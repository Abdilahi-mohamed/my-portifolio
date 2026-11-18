import { Db, MongoClient, ObjectId } from "mongodb";
import { loadServerEnv } from "./env";

export type MongoRecord = Record<string, unknown> & { _id?: string | ObjectId };

type MongoCache = {
  client: MongoClient | null;
  database: Db | null;
};

const cache = globalThis as typeof globalThis & { __portfolioMongo?: MongoCache };
if (!cache.__portfolioMongo) cache.__portfolioMongo = { client: null, database: null };

export async function getDatabase(): Promise<Db> {
  loadServerEnv();
  const cached = cache.__portfolioMongo!;
  if (cached.database) return cached.database;

  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error("MONGODB_URI is required.");

  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error("MONGODB_URI is invalid.");
  }
  if (!["mongodb:", "mongodb+srv:"].includes(parsed.protocol)) {
    throw new Error("MONGODB_URI must use mongodb:// or mongodb+srv://.");
  }

  const client = new MongoClient(uri, {
    appName: "abdilahi-portfolio-next",
    connectTimeoutMS: 10_000,
    serverSelectionTimeoutMS: 10_000,
    retryReads: true,
    retryWrites: true,
  });
  await client.connect();
  await client.db().command({ ping: 1 });

  const databaseName =
    process.env.MONGODB_DB?.trim() ||
    decodeURIComponent(parsed.pathname.replace(/^\/+/, "")) ||
    "test";
  cached.client = client;
  cached.database = client.db(databaseName);
  return cached.database;
}

export async function getCollection(name: string) {
  const database = await getDatabase();
  return database.collection<MongoRecord>(name);
}
