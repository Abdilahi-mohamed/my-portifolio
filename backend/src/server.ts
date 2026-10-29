import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { config } from "dotenv";
import { isPortfolioContent } from "./portfolioValidation.js";

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const backendDirectory = dirname(serverDirectory);
const projectDirectory = dirname(backendDirectory);
const frontendBuildDirectory = join(projectDirectory, "frontend", "dist");
config({ path: join(backendDirectory, ".env") });
let adminUsername = process.env.ADMIN_USERNAME?.trim() ?? "";
const port = Number(process.env.PORT ?? 4000);
const dataDirectory = resolve(backendDirectory, process.env.DATA_DIRECTORY ?? "data");
const allowedOrigins = new Set([
  "https://my-portifolio-blush-five.vercel.app",
  "https://my-portifolio-8cfytxot8-abdilahi-mohameds-projects.vercel.app",
  "https://my-portifolio-sigma-sooty.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.FRONTEND_ORIGIN?.split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean) ?? []),
]);
const portfolioFile = join(dataDirectory, "portfolio.json");
const adminPasswordFile = join(dataDirectory, "admin-password.json");
const adminSessionsFile = join(dataDirectory, "admin-sessions.json");
const contactMessagesFile = join(dataDirectory, "contact-messages.json");
const uploadDirectory = join(backendDirectory, "data", "uploads");
const defaultPortfolioFile = join(projectDirectory, "shared", "portfolio.default.json");
const maxBodyBytes = 10_000;
const maxPortfolioBytes = 1_000_000;
const maxUploadBytes = 8 * 1024 * 1024;
const uploadMimeTypes: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const contactAttempts = new Map<string, { count: number; resetAt: number }>();
const sessionDuration = 8 * 60 * 60 * 1000;
const cookieName = "portfolio_admin";
type PasswordRecord = { salt: string; hash: string };
type AdminSession = {
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
};
type ContactMessage = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

function createPasswordRecord(password: string): PasswordRecord {
  const salt = randomBytes(16).toString("hex");
  return { salt, hash: scryptSync(password, salt, 64).toString("hex") };
}

let adminPasswordRecord: PasswordRecord | null = null;
let adminSessions: AdminSession[] = [];
let fileWriteQueue: Promise<void> = Promise.resolve();

const b2Endpoint = process.env.B2_ENDPOINT?.trim() ?? "";
const b2Bucket = process.env.B2_BUCKET_NAME?.trim() ?? "";
const b2AccessKeyId = process.env.B2_ACCESS_KEY_ID?.trim() ?? "";
const b2ApplicationKey = process.env.B2_APPLICATION_KEY?.trim() ?? "";
const b2Region = process.env.B2_REGION?.trim() ||
  (/s3\.([a-z0-9-]+)\.backblazeb2\.com/i.exec(b2Endpoint)?.[1] ?? "");
const b2Settings = [b2Endpoint, b2Bucket, b2AccessKeyId, b2ApplicationKey, b2Region];
const b2Configured = b2Settings.every(Boolean);
const b2Client = (() => {
  if (!b2Settings.some(Boolean)) return null;
  if (!b2Configured) {
    throw new Error(
      "Configure B2_ENDPOINT, B2_BUCKET_NAME, B2_ACCESS_KEY_ID, B2_APPLICATION_KEY, and B2_REGION together.",
    );
  }
  const endpoint = new URL(
    /^[a-z][a-z\d+.-]*:\/\//i.test(b2Endpoint) ? b2Endpoint : `https://${b2Endpoint}`,
  );
  if (endpoint.protocol !== "https:") {
    throw new Error("B2_ENDPOINT must use HTTPS.");
  }
  return new S3Client({
    endpoint: endpoint.toString().replace(/\/+$/, ""),
    region: b2Region,
    credentials: {
      accessKeyId: b2AccessKeyId,
      secretAccessKey: b2ApplicationKey,
    },
    forcePathStyle: true,
  });
})();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function serializeFileWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = fileWriteQueue.then(operation);
  fileWriteQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function writeJsonFile(file: string, value: unknown): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  const temporaryFile = `${file}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  try {
    await writeFile(temporaryFile, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporaryFile, file);
  } catch (error) {
    try {
      await unlink(temporaryFile);
    } catch (cleanupError) {
      if (!isRecord(cleanupError) || cleanupError.code !== "ENOENT") {
        console.error("Unable to clean up a temporary data file:", cleanupError);
      }
    }
    throw error;
  }
}

async function readJsonFile(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, "utf8")) as unknown;
}

function respond(
  response: ServerResponse,
  status: number,
  body: Record<string, string>,
): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

async function serveFrontend(pathname: string, request: IncomingMessage, response: ServerResponse): Promise<boolean> {
  if (request.method !== "GET" && request.method !== "HEAD") return false;

  let filePath = join(frontendBuildDirectory, "index.html");
  if (pathname !== "/") {
    let decodedPath: string;
    try {
      decodedPath = decodeURIComponent(pathname);
    } catch {
      respond(response, 400, { message: "Invalid URL path." });
      return true;
    }

    const requestedPath = resolve(frontendBuildDirectory, `.${decodedPath}`);
    if (!requestedPath.startsWith(`${frontendBuildDirectory}${process.platform === "win32" ? "\\" : "/"}`)) {
      respond(response, 400, { message: "Invalid URL path." });
      return true;
    }

    try {
      if ((await stat(requestedPath)).isFile()) filePath = requestedPath;
    } catch (error) {
      if (!isRecord(error) || error.code !== "ENOENT") throw error;
      if (/\.[^/]+$/.test(decodedPath)) {
        respond(response, 404, { message: "File not found." });
        return true;
      }
    }
  }

  let content: Buffer;
  try {
    content = await readFile(filePath);
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return false;
    throw error;
  }

  const extension = filePath.split(".").at(-1)?.toLowerCase();
  const contentType: Record<string, string> = {
    css: "text/css; charset=utf-8",
    html: "text/html; charset=utf-8",
    ico: "image/x-icon",
    jpg: "image/jpeg",
    js: "text/javascript; charset=utf-8",
    json: "application/json; charset=utf-8",
    png: "image/png",
    svg: "image/svg+xml",
    txt: "text/plain; charset=utf-8",
    webp: "image/webp",
    woff: "font/woff",
    woff2: "font/woff2",
  };
  response.writeHead(200, {
    "Content-Type": extension ? contentType[extension] ?? "application/octet-stream" : "application/octet-stream",
    "Content-Length": content.byteLength,
    "Cache-Control": filePath.endsWith("index.html")
      ? "no-cache"
      : "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(request.method === "HEAD" ? undefined : content);
  return true;
}

async function readJson(request: IncomingMessage, maxBytes = maxBodyBytes): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) {
      throw new Error("Request body is too large.");
    }
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function loadInitialPortfolio(): Promise<unknown> {
  let portfolio: unknown;
  try {
    portfolio = JSON.parse(await readFile(portfolioFile, "utf8")) as unknown;
  } catch (error) {
    if (!isRecord(error) || error.code !== "ENOENT") throw error;
    portfolio = JSON.parse(await readFile(defaultPortfolioFile, "utf8")) as unknown;
  }
  if (isRecord(portfolio)) {
    const normalized = { ...portfolio };
    if (!("customSections" in normalized)) normalized.customSections = [];
    if (!("experience" in normalized)) normalized.experience = [];
    if (!("certificates" in normalized)) normalized.certificates = [];
    if (isRecord(normalized.skillsSection) && Array.isArray(normalized.skillsSection.skills)) {
      normalized.skillsSection = {
        ...normalized.skillsSection,
        skills: normalized.skillsSection.skills.map((skill) => {
          if (
            !isRecord(skill) ||
            skill.category === "Databases" ||
            !(
              (typeof skill.name === "string" && skill.name.trim().toLowerCase() === "mongodb") ||
              skill.icon === "Mongodb"
            )
          ) return skill;
          return { ...skill, category: "Databases" };
        }),
      };
    }
    if (Array.isArray(normalized.navigation)) {
      const navigation = [...normalized.navigation];
      const aboutIndex = navigation.findIndex((item) => isRecord(item) && item.id === "about");
      const homeIndex = navigation.findIndex((item) => isRecord(item) && item.id === "home");
      if (aboutIndex >= 0 && homeIndex >= 0 && aboutIndex > homeIndex) {
        const [about] = navigation.splice(aboutIndex, 1);
        navigation.splice(homeIndex, 0, about);
      }
      normalized.navigation = navigation;
    }
    if (isRecord(normalized.projectsSection) && Array.isArray(normalized.projectsSection.projects)) {
      normalized.projectsSection = {
        ...normalized.projectsSection,
        projects: normalized.projectsSection.projects.map((project, index) => {
          if (!isRecord(project)) return project;
          const slug = typeof project.title === "string"
            ? project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
            : "project";
          return {
            ...project,
            id: typeof project.id === "string" && project.id ? project.id : `${slug || "project"}-${index + 1}`,
            fullDescription: typeof project.fullDescription === "string"
              ? project.fullDescription
              : project.description,
            gallery: Array.isArray(project.gallery) ? project.gallery : [],
            linkedinUrl: typeof project.linkedinUrl === "string" ? project.linkedinUrl : "",
            featured: typeof project.featured === "boolean" ? project.featured : false,
            visible: typeof project.visible === "boolean" ? project.visible : true,
          };
        }),
      };
    }
    return normalized;
  }
  return portfolio;
}

async function initializePortfolio(): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  try {
    await readJsonFile(portfolioFile);
  } catch (error) {
    if (!isRecord(error) || error.code !== "ENOENT") throw error;
    await serializeFileWrite(async () => writeJsonFile(portfolioFile, await loadInitialPortfolio()));
  }
}

async function getPortfolio(): Promise<unknown> {
  return readJsonFile(portfolioFile);
}

async function savePortfolio(content: unknown): Promise<void> {
  await serializeFileWrite(async () => {
    const stored = await readJsonFile(portfolioFile);
    await writeJsonFile(portfolioFile, content);
    await removeObsoleteMedia(stored, content);
  });
}

function getCookie(request: IncomingMessage, name: string): string | undefined {
  const cookies = request.headers.cookie?.split(";") ?? [];
  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator < 0) continue;
    if (cookie.slice(0, separator).trim() === name) {
      return cookie.slice(separator + 1).trim();
    }
  }
  return undefined;
}

async function hasAdminSession(request: IncomingMessage): Promise<boolean> {
  const token = getCookie(request, cookieName);
  if (!token) return false;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const session = adminSessions.find(
    (item) => item.tokenHash === tokenHash && Date.parse(item.expiresAt) > Date.now(),
  );
  if (session) return true;
  const remaining = adminSessions.filter((item) => item.tokenHash !== tokenHash);
  if (remaining.length !== adminSessions.length) {
    adminSessions = remaining;
    await serializeFileWrite(() => writeJsonFile(adminSessionsFile, adminSessions));
  }
  return false;
}

async function loadLegacyAdminPassword(): Promise<void> {
  try {
    const parsed: unknown = JSON.parse(await readFile(adminPasswordFile, "utf8"));
    if (
      !isRecord(parsed) ||
      typeof parsed.salt !== "string" ||
      !/^[\da-f]{32}$/i.test(parsed.salt) ||
      typeof parsed.hash !== "string" ||
      !/^[\da-f]{128}$/i.test(parsed.hash)
    ) {
      throw new Error("The stored admin password data is invalid.");
    }
    if (typeof parsed.username === "string" && parsed.username.trim()) {
      adminUsername = parsed.username.trim();
    }
    adminPasswordRecord = { salt: parsed.salt, hash: parsed.hash };
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return;
    throw error;
  }
}

async function loadAdminAccount(): Promise<void> {
  await loadLegacyAdminPassword();
  if (!adminPasswordRecord && process.env.ADMIN_PASSWORD) {
    adminPasswordRecord = createPasswordRecord(process.env.ADMIN_PASSWORD);
  }

  let sessions: unknown;
  try {
    sessions = await readJsonFile(adminSessionsFile);
  } catch (error) {
    if (!isRecord(error) || error.code !== "ENOENT") throw error;
    sessions = [];
  }
  if (!Array.isArray(sessions)) {
    throw new Error("The stored admin sessions data is invalid.");
  }
  adminSessions = sessions.map((session) => {
    if (
      !isRecord(session) ||
      typeof session.tokenHash !== "string" ||
      !/^[\da-f]{64}$/i.test(session.tokenHash) ||
      typeof session.createdAt !== "string" ||
      typeof session.expiresAt !== "string" ||
      !Number.isFinite(Date.parse(session.expiresAt))
    ) {
      throw new Error("The stored admin sessions data is invalid.");
    }
    return {
      tokenHash: session.tokenHash,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    };
  }).filter((session) => Date.parse(session.expiresAt) > Date.now());
  await serializeFileWrite(() => writeJsonFile(adminSessionsFile, adminSessions));
}

async function saveAdminPassword(record: PasswordRecord): Promise<void> {
  if (!adminUsername) {
    throw new Error("Admin username is not configured.");
  }
  await serializeFileWrite(() => writeJsonFile(adminPasswordFile, {
    username: adminUsername,
    ...record,
  }));
}

function localAdminBypassEnabled(request: IncomingMessage): boolean {
  const address = request.socket.remoteAddress;
  const isLoopback = address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
  return process.env.ADMIN_AUTH_DISABLED === "true" &&
    process.env.NODE_ENV !== "production" &&
    isLoopback;
}

async function isAdminAuthenticated(request: IncomingMessage): Promise<boolean> {
  return localAdminBypassEnabled(request) || await hasAdminSession(request);
}

function passwordMatches(received: string): boolean {
  if (!adminPasswordRecord) return false;
  const receivedHash = scryptSync(received, adminPasswordRecord.salt, 64);
  const configuredHash = Buffer.from(adminPasswordRecord.hash, "hex");
  return timingSafeEqual(receivedHash, configuredHash);
}

function usernameMatches(received: string): boolean {
  if (!adminUsername) return false;
  const receivedHash = createHash("sha256").update(received).digest();
  const configuredHash = createHash("sha256").update(adminUsername).digest();
  return timingSafeEqual(receivedHash, configuredHash);
}

function setSessionCookie(response: ServerResponse, token: string, secure: boolean): void {
  response.setHeader(
    "Set-Cookie",
    `${cookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=${secure ? "None" : "Strict"}; Path=/api/admin; Max-Age=${sessionDuration / 1000}${secure ? "; Secure" : ""}`,
  );
}

function clearSessionCookie(response: ServerResponse, secure: boolean): void {
  response.setHeader(
    "Set-Cookie",
    `${cookieName}=; HttpOnly; SameSite=${secure ? "None" : "Strict"}; Path=/api/admin; Max-Age=0${secure ? "; Secure" : ""}`,
  );
}

function isSecureRequest(request: IncomingMessage): boolean {
  return request.headers["x-forwarded-proto"] === "https";
}

function mediaFilenameSet(value: unknown, filenames = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    const match = /\/api\/media\/([a-f0-9]{32}\.(?:png|jpg|webp|gif))(?:[?#]|$)/.exec(value);
    if (match) filenames.add(match[1]);
  } else if (Array.isArray(value)) {
    value.forEach((item) => mediaFilenameSet(item, filenames));
  } else if (isRecord(value)) {
    Object.values(value).forEach((item) => mediaFilenameSet(item, filenames));
  }
  return filenames;
}

async function removeMediaFile(filename: string): Promise<void> {
  if (b2Client) {
    await b2Client.send(new DeleteObjectCommand({ Bucket: b2Bucket, Key: filename }));
  }
  try {
    await unlink(join(uploadDirectory, filename));
  } catch (error) {
    if (!isRecord(error) || error.code !== "ENOENT") throw error;
  }
}

async function removeObsoleteMedia(previous: unknown, next: unknown): Promise<void> {
  const retained = mediaFilenameSet(next);
  for (const filename of mediaFilenameSet(previous)) {
    if (!retained.has(filename)) await removeMediaFile(filename);
  }
}

function mediaContentType(filename: string): string {
  const extension = filename.split(".").at(-1);
  return extension ? uploadMimeTypes[extension] ?? "application/octet-stream" : "application/octet-stream";
}

function isValidImage(image: Buffer, extension: string): boolean {
  return (
    (extension === "jpg" && image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff) ||
    (extension === "png" && image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (extension === "webp" && image.toString("ascii", 0, 4) === "RIFF" && image.toString("ascii", 8, 12) === "WEBP") ||
    (extension === "gif" && ["GIF87a", "GIF89a"].includes(image.toString("ascii", 0, 6)))
  );
}

function isObjectNotFound(error: unknown): boolean {
  return isRecord(error) && (
    error.name === "NotFound" ||
    error.name === "NoSuchKey" ||
    (isRecord(error.$metadata) && error.$metadata.httpStatusCode === 404)
  );
}

async function importLegacyUploads(): Promise<void> {
  if (!b2Client) return;
  let filenames: string[];
  try {
    filenames = await readdir(uploadDirectory);
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return;
    throw error;
  }

  for (const filename of filenames) {
    if (!/^[a-f0-9]{32}\.(?:png|jpg|webp|gif)$/.test(filename)) continue;
    try {
      await b2Client.send(new HeadObjectCommand({ Bucket: b2Bucket, Key: filename }));
      continue;
    } catch (error) {
      if (!isObjectNotFound(error)) throw error;
    }
    const image = await readFile(join(uploadDirectory, filename));
    if (image.length === 0 || image.length > maxUploadBytes || !isValidImage(image, filename.split(".").at(-1) ?? "")) {
      console.warn(`Skipping invalid or oversized legacy image: ${filename}`);
      continue;
    }
    await b2Client.send(new PutObjectCommand({
      Bucket: b2Bucket,
      Key: filename,
      Body: image,
      ContentLength: image.length,
      ContentType: mediaContentType(filename),
      CacheControl: "public, max-age=31536000, immutable",
    }));
  }
}

async function createAdminSession(response: ServerResponse, secure: boolean): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  adminSessions.push({
    tokenHash: createHash("sha256").update(token).digest("hex"),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + sessionDuration).toISOString(),
  });
  await serializeFileWrite(() => writeJsonFile(adminSessionsFile, adminSessions));
  setSessionCookie(response, token, secure);
}

function validateMessage(value: unknown): ContactMessage | null {
  if (typeof value !== "object" || value === null) return null;
  const input = value as Record<string, unknown>;
  if (
    typeof input.name !== "string" ||
    typeof input.email !== "string" ||
    typeof input.message !== "string" ||
    (input.subject !== undefined && typeof input.subject !== "string")
  ) {
    return null;
  }

  const message: ContactMessage = {
    name: input.name.trim(),
    email: input.email.trim(),
    subject: typeof input.subject === "string" ? input.subject.trim() : "",
    message: input.message.trim(),
  };
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (
    message.name.length < 2 ||
    message.name.length > 100 ||
    !emailPattern.test(message.email) ||
    message.email.length > 254 ||
    message.subject.length > 150 ||
    message.message.length < 10 ||
    message.message.length > 5000
  ) {
    return null;
  }
  return message;
}

const server = createServer((request, response) => {
  void handleRequest(request, response).catch((error: unknown) => {
    console.error("Unhandled API request error:", error);
    if (response.headersSent) {
      response.destroy();
    } else {
      respond(response, 500, { message: "The request could not be completed." });
    }
  });
});

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (isSecureRequest(request)) {
    response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  const origin = request.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    respond(response, 403, { message: "This origin is not allowed." });
    return;
  }
  if (origin) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Credentials", "true");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (
    request.method === "GET" &&
    (url.pathname === "/api/health" || url.pathname === "/api/health/storage")
  ) {
    respond(response, 200, { status: "ok", storage: b2Client ? "backblaze-b2" : "legacy-local" });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/portfolio") {
    try {
      const content = await getPortfolio();
      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(JSON.stringify(content));
    } catch (error) {
      console.error("Unable to load portfolio content:", error);
      respond(response, 500, { message: "Portfolio content could not be loaded." });
    }
    return;
  }

  const mediaMatch = /^\/api\/media\/([a-f0-9]{32}\.(?:png|jpg|webp|gif))$/.exec(url.pathname);
  if (request.method === "GET" && mediaMatch) {
    try {
      const filename = mediaMatch[1];
      let image: Buffer;
      let contentType = mediaContentType(filename);
      if (b2Client) {
        try {
          const storedObject = await b2Client.send(new GetObjectCommand({
            Bucket: b2Bucket,
            Key: filename,
          }));
          if (!storedObject.Body) throw new Error("The B2 object has no response body.");
          image = Buffer.from(await storedObject.Body.transformToByteArray());
          if (storedObject.ContentType) contentType = storedObject.ContentType;
        } catch (error) {
          if (!isObjectNotFound(error)) throw error;
          image = await readFile(join(uploadDirectory, filename));
        }
      } else {
        image = await readFile(join(uploadDirectory, filename));
      }
      response.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": image.byteLength,
        "Cache-Control": "public, max-age=31536000, immutable",
      });
      response.end(image);
    } catch (error) {
      if (isRecord(error) && error.code === "ENOENT") {
        respond(response, 404, { message: "Image not found." });
      } else {
        console.error("Unable to load uploaded image:", error);
        respond(response, 500, { message: "Image could not be loaded." });
      }
    }
    return;
  }

  if (url.pathname.startsWith("/api/admin/")) {
    if (request.method === "GET" && url.pathname === "/api/admin/session") {
      respond(response, 200, {
        authenticated: await isAdminAuthenticated(request) ? "true" : "false",
        configured: adminUsername && adminPasswordRecord ? "true" : "false",
        authDisabled: localAdminBypassEnabled(request) ? "true" : "false",
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/admin/login") {
      if (origin && !allowedOrigins.has(origin)) {
        respond(response, 403, { message: "This origin is not allowed." });
        return;
      }
      const now = Date.now();
      const clientAddress = request.socket.remoteAddress ?? "unknown";
      const attempts = loginAttempts.get(clientAddress);
      if (attempts && attempts.resetAt > now && attempts.count >= 5) {
        respond(response, 429, { message: "Too many sign-in attempts. Try again in one minute." });
        return;
      }
      try {
        const body = await readJson(request);
        if (
          !isRecord(body) ||
          typeof body.username !== "string" ||
          typeof body.password !== "string" ||
          body.username.length > 100 ||
          body.password.length > 128
        ) {
          respond(response, 400, { message: "Enter your username and password." });
          return;
        }
        const validUsername = usernameMatches(body.username);
        const validPassword = passwordMatches(body.password);
        if (!validUsername || !validPassword) {
          const current = attempts && attempts.resetAt > now
            ? { count: attempts.count + 1, resetAt: attempts.resetAt }
            : { count: 1, resetAt: now + 60_000 };
          loginAttempts.set(clientAddress, current);
          respond(response, 401, { message: "The username or password is incorrect." });
          return;
        }
        loginAttempts.delete(clientAddress);
        await createAdminSession(response, isSecureRequest(request));
        respond(response, 200, { message: "Signed in successfully." });
      } catch (error) {
        if (error instanceof SyntaxError) {
          respond(response, 400, { message: "The request body must contain valid JSON." });
        } else if (error instanceof Error && error.message === "Request body is too large.") {
          respond(response, 413, { message: "The request is too large." });
        } else {
          console.error("Unable to sign in to admin:", error);
          respond(response, 500, { message: "Sign-in could not be completed." });
        }
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/admin/password") {
      if (!await isAdminAuthenticated(request)) {
        respond(response, 401, { message: "Sign in to change the admin password." });
        return;
      }
      try {
        const body = await readJson(request);
        if (
          !isRecord(body) ||
          typeof body.currentPassword !== "string" ||
          typeof body.newPassword !== "string"
        ) {
          respond(response, 400, { message: "Enter your current and new passwords." });
          return;
        }
        if (!passwordMatches(body.currentPassword)) {
          respond(response, 401, { message: "The current password is incorrect." });
          return;
        }
        if (body.newPassword.length < 7 || body.newPassword.length > 128) {
          respond(response, 400, { message: "The new password must be between 7 and 128 characters." });
          return;
        }

        const nextPasswordRecord = createPasswordRecord(body.newPassword);
        await saveAdminPassword(nextPasswordRecord);
        adminPasswordRecord = nextPasswordRecord;
        adminSessions = [];
        await serializeFileWrite(() => writeJsonFile(adminSessionsFile, adminSessions));
        await createAdminSession(response, isSecureRequest(request));
        respond(response, 200, { message: "Admin password changed successfully." });
      } catch (error) {
        if (error instanceof SyntaxError) {
          respond(response, 400, { message: "The request body must contain valid JSON." });
        } else if (error instanceof Error && error.message === "Request body is too large.") {
          respond(response, 413, { message: "The request is too large." });
        } else {
          console.error("Unable to change admin password:", error);
          respond(response, 500, { message: "The admin password could not be changed." });
        }
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/admin/logout") {
      const token = getCookie(request, cookieName);
      if (token) {
        const tokenHash = createHash("sha256").update(token).digest("hex");
        adminSessions = adminSessions.filter((session) => session.tokenHash !== tokenHash);
        await serializeFileWrite(() => writeJsonFile(adminSessionsFile, adminSessions));
      }
      clearSessionCookie(response, isSecureRequest(request));
      respond(response, 200, { message: "Signed out." });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/admin/uploads") {
      if (!await isAdminAuthenticated(request)) {
        respond(response, 401, { message: "Sign in to upload project images." });
        return;
      }
      if (!b2Client) {
        respond(response, 503, { message: "Configure Backblaze B2 storage before uploading images." });
        return;
      }
      const contentType = request.headers["content-type"];
      const extensionByType: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
      };
      const extension = contentType ? extensionByType[contentType.split(";")[0].trim()] : undefined;
      if (!extension) {
        respond(response, 415, { message: "Choose a PNG, JPEG, WebP, or GIF image." });
        return;
      }
      try {
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of request) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          size += buffer.length;
          if (size > maxUploadBytes) {
            respond(response, 413, { message: "Each image must be 8 MB or smaller." });
            return;
          }
          chunks.push(buffer);
        }
        const image = Buffer.concat(chunks);
        if (!isValidImage(image, extension) || image.length === 0) {
          respond(response, 400, { message: "The selected file is not a valid supported image." });
          return;
        }
        const filename = `${randomBytes(16).toString("hex")}.${extension}`;
        await b2Client.send(new PutObjectCommand({
          Bucket: b2Bucket,
          Key: filename,
          Body: image,
          ContentLength: image.length,
          ContentType: contentType?.split(";")[0].trim(),
          CacheControl: "public, max-age=31536000, immutable",
        }));
        response.writeHead(201, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
        response.end(JSON.stringify({ url: `/api/media/${filename}` }));
      } catch (error) {
        if (error instanceof Error && error.message === "Request body is too large.") {
          respond(response, 413, { message: "Each image must be 8 MB or smaller." });
        } else {
          console.error("Unable to save uploaded project image:", error);
          respond(response, 500, { message: "The image could not be saved." });
        }
      }
      return;
    }

    if ((request.method === "GET" || request.method === "PUT") &&
      (url.pathname === "/api/admin/portfolio" || url.pathname === "/api/admin/portfolio/")) {
      if (!await isAdminAuthenticated(request)) {
        respond(response, 401, { message: "Sign in to manage portfolio content." });
        return;
      }
      if (request.method === "GET") {
        try {
          const content = await getPortfolio();
          response.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          });
          response.end(JSON.stringify(content));
        } catch (error) {
          console.error("Unable to load portfolio content for admin:", error);
          respond(response, 500, { message: "Portfolio content could not be loaded." });
        }
        return;
      }
      if (origin && !allowedOrigins.has(origin)) {
        respond(response, 403, { message: "This origin is not allowed." });
        return;
      }
      try {
        const content = await readJson(request, maxPortfolioBytes);
        if (Buffer.byteLength(JSON.stringify(content), "utf8") > maxPortfolioBytes) {
          respond(response, 413, { message: "Portfolio content is too large." });
        } else if (!isPortfolioContent(content)) {
          respond(response, 400, { message: "Portfolio content is incomplete or invalid." });
        } else {
          await savePortfolio(content);
          respond(response, 200, { message: "Portfolio changes saved." });
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          respond(response, 400, { message: "The request body must contain valid JSON." });
        } else if (error instanceof Error && error.message === "Request body is too large.") {
          respond(response, 413, { message: "Portfolio content is too large." });
        } else {
          console.error("Unable to save portfolio content:", error);
          respond(response, 500, { message: "Portfolio changes could not be saved." });
        }
      }
      return;
    }

    respond(response, 404, { message: "Admin route not found." });
    return;
  }

  if (!url.pathname.startsWith("/api/") && await serveFrontend(url.pathname, request, response)) {
    return;
  }

  if (request.method !== "POST" || url.pathname !== "/api/contact") {
    respond(response, 404, { message: "Route not found." });
    return;
  }
  if (!request.headers["content-type"]?.includes("application/json")) {
    respond(response, 415, { message: "Send the message as JSON." });
    return;
  }

  const now = Date.now();
  const clientAddress = request.socket.remoteAddress ?? "unknown";
  const currentAttempts = contactAttempts.get(clientAddress);
  if (currentAttempts && currentAttempts.resetAt <= now) {
    contactAttempts.delete(clientAddress);
  }
  const attempts = contactAttempts.get(clientAddress);
  if (attempts && attempts.count >= 5) {
    respond(response, 429, { message: "Too many messages were submitted. Try again later." });
    return;
  }
  contactAttempts.set(clientAddress, {
    count: (attempts?.count ?? 0) + 1,
    resetAt: attempts?.resetAt ?? now + 15 * 60_000,
  });

  try {
    const input = await readJson(request);
    const message = validateMessage(input);
    if (!message) {
      respond(response, 400, {
        message: "Enter a valid name, email, and message (10–5000 characters).",
      });
      return;
    }
    await serializeFileWrite(async () => {
      let messages: unknown;
      try {
        messages = await readJsonFile(contactMessagesFile);
      } catch (error) {
        if (!isRecord(error) || error.code !== "ENOENT") throw error;
        messages = [];
      }
      if (!Array.isArray(messages)) {
        throw new Error("The stored contact messages data is invalid.");
      }
      messages.push({ ...message, receivedAt: new Date().toISOString() });
      await writeJsonFile(contactMessagesFile, messages);
    });
    respond(response, 201, { message: "Your message was received successfully." });
  } catch (error) {
    if (error instanceof SyntaxError) {
      respond(response, 400, { message: "The request body must contain valid JSON." });
    } else if (error instanceof Error && error.message === "Request body is too large.") {
      respond(response, 413, { message: "Message is too large." });
    } else {
      console.error("Unable to save contact message:", error);
      respond(response, 500, { message: "The message could not be saved. Please try again." });
    }
  }
}

async function startServer(): Promise<void> {
  await initializePortfolio();
  await loadAdminAccount();
  await importLegacyUploads();
  server.listen(port, () => {
    console.log(`Portfolio API listening on http://localhost:${port}`);
    console.log(`Structured data directory: ${dataDirectory}`);
    console.log(`Media storage: ${b2Client ? "Backblaze B2" : "local legacy files (uploads disabled)"}`);
  });
}

let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; shutting down the portfolio API.`);
  server.close((error) => {
    if (error) {
      console.error("Unable to close the HTTP server cleanly:", error);
      process.exitCode = 1;
    }
    b2Client?.destroy();
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

void startServer().catch((error: unknown) => {
  console.error("Unable to start the portfolio API:", error);
  b2Client?.destroy();
  process.exitCode = 1;
});
