import { prisma }           from "@1bp/database";
import { syncWalletBalance } from "../services/solana.js";

export const syncActiveWallets = async () => {
  const wallets = await prisma.wallet.findMany({
    where: { lockedPixels: { gt: 0n } },
    select: { address: true },
  });

  await Promise.allSettled(wallets.map((w) => syncWalletBalance(w.address)));
  console.log(`✅ Synced ${wallets.length} active wallets`);
};
