import { prisma } from "@1bp/database";

export const getAdjacentFreeSpaces = async (walletAddress: string) => {
  const areas = await prisma.pixelArea.findMany({
    where: { walletAddress, status: { not: "RELEASED" } },
  });

  const freeSpaces = [];

  for (const area of areas) {
    const candidates = [
      { dir: "top",    x: area.x,              y: area.y - 1,           w: area.width,  h: 1 },
      { dir: "bottom", x: area.x,              y: area.y + area.height, w: area.width,  h: 1 },
      { dir: "left",   x: area.x - 1,          y: area.y,               w: 1, h: area.height },
      { dir: "right",  x: area.x + area.width, y: area.y,               w: 1, h: area.height },
    ];

    for (const c of candidates) {
      const result = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint as count FROM pixel_areas
        WHERE status != 'RELEASED'
        AND x < ${c.x + c.w} AND x + width  > ${c.x}
        AND y < ${c.y + c.h} AND y + height > ${c.y}
      `;
      if (result[0].count === 0n) {
        freeSpaces.push({ ...c, parentAreaId: area.id });
      }
    }
  }

  return freeSpaces;
};
