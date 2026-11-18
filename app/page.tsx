"use client";

import dynamic from "next/dynamic";

const PortfolioApp = dynamic(() => import("@/frontend/src/components/App"), { ssr: false });

export default function PortfolioPage() {
  return <PortfolioApp />;
}
