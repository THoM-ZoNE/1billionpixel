"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWalletStore } from "@/store/walletStore";

const NAV_LINKS = [
  { label: "Live Canvas",  href: "/canvas/live" },
  { label: "Tokenomics",   href: "/tokenomics" },
  { label: "FAQ",          href: "/faq" },
];

const SOCIAL_LINKS = [
  { label: "Telegram", href: "https://t.me/1bpfun" },
  { label: "X",        href: "https://x.com/1bpfun" },
];

export function Navbar() {
  const pathname  = usePathname();
  const { walletData } = useWalletStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const pixelsAvailable = walletData?.availableQuota
    ? Number(walletData.availableQuota).toLocaleString()
    : null;

  const linkStyle = (href: string): React.CSSProperties => ({
    fontFamily: "monospace",
    fontSize: "0.75rem",
    letterSpacing: "0.08em",
    textDecoration: "none",
    color: pathname === href ? "#14F195" : "rgba(255,255,255,0.5)",
    transition: "color 0.2s",
    whiteSpace: "nowrap",
  });

  const socialStyle: React.CSSProperties = {
    fontFamily: "monospace",
    fontSize: "0.72rem",
    letterSpacing: "0.08em",
    textDecoration: "none",
    color: "rgba(255,255,255,0.35)",
    transition: "color 0.2s",
    whiteSpace: "nowrap",
  };

  const divider = (
    <span style={{
      width: 1, height: 14,
      background: "rgba(255,255,255,0.12)",
      display: "inline-block", flexShrink: 0,
    }} />
  );

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, width: "100%", zIndex: 50,
        background: "rgba(5,7,10,0.85)", backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          padding: "0 1.25rem", height: 64,
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: "1rem",
        }}>

          {/* ── Bal: Logo + Nav linkek ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
            <Link href="/" style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: "0.85rem", color: "#7C3AED",
              textDecoration: "none", letterSpacing: "0.05em",
              flexShrink: 0,
            }}>
              1BP.FUN
            </Link>

            {/* Asztali nav */}
            <div style={{
              display: "flex", alignItems: "center", gap: "1.5rem",
              // Mobilon elrejt — kezeld CSS media query-vel ha kell
            }}
              className="hide-mobile"
            >
              {NAV_LINKS.map(({ label, href }) => (
                <Link key={href} href={href} style={linkStyle(href)}>
                  {label}
                </Link>
              ))}

              {divider}

              {SOCIAL_LINKS.map(({ label, href }) => (
                <a
                  key={href} href={href}
                  target="_blank" rel="noopener noreferrer"
                  style={socialStyle}
                >
                  {label} ↗
                </a>
              ))}
            </div>
          </div>

          {/* ── Jobb: Pixel count + Wallet ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexShrink: 0 }}>
            {pixelsAvailable && (
              <div
                className="hide-mobile"
                style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}
              >
                <span style={{
                  fontSize: "0.6rem", color: "rgba(255,255,255,0.3)",
                  fontFamily: "monospace", textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}>
                  Available
                </span>
                <span style={{
                  fontSize: "0.8rem", color: "#14F195",
                  fontWeight: 700, fontFamily: "monospace",
                }}>
                  {pixelsAvailable} px
                </span>
              </div>
            )}

            <WalletMultiButton style={{
              background: "#7C3AED", height: 38,
              padding: "0 1rem", borderRadius: 10,
              fontSize: "0.78rem", fontWeight: 700,
            }} />

            {/* Hamburger — mobilon */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="show-mobile"
              style={{
                background: "none", border: "none",
                color: "rgba(255,255,255,0.6)", cursor: "pointer",
                fontSize: "1.3rem", padding: "0 4px",
              }}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobil dropdown menü ── */}
      {menuOpen && (
        <div style={{
          position: "fixed", top: 64, left: 0, right: 0,
          zIndex: 49,
          background: "rgba(5,7,10,0.97)", backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "1.25rem",
          display: "flex", flexDirection: "column", gap: "1rem",
        }}>
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href} href={href}
              onClick={() => setMenuOpen(false)}
              style={{ ...linkStyle(href), fontSize: "0.9rem" }}
            >
              {label}
            </Link>
          ))}
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
          {SOCIAL_LINKS.map(({ label, href }) => (
            <a
              key={href} href={href}
              target="_blank" rel="noopener noreferrer"
              style={{ ...socialStyle, fontSize: "0.9rem" }}
            >
              {label} ↗
            </a>
          ))}
        </div>
      )}
    </>
  );
}