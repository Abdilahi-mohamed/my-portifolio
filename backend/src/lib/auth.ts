import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "./mongodb";

export const SESSION_COOKIE = "portfolio_admin";
const sessionDurationSeconds = 60 * 60 * 24 * 14;

export type PasswordRecord = { salt: string; hash: string };

export function createPasswordRecord(password: string): PasswordRecord {
  const salt = randomBytes(16).toString("hex");
  return { salt, hash: scryptSync(password, salt, 64).toString("hex") };
}

function passwordMatches(received: string, record: PasswordRecord): boolean {
  const receivedHash = scryptSync(received, record.salt, 64);
  const configuredHash = Buffer.from(record.hash, "hex");
  return receivedHash.length === configuredHash.length &&
    timingSafeEqual(receivedHash, configuredHash);
}

export async function loadAdminAccount(): Promise<{ username: string; password: PasswordRecord } | null> {
  const accounts = await getCollection("adminAccounts");
  const account = await accounts.findOne({ _id: "primary" });
  if (account &&
    typeof account.username === "string" &&
    typeof account.salt === "string" &&
    typeof account.hash === "string") {
    return { username: account.username.trim(), password: { salt: account.salt, hash: account.hash } };
  }

  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return null;

  const record = createPasswordRecord(password);
  await accounts.updateOne(
    { _id: "primary" },
    { $setOnInsert: { _id: "primary", username, ...record, createdAt: new Date() } },
    { upsert: true },
  );
  const saved = await accounts.findOne({ _id: "primary" });
  if (saved && typeof saved.username === "string" && typeof saved.salt === "string" && typeof saved.hash === "string") {
    return { username: saved.username, password: { salt: saved.salt, hash: saved.hash } };
  }
  return null;
}

export async function hasAdminSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const sessions = await getCollection("adminSessions");
  const session = await sessions.findOne({ tokenHash, expiresAt: { $gt: new Date() } });
  if (session) return true;
  await sessions.deleteOne({ tokenHash });
  return false;
}

export async function createAdminSession(response: NextResponse): Promise<void> {
  const token = randomUUID();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await (await getCollection("adminSessions")).insertOne({
    tokenHash,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + sessionDurationSeconds * 1000),
  });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionDurationSeconds,
  });
}

export async function validateAdminLogin(username: string, password: string): Promise<boolean> {
  const account = await loadAdminAccount();
  if (!account) return false;
  if (username !== account.username) return false;
  return passwordMatches(password, account.password);
}

export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<void> {
  const account = await loadAdminAccount();
  if (!account || !passwordMatches(currentPassword, account.password)) {
    throw new Error("The current password is incorrect.");
  }
  const record = createPasswordRecord(newPassword);
  await (await getCollection("adminAccounts")).updateOne(
    { _id: "primary" },
    { $set: { username: account.username, ...record, updatedAt: new Date() } },
  );
  await (await getCollection("adminSessions")).deleteMany({});
}
