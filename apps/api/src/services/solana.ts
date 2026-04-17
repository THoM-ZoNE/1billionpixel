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

    // Próbálja mindkét token programmal
    for (const programId of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
      try {
        const ata  = await getAssociatedTokenAddress(mint, pubkey, false, programId);
        const acct = await getAccount(connection, ata, "confirmed", programId);
        const mintInfo = await getMint(connection, mint, "confirmed", programId);
        const decimals = BigInt(mintInfo.decimals); // 6
        return acct.amount / (10n ** decimals);
      } catch {
        // következő program
      }
    }
    return 0n;
  } catch (err) {
    console.error("[getOnChainBalance] error:", err);
    return 0n;
  }
};


export const syncWalletBalance = async (address: string) => {
  console.log("[sync] address:", address);
  console.log("[sync] mint:", process.env.NEXT_PUBLIC_TOKEN_MINT);
  console.log("[sync] rpc:", process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL);
  
  const onChain = await getOnChainBalance(address);
  console.log("[sync] onChain balance:", onChain.toString());
  const existing       = await prisma.wallet.findUnique({ where: { address } });
  const lockedPixels   = existing?.lockedPixels ?? 0n;
  const availableQuota = onChain >= lockedPixels ? onChain - lockedPixels : 0n;

  // Ha manualOverride be van kapcsolva, csak a lastSynced-et frissítjük —
  // a totalQuota és availableQuota manuálisan lett beállítva, nem írjuk felül.
  const wallet = await prisma.wallet.upsert({
    where:  { address },
    create: {
      address,
      totalQuota:     onChain,
      lockedPixels:   0n,
      availableQuota: onChain,
    },
    update: existing?.manualOverride
      ? { lastSynced: new Date() }
      : { totalQuota: onChain, availableQuota: availableQuota, lastSynced: new Date() },
  });

  // availableQuota-t mindig on-the-fly számítjuk — a DB-ben tárolt érték elcsúszikásban lehet
  const effectiveAvailable = wallet.totalQuota >= wallet.lockedPixels
    ? wallet.totalQuota - wallet.lockedPixels
    : 0n;
  return {
    ...wallet,
    totalQuota:     wallet.totalQuota.toString(),
    lockedPixels:   wallet.lockedPixels.toString(),
    availableQuota: effectiveAvailable.toString(),
  };
};

