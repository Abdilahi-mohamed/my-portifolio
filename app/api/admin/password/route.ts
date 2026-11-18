import { NextRequest, NextResponse } from "next/server";
import { createAdminSession, changeAdminPassword, hasAdminSession } from "@/backend/src/lib/auth";

export async function POST(request: NextRequest) {
  if (!await hasAdminSession(request)) {
    return NextResponse.json({ message: "Sign in to change the admin password." }, { status: 401 });
  }
  try {
    const body = await request.json();
    if (typeof body?.currentPassword !== "string" || typeof body?.newPassword !== "string") {
      return NextResponse.json({ message: "Enter your current and new passwords." }, { status: 400 });
    }
    if (body.newPassword.length < 7 || body.newPassword.length > 128) {
      return NextResponse.json({ message: "The new password must be between 7 and 128 characters." }, { status: 400 });
    }
    await changeAdminPassword(body.currentPassword, body.newPassword);
    const response = NextResponse.json({ message: "Admin password changed successfully." });
    await createAdminSession(response);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "The current password is incorrect.") {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    console.error("Unable to change password:", error);
    return NextResponse.json({ message: "The admin password could not be changed." }, { status: 500 });
  }
}
