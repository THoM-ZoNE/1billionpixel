"use client";
import { PumpCapsule } from "./PumpCapsule";

export function CanvasPreview() {
  return (
    <section className="flex flex-col items-center gap-4 w-full">
      <div className="text-center">
        <h2
          className="font-pixel text-xs uppercase tracking-[0.2em] text-violet-400 mb-2"
        >
          LIVE CAPSULE PREVIEW
        </h2>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          This pump.fun-style capsule shows a live preview of the 1 billion
          pixel canvas. Every claimed area appears here in real time as the
          capsule fills up.
        </p>
      </div>

      
      <div className="capsule-glow-wrapper">
      <div className="capsule-solana w-full">
          <div className="capsule-solana-inner">
            <PumpCapsule />
          </div>
        </div>
        </div>
        <span
        style={{
          marginTop: "8px",
          fontSize: "10px",
          color: "rgba(255,255,255,0.15)",
          fontFamily: "monospace",
          display: "block",
          textAlign: "center",
        }}
      >
        1,000,000,000 pixels
      </span>
    </section>
  );
}
