"use client";
import "@/app/globals.css";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { Press_Start_2P, Pixelify_Sans } from "next/font/google";
import { Providers } from "./providers";

// SSR disabled — Navbar uses useWallet(), which would throw during SSR without WalletProvider
const Navbar = dynamic(
  () => import("@/components/layout/Navbar").then(m => m.Navbar),
  { ssr: false }
);

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--font-pixelify",
});
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${pressStart.variable} ${pixelify.variable}`}>
      <head>
        <title>1BillionPixel.fun — Own Your Piece of the Billion</title>
        <meta
          name="description"
          content="Buy $1BPX tokens on Pump.fun and claim your pixel canvas territory forever."
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-canvas-bg text-white antialiased">
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
