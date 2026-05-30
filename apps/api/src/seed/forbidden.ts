import { PrismaClient } from "@prisma/client";
import {
  CANVAS_W,
  CANVAS_H,
  isInsideCapsule,
  isTileFullyOutside,
  isTilePartiallyOutside,
} from "@1bp/shared";

const prisma = new PrismaClient();

const COARSE = 100;
const FINE   = 50;
const ULTRA  = 10;

async function seedForbidden() {
  console.log("Seeding forbidden zones...");
  console.log(`Canvas: ${CANVAS_W} × ${CANVAS_H}`);

  await prisma.wallet.upsert({
    where: { address: "SYSTEM" },
    update: {},
    create: { address: "SYSTEM" },
  });

  // Delete old forbidden zones — avoid duplicates on rerun
  const deleted = await prisma.pixelArea.deleteMany({
    where: { status: "FORBIDDEN" },
  });
  console.log(`Cleared ${deleted.count} existing forbidden tiles.`);

  const forbidden: {
    x: number;
    y: number;
    width: number;
    height: number;
  }[] = [];

  for (let tx = 0; tx < CANVAS_W; tx += COARSE) {
    for (let ty = 0; ty < CANVAS_H; ty += COARSE) {
      const tw = Math.min(COARSE, CANVAS_W - tx);
      const th = Math.min(COARSE, CANVAS_H - ty);

      if (isTileFullyOutside(tx, ty, tw, th)) {
        // Fully outside → one large block
        forbidden.push({ x: tx, y: ty, width: tw, height: th });
      } else if (isTilePartiallyOutside(tx, ty, tw, th)) {
        // Partially outside → FINE subdivision
        for (let fx = tx; fx < tx + tw; fx += FINE) {
          for (let fy = ty; fy < ty + th; fy += FINE) {
            const fw = Math.min(FINE, tx + tw - fx);
            const fh = Math.min(FINE, ty + th - fy);

            if (isTileFullyOutside(fx, fy, fw, fh)) {
              forbidden.push({ x: fx, y: fy, width: fw, height: fh });
            } else if (isTilePartiallyOutside(fx, fy, fw, fh)) {
              // ULTRA subdivision at the capsule edge
              for (let ux = fx; ux < fx + fw; ux += ULTRA) {
                for (let uy = fy; uy < fy + fh; uy += ULTRA) {
                  const uw = Math.min(ULTRA, fx + fw - ux);
                  const uh = Math.min(ULTRA, fy + fh - uy);
                  if (isTileFullyOutside(ux, uy, uw, uh)) {
                    forbidden.push({ x: ux, y: uy, width: uw, height: uh });
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  console.log(`Generated ${forbidden.length} forbidden tiles, inserting...`);

  // Batch insert in groups of 500 (createMany may have limits with BigInt)
  const BATCH = 500;
  for (let i = 0; i < forbidden.length; i += BATCH) {
    const chunk = forbidden.slice(i, i + BATCH);
    await prisma.pixelArea.createMany({
      data: chunk.map((zone) => ({
        x: zone.x,
        y: zone.y,
        width: zone.width,
        height: zone.height,
        status: "FORBIDDEN",
        walletAddress: "SYSTEM",
        pixelCount: BigInt(zone.width * zone.height),
      })),
      skipDuplicates: true,
    });
    console.log(`  Inserted ${Math.min(i + BATCH, forbidden.length)} / ${forbidden.length}`);
  }

  console.log("Done!");
  await prisma.$disconnect();
}

seedForbidden().catch(console.error);