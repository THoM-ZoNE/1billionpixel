import { useEffect, useState } from "react";
import { useWallet }           from "@solana/wallet-adapter-react";
import { useWalletStore }      from "@/store/walletStore";
import { api }                 from "@/lib/api";
import { signAuthMessage }     from "@/lib/signMessage";

export const useWalletSync = () => {
  const wallet = useWallet();
  const { fetchWallet, clearWallet } = useWalletStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet.publicKey) { clearWallet(); return; }
    fetchWallet(wallet.publicKey.toBase58());
  }, [wallet.publicKey]);

  const connectAndVerify = async () => {
    if (!wallet.publicKey) return;
    setError(null);
    try {
      // Először lekérdezzük az aktuális wallet állapotát.
      // Ha skipSignature be van kapcsolva, nem nyílik meg a Phantom wallet.
      const walletData = await fetchWallet(wallet.publicKey.toBase58());
      if (walletData?.skipSignature) {
        // Aláírás kihagyva az admin által — kész
        return;
      }
      const { message, signature } = await signAuthMessage(wallet);
      await api.post("/wallet/connect", {
        address: wallet.publicKey.toBase58(), message, signature,
      });
      await fetchWallet(wallet.publicKey.toBase58());
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Wallet kapcsolódás sikertelen.";
      setError(msg);
    }
  };

  return { connectAndVerify, error, clearError: () => setError(null) };
};
