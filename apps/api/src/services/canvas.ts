// apps/api/src/services/canvas.ts
import { prisma } from "@1bp/database";

export async function checkAreaAvailable(
  x: number,
  y: number,
  width: number,
  height: number
): Promise<boolean> {
  const result = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM pixel_areas
    WHERE status = 'ACTIVE'
      AND x < ${x + width}
      AND x + width > ${x}
      AND y < ${y + height}
      AND y + height > ${y}
  `;
  return result[0].count === 0n;
}
export type PixelArea = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  imageUrl: string | null;
  walletAddress: string | null;
  status: string;
};

export async function getCanvasAreas(params: {
  x: number;
  y: number;
  w: number;
  h: number;
}): Promise<PixelArea[]> {
  const { x, y, w, h } = params;

  const areas = await prisma.pixelArea.findMany({
    where: {
      NOT: [{ status: "RELEASED" }],
      AND: [
        { x: { gte: x } },
        { x: { lte: x + w } },
        { y: { gte: y } },
        { y: { lte: y + h } },
      ],
    },
    select: {
      id: true,
      x: true,
      y: true,
      width: true,
      height: true,
      imageUrl: true,
      walletAddress: true,
      status: true,
    },
  });

  return areas;
}

export async function getCanvasStats() {
  const [totalClaimed, totalWallets] = await Promise.all([
    prisma.pixelArea.aggregate({
      where: { status: "ACTIVE" },
      _sum: { pixelCount: true },
    }),
    prisma.wallet.count(),
  ]);

  const claimed = Number(totalClaimed._sum.pixelCount ?? 0);

  return {
    claimedPixels: claimed,
    totalPixels: 1_000_000_000,
    percentFilled: ((claimed / 1_000_000_000) * 100).toFixed(4),
    totalWallets,
  };
}

// --- Claim area ---
export interface ClaimAreaInput {
  walletAddress: string;
  x: number;
  y: number;
  width: number;
  height: number;
  imageUrl?: string;
  imageKey?: string;
  imageType?: string;
  link?: string; // ha később kell
}

export async function claimArea(input: ClaimAreaInput) {
  const pixelCount = BigInt(input.width * input.height);

  // 1. Ellenőrzés: átfedés más területekkel
  const overlapping = await prisma.pixelArea.findFirst({
    where: {
      status: "ACTIVE",
      x: { lte: input.x + input.width - 1 },
      y: { lte: input.y + input.height - 1 },
      AND: [
        { x: { gte: input.x - 0 } }, // finomítható
        { y: { gte: input.y - 0 } },
      ],
    },
  });

  // Pontosabb overlap check
  const overlappingAreas = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM pixel_areas
    WHERE status = 'ACTIVE'
      AND x < ${input.x + input.width}
      AND x + width > ${input.x}
      AND y < ${input.y + input.height}
      AND y + height > ${input.y}
  `;

  if (Number(overlappingAreas[0]?.count ?? 0) > 0) {
    throw new Error("OVERLAP: This area overlaps with an existing claim");
  }

  // 2. Wallet kvóta ellenőrzés
  const wallet = await prisma.wallet.findUnique({
    where: { address: input.walletAddress },
  });

  if (!wallet) {
    throw new Error("WALLET_NOT_FOUND: Wallet not registered");
  }

  // On-the-fly számítás: totalQuota - lockedPixels — így a manualOverride is működik
  const effectiveAvailable = wallet.totalQuota - wallet.lockedPixels;
  if (effectiveAvailable < pixelCount) {
    throw new Error(
      `INSUFFICIENT_QUOTA: Need ${pixelCount} pixels, have ${effectiveAvailable}`
    );
  }

  // 3. Tranzakció: area létrehozás + kvóta csökkentés
  const area = await prisma.$transaction(async (tx) => {
    const newArea = await tx.pixelArea.create({
      data: {
        walletAddress: input.walletAddress,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
        pixelCount,
        imageUrl: input.imageUrl ?? null,
        imageKey: input.imageKey ?? null,
        imageType: input.imageType ?? null,
        status: "ACTIVE",
      },
    });

    await tx.wallet.update({
      where: { address: input.walletAddress },
      data: {
        lockedPixels: { increment: pixelCount },
        availableQuota: { decrement: pixelCount },
      },
    });

    return newArea;
  });

  return area;
}