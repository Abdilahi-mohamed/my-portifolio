"use client";

import dynamic from "next/dynamic";

const AdminApp = dynamic(
  () => import("@/frontend/src/components/admin/AdminApp").then((module) => module.AdminApp),
  { ssr: false },
);

export default function AdminAnalyticsPage() {
  return <AdminApp />;
}
