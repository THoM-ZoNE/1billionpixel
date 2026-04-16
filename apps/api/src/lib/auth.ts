import { PublicKey } from "@solana/web3.js";
import nacl           from "tweetnacl";
import bs58           from "bs58";

export const verifySignature = (
  walletAddress: string,
  message: string,
  signature: string
): boolean => {
  try {
    const pubkey    = new PublicKey(walletAddress);
    const msgBytes  = new TextEncoder().encode(message);
    const sigBytes  = bs58.decode(signature);
    return nacl.sign.detached.verify(msgBytes, sigBytes, pubkey.toBytes());
  } catch {
    return false;
  }
};
