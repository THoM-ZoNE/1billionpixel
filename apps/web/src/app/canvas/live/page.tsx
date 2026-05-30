import type { Metadata } from "next";
import { Suspense } from "react";
import { LiveCanvas } from "@/components/canvas/LiveCanvas";

export const metadata: Metadata = {
  title: "Live Capsule — 1BillionPixel.fun",
  description: "Watch the 1 Billion Pixel capsule fill up in real time.",
};

export default function LiveCanvasPage() {
  return (
    <Suspense fallback={null}>
      <LiveCanvas />
    </Suspense>
  );
}