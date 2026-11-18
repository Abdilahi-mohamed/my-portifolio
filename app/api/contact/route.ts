import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/backend/src/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 || message.length < 10 || message.length > 5000) {
      return NextResponse.json({
        message: "Enter a valid name, email, and message (10-5000 characters).",
      }, { status: 400 });
    }
    await (await getCollection("contactMessages")).insertOne({
      name,
      email,
      message,
      receivedAt: new Date(),
    });
    return NextResponse.json({ message: "Your message was received successfully." }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: "The request body must contain valid JSON." }, { status: 400 });
    }
    console.error("Unable to save contact message:", error);
    return NextResponse.json({ message: "The message could not be saved." }, { status: 500 });
  }
}
