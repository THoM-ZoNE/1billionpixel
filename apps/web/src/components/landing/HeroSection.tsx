"use client";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet }          from "@solana/wallet-adapter-react";
import { useWalletSync }      from "@/hooks/useWalletSync";
import { Toast }              from "@/components/ui/Toast";

export function HeroSection() {
  const { connected } = useWallet();
  const { connectAndVerify, error, clearError } = useWalletSync();

  return (
    <section className="flex flex-col items-center gap-10 px-4 pt-10 text-center lg:pt-12">
      <div className="max-w-3xl">
        <h1 className="font-pixel text-4xl md:text-6xl lg:text-7xl leading-tight mb-4 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
          1 Billion Pixels
        </h1>
        <p className="text-base md:text-lg text-slate-300">
          Buy <span className="font-semibold text-violet-300">$1BPX</span> on Pump.fun.{" "}
          Claim your piece of internet history. 1 token ≈ 1 pixel.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {!connected ? (
          <WalletMultiButton className="!bg-violet-500 !text-white !px-6 !py-3 !rounded-xl !font-semibold hover:!bg-violet-400" />
        ) : (
          <button
            onClick={connectAndVerify}
            className="px-8 py-3 rounded-xl bg-violet-500 text-white font-semibold shadow-[0_0_30px_rgba(139,92,246,0.7)] hover:bg-violet-400 transition"
          >
            Verify &amp; Claim Pixels
          </button>
        )}

        <a
          href="https://pump.fun"
          target="_blank"
          className="px-8 py-3 rounded-xl border border-slate-600 bg-black/40 text-slate-100 hover:border-violet-400 hover:bg-violet-500/10 font-semibold transition"
        >
          Buy $1BPX on Pump.fun →
        </a>
      </div>

      {/* Toast – sliding up from down at error */}
      {error && (
        <Toast
          message={error}
          type="error"
          onClose={clearError}
        />
      )}
    </section>
  );
}
