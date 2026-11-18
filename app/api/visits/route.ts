import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/backend/src/lib/mongodb";

export async function POST(request: NextRequest) {
  const visitorId = (await request.json())?.visitorId;
  if (typeof visitorId !== "string" ||
    !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(visitorId)) {
    return NextResponse.json({ message: "A valid anonymous visitor session is required." }, { status: 400 });
  }
  try {
    const visitorHash = createHash("sha256").update(visitorId).digest("hex");
    await (await getCollection("portfolioVisitors")).updateOne(
      { visitorHash },
      { $setOnInsert: { visitorHash, firstSeenAt: new Date() } },
      { upsert: true },
    );
    return NextResponse.json({ message: "Visitor session recorded." });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return NextResponse.json({ message: "Visitor session recorded." });
    }
    console.error("Unable to record visitor:", error);
    return NextResponse.json({ message: "Visitor analytics could not be updated." }, { status: 500 });
  }
}
