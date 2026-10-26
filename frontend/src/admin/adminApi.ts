import type { PortfolioContent } from "../types";

type SessionResponse = { authenticated: string; configured: string; authDisabled: string };
type MessageResponse = { message?: string };

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function checkAdminSession(): Promise<SessionResponse> {
  const response = await fetch("/api/admin/session", { credentials: "same-origin" });
  const body = await parseJson<SessionResponse & MessageResponse>(response);
  if (!response.ok) {
    throw new Error(body.message ?? "Could not verify admin session.");
  }
  return body;
}

export async function adminLogin(username: string, password: string): Promise<void> {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    credentials: "same-origin",
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
  const response = await fetch("/api/admin/password", {
    method: "POST",
    credentials: "same-origin",
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
  await fetch("/api/admin/logout", {
    method: "POST",
    credentials: "same-origin",
  });
}

export async function loadAdminPortfolio(): Promise<PortfolioContent> {
  const response = await fetch("/api/admin/portfolio", { credentials: "same-origin" });
  const body = await parseJson<PortfolioContent & MessageResponse>(response);
  if (!response.ok || !("hero" in body)) {
    throw new Error(body.message ?? "Could not load portfolio content.");
  }
  return body;
}

export async function saveAdminPortfolio(content: PortfolioContent): Promise<string> {
  const response = await fetch("/api/admin/portfolio", {
    method: "PUT",
    credentials: "same-origin",
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
  const response = await fetch("/api/admin/uploads", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const body = await parseJson<{ url?: string; message?: string }>(response);
  if (!response.ok || !body.url) {
    throw new Error(body.message ?? "The image could not be uploaded.");
  }
  return body.url;
}
