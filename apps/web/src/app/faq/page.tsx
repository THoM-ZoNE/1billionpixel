"use client";
import { useState } from "react";

const FAQS = [
  {
    q: "What is $1BPX?",
    a: "$1BPX is the native token of the 1 Billion Pixel project on Solana. It gives holders the right to claim and display visual content on a shared, permanent digital canvas. 1 token = 1 pixel of claimable area.",
  },
  {
    q: "How do I claim pixels?",
    a: "Buy $1BPX on Pump.fun, then connect your Solana wallet on this site. Your token balance determines how many pixels you can claim. Draw a selection on the canvas, upload your image or artwork, and confirm the claim.",
  },
  {
    q: "Do I spend my tokens to claim?",
    a: "No. You hold your tokens — you do not burn or spend them. As long as your wallet balance covers your claimed area, your space remains active. Sell your tokens and you risk losing your space.",
  },
  {
    q: "What happens if I sell my tokens?",
    a: "If your wallet balance drops below your claimed pixel count, your area is marked AT_RISK and you receive a Telegram notification. You have until the next hourly sync to restore your balance. If you don't, your image is proportionally shrunk from the top-left to match your new balance. If the resulting area would fall below 10×10 pixels, the claim is fully released.",
  },
  {
    q: "What is the Proportional Shrink?",
    a: "When your token balance no longer covers your full claimed area, the system scales your image down proportionally, anchored to its top-left corner. The freed space on the right and bottom becomes immediately available for others to claim. Your image stays intact — it just gets smaller.",
  },
  {
    q: "Why do I need to connect Telegram?",
    a: "Telegram is used for AT_RISK alerts and bot-side wallet verification. Without a connected Telegram account, you won't receive notifications when your area is at risk of being shrunk or released.",
  },
  {
    q: "Can I move my claimed area after claiming?",
    a: "No. Once a claim is confirmed, the position is fixed. You can update the image displayed in your area, but the location on the canvas does not change.",
  },
  {
    q: "Can I claim multiple separate areas?",
    a: "Yes. Your token balance is a shared quota across all your claims. The total pixel count of all your active claims must not exceed your current wallet balance.",
  },
  {
    q: "What image formats are supported?",
    a: "JPG, PNG, GIF, and WebP are all supported. Maximum file size is 10 MB. GIF animations are rendered live on the canvas.",
  },
  {
    q: "Is the canvas permanent?",
    a: "As long as you hold enough tokens to cover your claimed area, your space is permanent. The only way your content is removed is if your token balance drops and is not restored before the next hourly sync.",
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <main style={{
      minHeight: "100vh", background: "#05070a",
      color: "white", padding: "96px 24px 64px",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>

        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <p style={{
            margin: 0, color: "rgba(153,69,255,0.9)",
            fontFamily: "monospace", fontSize: "0.72rem",
            letterSpacing: "0.18em", textTransform: "uppercase",
          }}>
            Frequently Asked Questions
          </p>
          <h1 style={{
            margin: "1rem 0 0.75rem",
            fontFamily: '"Press Start 2P", monospace',
            fontSize: "clamp(1.4rem, 4vw, 2.2rem)",
            lineHeight: 1.3,
          }}>
            FAQ
          </h1>
          <p style={{
            color: "rgba(255,255,255,0.4)", fontSize: "0.88rem",
            fontFamily: "monospace", lineHeight: 1.8, margin: 0,
          }}>
            Everything you need to know about $1BPX and the canvas.
          </p>
        </div>

        {/* Accordion */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {FAQS.map((item, i) => (
            <div
              key={i}
              style={{
                border: open === i
                  ? "1px solid rgba(153,69,255,0.5)"
                  : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                background: open === i
                  ? "rgba(153,69,255,0.06)"
                  : "rgba(255,255,255,0.02)",
                overflow: "hidden",
                transition: "border-color 0.2s, background 0.2s",
              }}
            >
              {/* Question */}
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: "100%", textAlign: "left",
                  padding: "1.1rem 1.25rem",
                  background: "none", border: "none", cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  gap: "1rem",
                }}
              >
                <span style={{
                  color: "white", fontWeight: 600,
                  fontSize: "0.92rem", lineHeight: 1.5,
                }}>
                  {item.q}
                </span>
                <span style={{
                  color: open === i ? "#c4b5fd" : "rgba(255,255,255,0.3)",
                  fontSize: "1.1rem", flexShrink: 0,
                  transform: open === i ? "rotate(45deg)" : "rotate(0deg)",
                  transition: "transform 0.2s, color 0.2s",
                  display: "inline-block",
                }}>
                  +
                </span>
              </button>

              {/* Answer */}
              {open === i && (
                <div style={{
                  padding: "0 1.25rem 1.25rem",
                  color: "rgba(255,255,255,0.55)",
                  fontSize: "0.88rem", fontFamily: "monospace",
                  lineHeight: 1.85,
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  paddingTop: "1rem",
                }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{
          textAlign: "center", marginTop: "1rem",
          padding: "1.5rem",
          border: "1px solid rgba(20,241,149,0.15)",
          borderRadius: 16,
          background: "rgba(20,241,149,0.03)",
        }}>
          <p style={{
            color: "rgba(255,255,255,0.5)", fontSize: "0.85rem",
            fontFamily: "monospace", margin: "0 0 1rem",
          }}>
            Still have questions? Join the community.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="https://t.me/1bpfun"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "0.6rem 1.25rem", borderRadius: 10,
                background: "rgba(20,241,149,0.1)",
                border: "1px solid rgba(20,241,149,0.25)",
                color: "#14f195", fontSize: "0.82rem",
                fontFamily: "monospace", textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Telegram →
            </a>
            <a
              href="https://x.com/1bpfun"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "0.6rem 1.25rem", borderRadius: 10,
                background: "rgba(153,69,255,0.1)",
                border: "1px solid rgba(153,69,255,0.25)",
                color: "#c4b5fd", fontSize: "0.82rem",
                fontFamily: "monospace", textDecoration: "none",
                fontWeight: 600,
              }}
            >
              X (Twitter) →
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}