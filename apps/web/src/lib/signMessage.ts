import { WalletContextState } from "@solana/wallet-adapter-react";
import bs58 from "bs58";

export const signAuthMessage = async (wallet: WalletContextState): Promise<{ message: string; signature: string }> => {
  if (!wallet.publicKey || !wallet.signMessage) throw new Error("Wallet not connected");

  const message   = `1BillionPixel Auth: ${wallet.publicKey.toBase58()} @ ${Date.now()}`;
  const msgBytes  = new TextEncoder().encode(message);
  const sigBytes  = await wallet.signMessage(msgBytes);
  const signature = bs58.encode(sigBytes);
  return { message, signature };
};
