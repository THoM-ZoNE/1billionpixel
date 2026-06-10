import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "1BillionPixel.fun — Own Your Pixel of Pumpfun history",
  description: "Buy $1BPX on PumpFun. 1 token ≈ 1 pixel. Claim your pixel of Pumpfun history.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
    other: [
      { rel: "manifest", url: "/site.webmanifest" },
    ],
  },
  openGraph: {
    title: "1BillionPixel.fun",
    description: "Own Your Pixel of Pumpfun history",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
    url: "https://1billionpixel.fun",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
};