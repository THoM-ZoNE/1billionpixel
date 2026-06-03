import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Currently local storage; prepared for later DO Spaces / R2 replacement
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

export async function saveImageLocally(
  buffer: Buffer,
  mimeType: string
): Promise<{ url: string; key: string; type: string }> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const ext = mimeType === "image/png" ? "png" : mimeType === "image/gif" ? "gif" : "jpg";
  const key = `${randomUUID()}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, key);

  await fs.writeFile(filePath, buffer);

  const baseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";
  const url = `${baseUrl}/uploads/${key}`;

  return { url, key, type: ext };
}

// DigitalOcean Spaces stub — replace later if needed
// export async function saveImageToSpaces(...) { ... }
