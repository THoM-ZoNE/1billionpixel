import { create } from "zustand";
import { WalletDTO } from "@1bp/shared";
import { api } from "@/lib/api";

interface WalletState {
  walletData: WalletDTO | null;
  isLoading: boolean;
  fetchWallet: (address: string) => Promise<WalletDTO | null>;
  refreshWalletData: (address: string) => Promise<void>;  
  clearWallet: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  walletData: null,
  isLoading: false,
  fetchWallet: async (address) => {
    set({ isLoading: true });
    try {
      const data = await api.get<WalletDTO>(`/wallet/${address}`);
      set({ walletData: data });
      return data;
    } catch {
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  refreshWalletData: async (address) => {        // ← NEW
    try {
      const data = await api.get<WalletDTO>(`/wallet/${address}`);
      set({ walletData: data });
    } catch {}
  },
  clearWallet: () => set({ walletData: null }),
}));