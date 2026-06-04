import { prisma } from "@1bp/database";
import { getOnChainBalance } from "../services/solana.js";
import { sendTelegramMessage } from "../services/telegram.js";
import { scaleAreaProportionally } from "../services/imageScaler.js";

const GRACE_HOURS = Number(process.env.QUOTA_GRACE_HOURS ?? 1); // 1 óra alapértelmezett

export async function runQuotaEnforcer(): Promise<void> {
  console.log("[QuotaEnforcer] Starting run...");

  // Összes wallet lekérése területekkel együtt
  const wallets = await prisma.wallet.findMany({
    where: {
      manualOverride: false,
      bannedAt: null,
      lockedPixels: { gt: 0 }, // csak akiknek van foglalt területük
    },
    include: {
      areas: {
        where: { status: { in: ["ACTIVE", "AT_RISK"] } },
        orderBy: { claimedAt: "asc" }, // régebbi területeket csökkentjük először
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
        console.log(`[QuotaEnforcer] ${wallet.address.slice(0,8)}... restored to ACTIVE`);
      }
      continue;
    }

    // ⚠️ Deficit: onChain < locked
    const deficit = locked - onChain;
    console.log(`[QuotaEnforcer] ${wallet.address.slice(0,8)}... deficit: ${deficit} px`);

    if (!wallet.atRiskSince) {
      // 1. futás: AT_RISK jelölés + Telegram értesítés
      await prisma.wallet.update({
        where: { address: wallet.address },
        data: { atRiskSince: new Date() },
      });
      await prisma.pixelArea.updateMany({
        where: { walletAddress: wallet.address, status: "ACTIVE" },
        data: { status: "AT_RISK" },
      });

      if (wallet.telegramHandle) {
        const msg =
          `⚠️ <b>1BillionPixel — Quota Warning</b>\n\n` +
          `Your wallet <code>${wallet.address.slice(0, 8)}...${wallet.address.slice(-4)}</code> ` +
          `holds <b>${onChain.toLocaleString()} $1BPX</b> tokens, but has ` +
          `<b>${locked.toLocaleString()} pixels</b> claimed.\n\n` +
          `You need to buy back <b>${deficit.toLocaleString()} $1BPX</b> within ` +
          `<b>${GRACE_HOURS} hour${GRACE_HOURS > 1 ? "s" : ""}</b> to keep all your areas.\n\n` +
          `If you don't top up in time, your claimed areas will be proportionally reduced.\n\n` +
          `👉 <a href="https://pump.fun">Buy $1BPX on PumpFun</a>`;

        await sendTelegramMessage(wallet.telegramHandle, msg);
      }

      console.log(`[QuotaEnforcer] ${wallet.address.slice(0,8)}... marked AT_RISK, notification sent`);
      continue;
    }

    // 2. futás: türelmi idő lejárt → arányos csökkentés
    const gracePeriodMs = GRACE_HOURS * 60 * 60 * 1000;
    const elapsed = Date.now() - wallet.atRiskSince.getTime();

    if (elapsed < gracePeriodMs) {
      console.log(`[QuotaEnforcer] ${wallet.address.slice(0,8)}... still in grace period (${Math.round(elapsed/60000)}min elapsed)`);
      continue;
    }

    // Grace lejárt → arányos területcsökkentés
    console.log(`[QuotaEnforcer] ${wallet.address.slice(0,8)}... grace expired, scaling areas...`);

    // Elosztjuk az elérhető pixeleket az areák között arányosan
    // (régebbi areák kicsit több pixelt kapnak, ha nem osztható egyenletesen)
    const totalAllowed = onChain; // mennyi pixel összesen engedélyezett
    let remainingAllowed = totalAllowed;

    for (const area of wallet.areas) {
      if (remainingAllowed <= 0n) {
        // Nincs több engedélyezett pixel → terület törlése
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

    // AT_RISK törlése, területek visszaállítása ACTIVE-ra
    await prisma.wallet.update({
      where: { address: wallet.address },
      data: { atRiskSince: null },
    });
    await prisma.pixelArea.updateMany({
      where: { walletAddress: wallet.address, status: "AT_RISK" },
      data: { status: "ACTIVE" },
    });

    // Telegram értesítés a csökkentésről
    if (wallet.telegramHandle) {
      const msg =
        `📉 <b>1BillionPixel — Areas Resized</b>\n\n` +
        `Your claimed areas have been proportionally reduced to match your current ` +
        `<b>${onChain.toLocaleString()} $1BPX</b> token balance.\n\n` +
        `To restore your original areas, buy back the tokens and re-claim.\n\n` +
        `👉 <a href="https://pump.fun">Buy $1BPX on PumpFun</a>`;
      await sendTelegramMessage(wallet.telegramHandle, msg);
    }
  }

  console.log("[QuotaEnforcer] Run complete.");
}