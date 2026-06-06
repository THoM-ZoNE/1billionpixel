import { prisma } from "@1bp/database";
import { getOnChainBalance } from "../services/solana.js";
import { scaleAreaProportionally } from "../services/imageScaler.js";
import {
  sendQuotaWarning,
  sendResizeNotification,
  sendQuotaRestoredNotification,
} from "../services/telegram.js";

const GRACE_HOURS = Number(process.env.QUOTA_GRACE_HOURS ?? 1);

export async function runQuotaEnforcer(): Promise<void> {
  console.log("[QuotaEnforcer] Starting run...");

  const wallets = await prisma.wallet.findMany({
    where: {
      manualOverride: false,
      bannedAt: null,
      lockedPixels: { gt: 0 },
    },
    include: {
      areas: {
        where: { status: { in: ["ACTIVE", "AT_RISK"] } },
        orderBy: { claimedAt: "asc" },
      },
    },
  });

  for (const wallet of wallets) {
    const onChain = await getOnChainBalance(wallet.address);
    const locked  = wallet.lockedPixels;

      if (onChain >= locked) {
        // ✅ Rendben — ha AT_RISK volt, visszaállítjuk ACTIVE-ra
        if (wallet.atRiskSince) {
          await prisma.wallet.update({
            where: { address: wallet.address },
            data: { atRiskSince: null },
          });
          await prisma.pixelArea.updateMany({
            where: { walletAddress: wallet.address, status: "AT_RISK" },
            data: { status: "ACTIVE" },
          });

          // ✅ Új függvény: restored értesítés
          if (wallet.telegramHandle) {
            await sendQuotaRestoredNotification(
              wallet.telegramHandle,
              wallet.address,
              onChain
            );
          }

          console.log(`[QuotaEnforcer] ${wallet.address.slice(0,8)}... restored to ACTIVE`);
        }
        continue;
      }

      // ⚠️ Deficit
      const deficit = locked - onChain;
      console.log(`[QuotaEnforcer] ${wallet.address.slice(0,8)}... deficit: ${deficit} px`);

      if (!wallet.atRiskSince) {
    // Ha nemrég már resize-oltuk → ne küldjön új warningot
    if (wallet.lastResizedAt) {
      const sinceResize = Date.now() - wallet.lastResizedAt.getTime();
      const cooldownMs = GRACE_HOURS * 60 * 60 * 1000;
      if (sinceResize < cooldownMs) {
        console.log(`[QuotaEnforcer] ${wallet.address.slice(0,8)}... recently resized, skipping warning`);
        continue;
      }
  }

    // AT_RISK jelölés + warning
    await prisma.wallet.update({
      where: { address: wallet.address },
      data: { atRiskSince: new Date() },
    });
    await prisma.pixelArea.updateMany({
      where: { walletAddress: wallet.address, status: "ACTIVE" },
      data: { status: "AT_RISK" },
    });

    if (wallet.telegramHandle) {
      await sendQuotaWarning(
        wallet.telegramHandle,
        wallet.address,
        onChain,
        locked,
        deficit,
        GRACE_HOURS
      );
    }

    console.log(`[QuotaEnforcer] ${wallet.address.slice(0,8)}... marked AT_RISK, notification sent`);
    continue;
  }

    // 2. futás: türelmi idő lejárt?
    const gracePeriodMs = GRACE_HOURS * 60 * 60 * 1000;
    const elapsed = Date.now() - wallet.atRiskSince.getTime();

    if (elapsed < gracePeriodMs) {
      console.log(`[QuotaEnforcer] ${wallet.address.slice(0,8)}... still in grace period (${Math.round(elapsed / 60000)}min elapsed)`);
      continue;
    }

    // Grace lejárt → arányos területcsökkentés
    console.log(`[QuotaEnforcer] ${wallet.address.slice(0,8)}... grace expired, scaling areas...`);

    const totalAllowed = onChain;
    let remainingAllowed = totalAllowed;

    for (const area of wallet.areas) {
      if (remainingAllowed <= 0n) {
        await prisma.pixelArea.update({
          where: { id: area.id },
          data: { status: "RELEASED" },
        });
        continue;
      }

      const areaPixels = area.pixelCount;
      const proportion = Number(areaPixels) / Number(locked);
      const allowedForArea = BigInt(Math.floor(Number(totalAllowed) * proportion));

      if (allowedForArea < areaPixels) {
        await scaleAreaProportionally(area.id, allowedForArea);
      }

      remainingAllowed -= allowedForArea < areaPixels ? allowedForArea : areaPixels;
    }

        // AT_RISK reset + lastResizedAt timestamp
    await prisma.wallet.update({
      where: { address: wallet.address },
      data: {
        atRiskSince: null,
        lastResizedAt: new Date(),   // ← ÚJ
      },
    });
    await prisma.pixelArea.updateMany({
      where: { walletAddress: wallet.address, status: "AT_RISK" },
      data: { status: "ACTIVE" },
    });

    if (wallet.telegramHandle) {
      await sendResizeNotification(
        wallet.telegramHandle,
        wallet.address,
        onChain
      );
    }
  }

  console.log("[QuotaEnforcer] Run complete.");
}