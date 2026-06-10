// apps/api/src/services/storage.ts
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

export async function saveImageLocally(
  buffer: Buffer,
  ext: "webp" | "gif" | "jpg" | "png"
): Promise<{ url: string; key: string }> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const key      = `${randomUUID()}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, key);
  await fs.writeFile(filePath, buffer);
  const baseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";
  const url     = `${baseUrl}/uploads/${key}`;
  return { url, key };
}

// ── ÚJ függvény ───────────────────────────────────────────────────────────
export async function deleteImageLocally(imageKey: string | null): Promise<void> {
  if (!imageKey) return;
  // R2-kompatibilis: ha majd R2-t használsz, ide kerül a S3 deleteObject hívás
  try {
    const filePath = path.join(UPLOAD_DIR, path.basename(imageKey));
    await fs.unlink(filePath);
  } catch {
    // Ha már nem létezik a fájl, nem dob hibát
  }
}