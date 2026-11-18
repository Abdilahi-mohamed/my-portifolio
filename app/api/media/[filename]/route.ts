import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, getStorage } from "@/backend/src/lib/storage";

export const dynamic = "force-dynamic";

function contentType(filename: string): string {
  if (/\.png$/i.test(filename)) return "image/png";
  if (/\.jpe?g$/i.test(filename)) return "image/jpeg";
  if (/\.webp$/i.test(filename)) return "image/webp";
  if (/\.gif$/i.test(filename)) return "image/gif";
  if (/\.mp4$/i.test(filename)) return "video/mp4";
  if (/\.webm$/i.test(filename)) return "video/webm";
  return "application/octet-stream";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  if (!/^[a-f0-9]{32}\.(?:png|jpg|jpeg|webp|gif|mp4|webm)$/i.test(filename)) {
    return NextResponse.json({ message: "Media not found." }, { status: 404 });
  }
  try {
    const storage = getStorage();
    let media: Buffer;
    let type = contentType(filename);
    let contentRange: string | undefined;
    if (storage) {
      const range = request.headers.get("range");
      const result = await storage.client.send(new GetObjectCommand({
        Bucket: storage.bucket,
        Key: filename,
        ...(range ? { Range: range } : {}),
      }));
      if (!result.Body) throw new Error("Object has no body.");
      media = Buffer.from(await result.Body.transformToByteArray());
      if (result.ContentType) type = result.ContentType;
      contentRange = result.ContentRange;
    } else {
      media = await readFile(join(process.cwd(), "backend", "data", "uploads", filename));
    }
    const headers = new Headers({
      "Content-Type": type,
      "Content-Length": String(media.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    });
    if (contentRange) headers.set("Content-Range", contentRange);
    return new NextResponse(new Uint8Array(media), {
      status: contentRange ? 206 : 200,
      headers,
    });
  } catch (error) {
    console.error("Unable to load media:", filename, error);
    return NextResponse.json({ message: "Media not found." }, { status: 404 });
  }
}
