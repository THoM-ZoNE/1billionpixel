"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletStore } from "@/store/walletStore";
import { ClaimModal } from "@/components/pixel/ClaimModal";
import { useCanvasStore } from "@/store/canvasStore";
import { useEffect, useRef, useCallback, useState } from "react";
import { onCanvasEvent, connectWebSocket } from "@/lib/websocket";
import { api } from "@/lib/api";
import {
  WORLD_W, WORLD_H, WORLD_RATIO,
  drawCapsulePath, isRectInsideCapsule,
} from "@/lib/capsuleConfig";

const RATIOS: Record<string, [number, number]> = {
  "Free": [0, 0], "1:1": [1, 1], "4:3": [4, 3],
  "16:9": [16, 9], "21:9": [21, 9], "9:16": [9, 16],
};

const MIN_PX        = 10;
const GRID_SNAP     = 10;
const NEIGHBOR_SNAP = 20;

const snapToGrid      = (v: number) => Math.round(v / GRID_SNAP) * GRID_SNAP;
const snapToNeighbors = (val: number, edges: number[], threshold: number) => {
  let best = val, bestDist = threshold;
  for (const e of edges) { const d = Math.abs(val - e); if (d < bestDist) { bestDist = d; best = e; } }
  return best;
};

interface Area {
  id?: string;
  x: number; y: number; width: number; height: number;
  status: "ACTIVE" | "AT_RISK" | "FORBIDDEN" | "RELEASED";
  imageUrl?: string;
}

type Sel = { x: number; y: number; w: number; h: number };

export function ClaimSection() {
  const { connected }                       = useWallet();
  const { walletData }                      = useWalletStore();
  const { areas, setAreas, addArea, removeArea } = useCanvasStore();

  // ── Refs ──────────────────────────────────────────────────────────────────
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const dragStart       = useRef<{ wx: number; wy: number } | null>(null);
  const previewImgRef   = useRef<HTMLImageElement | null>(null);
  const panStart        = useRef<{ cx: number; cy: number; tx: number; ty: number } | null>(null);
  const spacePressedRef = useRef(false);
  const vtRef           = useRef({ x: 0, y: 0, scale: 1 });
  const draggingRef     = useRef(false);
  const selectionRef    = useRef<Sel | null>(null);
  const rafRef          = useRef<number | null>(null);
  const isPanningRef    = useRef(false);
  const isMoveRef       = useRef(false);
  const moveOffsetRef   = useRef<{ dx: number; dy: number } | null>(null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [ratioKey,        setRatioKey]        = useState("16:9");
  const [selection,       setSelection]       = useState<Sel | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [modalRegion,     setModalRegion]     = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [previewImage,    setPreviewImage]    = useState<string | null>(null);
  const [zoomDisplay,     setZoomDisplay]     = useState(1);
  const [cursorStyle,     setCursorStyle]     = useState("cell");

  const availableQuota = Number(walletData?.availableQuota ?? 0);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getEdges = useCallback(() => {
    const xEdges = [0, WORLD_W];
    const yEdges = [0, WORLD_H];
    (Array.isArray(areas) ? areas : []).forEach(a => {
      xEdges.push(a.x, a.x + a.width);
      yEdges.push(a.y, a.y + a.height);
    });
    return { xEdges, yEdges };
  }, [areas]);

  const overlapsAnyArea = useCallback((x: number, y: number, w: number, h: number): boolean => {
    return (Array.isArray(areas) ? areas : []).some(a => {
      if (a.status === "FORBIDDEN" || a.status === "RELEASED") return false;
      return x < a.x + a.width && x + w > a.x && y < a.y + a.height && y + h > a.y;
    });
  }, [areas]);

  const snapPosition = useCallback((x: number, y: number, w: number, h: number): Sel => {
    const { xEdges, yEdges } = getEdges();
    const snappedLeft   = snapToNeighbors(x,     xEdges, NEIGHBOR_SNAP);
    const snappedRight  = snapToNeighbors(x + w, xEdges, NEIGHBOR_SNAP);
    const snappedTop    = snapToNeighbors(y,     yEdges, NEIGHBOR_SNAP);
    const snappedBottom = snapToNeighbors(y + h, yEdges, NEIGHBOR_SNAP);
    const dLeft   = Math.abs(snappedLeft  - x);
    const dRight  = Math.abs(snappedRight - (x + w));
    const dTop    = Math.abs(snappedTop   - y);
    const dBottom = Math.abs(snappedBottom - (y + h));
    const finalX = dLeft <= dRight
      ? (dLeft  < NEIGHBOR_SNAP ? snappedLeft      : snapToGrid(x))
      : (dRight < NEIGHBOR_SNAP ? snappedRight - w : snapToGrid(x));
    const finalY = dTop <= dBottom
      ? (dTop    < NEIGHBOR_SNAP ? snappedTop       : snapToGrid(y))
      : (dBottom < NEIGHBOR_SNAP ? snappedBottom - h : snapToGrid(y));
    return {
      x: Math.max(0, Math.min(finalX, WORLD_W - w)),
      y: Math.max(0, Math.min(finalY, WORLD_H - h)),
      w, h,
    };
  }, [getEdges]);

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadAreas = useCallback(async () => {
    const data = await api.get<any>(`/canvas/areas?x=0&y=0&w=${WORLD_W}&h=${WORLD_H}`);
    setAreas(Array.isArray(data) ? data : (data?.areas ?? []));
  }, [setAreas]);

  useEffect(() => {
    connectWebSocket();
    loadAreas();
    const off1 = onCanvasEvent("AREA_CLAIMED",   (d) => addArea(d.area));
    const off2 = onCanvasEvent("AREA_RELEASED",  (d) => removeArea(d.areaId));
    const off3 = onCanvasEvent("IMAGE_UPLOADED", loadAreas);
    return () => { off1(); off2(); off3(); };
  }, []);

  useEffect(() => {
    if (!previewImage) { previewImgRef.current = null; return; }
    const img = new window.Image();
    img.src = previewImage;
    img.onload = () => { previewImgRef.current = img; };
  }, [previewImage]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        spacePressedRef.current = true;
        if (!isPanningRef.current) setCursorStyle("grab");
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePressedRef.current = false;
        if (!isPanningRef.current) setCursorStyle("cell");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, []);

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx    = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const { x: tx, y: ty, scale } = vtRef.current;
    const sx = (W / WORLD_W) * scale;
    const sy = (H / WORLD_H) * scale;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(tx, ty);

    // Forbidden area — always red outside the capsule
    ctx.save();
    ctx.fillStyle = "rgba(160,20,20,0.65)";
    ctx.beginPath();
    drawCapsulePath(ctx, sx, sy, 0, 0);
    ctx.rect(-tx, -ty, W, H);
    ctx.fill("evenodd");
    ctx.restore();

    // Capsule clip
    ctx.save();
    drawCapsulePath(ctx, sx, sy, 0, 0);
    ctx.clip();
    ctx.fillStyle = "#060a06";
    ctx.fillRect(-tx / scale, -ty / scale, W / scale, H / scale);

    // Grid
    const step = Math.round(WORLD_W / 40) * sx;
    ctx.strokeStyle = "rgba(20,241,149,0.05)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < WORLD_W * sx; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H * sy); ctx.stroke(); }
    for (let y = 0; y < WORLD_H * sy; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W * sx, y); ctx.stroke(); }

    // Areas
    (Array.isArray(areas) ? areas : []).forEach((a: Area) => {
      if (a.status === "FORBIDDEN" || a.status === "RELEASED") return;
      const cx = a.x * sx, cy = a.y * sy, cw = a.width * sx, ch = a.height * sy;
      ctx.fillStyle   = a.status === "AT_RISK" ? "rgba(245,158,11,0.5)" : "rgba(153,69,255,0.5)";
      ctx.strokeStyle = a.status === "AT_RISK" ? "rgba(245,158,11,0.8)" : "rgba(153,69,255,0.8)";
      ctx.fillRect(cx, cy, cw, ch);
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, cy, cw, ch);
    });

    // Preview + selection
    const sel = selectionRef.current ?? selection;
    if (sel && previewImgRef.current) {
      ctx.globalAlpha = 0.75;
      ctx.drawImage(previewImgRef.current, sel.x * sx, sel.y * sy, sel.w * sx, sel.h * sy);
      ctx.globalAlpha = 1;
    }

    if (sel) {
      const { x, y, w, h } = sel;
      const valid     = isRectInsideCapsule(x, y, w, h);
      const noOverlap = !overlapsAnyArea(x, y, w, h);
      const canCl     = w * h <= availableQuota && w * h > 0;
      const isOk      = valid && noOverlap && canCl;

      ctx.fillStyle   = isOk ? "rgba(20,241,149,0.18)" : "rgba(239,68,68,0.18)";
      ctx.fillRect(x * sx, y * sy, w * sx, h * sy);
      ctx.strokeStyle = isOk ? "rgba(20,241,149,0.9)" : "rgba(239,68,68,0.9)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(x * sx, y * sy, w * sx, h * sy);
      ctx.setLineDash([]);

      // Move icon
      if (!draggingRef.current) {
        const cx = (x + w / 2) * sx;
        const cy = (y + h / 2) * sy;
        ctx.fillStyle = "rgba(20,241,149,0.5)";
        ctx.font = `${Math.max(12, 14 / scale)}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText("✥", cx, cy + 5);
        ctx.textAlign = "left";
      }

      // Snap edge highlight
      const { xEdges, yEdges } = (() => {
        const xe = [0, WORLD_W]; const ye = [0, WORLD_H];
        (Array.isArray(areas) ? areas : []).forEach(a => { xe.push(a.x, a.x + a.width); ye.push(a.y, a.y + a.height); });
        return { xEdges: xe, yEdges: ye };
      })();
      ctx.strokeStyle = "rgba(20,241,149,1)";
      ctx.lineWidth = 1.5;
      if (xEdges.some(e => Math.abs(x - e)       <= 1)) { ctx.beginPath(); ctx.moveTo(x * sx,       y * sy); ctx.lineTo(x * sx,       (y + h) * sy); ctx.stroke(); }
      if (xEdges.some(e => Math.abs((x + w) - e) <= 1)) { ctx.beginPath(); ctx.moveTo((x+w) * sx,   y * sy); ctx.lineTo((x+w) * sx,   (y + h) * sy); ctx.stroke(); }
      if (yEdges.some(e => Math.abs(y - e)        <= 1)) { ctx.beginPath(); ctx.moveTo(x * sx,       y * sy); ctx.lineTo((x+w) * sx,   y * sy);       ctx.stroke(); }
      if (yEdges.some(e => Math.abs((y + h) - e)  <= 1)) { ctx.beginPath(); ctx.moveTo(x * sx, (y+h) * sy); ctx.lineTo((x+w) * sx, (y+h) * sy);     ctx.stroke(); }

      // Label
      const label = !valid     ? "Outside the capsule!"
                  : !noOverlap ? "Overlaps claimed area!"
                  : !canCl     ? "Insufficient quota!"
                  : `${Math.round(w)} × ${Math.round(h)} px`;
      ctx.fillStyle = isOk ? "rgba(20,241,149,0.9)" : "rgba(239,68,68,0.9)";
      ctx.font = `bold ${Math.max(10, 11 / scale)}px monospace`;
      ctx.fillText(label, x * sx + 4, y * sy - 5);
    }

    ctx.restore(); // clip restore

    // Capsule stroke
    drawCapsulePath(ctx, sx, sy, 0, 0);
    ctx.strokeStyle = "rgba(20,241,149,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore(); // translate restore
  }, [areas, availableQuota, overlapsAnyArea, selection]);

  // ── Resize ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const resize = () => {
      const w = canvas.parentElement?.clientWidth ?? 800;
      canvas.width  = w;
      canvas.height = Math.round(w / WORLD_RATIO);
      draw();
    };
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(canvas.parentElement!);
    return () => obs.disconnect();
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  // ── Wheel ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (canvas.width  / rect.width);
      const cy = (e.clientY - rect.top)  * (canvas.height / rect.height);
      const { x: px, y: py, scale: ps } = vtRef.current;
      const factor   = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.5, Math.min(20, ps * factor));
      vtRef.current  = { x: cx - (cx - px) * (newScale / ps), y: cy - (cy - py) * (newScale / ps), scale: newScale };
      setZoomDisplay(newScale);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => draw());
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [draw]);

  // ── World coordinates ─────────────────────────────────────────────────────
  const toWorld = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return null;
    const rect   = canvas.getBoundingClientRect();
    const { x: tx, y: ty, scale } = vtRef.current;
    const W = canvas.width, H = canvas.height;
    const canvasX = (e.clientX - rect.left) * (W / rect.width);
    const canvasY = (e.clientY - rect.top)  * (H / rect.height);
    const worldSx = (W / WORLD_W) * scale;
    const worldSy = (H / WORLD_H) * scale;
    return {
      wx: Math.max(0, Math.min(Math.round((canvasX - tx) / worldSx), WORLD_W - 1)),
      wy: Math.max(0, Math.min(Math.round((canvasY - ty) / worldSy), WORLD_H - 1)),
    };
  };

  const toWorldSnapped = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const base = toWorld(e); if (!base) return null;
    let { wx, wy } = base;
    const { xEdges, yEdges } = getEdges();
    wx = snapToNeighbors(wx, xEdges, NEIGHBOR_SNAP);
    wy = snapToNeighbors(wy, yEdges, NEIGHBOR_SNAP);
    if (!xEdges.some(ex => Math.abs(wx - ex) < 0.5)) wx = snapToGrid(wx);
    if (!yEdges.some(ey => Math.abs(wy - ey) < 0.5)) wy = snapToGrid(wy);
    return { wx, wy };
  };

  const applyRatio = (w: number, h: number): [number, number] => {
    const ratio = RATIOS[ratioKey];
    if (!ratio[0]) return [w, h];
    return [w, Math.round(w * ratio[1] / ratio[0])];
  };

  // ── Mouse handlers ────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (e.button === 0 && spacePressedRef.current)) {
      e.preventDefault();
      panStart.current     = { cx: e.clientX, cy: e.clientY, tx: vtRef.current.x, ty: vtRef.current.y };
      isPanningRef.current = true;
      setCursorStyle("grabbing");
      return;
    }
    if (e.button !== 0) return;
    const pos = toWorldSnapped(e); if (!pos) return;
    const sel = selectionRef.current ?? selection;

    // Move when clicking inside the selection
    if (sel && pos.wx >= sel.x && pos.wx <= sel.x + sel.w && pos.wy >= sel.y && pos.wy <= sel.y + sel.h) {
      isMoveRef.current     = true;
      draggingRef.current   = true;
      moveOffsetRef.current = { dx: pos.wx - sel.x, dy: pos.wy - sel.y };
      setCursorStyle("grabbing");
      return;
    }

    // New selection
    isMoveRef.current    = false;
    dragStart.current    = { wx: pos.wx, wy: pos.wy };
    draggingRef.current  = true;
    selectionRef.current = null;
    setSelection(null);
    setValidationError(null);
    setCursorStyle("crosshair");
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Pan
    if (isPanningRef.current && panStart.current) {
      vtRef.current = {
        ...vtRef.current,
        x: panStart.current.tx + (e.clientX - panStart.current.cx),
        y: panStart.current.ty + (e.clientY - panStart.current.cy),
      };
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => draw());
      return;
    }

    // Update cursor hover (only when not dragging)
    if (!draggingRef.current) {
      const pos = toWorld(e);
      const sel = selectionRef.current ?? selection;
      if (pos && sel && pos.wx >= sel.x && pos.wx <= sel.x + sel.w && pos.wy >= sel.y && pos.wy <= sel.y + sel.h) {
        setCursorStyle("grab");
      } else {
        setCursorStyle(spacePressedRef.current ? "grab" : "cell");
      }
      return;
    }

    const pos = toWorldSnapped(e); if (!pos) return;

    // Move
    if (isMoveRef.current && moveOffsetRef.current) {
      const sel = selectionRef.current ?? selection;
      if (!sel) return;
      const rawX = Math.max(0, Math.min(pos.wx - moveOffsetRef.current.dx, WORLD_W - sel.w));
      const rawY = Math.max(0, Math.min(pos.wy - moveOffsetRef.current.dy, WORLD_H - sel.h));
      selectionRef.current = snapPosition(rawX, rawY, sel.w, sel.h);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => draw());
      return;
    }

    // Draw new selection
    if (!dragStart.current) return;
    let w = Math.abs(pos.wx - dragStart.current.wx) || 1;
    let h = Math.abs(pos.wy - dragStart.current.wy) || 1;
    [w, h] = applyRatio(w, h);
    selectionRef.current = {
      x: Math.min(dragStart.current.wx, pos.wx),
      y: Math.min(dragStart.current.wy, pos.wy),
      w, h,
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => draw());
  };

  const onMouseUp = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      panStart.current     = null;
      setCursorStyle("cell");
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => draw());
      return;
    }
    draggingRef.current   = false;
    isMoveRef.current     = false;
    moveOffsetRef.current = null;
    setCursorStyle("cell");
    const sel = selectionRef.current;
    if (!sel) return;
    if (sel.w < MIN_PX || sel.h < MIN_PX) {
      setValidationError(`Minimum selectable size: ${MIN_PX}×${MIN_PX} px`);
      selectionRef.current = null; draw(); return;
    }
    if (!isRectInsideCapsule(sel.x, sel.y, sel.w, sel.h)) {
      setValidationError("The selected area lies outside the capsule!");
      selectionRef.current = null; draw(); return;
    }
    if (overlapsAnyArea(sel.x, sel.y, sel.w, sel.h)) {
      setValidationError("The selected area overlaps an already claimed area!");
      selectionRef.current = null; draw(); return;
    }
    setSelection({ ...sel });
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const pixelCount = selection ? selection.w * selection.h : 0;
  const canClaim   = pixelCount > 0 && pixelCount <= availableQuota
                  && !!selection
                  && isRectInsideCapsule(selection.x, selection.y, selection.w, selection.h)
                  && !overlapsAnyArea(selection.x, selection.y, selection.w, selection.h);

  if (!connected) return null;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "white", margin: 0 }}>Claim Your Pixels</h2>
          {walletData && (
            <p style={{ fontSize: "0.8rem", color: "rgba(20,241,149,0.8)", margin: "0.2rem 0 0" }}>
              {availableQuota.toLocaleString()} pixel available for claiming
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {Object.keys(RATIOS).map(k => (
            <button key={k}
              onClick={() => { setRatioKey(k); setSelection(null); selectionRef.current = null; draw(); }}
              style={{
                padding: "0.3rem 0.75rem", borderRadius: "0.4rem", border: "none",
                cursor: "pointer", fontSize: "0.75rem", fontWeight: 600,
                background: ratioKey === k ? "#14f195" : "rgba(255,255,255,0.08)",
                color:      ratioKey === k ? "#000"    : "rgba(255,255,255,0.6)",
                transition: "all 0.15s",
              }}>{k}</button>
          ))}
          {selection && (
            <button
              onClick={() => { setSelection(null); selectionRef.current = null; draw(); }}
              style={{ padding: "0.3rem 0.75rem", borderRadius: "0.4rem", border: "none",
                cursor: "pointer", fontSize: "0.75rem", fontWeight: 600,
                background: "rgba(239,68,68,0.2)", color: "#ef4444" }}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Info row */}
      <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", fontFamily: "monospace", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        <span>Canvas: {WORLD_W.toLocaleString()} × {WORLD_H.toLocaleString()} px</span>
        <span>Zoom: {zoomDisplay.toFixed(2)}×</span>
        {selection && (
          <>
            <span style={{ color: "rgba(20,241,149,0.7)" }}>
              Selection: {selection.x},{selection.y} → {selection.w}×{selection.h}
            </span>
            <span style={{ color: canClaim ? "rgba(20,241,149,0.9)" : "rgba(239,68,68,0.9)" }}>
              {pixelCount.toLocaleString()} px {canClaim ? "✓" : "— insufficient quota"}
            </span>
          </>
        )}
      </div>

      {/* Canvas */}
      <div style={{
        width: "100%", position: "relative", borderRadius: "0.75rem", overflow: "hidden",
        border: "2px solid rgba(20,241,149,0.45)",
        boxShadow: "0 0 48px rgba(20,241,149,0.06), inset 0 0 0 1px rgba(20,241,149,0.1)",
        background: "#060a06",
      }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", cursor: cursorStyle }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => {
            draggingRef.current  = false;
            isPanningRef.current = false;
            panStart.current     = null;
            setCursorStyle("cell");
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => draw());
          }}
        />
      </div>

      {/* Validation error */}
      {validationError && (
        <div style={{ color: "#f87171", fontSize: "0.78rem", fontFamily: "monospace",
          background: "rgba(239,68,68,0.1)", borderRadius: "0.5rem",
          padding: "0.5rem 0.75rem", textAlign: "center" }}>
          ⚠ {validationError}
        </div>
      )}

      {/* Legend + Claim Button */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "0.75rem", padding: "0.5rem 0.75rem",
        background: "rgba(255,255,255,0.03)", borderRadius: "0.5rem",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.7rem" }}>
          <span style={{ color: "rgba(153,69,255,0.9)" }}>● Claimed</span>
          <span style={{ color: "rgba(245,158,11,0.9)" }}>● At Risk</span>
          <span style={{ color: "rgba(20,241,149,0.7)" }}>● Selected</span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>Scroll = Zoom · Space/Middle+Drag = Pan · Draw = Select · ✥ = Move</span>
        </div>
        <button
          disabled={!canClaim}
          onClick={() => selection && setModalRegion({ x: selection.x, y: selection.y, width: selection.w, height: selection.h })}
          style={{
            padding: "0.6rem 1.5rem", borderRadius: "0.5rem", border: "none",
            cursor: canClaim ? "pointer" : "not-allowed",
            fontWeight: 700, fontSize: "0.9rem",
            background: canClaim ? "linear-gradient(135deg,#14f195,#9945ff)" : "rgba(255,255,255,0.1)",
            color:      canClaim ? "#000" : "rgba(255,255,255,0.3)",
            transition: "all 0.2s",
          }}>
          {selection ? `Claim ${pixelCount.toLocaleString()} pixel →` : "Claim pixels"}
        </button>
      </div>

      {/* Claim Modal */}
      {modalRegion && walletData && (
        <ClaimModal
          region={modalRegion}
          availableQuota={walletData.availableQuota}
          onClose={() => { setModalRegion(null); setSelection(null); setPreviewImage(null); }}
          onSuccess={loadAreas}
          onImageSelected={(dataUrl) => setPreviewImage(dataUrl)}
        />
      )}
    </section>
  );
}