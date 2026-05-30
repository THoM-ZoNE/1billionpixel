// app/providers.tsx
"use client";

import { useEffect, useState } from "react";
import { WalletProvider } from "@/providers/WalletProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Do not attach WalletProvider during SSR or before the first render —
  // but return the children so the page content remains visible.
  // Wallet-dependent components (Navbar, HeroSection) are loaded with dynamic import + ssr:false,
  // so they never run without the provider.
  if (!mounted) return <>{children}</>;

  return (
    <WalletProvider>
      {children}
    </WalletProvider>
  );
}
  