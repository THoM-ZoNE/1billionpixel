// ─── Capsule Geometry — single source of truth ───────────────────────────────
// A kapszula valódi pixel-dimenziói (world-koordináta rendszer)
export const CAPSULE_W = 51136;
export const CAPSULE_H = 21494;
export const CAPSULE_R = 10747; // = CAPSULE_H / 2

// A "world" canvas, ami 20%-kal nagyobb, hogy a sarokzónák is látszódjanak
export const WORLD_W = 61363; // CAPSULE_W × 1.2
export const WORLD_H = 25793; // CAPSULE_H × 1.2

// A kapszula eltolása a world-on belül (középre igazítás)
export const CAPSULE_OFFSET_X = (WORLD_W - CAPSULE_W) / 2; // ≈ 5113
export const CAPSULE_OFFSET_Y = (WORLD_H - CAPSULE_H) / 2; // ≈ 2149

// A megjelenítési arány (display_width / display_height)
export const WORLD_RATIO = WORLD_W / WORLD_H; // ≈ 2.379

// ─── Capsule path rajzoló — bármely canvas mérethez ──────────────────────────
// A kapszulát a world-koordináta rendszerben rajzolja, canvas px-ben.
// ox/oy: a world origójának eltolása canvas px-ben (pan)
// scaleX/scaleY: world px → canvas px skálázás
export function drawCapsulePath(
  ctx: CanvasRenderingContext2D,
  scaleX: number,
  scaleY: number,
  ox = 0,
  oy = 0
) {
  const r = CAPSULE_R * scaleY;
  const x0 = CAPSULE_OFFSET_X * scaleX + ox;
  const y0 = CAPSULE_OFFSET_Y * scaleY + oy;
  const capW = CAPSULE_W * scaleX;
  const capH = CAPSULE_H * scaleY;

  const leftCx  = x0 + r;
  const rightCx = x0 + capW - r;
  const midY    = y0 + capH / 2;

  ctx.beginPath();
  ctx.moveTo(leftCx, y0);
  ctx.lineTo(rightCx, y0);
  ctx.arc(rightCx, midY, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(leftCx, y0 + capH);
  ctx.arc(leftCx,  midY, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
}

// ─── Koordináta-konverziók ────────────────────────────────────────────────────

/** World-koordináta → canvas px */
export function worldToCanvas(
  wx: number, wy: number,
  canvasW: number, canvasH: number,
  zoom = 1, panX = 0, panY = 0
): { x: number; y: number } {
  const sx = (canvasW / WORLD_W) * zoom;
  const sy = (canvasH / WORLD_H) * zoom;
  return {
    x: wx * sx + panX,
    y: wy * sy + panY,
  };
}

/** Canvas px → world-koordináta */
export function canvasToWorld(
  cx: number, cy: number,
  canvasW: number, canvasH: number,
  zoom = 1, panX = 0, panY = 0
): { x: number; y: number } {
  const sx = (canvasW / WORLD_W) * zoom;
  const sy = (canvasH / WORLD_H) * zoom;
  return {
    x: (cx - panX) / sx,
    y: (cy - panY) / sy,
  };
}

/** Egy world-koordinátás pont a kapszulán belül van-e? */
export function isInsideCapsule(wx: number, wy: number): boolean {
  const lx = wx - CAPSULE_OFFSET_X;
  const ly = wy - CAPSULE_OFFSET_Y;
  if (lx < 0 || ly < 0 || lx > CAPSULE_W || ly > CAPSULE_H) return false;

  const midY = CAPSULE_H / 2;

  // Bal félkör zóna
  if (lx < CAPSULE_R) {
    const dx = lx - CAPSULE_R;
    const dy = ly - midY;
    return dx * dx + dy * dy <= CAPSULE_R * CAPSULE_R;
  }
  // Jobb félkör zóna
  if (lx > CAPSULE_W - CAPSULE_R) {
    const dx = lx - (CAPSULE_W - CAPSULE_R);
    const dy = ly - midY;
    return dx * dx + dy * dy <= CAPSULE_R * CAPSULE_R;
  }
  // Téglalap zóna
  return true;
}

/** Egy téglalap (world-koordinátás) teljes egészében a kapszulán belül van-e? */
export function isRectInsideCapsule(
  wx: number, wy: number, ww: number, wh: number
): boolean {
  // Mind a 4 sarokpontot ellenőrizzük
  return (
    isInsideCapsule(wx,      wy) &&
    isInsideCapsule(wx + ww, wy) &&
    isInsideCapsule(wx,      wy + wh) &&
    isInsideCapsule(wx + ww, wy + wh)
  );
}
