import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/backend/src/lib/auth";
import { getCollection } from "@/backend/src/lib/mongodb";
import { createHash } from "node:crypto";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await (await getCollection("adminSessions")).deleteOne({ tokenHash });
  }
  const response = NextResponse.json({ message: "Signed out." });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
