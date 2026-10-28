import type { PortfolioContent } from "./types";

const deployedApiUrl = "https://my-portifolio-3fo7.onrender.com";
const apiBaseUrl = import.meta.env.PROD ? deployedApiUrl : "";

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
