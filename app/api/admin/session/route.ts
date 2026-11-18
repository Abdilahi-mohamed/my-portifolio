import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession, loadAdminAccount } from "@/backend/src/lib/auth";

export async function GET(request: NextRequest) {
  const account = await loadAdminAccount();
  return NextResponse.json({
    authenticated: String(await hasAdminSession(request)),
    configured: String(Boolean(account)),
    authDisabled: "false",
  });
}
