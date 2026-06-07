import { prisma } from "@1bp/database";
import { getOnChainBalance, syncWalletBalance } from "../services/solana.js";
import { scaleAreaProportionally } from "../services/imageScaler.js";
import {
  sendQuotaWarning,
  sendResizeNotification,
  sendQuotaRestoredNotification,
  sendAreaReleasedNotification,
  sendAreaAvailableToGroup,
} from "../services/telegram.js";

const MIN_AREA_PIXELS = 10_000n; // 100×100 px minimum
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
        const updated = await prisma.pixelArea.updateMany({
          where: { walletAddress: wallet.address, status: "AT_RISK" },
          data: { status: "ACTIVE" },
        });

        await prisma.wallet.update({
          where: { address: wallet.address },
          data: { atRiskSince: null },
        });

        if (updated.count > 0 && wallet.telegramHandle) {
          await sendQuotaRestoredNotification(
            wallet.telegramHandle,
            wallet.address,
            onChain
          );
          console.log(`[QuotaEnforcer] ${wallet.address.slice(0,8)}... restored to ACTIVE (${updated.count} areas)`);
        } else {
          console.log(`[QuotaEnforcer] ${wallet.address.slice(0,8)}... atRiskSince cleared, no active areas to restore`);
        }
      }
      continue;
    }

    // ⚠️ Deficit
    const deficit = locked - onChain;
    console.log(`[QuotaEnforcer] ${wallet.address.slice(0,8)}... deficit: ${deficit} px`);

    if (!wallet.atRiskSince) {
      // Cooldown: ha nemrég már resize-oltuk → skip
      if (wallet.lastResizedAt) {
        const sinceResize = Date.now() - wallet.lastResizedAt.getTime();
        const cooldownMs = GRACE_HOURS * 60 * 60 * 1000;
        if (sinceResize < cooldownMs) {
          console.log(`[QuotaEnforcer] ${wallet.address.slice(0,8)}... recently resized, skipping warning`);
          continue;
        }
      }

      // AT_RISK jelölés + warning DM
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

    // Grace period ellenőrzés
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
    let hadResize = false;

    for (const area of wallet.areas) {
      // Nincs több kvóta → teljes release
      if (remainingAllowed <= 0n) {
        await prisma.pixelArea.update({
          where: { id: area.id },
          data: { status: "RELEASED" },
        });
        if (wallet.telegramHandle) {
          await sendAreaReleasedNotification(
            wallet.telegramHandle,
            wallet.address,
            area.x, area.y, area.width, area.height
          );
        }
        await sendAreaAvailableToGroup({
          x: area.x, y: area.y,
          width: area.width, height: area.height,
        });
        continue;
      }

      const areaPixels = BigInt(area.width) * BigInt(area.height);
      const proportion = Number(areaPixels) / Number(locked);
      const allowedForArea = BigInt(Math.floor(Number(totalAllowed) * proportion));

      if (allowedForArea < areaPixels) {
        // ✅ Ha túl kicsi lenne → release, ne resize
        if (allowedForArea < MIN_AREA_PIXELS) {
          await prisma.pixelArea.update({
            where: { id: area.id },
            data: { status: "RELEASED" },
          });
          if (wallet.telegramHandle) {
            await sendAreaReleasedNotification(
              wallet.telegramHandle,
              wallet.address,
              area.x, area.y, area.width, area.height
            );
          }
          await sendAreaAvailableToGroup({
            x: area.x, y: area.y,
            width: area.width, height: area.height,
          });
          remainingAllowed -= areaPixels;
          continue;
        }

        // Normal resize
        await scaleAreaProportionally(area.id, allowedForArea);
        hadResize = true;
      }

      remainingAllowed -= allowedForArea < areaPixels ? allowedForArea : areaPixels;
    }

    // Wallet quota újraszámítás
    await syncWalletBalance(wallet.address);

    // AT_RISK reset + lastResizedAt
    await prisma.wallet.update({
      where: { address: wallet.address },
      data: {
        atRiskSince: null,
        lastResizedAt: new Date(),
      },
    });

    // Resize értesítő csak ha volt normál resize (nem csak release-ek)
    if (hadResize && wallet.telegramHandle) {
      await sendResizeNotification(
        wallet.telegramHandle,
        wallet.address,
        onChain
      );
    }
  }

  console.log("[QuotaEnforcer] Run complete.");
}