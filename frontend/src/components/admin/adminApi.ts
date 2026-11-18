import type { PortfolioContent } from "../types";
import { apiUrl, cachePortfolio, notifyPortfolioUpdated, resolvePortfolioMedia } from "../api";

type SessionResponse = { authenticated: string; configured: string; authDisabled: string };
type MessageResponse = { message?: string };
type StorageHealthResponse = MessageResponse & {
  database?: string;
  storage?: string;
};
export type AdminPortfolioSnapshot = {
  content: PortfolioContent;
  revision: string;
};
export type AdminVisitorAnalytics = {
  totalSessions: number;
  sessionsToday: number;
  sessionsLast7Days: number;
};

const adminRequestTimeoutMs = 60_000;
const adminRequestTimeoutMessage =
  "The portfolio API did not respond within 60 seconds. Check the backend service and network. If this happened while saving, reload the dashboard before retrying to verify whether the changes were saved.";

async function fetchAdminWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), adminRequestTimeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(adminRequestTimeoutMessage);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function portfolioRevision(response: Response): string {
  const match = /^"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"$/i.exec(
    response.headers.get("ETag") ?? "",
  );
  if (!match) {
    throw new Error("The API did not return a portfolio revision. Reload the latest backend before editing.");
  }
  return match[1];
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function requirePersistentStorage(): Promise<void> {
  const response = await fetchAdminWithTimeout(apiUrl("/api/health"), { cache: "no-store" });
  const body = await parseJson<StorageHealthResponse>(response);
  if (!response.ok) {
    throw new Error(body.message ?? "The portfolio storage service is unavailable.");
  }
  if (body.database !== "mongodb") {
    throw new Error(
      "The connected API does not confirm MongoDB persistence. Admin editing is blocked to protect your data. Redeploy the latest backend commit to Render, then reopen the dashboard.",
    );
  }
  if (process.env.NODE_ENV === "production" &&
    body.storage !== "backblaze-b2" &&
    body.storage !== "cloudflare-r2") {
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

export async function loadAdminPortfolio(): Promise<AdminPortfolioSnapshot> {
  await requirePersistentStorage();
  const response = await fetch(apiUrl("/api/admin/portfolio"), { credentials: "include" });
  const body = await parseJson<PortfolioContent & MessageResponse>(response);
  if (!response.ok || !("hero" in body)) {
    throw new Error(body.message ?? "Could not load portfolio content.");
  }
  cachePortfolio(body);
  return { content: resolvePortfolioMedia(body), revision: portfolioRevision(response) };
}

export async function loadAdminVisitorAnalytics(): Promise<AdminVisitorAnalytics> {
  const response = await fetch(apiUrl("/api/admin/analytics"), {
    credentials: "include",
    cache: "no-store",
  });
  const body = await parseJson<AdminVisitorAnalytics & MessageResponse>(response);
  if (
    !response.ok ||
    !Number.isInteger(body.totalSessions) ||
    !Number.isInteger(body.sessionsToday) ||
    !Number.isInteger(body.sessionsLast7Days)
  ) {
    throw new Error(body.message ?? "Could not load visitor analytics.");
  }
  return body;
}

export async function saveAdminPortfolio(
  content: PortfolioContent,
  revision: string,
): Promise<{ message: string; revision: string }> {
  await requirePersistentStorage();
  const response = await fetchAdminWithTimeout(apiUrl("/api/admin/portfolio"), {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json", "If-Match": `"${revision}"` },
    body: JSON.stringify(content),
  });
  const body = await parseJson<MessageResponse>(response);
  if (!response.ok) {
    throw new Error(body.message ?? "Could not save portfolio changes.");
  }
  const nextRevision = portfolioRevision(response);
  cachePortfolio(content);
  notifyPortfolioUpdated();
  return { message: body.message ?? "Portfolio changes saved.", revision: nextRevision };
}

async function uploadMedia(file: File): Promise<string> {
  await requirePersistentStorage();
  const response = await fetch(apiUrl("/api/admin/uploads"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const body = await parseJson<{ url?: string; message?: string }>(response);
  if (!response.ok || !body.url) {
    throw new Error(body.message ?? "The media could not be uploaded.");
  }
  return apiUrl(body.url);
}

export async function uploadImage(file: File): Promise<string> {
  return uploadMedia(file);
}

export async function uploadProjectMedia(file: File): Promise<string> {
  return uploadMedia(file);
}
