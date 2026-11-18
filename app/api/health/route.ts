import { NextResponse } from "next/server";
import { getDatabase } from "@/backend/src/lib/mongodb";
import { getStorage } from "@/backend/src/lib/storage";

export async function GET() {
  try {
    await (await getDatabase()).command({ ping: 1 });
  } catch {
    return NextResponse.json({
      status: "error",
      database: "unavailable",
      message: "The portfolio database is unavailable.",
    }, { status: 503 });
  }

  let storage = "legacy-local";
  try {
    const configured = getStorage();
    if (configured) storage = configured.mode;
  } catch {
    storage = "misconfigured";
  }
  return NextResponse.json({ status: "ok", database: "mongodb", storage });
}
