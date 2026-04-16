import { create } from "zustand";
import { PixelAreaDTO } from "@1bp/shared";

interface CanvasState {
  areas:       PixelAreaDTO[];
  viewport:    { x: number; y: number; scale: number };
  addArea:     (area: PixelAreaDTO) => void;
  removeArea:  (id: string) => void;
  setAreas:    (areas: any) => void;  // any hogy ne dobjon TS hibát
  setViewport: (v: Partial<CanvasState["viewport"]>) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  areas:    [],
  viewport: { x: 0, y: 0, scale: 1 },

  addArea:     (area)  => set((s) => ({ areas: [...s.areas, area] })),
  removeArea:  (id)    => set((s) => ({ areas: s.areas.filter((a) => a.id !== id) })),
  setAreas:    (data)  => set({ areas: Array.isArray(data) ? data : (data?.areas ?? []) }),
  setViewport: (v)     => set((s) => ({ viewport: { ...s.viewport, ...v } })),
}));
