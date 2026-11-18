import { NextResponse } from "next/server";
import { getCollection } from "@/backend/src/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const record = await (await getCollection("portfolio")).findOne({ _id: "primary" });
    if (!record || !record.content) {
      return NextResponse.json({ message: "Portfolio content could not be found." }, { status: 404 });
    }
    return NextResponse.json(record.content, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load portfolio content:", error);
    return NextResponse.json({ message: "Portfolio content could not be loaded." }, { status: 500 });
  }
}
