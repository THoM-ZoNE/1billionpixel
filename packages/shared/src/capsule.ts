export const CANVAS_W = 42986;
export const CANVAS_H = 26867;
export const CAPSULE_R = CANVAS_H / 2;           // 13433.5

// Visszaadja, hogy az (x,y) pont a kapszulán belül van-e
export function isInsideCapsule(x: number, y: number): boolean {
  const cy = CANVAS_H / 2;
  const r  = CANVAS_H / 2;

  // Bal félkör középpontja: (r, cy), jobb: (WORLD_W - r, cy)
  if (x < r) {
    const dx = x - r;
    const dy = y - cy;
    return dx * dx + dy * dy <= r * r;
  }
  if (x > CANVAS_W - r) {
    const dx = x - (CANVAS_W - r);
    const dy = y - cy;
    return dx * dx + dy * dy <= r * r;
  }
  return true; // középső téglalap mindig belül
}

// Visszaadja, hogy egy téglalap TELJESEN belül van-e (claim ellenőrzés)
export function isClaimable(
  ax: number, ay: number, aw: number, ah: number,
  step = 50
): boolean {
  for (let x = ax; x <= ax + aw; x += step) {
    for (let y = ay; y <= ay + ah; y += step) {
      if (!isInsideCapsule(x, y)) return false;
    }
  }
  // Sarkok ellenőrzése
  for (const [px, py] of [
    [ax, ay], [ax+aw, ay], [ax, ay+ah], [ax+aw, ay+ah]
  ]) {
    if (!isInsideCapsule(px, py)) return false;
  }
  return true;
}

export function isTileFullyOutside(
  tx: number, ty: number,
  tw: number, th: number,
  step = 50 // 50px-enként mintavételez
): boolean {
  for (let x = tx; x <= tx + tw; x += step) {
    for (let y = ty; y <= ty + th; y += step) {
      if (isInsideCapsule(x, y)) return false;
    }
  }
  // Sarkok explicit ellenőrzése
  for (const [px, py] of [
    [tx, ty], [tx + tw, ty], [tx, ty + th], [tx + tw, ty + th],
  ]) {
    if (isInsideCapsule(px, py)) return false;
  }
  return true;
}

export function isTilePartiallyOutside(
  tx: number, ty: number,
  tw: number, th: number,
  step = 50
): boolean {
  for (let x = tx; x <= tx + tw; x += step) {
    for (let y = ty; y <= ty + th; y += step) {
      if (!isInsideCapsule(x, y)) return true;
    }
  }
  return false;
}