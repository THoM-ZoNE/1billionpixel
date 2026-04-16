"use client";

import dynamic from "next/dynamic";
import { StatsBar }   from "@/components/landing/StatsBar";
import { HowItWorks } from "@/components/landing/HowItWorks";

// useWallet()-et használnak — WalletProvider nélkül SSR-ben kivételt dobnának
const HeroSection   = dynamic(() => import("@/components/landing/HeroSection").then(m => m.HeroSection),     { ssr: false });
const CanvasPreview = dynamic(() => import("@/components/canvas/CanvasPreview").then(m => m.CanvasPreview),  { ssr: false });
const ClaimSection  = dynamic(() => import("@/components/landing/ClaimSection").then(m => m.ClaimSection),   { ssr: false });

export default function HomePage() {
  return (
    <main style={{
      background: "linear-gradient(to bottom, #000000, #05010f, #000000)",
      color: "white",
      minHeight: "100vh",
    }}>
      <div style={{
        maxWidth: "860px",       /* szűkebb, kapszula-arányos */
        margin: "0 auto",
        padding: "2.5rem 1.25rem 6rem",
        display: "flex",
        flexDirection: "column",
        gap: "2.5rem",           /* kisebb gap = kompaktabb */
      }}>
        <HeroSection />
        <CanvasPreview />        {/* ← kapszula FÖLÖTTE van a stats-nak */}
        <StatsBar />
        <HowItWorks />
        <ClaimSection />
      </div>
    </main>
  );
}

