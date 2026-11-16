import type { PortfolioContent } from "./types";

const deployedApiUrl = "https://my-portifolio-3fo7.onrender.com";
const portfolioCacheKey = "portfolio-content-cache";
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const apiBaseUrl = (
  configuredApiUrl || (import.meta.env.PROD ? deployedApiUrl : "")
).replace(/\/+$/, "");
const portfolioUpdateChannel = typeof BroadcastChannel === "undefined"
  ? null
  : new BroadcastChannel("portfolio-content");

export function apiUrl(path: string): string {
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function subscribeToPortfolioUpdates(listener: () => void): () => void {
  if (!portfolioUpdateChannel) return () => {};
  const handleUpdate = () => listener();
  portfolioUpdateChannel.addEventListener("message", handleUpdate);
  return () => {
    portfolioUpdateChannel.removeEventListener("message", handleUpdate);
  };
}

export function notifyPortfolioUpdated(): void {
  portfolioUpdateChannel?.postMessage(null);
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

export function getCachedPortfolio(): PortfolioContent | null {
  try {
    const cachedContent = window.localStorage.getItem(portfolioCacheKey);
    if (!cachedContent) return null;
    return resolvePortfolioMedia(JSON.parse(cachedContent) as PortfolioContent);
  } catch (error) {
    console.warn("The saved portfolio cache could not be read:", error);
    return null;
  }
}

export function cachePortfolio(content: PortfolioContent): void {
  try {
    window.localStorage.setItem(portfolioCacheKey, JSON.stringify(content));
  } catch (error) {
    console.warn("The latest portfolio could not be cached:", error);
  }
}
