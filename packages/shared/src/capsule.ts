// packages/shared/src/capsule.ts
// ─── Kapszula geometria — egyetlen igazság forrás (frontend + backend) ───────

export const CAPSULE_W = 51136;
export const CAPSULE_H = 21494;
export const CAPSULE_R = 10747; // = CAPSULE_H / 2

export const WORLD_W = 61363;   // CAPSULE_W × 1.2
export const WORLD_H = 25793;   // CAPSULE_H × 1.2

export const CAPSULE_OFFSET_X = 5114;  // (WORLD_W - CAPSULE_W) / 2
export const CAPSULE_OFFSET_Y = 2150;  // (WORLD_H - CAPSULE_H) / 2

// Legacy alias-ok — ha valahol még CANVAS_W/H van importálva, nem törik el
export const CANVAS_W = WORLD_W;
export const CANVAS_H = WORLD_H;

// ─── Pont-szintű ellenőrzés (world koordinátákban) ────────────────────────────

export function isInsideCapsule(wx: number, wy: number): boolean {
  // World → lokális kapszula koordináta
  const lx = wx - CAPSULE_OFFSET_X;
  const ly = wy - CAPSULE_OFFSET_Y;

  // Befoglaló téglalap ellenőrzés
  if (lx < 0 || ly < 0 || lx > CAPSULE_W || ly > CAPSULE_H) return false;

  const cy = CAPSULE_H / 2;

  // Bal félkör
  if (lx < CAPSULE_R) {
    const dx = lx - CAPSULE_R;
    const dy = ly - cy;
    return dx * dx + dy * dy <= CAPSULE_R * CAPSULE_R;
  }

  // Jobb félkör
  if (lx > CAPSULE_W - CAPSULE_R) {
    const dx = lx - (CAPSULE_W - CAPSULE_R);
    const dy = ly - cy;
    return dx * dx + dy * dy <= CAPSULE_R * CAPSULE_R;
  }

  // Középső téglalap — mindig belül
  return true;
}

// ─── Téglalap-szintű ellenőrzések ─────────────────────────────────────────────

/**
 * Claim validáció: a téglalap ÖSSZES pontja a kapszulán belül kell legyen.
 * Csak a 4 sarokpontot ellenőrzi — ez elégséges a konvex kapszula formánál.
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
 * Tile teljesen kívül van-e? (renderer optimalizáláshoz)
 */
export function isTileFullyOutside(
  tx: number,
  ty: number,
  tw: number,
  th: number,
): boolean {
  // Ha bármely sarok belül van, nem teljesen kívül
  if (isInsideCapsule(tx,      ty))      return false;
  if (isInsideCapsule(tx + tw, ty))      return false;
  if (isInsideCapsule(tx,      ty + th)) return false;
  if (isInsideCapsule(tx + tw, ty + th)) return false;

  // Élközéppontok is — hogy a félkörök ne csússzanak át
  if (isInsideCapsule(tx + tw / 2, ty))       return false;
  if (isInsideCapsule(tx + tw / 2, ty + th))  return false;
  if (isInsideCapsule(tx,      ty + th / 2))  return false;
  if (isInsideCapsule(tx + tw, ty + th / 2))  return false;

  return true;
}

/**
 * Tile részben kívül van-e? (partial overlap detekció)
 */
export function isTilePartiallyOutside(
  tx: number,
  ty: number,
  tw: number,
  th: number,
): boolean {
  return !isClaimable(tx, ty, tw, th);
}