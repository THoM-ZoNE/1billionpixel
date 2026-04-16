"use client";
import { useMemo } from "react";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider }
  from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter }  from "@solana/wallet-adapter-phantom";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import "@solana/wallet-adapter-react-ui/styles.css";

//const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
const RPC = "https://mainnet.helius-rpc.com/?api-key=eeae52ee-8d9d-41b7-9ea2-ccc7d7e88847";
console.log("RPC =", RPC); // ideiglenesen

export function WalletProvider({ children }: { children: React.ReactNode }) {

  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new BackpackWalletAdapter(),
    new SolflareWalletAdapter(),
  ], []);

  return (
    <ConnectionProvider endpoint={RPC}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
