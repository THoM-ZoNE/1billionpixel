"use client";

import { HeroSection }   from "@/components/landing/HeroSection";
import { StatsBar }      from "@/components/landing/StatsBar";
import {CanvasPreview} from "@/components/canvas/CanvasPreview";
import { HowItWorks }    from "@/components/landing/HowItWorks";
import { ClaimSection }  from "@/components/landing/ClaimSection";

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

