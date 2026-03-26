/**
 * Storage abstraction layer.
 * Uses local filesystem in development, AWS S3 in production.
 */
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const STORAGE_TYPE = process.env.STORAGE_TYPE ?? "local";
const LOCAL_PATH = process.env.LOCAL_STORAGE_PATH ?? "./storage";

export interface StorageFile {
  key: string;
  url: string;
  size: number;
  mimeType: string;
}

// Resolve storage base path — handles both absolute (/app/storage) and relative (./storage) paths
function resolveStoragePath(subPath: string): string {
  const base = path.isAbsolute(LOCAL_PATH) ? LOCAL_PATH : path.join(process.cwd(), LOCAL_PATH);
  return path.join(base, subPath);
}

// Ensure local storage directory exists
async function ensureLocalDir(subPath: string): Promise<void> {
  const dir = path.dirname(resolveStoragePath(subPath));
  await fs.mkdir(dir, { recursive: true });
}

export async function uploadFile(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<StorageFile> {
  if (STORAGE_TYPE === "s3") {
    return uploadToS3(buffer, key, mimeType);
  }
  return uploadToLocal(buffer, key, mimeType);
}

async function uploadToLocal(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<StorageFile> {
  // Sanitize key — prevent path traversal
  const safeKey = key.replace(/\.\./g, "").replace(/^\/+/, "");
  await ensureLocalDir(safeKey);
  const filePath = resolveStoragePath(safeKey);
  await fs.writeFile(filePath, buffer);
  return {
    key: safeKey,
    url: `/api/storage/${safeKey}`,
    size: buffer.length,
    mimeType,
  };
}

async function uploadToS3(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<StorageFile> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({ region: process.env.AWS_REGION });
  const bucket = process.env.AWS_S3_BUCKET!;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ServerSideEncryption: "AES256",
    })
  );

  return {
    key,
    url: `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
    size: buffer.length,
    mimeType,
  };
}

export async function getFile(key: string): Promise<Buffer | null> {
  if (STORAGE_TYPE === "s3") {
    return getFromS3(key);
  }
  return getFromLocal(key);
}

async function getFromLocal(key: string): Promise<Buffer | null> {
  const safeKey = key.replace(/\.\./g, "").replace(/^\/+/, "");
  const filePath = resolveStoragePath(safeKey);
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

async function getFromS3(key: string): Promise<Buffer | null> {
  const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({ region: process.env.AWS_REGION });

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
      })
    );
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

export async function deleteFile(key: string): Promise<void> {
  if (STORAGE_TYPE === "s3") {
    const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({ region: process.env.AWS_REGION });
    await client.send(
      new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET!, Key: key })
    );
    return;
  }

  const safeKey = key.replace(/\.\./g, "").replace(/^\/+/, "");
  const filePath = resolveStoragePath(safeKey);
  try {
    await fs.unlink(filePath);
  } catch {
    // File may not exist
  }
}

export function generateStorageKey(
  lawyerId: string,
  caseId: string,
  fileName: string
): string {
  const ext = path.extname(fileName);
  const safeName = path
    .basename(fileName, ext)
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .substring(0, 50);
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString("hex");
  return `lawyers/${lawyerId}/cases/${caseId}/${timestamp}_${random}_${safeName}${ext}`;
}

export function computeChecksum(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
