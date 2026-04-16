import { prisma }            from "@1bp/database";
import { getOnChainBalance }  from "../services/solana.js";
import { broadcastCanvasUpdate } from "../lib/websocket.js";
import { GRACE_PERIOD_HOURS } from "@1bp/shared";

export const checkGracePeriods = async (walletAddress: string) => {
  const wallet  = await prisma.wallet.findUnique({ where: { address: walletAddress } });
  if (!wallet) return;

  const balance = await getOnChainBalance(walletAddress);

  if (balance >= wallet.lockedPixels) {
    // Balance OK — clear any grace period
    if (wallet.gracePeriodEnd) {
      await prisma.wallet.update({
        where: { address: walletAddress },
        data:  { gracePeriodEnd: null },
      });
      await prisma.pixelArea.updateMany({
        where: { walletAddress, status: "AT_RISK" },
        data:  { status: "ACTIVE" },
      });
    }
    return;
  }

  // Deficit detected
  if (!wallet.gracePeriodEnd) {
    const gracePeriodEnd = new Date(Date.now() + GRACE_PERIOD_HOURS * 3_600_000);
    await prisma.wallet.update({ where: { address: walletAddress }, data: { gracePeriodEnd } });
    await prisma.pixelArea.updateMany({
      where: { walletAddress, status: "ACTIVE" },
      data:  { status: "AT_RISK" },
    });
    broadcastCanvasUpdate({ type: "GRACE_PERIOD_STARTED", walletAddress, gracePeriodEnd });
  }
};

export const runGracePeriodJob = async () => {
  const expired = await prisma.wallet.findMany({
    where: { gracePeriodEnd: { lte: new Date() } },
  });

  for (const wallet of expired) {
    const balance = await getOnChainBalance(wallet.address);
    if (balance >= wallet.lockedPixels) continue; // recovered

    const deficit   = wallet.lockedPixels - balance;
    const toRelease = await prisma.pixelArea.findMany({
      where:   { walletAddress: wallet.address, status: "AT_RISK" },
      orderBy: { claimedAt: "desc" }, // LIFO: newest first
    });

    let remaining = deficit;
    for (const area of toRelease) {
      if (remaining <= 0n) break;
      await prisma.pixelArea.update({ where: { id: area.id }, data: { status: "RELEASED" } });
      remaining -= area.pixelCount;
      broadcastCanvasUpdate({ type: "AREA_RELEASED", areaId: area.id,
        x: area.x, y: area.y, width: area.width, height: area.height });
    }

    await prisma.wallet.update({
      where: { address: wallet.address },
      data:  { lockedPixels: balance, availableQuota: 0n, gracePeriodEnd: null },
    });
  }
};
