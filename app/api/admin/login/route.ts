import { NextRequest, NextResponse } from "next/server";
import { createAdminSession, validateAdminLogin } from "@/backend/src/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body?.username !== "string" || typeof body?.password !== "string") {
      return NextResponse.json({ message: "Enter your username and password." }, { status: 400 });
    }
    if (!await validateAdminLogin(body.username, body.password)) {
      return NextResponse.json({ message: "The username or password is incorrect." }, { status: 401 });
    }
    const response = NextResponse.json({ message: "Signed in successfully." });
    await createAdminSession(response);
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: "The request body must contain valid JSON." }, { status: 400 });
    }
    console.error("Unable to sign in:", error);
    return NextResponse.json({ message: "Sign-in could not be completed." }, { status: 500 });
  }
}
