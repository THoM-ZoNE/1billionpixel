import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@1bp/database";
import { broadcastCanvasUpdate } from "../lib/websocket.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

/**
 * Arányosan csökkenti az area méretét bal felső saroktól.
 * newPixelCount = az új maximális pixelszám a wallet-nek ennél az area-nál.
 * 
 * Például: 200x100 area → 10000px, de csak 6000px engedélyezett
 * scale = sqrt(6000/10000) = 0.7746
 * newWidth = floor(200 * 0.7746) = 154
 * newHeight = floor(100 * 0.7746) = 77
 * x, y változatlan → bal felső sarokból "nyílik ki"
 */
export async function scaleAreaProportionally(
  areaId: string,
  newPixelCount: bigint
): Promise<void> {
  const area = await prisma.pixelArea.findUnique({ where: { id: areaId } });
  if (!area || !area.imageUrl || !area.imageKey) return;

  const currentPixels = BigInt(area.width) * BigInt(area.height);
  if (newPixelCount >= currentPixels) return; // nincs szükség csökkentésre

  // Arányos méretszámítás
  const scale = Math.sqrt(Number(newPixelCount) / Number(currentPixels));
  const newWidth  = Math.max(1, Math.floor(area.width  * scale));
  const newHeight = Math.max(1, Math.floor(area.height * scale));
  const actualNewPixels = BigInt(newWidth) * BigInt(newHeight);

  // Kép újraméreteozése ha van fájl
  const filePath = path.join(UPLOAD_DIR, area.imageKey);
  try {
    const originalBuffer = await fs.readFile(filePath);
    const resizedBuffer = await sharp(originalBuffer)
      .resize(newWidth, newHeight, { fit: "fill" })
      .webp({ quality: 82 })
      .toBuffer();

    // Felülírjuk a meglévő fájlt (imageKey marad ugyanaz)
    await fs.writeFile(filePath, resizedBuffer);
  } catch (err) {
    // Ha a fájl nem olvasható, csak a DB-t frissítjük
    console.warn(`[imageScaler] Could not read file for area ${areaId}:`, err);
  }

  // DB frissítés
  await prisma.pixelArea.update({
    where: { id: areaId },
    data: {
      width:      newWidth,
      height:     newHeight,
      pixelCount: actualNewPixels,
    },
  });

  // lockedPixels frissítése a wallet-en
  const pixelDiff = currentPixels - actualNewPixels;
  await prisma.wallet.update({
    where: { address: area.walletAddress },
    data: {
      lockedPixels:   { decrement: pixelDiff },
      availableQuota: { increment: pixelDiff },
    },
  });

  // Canvas broadcast — a régi területet eltakarítja, az újat megjeleníti
  broadcastCanvasUpdate({
    type: "AREA_RESIZED",
    areaId: area.id,
    imageUrl: area.imageUrl,
    x:      area.x,
    y:      area.y,
    width:  newWidth,
    height: newHeight,
    // A clearRect koordinátái: a régi jobb/alsó széltől az új jobb/alsó szélig
    clearFrom: {
      x: area.x,
      y: area.y,
      oldWidth:  area.width,
      oldHeight: area.height,
    },
  });
}