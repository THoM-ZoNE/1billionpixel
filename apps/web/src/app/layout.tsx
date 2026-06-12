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

const ContractTicker = dynamic(
  () => import("@/components/layout/ContractTicker").then(m => m.ContractTicker),
  { ssr: false }
);

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${pressStart.variable} ${pixelify.variable}`}>
      <head>
        <title>1BillionPixel.fun — Own Your Pixel of Pumpfun history</title>
        <meta
          name="description"
          content="Buy $1BPX tokens on Pump.fun and claim your pixel."
        />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:title" content="1BillionPixel.fun" />
        <meta property="og:description" content="Own a pixel of PumpFun history" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="/og-image.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></meta>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-canvas-bg text-white antialiased">
        <Providers>
          <Navbar />
          <ContractTicker />
          {children}
        </Providers>
      </body>
    </html>
  );
}
