export * from "./capsule";
export const TILE_SIZE     = 100;   // 100x100 pixel tiles
export const MIN_AREA_SIZE = 100;   // minimum 10x10 = 100 pixels
export const GRACE_PERIOD_HOURS = 72;
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif"];
export const MAX_FILE_SIZE_MB   = 10;

export type AreaStatus = "ACTIVE" | "AT_RISK" | "RELEASED" | "FORBIDDEN";

export interface PixelAreaDTO {
  id: string;
  walletAddress: string;
  x: number; y: number;
  width: number; height: number;
  pixelCount: number;
  imageUrl: string | null;
  status: AreaStatus;
  claimedAt: string;
}

export interface WalletDTO {
  address: string;
  totalQuota: number;
  lockedPixels: number;
  availableQuota: number;
  gracePeriodEnd: string | null;
  areas: PixelAreaDTO[];
}

export interface ClaimAreaPayload {
  walletAddress: string;
  x: number; y: number;
  width: number; height: number;
  signature: string; // signed message proof
}

export interface CanvasRegion {
  x: number; y: number;
  width: number; height: number;
}
