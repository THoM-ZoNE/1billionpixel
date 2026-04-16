import { create } from "zustand";
import { WalletDTO } from "@1bp/shared";
import { api }        from "@/lib/api";

interface WalletState {
  walletData:    WalletDTO | null;
  isLoading:     boolean;
  fetchWallet:   (address: string) => Promise<void>;
  clearWallet:   () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  walletData:  null,
  isLoading:   false,

  fetchWallet: async (address) => {
    set({ isLoading: true });
    try {
      const data = await api.get<WalletDTO>(`/wallet/${address}`);
      set({ walletData: data });
    } finally {
      set({ isLoading: false });
    }
  },

  clearWallet: () => set({ walletData: null }),
}));
