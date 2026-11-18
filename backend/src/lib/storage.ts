import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { loadServerEnv } from "./env";

export type StorageConfig = {
  client: S3Client;
  bucket: string;
  mode: "cloudflare-r2" | "backblaze-b2";
};

export function getStorage(): StorageConfig | null {
  loadServerEnv();

  const r2Endpoint = process.env.R2_ENDPOINT?.trim();
  const r2Bucket = process.env.R2_BUCKET_NAME?.trim();
  const r2AccessKey = process.env.R2_ACCESS_KEY_ID?.trim();
  const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const r2Region = process.env.R2_REGION?.trim() || "auto";

  if (r2Endpoint || r2Bucket || r2AccessKey || r2SecretKey) {
    if (!r2Endpoint || !r2Bucket || !r2AccessKey || !r2SecretKey) {
      throw new Error("Configure R2_ENDPOINT, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY together.");
    }
    return {
      mode: "cloudflare-r2",
      bucket: r2Bucket,
      client: new S3Client({
        endpoint: r2Endpoint,
        region: r2Region,
        credentials: { accessKeyId: r2AccessKey, secretAccessKey: r2SecretKey },
        forcePathStyle: true,
      }),
    };
  }

  const b2Endpoint = process.env.B2_ENDPOINT?.trim();
  const b2Bucket = process.env.B2_BUCKET_NAME?.trim();
  const b2AccessKey = process.env.B2_ACCESS_KEY_ID?.trim();
  const b2SecretKey = process.env.B2_APPLICATION_KEY?.trim();
  const b2Region =
    process.env.B2_REGION?.trim() ||
    (/s3\.([a-z0-9-]+)\.backblazeb2\.com/i.exec(b2Endpoint ?? "")?.[1] ?? "");

  if (b2Endpoint || b2Bucket || b2AccessKey || b2SecretKey) {
    if (!b2Endpoint || !b2Bucket || !b2AccessKey || !b2SecretKey || !b2Region) {
      throw new Error("Configure B2_ENDPOINT, B2_BUCKET_NAME, B2_ACCESS_KEY_ID, B2_APPLICATION_KEY, and B2_REGION together.");
    }
    const endpoint = /^[a-z][a-z\d+.-]*:\/\//i.test(b2Endpoint)
      ? b2Endpoint
      : `https://${b2Endpoint}`;
    if (!endpoint.startsWith("https://")) throw new Error("Object storage endpoints must use HTTPS.");
    return {
      mode: "backblaze-b2",
      bucket: b2Bucket,
      client: new S3Client({
        endpoint,
        region: b2Region,
        credentials: { accessKeyId: b2AccessKey, secretAccessKey: b2SecretKey },
        forcePathStyle: true,
      }),
    };
  }

  return null;
}

export { DeleteObjectCommand, GetObjectCommand, PutObjectCommand };
