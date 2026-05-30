"use client";
import { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet }          from "@solana/wallet-adapter-react";
import { useWalletSync }      from "@/hooks/useWalletSync";
import { Toast }              from "@/components/ui/Toast";

export function HeroSection() {
  const { connected } = useWallet();
  const { connectAndVerify, error, clearError } = useWalletSync();
  const [verifyHover, setVerifyHover] = useState(false);
  const [buyHover,    setBuyHover]    = useState(false);

  return (
    <section style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: "2rem", padding: "5rem 1.5rem 2rem", textAlign: "center",
    }}>
      {/* Heading */}
      <div style={{ maxWidth: 990, display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h1 style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "clamp(2rem, 6vw, 3.5rem)",
          lineHeight: 1.15, margin: 0, color: "white",
        }}>
          1 Billion{" "}
          <span style={{
            background: "linear-gradient(135deg, #9945FF, #d946ef)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Pixels
          </span>
        </h1>
        <p style={{
          fontSize: "0.85rem", color: "rgba(255,255,255,0.45)",
          fontFamily: "monospace", lineHeight: 1.8, margin: 0,
        }}>
          Buy <span style={{ color: "#c4b5fd", fontWeight: 600 }}>$1BPX</span> on Pumpfun,{" "}
          1 token ≈ 1 pixel. Claim your piece of PumpFun history.
        </p>
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.75rem" }}>
        {!connected ? (
          <WalletMultiButton className="!bg-violet-600 !rounded-xl !font-semibold !text-sm" />
        ) : (
          <button
            onClick={connectAndVerify}
            onMouseEnter={() => setVerifyHover(true)}
            onMouseLeave={() => setVerifyHover(false)}
            style={{
              padding: "0.75rem 1.75rem", borderRadius: "0.75rem",
              background: verifyHover ? "#6d28d9" : "#7C3AED",
              color: "white", border: "none",
              fontSize: "0.9rem", fontWeight: 700, cursor: "pointer",
              boxShadow: verifyHover ? "0 0 40px rgba(124,58,237,0.8)" : "0 0 28px rgba(124,58,237,0.55)",
              transform: verifyHover ? "translateY(-1px)" : "translateY(0)",
              transition: "all 0.2s",
            }}
          >
            Verify &amp; Claim Pixels
          </button>
        )}
        <a
          href="https://pump.fun"
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={() => setBuyHover(true)}
          onMouseLeave={() => setBuyHover(false)}
          style={{
            padding: "0.75rem 1.75rem", borderRadius: "0.75rem",
            border: `1px solid ${buyHover ? "rgba(153,69,255,0.8)" : "rgba(153,69,255,0.4)"}`,
            background: buyHover ? "rgba(153,69,255,0.12)" : "transparent",
            color: buyHover ? "#e9d5ff" : "#c4b5fd",
            fontSize: "0.9rem", fontWeight: 600,
            textDecoration: "none",
            transform: buyHover ? "translateY(-1px)" : "translateY(0)",
            transition: "all 0.2s",
          }}
        >
          Buy $1BPX on Pumpfun →
        </a>
      </div>

      {error && <Toast message={error} type="error" onClose={clearError} />}
    </section>
  );
}