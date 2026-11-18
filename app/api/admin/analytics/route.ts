import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/backend/src/lib/auth";
import { getCollection } from "@/backend/src/lib/mongodb";

export async function GET(request: NextRequest) {
  if (!await hasAdminSession(request)) {
    return NextResponse.json({ message: "Sign in to view visitor analytics." }, { status: 401 });
  }
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  try {
    const visitors = await getCollection("portfolioVisitors");
    return NextResponse.json({
      totalSessions: await visitors.countDocuments(),
      sessionsToday: await visitors.countDocuments({ firstSeenAt: { $gte: today } }),
      sessionsLast7Days: await visitors.countDocuments({ firstSeenAt: { $gte: last7Days } }),
    });
  } catch (error) {
    console.error("Unable to load analytics:", error);
    return NextResponse.json({ message: "Visitor analytics could not be loaded." }, { status: 500 });
  }
}
