import type { PortfolioContent } from "./types";

const deployedApiUrl = "https://my-portifolio-olgy.onrender.com";
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const apiBaseUrl = (configuredApiUrl || (import.meta.env.PROD ? deployedApiUrl : ""))
  .replace(/\/+$/, "");

export function apiUrl(path: string): string {
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function resolveMediaUrls(value: unknown): unknown {
  if (typeof value === "string" && value.startsWith("/api/media/")) {
    return apiUrl(value);
  }
  if (Array.isArray(value)) return value.map(resolveMediaUrls);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveMediaUrls(item)]),
    );
  }
  return value;
}

export function resolvePortfolioMedia(content: PortfolioContent): PortfolioContent {
  return resolveMediaUrls(content) as PortfolioContent;
}
