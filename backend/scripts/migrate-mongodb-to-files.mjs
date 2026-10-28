import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GridFSBucket, MongoClient } from "mongodb";
import { config } from "dotenv";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const backendDirectory = dirname(scriptDirectory);
config({ path: join(backendDirectory, ".env") });

const uri = process.env.MONGODB_URI?.trim();
if (!uri) {
  throw new Error("Set MONGODB_URI in backend/.env before running this one-time export.");
}

const dataDirectory = resolve(backendDirectory, process.env.DATA_DIRECTORY ?? "data");
const uploadDirectory = join(backendDirectory, "data", "uploads");
const backupDirectory = join(
  dataDirectory,
  "migration-backup",
  `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomBytes(3).toString("hex")}`,
);

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function writeAtomic(path, data) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  try {
    await writeFile(temporary, data, { flag: "wx", mode: 0o600 });
    await rename(temporary, path);
  } catch (error) {
    try {
      await unlink(temporary);
    } catch (cleanupError) {
      if (cleanupError.code !== "ENOENT") {
        console.error("Could not remove a temporary migration file:", cleanupError);
      }
    }
    throw error;
  }
}

async function existingFile(path) {
  try {
    return await readFile(path);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function exportFile(path, bytes, relativePath) {
  const previous = await existingFile(path);
  if (previous && !previous.equals(bytes)) {
    await writeAtomic(join(backupDirectory, relativePath), previous);
  }
  if (!previous?.equals(bytes)) await writeAtomic(path, bytes);
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

const client = new MongoClient(uri, { maxPoolSize: 1, serverSelectionTimeoutMS: 10_000 });

try {
  await client.connect();
  const databaseName = process.env.MONGODB_DB?.trim();
  const database = databaseName ? client.db(databaseName) : client.db();
  await database.command({ ping: 1 });

  const [portfolio, account, sessions, contacts, gridFiles] = await Promise.all([
    database.collection("portfolio").findOne({ _id: "primary" }),
    database.collection("adminAccounts").findOne({ _id: "primary" }),
    database.collection("adminSessions").find({ expiresAt: { $gt: new Date() } }).toArray(),
    database.collection("contactMessages").find().toArray(),
    database.collection("portfolioMedia.files")
      .find({ filename: /^[a-f0-9]{32}\.(png|jpg|webp|gif)$/ })
      .toArray(),
  ]);

  if (portfolio && !isRecord(portfolio.content)) {
    throw new Error("The portfolio record is invalid; no data files were changed.");
  }
  if (account && (
    typeof account.username !== "string" ||
    !/^[\da-f]{32}$/i.test(account.salt) ||
    !/^[\da-f]{128}$/i.test(account.hash)
  )) {
    throw new Error("The admin account record is invalid; no data files were changed.");
  }

  const bucket = new GridFSBucket(database, { bucketName: "portfolioMedia" });
  const images = [];
  for (const file of gridFiles) {
    const chunks = [];
    for await (const chunk of bucket.openDownloadStream(file._id)) {
      chunks.push(Buffer.from(chunk));
    }
    images.push({ filename: file.filename, bytes: Buffer.concat(chunks) });
  }

  if (portfolio) {
    await exportFile(
      join(dataDirectory, "portfolio.json"),
      jsonBytes(portfolio.content),
      "portfolio.json",
    );
  }

  if (account) {
    await exportFile(
      join(dataDirectory, "admin-password.json"),
      jsonBytes({ username: account.username, salt: account.salt, hash: account.hash }),
      "admin-password.json",
    );
  }

  const activeSessions = sessions
    .filter((session) =>
      typeof session.tokenHash === "string" &&
      /^[\da-f]{64}$/i.test(session.tokenHash) &&
      session.createdAt &&
      session.expiresAt,
    )
    .map((session) => ({
      tokenHash: session.tokenHash,
      createdAt: new Date(session.createdAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString(),
    }));
  const currentSessions = await existingFile(join(dataDirectory, "admin-sessions.json"));
  if (activeSessions.length || !currentSessions) {
    await exportFile(
      join(dataDirectory, "admin-sessions.json"),
      jsonBytes(activeSessions),
      "admin-sessions.json",
    );
  }

  const contactMessages = contacts.map(({ _id, ...message }) => ({
    ...message,
    receivedAt: message.receivedAt
      ? new Date(message.receivedAt).toISOString()
      : new Date().toISOString(),
  }));
  const currentContacts = await existingFile(join(dataDirectory, "contact-messages.json"));
  if (contactMessages.length || !currentContacts) {
    await exportFile(
      join(dataDirectory, "contact-messages.json"),
      jsonBytes(contactMessages),
      "contact-messages.json",
    );
  }

  for (const image of images) {
    await exportFile(
      join(uploadDirectory, image.filename),
      image.bytes,
      join("uploads", image.filename),
    );
  }

  console.log(JSON.stringify({
    portfolioExported: Boolean(portfolio),
    adminAccountExported: Boolean(account),
    activeSessionsExported: activeSessions.length,
    contactMessagesExported: contactMessages.length,
    gridFsImagesExported: images.length,
    existingFilesBackedUpTo: backupDirectory,
    databaseChanged: false,
  }, null, 2));
} finally {
  await client.close();
}
