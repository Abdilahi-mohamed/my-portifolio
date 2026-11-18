import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/backend/src/lib/auth";
import { getCollection } from "@/backend/src/lib/mongodb";
import { isPortfolioContent } from "@/backend/src/lib/portfolioValidation";
import { DeleteObjectCommand, getStorage } from "@/backend/src/lib/storage";

export async function GET(request: NextRequest) {
  if (!await hasAdminSession(request)) {
    return NextResponse.json({ message: "Sign in to manage portfolio content." }, { status: 401 });
  }
  try {
    const record = await (await getCollection("portfolio")).findOne({ _id: "primary" });
    if (!record || !isPortfolioContent(record.content) || typeof record._revision !== "string") {
      return NextResponse.json({ message: "Portfolio content could not be loaded." }, { status: 500 });
    }
    return NextResponse.json(record.content, {
      headers: { "Cache-Control": "no-store", ETag: `"${record._revision}"` },
    });
  } catch (error) {
    console.error("Unable to load admin portfolio:", error);
    return NextResponse.json({ message: "Portfolio content could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!await hasAdminSession(request)) {
    return NextResponse.json({ message: "Sign in to manage portfolio content." }, { status: 401 });
  }
  const match = /^"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"$/i.exec(
    request.headers.get("if-match") ?? "",
  );
  if (!match) {
    return NextResponse.json({
      message: "Reload the portfolio before saving so newer changes are not overwritten.",
    }, { status: 428 });
  }

  try {
    const content = await request.json();
    if (!isPortfolioContent(content)) {
      return NextResponse.json({ message: "Portfolio content is incomplete or invalid." }, { status: 400 });
    }
    const collection = await getCollection("portfolio");
    const previous = await collection.findOne({ _id: "primary" });
    if (!previous || !isPortfolioContent(previous.content) || typeof previous._revision !== "string") {
      return NextResponse.json({ message: "The saved portfolio is missing or invalid." }, { status: 500 });
    }
    const revision = randomUUID();
    const result = await collection.updateOne(
      { _id: "primary", _revision: match[1] },
      { $set: { content, _revision: revision, updatedAt: new Date() } },
    );
    if (result.matchedCount !== 1) {
      return NextResponse.json({
        message: "The portfolio changed after it was loaded. Reload the latest content before saving.",
      }, { status: 409 });
    }

    const previousText = JSON.stringify(previous.content);
    const nextText = JSON.stringify(content);
    const previousKeys = new Set(
      [...previousText.matchAll(/\/api\/media\/([a-f0-9]{32}\.(?:png|jpg|jpeg|webp|gif|mp4|webm))/gi)]
        .map((matchItem) => matchItem[1]),
    );
    const nextKeys = new Set(
      [...nextText.matchAll(/\/api\/media\/([a-f0-9]{32}\.(?:png|jpg|jpeg|webp|gif|mp4|webm))/gi)]
        .map((matchItem) => matchItem[1]),
    );
    const storage = getStorage();
    if (storage) {
      for (const key of previousKeys) {
        if (nextKeys.has(key)) continue;
        await storage.client.send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: key })).catch((error) => {
          console.error("Unable to delete obsolete media:", key, error);
        });
      }
    }

    return NextResponse.json({ message: "Portfolio changes saved." }, {
      headers: { "Cache-Control": "no-store", ETag: `"${revision}"` },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: "The request body must contain valid JSON." }, { status: 400 });
    }
    console.error("Unable to save admin portfolio:", error);
    return NextResponse.json({ message: "Portfolio changes could not be saved." }, { status: 500 });
  }
}
