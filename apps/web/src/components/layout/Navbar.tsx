"use client";
import { useWallet }          from "@solana/wallet-adapter-react";
import { useWalletStore }     from "@/store/walletStore";
import dynamic from "next/dynamic";
import Link                   from "next/link";

// SSR kikapcsolva — ez oldja meg a hydration hibát
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then(m => m.WalletMultiButton),
  { ssr: false }
);
export function Navbar() {
  const { publicKey }  = useWallet();
  const { walletData } = useWalletStore();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-logo">1BP.FUN</Link>

        <div className="navbar-right">
          <Link
            href="/canvas/live"
            style={{
              fontSize: "0.7rem",
              color: "rgba(20,241,149,0.8)",
              textDecoration: "none",
              fontFamily: "monospace",
              letterSpacing: "0.08em",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.3rem 0.75rem",
              border: "1px solid rgba(20,241,149,0.25)",
              borderRadius: "0.4rem",
            }}
          >
            <span style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#14f195",
              display: "inline-block",
            }} />
            LIVE CANVAS
          </Link>

          {walletData && (
            <div className="navbar-pixels">
              <span className="navbar-pixels-count">
                {Number(walletData.availableQuota).toLocaleString()}
              </span>{" "}
              pixels available
            </div>
          )}
          <WalletMultiButton />
        </div>
      </div>
    </nav>
  );
}