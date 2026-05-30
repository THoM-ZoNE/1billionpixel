"use client";
import { PumpCapsule } from "./PumpCapsule";

export function CanvasPreview() {
  return (
    <section style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: "1.5rem", width: "100%",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <h2 style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "0.7rem", letterSpacing: "0.2em",
          textTransform: "uppercase", color: "#9945FF", margin: 0,
        }}>
          Live Capsule Preview
        </h2>
        <p style={{
          color: "rgba(255,255,255,0.35)", fontSize: "0.82rem",
          maxWidth: 480, margin: "0 auto", lineHeight: 1.7,
          fontFamily: "monospace",
        }}>
          Every claimed area appears here in real time as the capsule fills up.
        </p>
      </div>

      {/* Capsule */}
      <div className="capsule-glow-wrapper" style={{ width: "100%" }}>
        <div className="capsule-solana" style={{ width: "100%" }}>
          <div className="capsule-solana-inner" style={{ width: "100%" }}>
            <PumpCapsule />
          </div>
        </div>
      </div>

      {/* Pixel count label */}
      <span style={{
        fontSize: "0.6rem", color: "rgba(255,255,255,0.15)",
        fontFamily: "monospace", letterSpacing: "0.1em",
      }}>
        1,000,000,000 pixels
      </span>
    </section>
  );
}
