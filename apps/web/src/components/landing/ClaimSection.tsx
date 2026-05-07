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

// ─── Képarány opciók ──────────────────────────────────────────────────────────
const RATIOS: Record<string, [number, number]> = {
  "Free": [0, 0],
  "1:1":  [1, 1],
  "4:3":  [4, 3],
  "16:9": [16, 9],
  "21:9": [21, 9],
  "9:16": [9, 16],
};

const MIN_PX = 10;

interface Area {
  id?: string;
  x: number; y: number; width: number; height: number;
  status: "ACTIVE" | "AT_RISK" | "FORBIDDEN" | "RELEASED";
  imageUrl?: string;
}

export function ClaimSection() {
  const { connected } = useWallet();
  const { walletData } = useWalletStore();
  const { areas, setAreas, addArea, removeArea } = useCanvasStore();

  // ── Refs ──────────────────────────────────────────────────────────────────
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const dragStart     = useRef<{ wx: number; wy: number } | null>(null);
  const previewImgRef = useRef<HTMLImageElement | null>(null);
  const panStart      = useRef<{ cx: number; cy: number; tx: number; ty: number } | null>(null);
  const hideTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spacePressedRef = useRef(false);
  const vtRef         = useRef({ x: 0, y: 0, scale: 1 });

  // ── State ─────────────────────────────────────────────────────────────────
  const [ratioKey,        setRatioKey]        = useState("16:9");
  const [selection,       setSelection]       = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [dragging,        setDragging]        = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [modalRegion,     setModalRegion]     = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [previewImage,    setPreviewImage]    = useState<string | null>(null);
  const [viewTransform,   setViewTransform]   = useState({ x: 0, y: 0, scale: 1 });
  const [showForbidden,   setShowForbidden]   = useState(false);
  const [isPanning,       setIsPanning]       = useState(false);

  const availableQuota = Number(walletData?.availableQuota ?? 0);

  // vtRef szinkronban tartása
  useEffect(() => { vtRef.current = viewTransform; }, [viewTransform]);

  // ── Területek betöltése ───────────────────────────────────────────────────
  const loadAreas = useCallback(async () => {
    const data = await api.get<any>(`/canvas/areas?x=0&y=0&w=${WORLD_W}&h=${WORLD_H}`);
    setAreas(Array.isArray(data) ? data : (data?.areas ?? []));
  }, [setAreas]);

  // ── WebSocket + initial load ──────────────────────────────────────────────
  useEffect(() => {
    connectWebSocket();
    loadAreas();
    const off1 = onCanvasEvent("AREA_CLAIMED",   (d) => addArea(d.area));
    const off2 = onCanvasEvent("AREA_RELEASED",  (d) => removeArea(d.areaId));
    const off3 = onCanvasEvent("IMAGE_UPLOADED", loadAreas);
    return () => { off1(); off2(); off3(); };
  }, []);

  // ── Preview image betöltése ───────────────────────────────────────────────
  useEffect(() => {
    if (!previewImage) { previewImgRef.current = null; return; }
    const img = new window.Image();
    img.src = previewImage;
    img.onload = () => { previewImgRef.current = img; };
  }, [previewImage]);

  // ── Space billentyű (pan cursor) ──────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); spacePressedRef.current = true; } };
    const onKeyUp   = (e: KeyboardEvent) => { if (e.code === "Space") spacePressedRef.current = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, []);

  // ── Forbidden flash helper ────────────────────────────────────────────────
  const triggerForbiddenFlash = useCallback(() => {
    setShowForbidden(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowForbidden(false), 800);
  }, []);

  // ── Canvas rajzolás ───────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const { x: tx, y: ty, scale } = vtRef.current;
    const sx = (W / WORLD_W) * scale;
    const sy = (H / WORLD_H) * scale;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(tx, ty);

    // Forbidden zóna — csak showForbidden esetén
    if (showForbidden) {
      ctx.save();
      ctx.fillStyle = "rgba(160,20,20,0.65)";
      ctx.beginPath();
      drawCapsulePath(ctx, sx, sy, 0, 0);
      ctx.rect(-tx, -ty, W, H);
      ctx.fill("evenodd");
      ctx.restore();
    }

    // Kapszula clip
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

    // Területek
    (Array.isArray(areas) ? areas : []).forEach((a: Area) => {
      if (a.status === "FORBIDDEN" || a.status === "RELEASED") return;
      const cx = a.x * sx, cy = a.y * sy, cw = a.width * sx, ch = a.height * sy;
      ctx.fillStyle   = a.status === "AT_RISK" ? "rgba(245,158,11,0.5)" : "rgba(153,69,255,0.5)";
      ctx.strokeStyle = a.status === "AT_RISK" ? "rgba(245,158,11,0.8)" : "rgba(153,69,255,0.8)";
      ctx.fillRect(cx, cy, cw, ch);
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, cy, cw, ch);
    });

    // Preview
    if (selection && previewImgRef.current) {
      ctx.globalAlpha = 0.75;
      ctx.drawImage(previewImgRef.current, selection.x * sx, selection.y * sy, selection.w * sx, selection.h * sy);
      ctx.globalAlpha = 1;
    }

    // Kijelölés
    if (selection) {
      const { x, y, w, h } = selection;
      const valid = isRectInsideCapsule(x, y, w, h);
      const canCl  = w * h <= availableQuota && w * h > 0;
      ctx.fillStyle   = (valid && canCl) ? "rgba(20,241,149,0.18)" : "rgba(239,68,68,0.18)";
      ctx.fillRect(x * sx, y * sy, w * sx, h * sy);
      ctx.strokeStyle = (valid && canCl) ? "rgba(20,241,149,0.9)" : "rgba(239,68,68,0.9)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(x * sx, y * sy, w * sx, h * sy);
      ctx.setLineDash([]);
      ctx.fillStyle = (valid && canCl) ? "rgba(20,241,149,0.9)" : "rgba(239,68,68,0.9)";
      ctx.font = `bold ${Math.max(10, 11 / scale)}px monospace`;
      ctx.fillText(`${Math.round(w)} × ${Math.round(h)} px`, x * sx + 4, y * sy - 5);
    }

    ctx.restore(); // clip restore

    // Kapszula stroke (clip-en kívül)
    drawCapsulePath(ctx, sx, sy, 0, 0);
    ctx.strokeStyle = "rgba(20,241,149,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore(); // translate restore
  }, [areas, selection, availableQuota, showForbidden]);

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

  // ── Wheel (zoom) ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (canvas.width  / rect.width);
      const cy = (e.clientY - rect.top)  * (canvas.height / rect.height);
      setViewTransform(prev => {
        const factor   = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.5, Math.min(20, prev.scale * factor));
        const nx = cx - (cx - prev.x) * (newScale / prev.scale);
        const ny = cy - (cy - prev.y) * (newScale / prev.scale);
        return { x: nx, y: ny, scale: newScale };
      });
      triggerForbiddenFlash();
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [triggerForbiddenFlash]);

  // ── World koordináta ──────────────────────────────────────────────────────
  const toWorld = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
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

  // ── Ratio snap ────────────────────────────────────────────────────────────
  const applyRatio = (w: number, h: number): [number, number] => {
    const ratio = RATIOS[ratioKey];
    if (!ratio[0]) return [w, h];
    return [w, Math.round(w * ratio[1] / ratio[0])];
  };

  // ── Mouse handlers ────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Middle click VAGY Space+bal gomb = pan
    if (e.button === 1 || (e.button === 0 && spacePressedRef.current)) {
      e.preventDefault();
      panStart.current = { cx: e.clientX, cy: e.clientY, tx: vtRef.current.x, ty: vtRef.current.y };
      setIsPanning(true);
      triggerForbiddenFlash();
      return;
    }
    if (e.button !== 0) return;
    const pos = toWorld(e); if (!pos) return;
    dragStart.current = { wx: pos.wx, wy: pos.wy };
    setDragging(true);
    setSelection(null);
    setValidationError(null);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Pan
    if (isPanning && panStart.current) {
      const nx = panStart.current.tx + (e.clientX - panStart.current.cx);
      const ny = panStart.current.ty + (e.clientY - panStart.current.cy);
      setViewTransform(prev => ({ ...prev, x: nx, y: ny }));
      triggerForbiddenFlash();
      return;
    }
    // Draw
    if (!dragging || !dragStart.current) return;
    const pos = toWorld(e); if (!pos) return;
    let w = Math.abs(pos.wx - dragStart.current.wx) || 1;
    let h = Math.abs(pos.wy - dragStart.current.wy) || 1;
    [w, h] = applyRatio(w, h);
    setSelection({
      x: Math.min(dragStart.current.wx, pos.wx),
      y: Math.min(dragStart.current.wy, pos.wy),
      w, h,
    });
  };

  const onMouseUp = () => {
    // Pan vége
    if (isPanning) {
      setIsPanning(false);
      panStart.current = null;
      return;
    }
    // Draw vége
    setDragging(false);
    if (!selection) return;
    if (selection.w < MIN_PX || selection.h < MIN_PX) {
      setValidationError(`Minimum kijelölhető méret: ${MIN_PX}×${MIN_PX} px`);
      setSelection(null);
      return;
    }
    if (!isRectInsideCapsule(selection.x, selection.y, selection.w, selection.h)) {
      setValidationError("A kijelölt terület a kapszulán kívülre esik!");
      setSelection(null);
      return;
    }
  };

  const pixelCount = selection ? selection.w * selection.h : 0;
  const canClaim   = pixelCount > 0 && pixelCount <= availableQuota &&
                     !!selection && isRectInsideCapsule(selection.x, selection.y, selection.w, selection.h);

  if (!connected) return null;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Fejléc */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "white", margin: 0 }}>
            Claim Your Pixels
          </h2>
          {walletData && (
            <p style={{ fontSize: "0.8rem", color: "rgba(20,241,149,0.8)", margin: "0.2rem 0 0" }}>
              {availableQuota.toLocaleString()} pixel available for claiming
            </p>
          )}
        </div>

        {/* Képarány választó */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {Object.keys(RATIOS).map(k => (
            <button key={k} onClick={() => { setRatioKey(k); setSelection(null); }}
              style={{
                padding: "0.3rem 0.75rem", borderRadius: "0.4rem", border: "none",
                cursor: "pointer", fontSize: "0.75rem", fontWeight: 600,
                background: ratioKey === k ? "#14f195" : "rgba(255,255,255,0.08)",
                color: ratioKey === k ? "#000" : "rgba(255,255,255,0.6)",
                transition: "all 0.15s",
              }}>{k}</button>
          ))}
          {selection && (
            <button onClick={() => setSelection(null)}
              style={{ padding: "0.3rem 0.75rem", borderRadius: "0.4rem", border: "none",
                cursor: "pointer", fontSize: "0.75rem", fontWeight: 600,
                background: "rgba(239,68,68,0.2)", color: "#ef4444" }}>
              ✕ Törlés
            </button>
          )}
        </div>
      </div>

      {/* Infó sor */}
      <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", fontFamily: "monospace", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        <span>Canvas: {WORLD_W.toLocaleString()} × {WORLD_H.toLocaleString()} px</span>
        <span>Zoom: {viewTransform.scale.toFixed(2)}×</span>
        {selection && (
          <>
            <span style={{ color: "rgba(20,241,149,0.7)" }}>
              Selection: {selection.x},{selection.y} → {selection.w}×{selection.h}
            </span>
            <span style={{ color: canClaim ? "rgba(20,241,149,0.9)" : "rgba(239,68,68,0.9)" }}>
              {pixelCount.toLocaleString()} pixel {canClaim ? "✓" : "— nincs elég quota"}
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
          style={{
            display: "block", width: "100%",
            cursor: isPanning ? "grabbing" : spacePressedRef.current ? "grab" : dragging ? "crosshair" : "cell",
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { setDragging(false); setIsPanning(false); panStart.current = null; }}
        />
      </div>

      {/* Validáció hiba */}
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
          <span style={{ color: "rgba(255,255,255,0.3)" }}>Scroll = Zoom · Space/Middle+Drag = Pan · Draw = Select</span>
        </div>
        <button
          disabled={!canClaim}
          onClick={() => selection && setModalRegion({ x: selection.x, y: selection.y, width: selection.w, height: selection.h })}
          style={{
            padding: "0.6rem 1.5rem", borderRadius: "0.5rem", border: "none",
            cursor: canClaim ? "pointer" : "not-allowed",
            fontWeight: 700, fontSize: "0.9rem",
            background: canClaim ? "linear-gradient(135deg,#14f195,#9945ff)" : "rgba(255,255,255,0.1)",
            color: canClaim ? "#000" : "rgba(255,255,255,0.3)",
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
          onImageSelected={(dataUrl) => setPreviewImage(dataUrl)}
        />
      )}
    </section>
  );
}