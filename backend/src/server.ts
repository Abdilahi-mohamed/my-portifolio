import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { isPortfolioContent } from "./portfolioValidation.js";

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const backendDirectory = dirname(serverDirectory);
const projectDirectory = dirname(backendDirectory);
config({ path: join(backendDirectory, ".env") });
const adminUsername = process.env.ADMIN_USERNAME ?? "abdillahip";
const port = Number(process.env.PORT ?? 4000);
const allowedOrigins = new Set([
  "https://my-portifolio-blush-five.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.FRONTEND_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? []),
]);
const messageFile = join(backendDirectory, "data", "messages.jsonl");
const portfolioFile = join(backendDirectory, "data", "portfolio.json");
const adminPasswordFile = join(backendDirectory, "data", "admin-password.json");
const uploadDirectory = join(backendDirectory, "data", "uploads");
const defaultPortfolioFile = join(projectDirectory, "shared", "portfolio.default.json");
const maxBodyBytes = 10_000;
const maxPortfolioBytes = 1_000_000;
const maxUploadBytes = 8 * 1024 * 1024;
const sessions = new Map<string, number>();
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const sessionDuration = 8 * 60 * 60 * 1000;
const cookieName = "portfolio_admin";
type PasswordRecord = { salt: string; hash: string };

function createPasswordRecord(password: string): PasswordRecord {
  const salt = randomBytes(16).toString("hex");
  return { salt, hash: scryptSync(password, salt, 64).toString("hex") };
}

let adminPasswordRecord = createPasswordRecord(process.env.ADMIN_PASSWORD ?? "abdillahi17859");

type ContactMessage = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function getPortfolio(): Promise<unknown> {
  let portfolio: unknown;
  let loadedFromDisk = true;
  try {
    portfolio = JSON.parse(await readFile(portfolioFile, "utf8")) as unknown;
  } catch (error) {
    if (!isRecord(error) || error.code !== "ENOENT") throw error;
    loadedFromDisk = false;
    portfolio = JSON.parse(await readFile(defaultPortfolioFile, "utf8")) as unknown;
  }
  if (isRecord(portfolio)) {
    const normalized = { ...portfolio };
    let migratedDatabaseSkill = false;
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
          migratedDatabaseSkill = true;
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
    if (loadedFromDisk && migratedDatabaseSkill) await savePortfolio(normalized);
    return normalized;
  }
  return portfolio;
}

async function savePortfolio(content: unknown): Promise<void> {
  await mkdir(dirname(portfolioFile), { recursive: true });
  const temporaryFile = `${portfolioFile}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(content, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporaryFile, portfolioFile);
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

function hasAdminSession(request: IncomingMessage): boolean {
  const token = getCookie(request, cookieName);
  const expiresAt = token ? sessions.get(token) : undefined;
  if (!token || !expiresAt) return false;
  if (expiresAt <= Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

async function loadAdminPassword(): Promise<void> {
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
    adminPasswordRecord = { salt: parsed.salt, hash: parsed.hash };
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return;
    throw error;
  }
}

async function saveAdminPassword(record: PasswordRecord): Promise<void> {
  await mkdir(dirname(adminPasswordFile), { recursive: true });
  const temporaryFile = `${adminPasswordFile}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(record)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporaryFile, adminPasswordFile);
}

function localAdminBypassEnabled(request: IncomingMessage): boolean {
  const address = request.socket.remoteAddress;
  const isLoopback = address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
  return process.env.ADMIN_AUTH_DISABLED === "true" &&
    process.env.NODE_ENV !== "production" &&
    isLoopback;
}

function isAdminAuthenticated(request: IncomingMessage): boolean {
  return localAdminBypassEnabled(request) || hasAdminSession(request);
}

function passwordMatches(received: string): boolean {
  const receivedHash = scryptSync(received, adminPasswordRecord.salt, 64);
  const configuredHash = Buffer.from(adminPasswordRecord.hash, "hex");
  return timingSafeEqual(receivedHash, configuredHash);
}

function usernameMatches(received: string): boolean {
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

const server = createServer(async (request, response) => {
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
  if (request.method === "GET" && url.pathname === "/api/health") {
    respond(response, 200, { status: "ok" });
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
      const filePath = join(uploadDirectory, mediaMatch[1]);
      const image = await readFile(filePath);
      const extension = mediaMatch[1].split(".").at(-1);
      const contentType = extension === "jpg" ? "image/jpeg" : `image/${extension}`;
      response.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": image.byteLength,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
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
        authenticated: isAdminAuthenticated(request) ? "true" : "false",
        configured: "true",
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
          typeof body.password !== "string"
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
        const token = randomBytes(32).toString("base64url");
        sessions.set(token, now + sessionDuration);
        setSessionCookie(response, token, isSecureRequest(request));
        respond(response, 200, { message: "Signed in successfully." });
      } catch (error) {
        respond(response, error instanceof SyntaxError ? 400 : 413, {
          message: error instanceof SyntaxError ? "The request body must contain valid JSON." : "The request is too large.",
        });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/admin/password") {
      if (!isAdminAuthenticated(request)) {
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
        if (body.newPassword.length < 8 || body.newPassword.length > 128) {
          respond(response, 400, { message: "The new password must be between 8 and 128 characters." });
          return;
        }

        const nextPasswordRecord = createPasswordRecord(body.newPassword);
        await saveAdminPassword(nextPasswordRecord);
        adminPasswordRecord = nextPasswordRecord;
        sessions.clear();
        const token = randomBytes(32).toString("base64url");
        sessions.set(token, Date.now() + sessionDuration);
        setSessionCookie(response, token, isSecureRequest(request));
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
      if (token) sessions.delete(token);
      clearSessionCookie(response, isSecureRequest(request));
      respond(response, 200, { message: "Signed out." });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/admin/uploads") {
      if (!isAdminAuthenticated(request)) {
        respond(response, 401, { message: "Sign in to upload project images." });
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
        const isValidImage =
          (extension === "jpg" && image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff) ||
          (extension === "png" && image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
          (extension === "webp" && image.toString("ascii", 0, 4) === "RIFF" && image.toString("ascii", 8, 12) === "WEBP") ||
          (extension === "gif" && ["GIF87a", "GIF89a"].includes(image.toString("ascii", 0, 6)));
        if (!isValidImage || image.length === 0) {
          respond(response, 400, { message: "The selected file is not a valid supported image." });
          return;
        }
        await mkdir(uploadDirectory, { recursive: true });
        const filename = `${randomBytes(16).toString("hex")}.${extension}`;
        await writeFile(join(uploadDirectory, filename), image, { mode: 0o600, flag: "wx" });
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
      if (!isAdminAuthenticated(request)) {
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

  if (request.method !== "POST" || url.pathname !== "/api/contact") {
    respond(response, 404, { message: "Route not found." });
    return;
  }
  if (!request.headers["content-type"]?.includes("application/json")) {
    respond(response, 415, { message: "Send the message as JSON." });
    return;
  }

  try {
    const input = await readJson(request);
    const message = validateMessage(input);
    if (!message) {
      respond(response, 400, {
        message: "Enter a valid name, email, and message (10–5000 characters).",
      });
      return;
    }
    await mkdir(dirname(messageFile), { recursive: true });
    await appendFile(
      messageFile,
      `${JSON.stringify({ ...message, receivedAt: new Date().toISOString() })}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
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
});

async function startServer(): Promise<void> {
  await loadAdminPassword();
  server.listen(port, () => {
    console.log(`Portfolio API listening on http://localhost:${port}`);
  });
}

void startServer().catch((error: unknown) => {
  console.error("Unable to start the portfolio API:", error);
  process.exitCode = 1;
});
