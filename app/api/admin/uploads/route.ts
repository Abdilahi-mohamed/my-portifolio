import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/backend/src/lib/auth";
import { getStorage, PutObjectCommand } from "@/backend/src/lib/storage";

const imageTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: NextRequest) {
  if (!await hasAdminSession(request)) {
    return NextResponse.json({ message: "Sign in to upload project images." }, { status: 401 });
  }
  const contentType = request.headers.get("content-type")?.split(";")[0].trim();
  let extension = contentType ? imageTypes[contentType] : undefined;
  if (contentType === "video/mp4") extension = "mp4";
  if (contentType === "video/webm") extension = "webm";
  if (!extension) {
    return NextResponse.json({
      message: "Choose a PNG, JPEG, WebP, or GIF image, or an MP4 or WebM video.",
    }, { status: 415 });
  }
  const maxBytes = extension === "mp4" || extension === "webm" ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
  const arrayBuffer = await request.arrayBuffer();
  const media = Buffer.from(arrayBuffer);
  if (media.length === 0 || media.length > maxBytes) {
    return NextResponse.json({ message: "The selected file is empty or exceeds its upload size limit." }, { status: 413 });
  }

  const storage = getStorage();
  if (!storage) {
    return NextResponse.json({ message: "Configure Cloudflare R2 or the existing object storage before uploading." }, { status: 503 });
  }
  try {
    const filename = `${randomBytes(16).toString("hex")}.${extension}`;
    await storage.client.send(new PutObjectCommand({
      Bucket: storage.bucket,
      Key: filename,
      Body: media,
      ContentLength: media.length,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }));
    return NextResponse.json({ url: `/api/media/${filename}` }, { status: 201 });
  } catch (error) {
    console.error("Unable to upload media:", error);
    return NextResponse.json({ message: "The media could not be saved." }, { status: 500 });
  }
}
