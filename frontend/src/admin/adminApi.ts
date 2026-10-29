import type { PortfolioContent } from "../types";
import { apiUrl, resolvePortfolioMedia } from "../api";

type SessionResponse = { authenticated: string; configured: string; authDisabled: string };
type MessageResponse = { message?: string };
type StorageHealthResponse = MessageResponse & {
  database?: string;
  storage?: string;
};

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function requirePersistentStorage(): Promise<void> {
  const response = await fetch(apiUrl("/api/health"), { cache: "no-store" });
  const body = await parseJson<StorageHealthResponse>(response);
  if (!response.ok) {
    throw new Error(body.message ?? "The portfolio storage service is unavailable.");
  }
  if (body.database !== "mongodb") {
    throw new Error(
      "The connected API does not confirm MongoDB persistence. Admin editing is blocked to protect your data. Redeploy the latest backend commit to Render, then reopen the dashboard.",
    );
  }
  if (import.meta.env.PROD && body.storage !== "backblaze-b2") {
    throw new Error(
      "The connected API does not confirm persistent image storage. Admin editing is blocked to protect your uploads. Configure Backblaze B2 on Render and redeploy the backend.",
    );
  }
}

export async function checkAdminSession(): Promise<SessionResponse> {
  const response = await fetch(apiUrl("/api/admin/session"), { credentials: "include" });
  const body = await parseJson<SessionResponse & MessageResponse>(response);
  if (!response.ok) {
    throw new Error(body.message ?? "Could not verify admin session.");
  }
  return body;
}

export async function adminLogin(username: string, password: string): Promise<void> {
  const response = await fetch(apiUrl("/api/admin/login"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await parseJson<MessageResponse>(response);
  if (!response.ok) {
    throw new Error(body.message ?? "Sign-in failed.");
  }
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
): Promise<string> {
  const response = await fetch(apiUrl("/api/admin/password"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const body = await parseJson<MessageResponse>(response);
  if (!response.ok) {
    throw new Error(body.message ?? "Could not change the admin password.");
  }
  return body.message ?? "Admin password changed successfully.";
}

export async function adminLogout(): Promise<void> {
  await fetch(apiUrl("/api/admin/logout"), {
    method: "POST",
    credentials: "include",
  });
}

export async function loadAdminPortfolio(): Promise<PortfolioContent> {
  await requirePersistentStorage();
  const response = await fetch(apiUrl("/api/admin/portfolio"), { credentials: "include" });
  const body = await parseJson<PortfolioContent & MessageResponse>(response);
  if (!response.ok || !("hero" in body)) {
    throw new Error(body.message ?? "Could not load portfolio content.");
  }
  return resolvePortfolioMedia(body);
}

export async function saveAdminPortfolio(content: PortfolioContent): Promise<string> {
  await requirePersistentStorage();
  const response = await fetch(apiUrl("/api/admin/portfolio"), {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(content),
  });
  const body = await parseJson<MessageResponse>(response);
  if (!response.ok) {
    throw new Error(body.message ?? "Could not save portfolio changes.");
  }
  return body.message ?? "Portfolio changes saved.";
}

export async function uploadImage(file: File): Promise<string> {
  await requirePersistentStorage();
  const response = await fetch(apiUrl("/api/admin/uploads"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const body = await parseJson<{ url?: string; message?: string }>(response);
  if (!response.ok || !body.url) {
    throw new Error(body.message ?? "The image could not be uploaded.");
  }
  return apiUrl(body.url);
}
