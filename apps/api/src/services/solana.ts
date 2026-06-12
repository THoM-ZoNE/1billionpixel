import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount,TOKEN_PROGRAM_ID,TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { prisma } from "@1bp/database";
import { getMint } from "@solana/spl-token";


const RPC =
  process.env.SOLANA_RPC_URL ??
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  "https://api.mainnet-beta.solana.com";

const connection = new Connection(RPC);

const getTokenMint = (): PublicKey => {
  const mint = process.env.NEXT_PUBLIC_TOKEN_MINT;
  if (!mint) throw new Error("NEXT_PUBLIC_TOKEN_MINT is not set in environment");
  return new PublicKey(mint);
};

export const getOnChainBalance = async (walletAddress: string): Promise<bigint> => {
  try {
    const pubkey = new PublicKey(walletAddress);
    const mint   = getTokenMint();

    // Try both token programs
    for (const programId of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
      try {
        const ata  = await getAssociatedTokenAddress(mint, pubkey, false, programId);
        const acct = await getAccount(connection, ata, "confirmed", programId);
        const mintInfo = await getMint(connection, mint, "confirmed", programId);
        const decimals = BigInt(mintInfo.decimals); // 6
        return acct.amount / (10n ** decimals);
      } catch {
        // next program
      }
    }
    return 0n;
  } catch (err) {
    console.error("[getOnChainBalance] error:", err);
    return 0n;
  }
};


export const syncWalletBalance = async (address: string) => {
  const short = `${address.slice(0,8)}...${address.slice(-4)}`;

  console.log(`[sync:${short}] onChain check...`);

  const onChain = await getOnChainBalance(address);
  const existing = await prisma.wallet.findUnique({
    where: { address },
    select: {
      manualOverride: true,
      bannedAt:       true,   // ← ÚJ
      penaltyPixels:  true,   // ← ÚJ
      bonusPixels:    true,
      lockedPixels:   true,   // ← ÚJ
    },
  });

  // Bannolt wallet ne frissüljön
  if (existing?.bannedAt) return;



  // ← MÓDOSÍTOTT: penalty és bonus figyelembevétele
  const penalty = existing?.penaltyPixels ?? 0n;
  const bonus   = existing?.bonusPixels   ?? 0n;
  const locked  = existing?.lockedPixels  ?? 0n;
  const rawQuota = onChain + bonus - penalty - (existing?.lockedPixels ?? 0n);
  const availableQuota = rawQuota > 0n ? rawQuota : 0n;

  console.log(
    `[sync:${short}] onChain=${onChain} | locked=${locked} | penalty=${penalty} | bonus=${bonus} | available=${availableQuota}`
  );

  const wallet = await prisma.wallet.upsert({
    where: { address },
    create: {
      address,
      totalQuota:    onChain,
      lockedPixels:  0n,
      availableQuota: onChain,
      penaltyPixels:  0n,   // ← ÚJ
      bonusPixels:    0n,   // ← ÚJ
    },
    update: existing?.manualOverride
      ? { lastSynced: new Date() }
      : {
          totalQuota:    onChain,
          availableQuota,
          lastSynced: new Date(),
          // penaltyPixels és bonusPixels itt NEM szerepel —
          // azokat csak az admin endpoint írja!
        },
  });

  return {
    ...wallet,
    totalQuota: onChain.toString(),
    lockedPixels: locked.toString(),
    availableQuota: availableQuota.toString(),
  };
};

