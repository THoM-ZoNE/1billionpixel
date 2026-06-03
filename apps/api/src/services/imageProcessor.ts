import sharp from "sharp";

// Max fájlméret outputban (bytes)
const MAX_OUTPUT_BYTES = 500_000; // 500 KB

export interface ProcessedImage {
  buffer: Buffer;
  mimeType: "image/webp" | "image/gif";
  ext: "webp" | "gif";
}

export async function resizeForArea(
  buffer: Buffer,
  mimeType: string,
  width: number,
  height: number
): Promise<ProcessedImage> {
  // GIF → nem konvertáljuk, Sharp animált GIF-et nem kezel jól
  if (mimeType === "image/gif") {
    return { buffer, mimeType: "image/gif", ext: "gif" };
  }

  // 1. lépés: resize + WebP konverzió, quality: 85
  let quality = 85;
  let result = await sharp(buffer)
    .resize(width, height, { fit: "fill", withoutEnlargement: false })
    .webp({ quality })
    .toBuffer();

  // 2. lépés: ha még mindig túl nagy → iteratív minőség csökkentés
  // (10-es lépésekben, minimum quality: 40)
  while (result.length > MAX_OUTPUT_BYTES && quality > 40) {
    quality -= 10;
    result = await sharp(buffer)
      .resize(width, height, { fit: "fill", withoutEnlargement: false })
      .webp({ quality })
      .toBuffer();
  }

  // 3. lépés: ha még mindig túl nagy quality:40-nél →
  // felbontást felére csökkentjük, de megtartjuk az arányokat a canvas-on
  if (result.length > MAX_OUTPUT_BYTES) {
    const meta = await sharp(buffer).metadata();
    const scaleFactor = Math.sqrt(MAX_OUTPUT_BYTES / result.length);
    const scaledW = Math.max(1, Math.round((meta.width ?? width) * scaleFactor));
    const scaledH = Math.max(1, Math.round((meta.height ?? height) * scaleFactor));

    result = await sharp(buffer)
      .resize(scaledW, scaledH, { fit: "fill" })
      .webp({ quality: 60 })
      .toBuffer();
  }

  return { buffer: result, mimeType: "image/webp", ext: "webp" };
}