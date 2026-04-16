import type { Metadata } from "next";
import { LiveCanvas } from "@/components/canvas/LiveCanvas";

export const metadata: Metadata = {
  title: "Live Canvas — 1BillionPixel.fun",
  description: "Watch the 1 Billion Pixel canvas fill up in real time.",
};

export default function LiveCanvasPage() {
  return <LiveCanvas />;
}