// app/providers.tsx
"use client";

import { useEffect, useState } from "react";
import { WalletProvider } from "@/providers/WalletProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // SSR-ben és első render előtt a WalletProvider-t NEM rendelünk —
  // de a children-t visszaadjuk, hogy az oldal tartalma látható legyen.
  // A wallet-függő komponensek (Navbar, HeroSection) dynamic import + ssr:false-szal
  // töltődnek be, így ők sosem futnak le provider nélkül.
  if (!mounted) return <>{children}</>;

  return (
    <WalletProvider>
      {children}
    </WalletProvider>
  );
}
  