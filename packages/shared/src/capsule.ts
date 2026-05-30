// packages/shared/src/capsule.ts
// ─── Capsule geometry — single source of truth (frontend + backend) ───────

export const CAPSULE_W = 51136;
export const CAPSULE_H = 21494;
export const CAPSULE_R = 10747; // = CAPSULE_H / 2

export const WORLD_W = 61363;   // CAPSULE_W × 1.2
export const WORLD_H = 25793;   // CAPSULE_H × 1.2

export const CAPSULE_OFFSET_X = 5114;  // (WORLD_W - CAPSULE_W) / 2
export const CAPSULE_OFFSET_Y = 2150;  // (WORLD_H - CAPSULE_H) / 2

// Legacy aliases — if CANVAS_W/H is still imported somewhere, it won't break
export const CANVAS_W = WORLD_W;
export const CANVAS_H = WORLD_H;

// ─── Point-level checks (in world coordinates) ────────────────────────────

export function isInsideCapsule(wx: number, wy: number): boolean {
  // World → local capsule coordinate
  const lx = wx - CAPSULE_OFFSET_X;
  const ly = wy - CAPSULE_OFFSET_Y;

  // Bounding-rectangle check
  if (lx < 0 || ly < 0 || lx > CAPSULE_W || ly > CAPSULE_H) return false;

  const cy = CAPSULE_H / 2;

  // Left semicircle
  if (lx < CAPSULE_R) {
    const dx = lx - CAPSULE_R;
    const dy = ly - cy;
    return dx * dx + dy * dy <= CAPSULE_R * CAPSULE_R;
  }

  // Right semicircle
  if (lx > CAPSULE_W - CAPSULE_R) {
    const dx = lx - (CAPSULE_W - CAPSULE_R);
    const dy = ly - cy;
    return dx * dx + dy * dy <= CAPSULE_R * CAPSULE_R;
  }

  // Middle rectangle — always inside
  return true;
}

// ─── Rectangle-level checks ─────────────────────────────────────────────

/*
 * Claim validation: every point of the rectangle must be inside the capsule.
 * Only the 4 corner points are checked — this is sufficient for the convex capsule shape.
 */
export function isClaimable(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
): boolean {
  return (
    isInsideCapsule(ax,      ay) &&
    isInsideCapsule(ax + aw, ay) &&
    isInsideCapsule(ax,      ay + ah) &&
    isInsideCapsule(ax + aw, ay + ah)
  );
}

/**
 * Is the tile fully outside? (for renderer optimization)
 */
export function isTileFullyOutside(
  tx: number,
  ty: number,
  tw: number,
  th: number,
): boolean {
  // If any corner is inside, it's not fully outside
  if (isInsideCapsule(tx,      ty))      return false;
  if (isInsideCapsule(tx + tw, ty))      return false;
  if (isInsideCapsule(tx,      ty + th)) return false;
  if (isInsideCapsule(tx + tw, ty + th)) return false;

  // Edge midpoints too — so semicircles don't slip through
  if (isInsideCapsule(tx + tw / 2, ty))       return false;
  if (isInsideCapsule(tx + tw / 2, ty + th))  return false;
  if (isInsideCapsule(tx,      ty + th / 2))  return false;
  if (isInsideCapsule(tx + tw, ty + th / 2))  return false;

  return true;
}

/**
 * Is the tile partially outside? (partial overlap detection)
 */
export function isTilePartiallyOutside(
  tx: number,
  ty: number,
  tw: number,
  th: number,
): boolean {
  return !isClaimable(tx, ty, tw, th);
}