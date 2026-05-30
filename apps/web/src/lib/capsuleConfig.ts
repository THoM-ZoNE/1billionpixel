// ─── Capsule Geometry — single source of truth ───────────────────────────────
// The capsule's actual pixel dimensions in world coordinates
export const CAPSULE_W = 51136;
export const CAPSULE_H = 21494;
export const CAPSULE_R = 10747; // = CAPSULE_H / 2

// The "world" canvas is 20% larger so the edge zones remain visible
export const WORLD_W = 61363; // CAPSULE_W × 1.2
export const WORLD_H = 25793; // CAPSULE_H × 1.2

// Offset the capsule inside the world canvas (centered)
export const CAPSULE_OFFSET_X = (WORLD_W - CAPSULE_W) / 2; // ≈ 5113
export const CAPSULE_OFFSET_Y = (WORLD_H - CAPSULE_H) / 2; // ≈ 2149

// Display aspect ratio (display_width / display_height)
export const WORLD_RATIO = WORLD_W / WORLD_H; // ≈ 2.379

// ─── Capsule path drawer — works for any canvas size ─────────────────────────
// Draw the capsule in world coordinates, mapped to canvas pixels.
// ox/oy: world origin offset in canvas pixels (pan)
// scaleX/scaleY: world px → canvas px scaling
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

/** World coordinates → canvas px */
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

/** Canvas px → world coordinates */
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

/** Is a world-coordinate point inside the capsule? */
export function isInsideCapsule(wx: number, wy: number): boolean {
  const lx = wx - CAPSULE_OFFSET_X;
  const ly = wy - CAPSULE_OFFSET_Y;
  if (lx < 0 || ly < 0 || lx > CAPSULE_W || ly > CAPSULE_H) return false;

  const midY = CAPSULE_H / 2;

  // Left semicircle zone
  if (lx < CAPSULE_R) {
    const dx = lx - CAPSULE_R;
    const dy = ly - midY;
    return dx * dx + dy * dy <= CAPSULE_R * CAPSULE_R;
  }
  // Right semicircle zone
  if (lx > CAPSULE_W - CAPSULE_R) {
    const dx = lx - (CAPSULE_W - CAPSULE_R);
    const dy = ly - midY;
    return dx * dx + dy * dy <= CAPSULE_R * CAPSULE_R;
  }
  // Rectangle zone
  return true;
}

/** Is a rectangle (world coordinates) entirely inside the capsule? */
export function isRectInsideCapsule(
  wx: number, wy: number, ww: number, wh: number
): boolean {
  // Check all 4 corner points
  return (
    isInsideCapsule(wx,      wy) &&
    isInsideCapsule(wx + ww, wy) &&
    isInsideCapsule(wx,      wy + wh) &&
    isInsideCapsule(wx + ww, wy + wh)
  );
}
