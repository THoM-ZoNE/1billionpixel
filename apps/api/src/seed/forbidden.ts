import { PrismaClient } from "@prisma/client";
import { CANVAS_W, CANVAS_H, isInsideCapsule, isTileFullyOutside, isTilePartiallyOutside } from "@1bp/shared";

const prisma = new PrismaClient();
const STEP = 100; // 100 pixelenként mintavételez
const COARSE = 100;  // belső, biztonságos blokkok
const FINE   = 50;   // kapszula széli blokkok

async function seedForbidden() {
  console.log("Seeding forbidden zones...");
  
  await prisma.wallet.upsert({
    where: { address: "SYSTEM" },
    update: {},
    create: {
      address: "SYSTEM",
    },
  });

  
  const forbidden: { x: number; y: number; width: number; height: number }[] = [];

  for (let tx = 0; tx < CANVAS_W; tx += COARSE) {
    for (let ty = 0; ty < CANVAS_H; ty += COARSE) {
      const tw = Math.min(COARSE, CANVAS_W - tx);
      const th = Math.min(COARSE, CANVAS_H - ty);

      if (isTileFullyOutside(tx, ty, tw, th, FINE)) {
        // Teljesen kint → egy nagy FORBIDDEN blokk
        forbidden.push({ x: tx, y: ty, width: tw, height: th });
      } else if (isTilePartiallyOutside(tx, ty, tw, th, FINE)) {
        // Részben kint → finomabb bontás 50x50-es altile-okra
        for (let fx = tx; fx < tx + tw; fx += FINE) {
          for (let fy = ty; fy < ty + th; fy += FINE) {
            const fw = Math.min(FINE, tx + tw - fx);
            const fh = Math.min(FINE, ty + th - fy);
            if (isTileFullyOutside(fx, fy, fw, fh, 10)) {
              forbidden.push({ x: fx, y: fy, width: fw, height: fh });
            }
          }
        }
      }
      // Ha egyetlen sarokpontja sincs a kapszulán belül → teljesen FORBIDDEN
      const corners = [
        [tx, ty], [tx + tw, ty], [tx, ty + th], [tx + tw, ty + th]
      ];

      const allOutside = corners.every(([x, y]) => !isInsideCapsule(x, y));
      if (allOutside) {
        forbidden.push({ x: tx, y: ty, width: tw, height: th });
      }
    }
  }

  // Batch insert
  for (const zone of forbidden) {
    await prisma.pixelArea.create({
      data: {
        x: zone.x,
        y: zone.y,
        width: zone.width,
        height: zone.height,
        status: "FORBIDDEN",
        walletAddress: "SYSTEM",
        pixelCount: BigInt(zone.width * zone.height),
      },
    });
  }

  console.log(`Seeded ${forbidden.length} forbidden tiles.`);
  await prisma.$disconnect();
}

seedForbidden();
