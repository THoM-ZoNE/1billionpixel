"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { api } from "@/lib/api";
import {
  WORLD_W, WORLD_H, WORLD_RATIO,
  drawCapsulePath,
  isRectInsideCapsule,
} from "@/lib/capsuleConfig";
import { ClaimModal } from "./ClaimModal";
import { useWalletStore } from "@/store/walletStore";

const MIN_PX = 100; // minimum kijelölhető pixel méret

interface Area {
  x: number; y: number; width: number; height: number;
  status: "ACTIVE" | "AT_RISK" | "FORBIDDEN";
}

export function ClaimSelector() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ wx: number; wy: number } | null>(null);
  const [modalRegion, setModalRegion] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { walletData } = useWalletStore();
  const availableQuota = walletData?.availableQuota ?? 0;

  // Adatok betöltése
  useEffect(() => {
    api.get<any>(`/canvas/areas?x=0&y=0&w=${WORLD_W}&h=${WORLD_H}`)
      .then(r => setAreas(Array.isArray(r) ? r : (r?.areas ?? [])))
      .catch(() => {});
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const sx = W / WORLD_W;
    const sy = H / WORLD_H;

    ctx.clearRect(0, 0, W, H);

    // 1) Forbidden sarokzónák (evenodd) — kapszulán kívüli terület piros
    ctx.save();
    ctx.fillStyle = "rgba(160, 20, 20, 0.65)";
    ctx.beginPath();
    drawCapsulePath(ctx, sx, sy, 0, 0);
    ctx.rect(0, 0, W, H);
    ctx.fill("evenodd");
    ctx.restore();

    // 2) Kapszula clip — belső tartalom
    ctx.save();
    drawCapsulePath(ctx, sx, sy, 0, 0);
    ctx.clip();

    // Fekete háttér
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, W, H);

    // Grid
    const step = Math.round(WORLD_W / 40) * sx;
    ctx.strokeStyle = "rgba(20,241,149,0.05)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Meglévő területek
    areas.forEach(a => {
      if (a.status === "FORBIDDEN") return; // geometriailag már kezelt
      const cx = a.x * sx, cy = a.y * sy;
      const cw = a.width * sx, ch = a.height * sy;
      ctx.fillStyle = a.status === "AT_RISK" ? "rgba(245,158,11,0.5)" : "rgba(153,69,255,0.5)";
      ctx.fillRect(cx, cy, cw, ch);
      ctx.strokeStyle = a.status === "AT_RISK" ? "rgba(245,158,11,0.8)" : "rgba(153,69,255,0.8)";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, cy, cw, ch);
    });

    // Kijelölés
    if (selection) {
      const { x, y, w, h } = selection;
      const valid = isRectInsideCapsule(x, y, w, h);
      ctx.fillStyle = valid ? "rgba(20,241,149,0.18)" : "rgba(239,68,68,0.18)";
      ctx.fillRect(x * sx, y * sy, w * sx, h * sy);
      ctx.strokeStyle = valid ? "rgba(20,241,149,0.9)" : "rgba(239,68,68,0.9)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x * sx, y * sy, w * sx, h * sy);

      // Méret felirat
      ctx.fillStyle = valid ? "rgba(20,241,149,0.9)" : "rgba(239,68,68,0.9)";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`${Math.round(w)} × ${Math.round(h)} px`, x * sx + 4, y * sy - 5);
    }

    ctx.restore();

    // Kapszula stroke
    drawCapsulePath(ctx, sx, sy, 0, 0);
    ctx.strokeStyle = "rgba(20,241,149,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [areas, selection]);

  // Resize
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const resize = () => {
      const w = canvas.parentElement?.clientWidth ?? 800;
      canvas.width = w;
      canvas.height = Math.round(w / WORLD_RATIO);
      draw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  // Canvas koordináta → world koordináta
  const toWorld = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
    return {
      wx: Math.round(cx / (canvas.width / WORLD_W)),
      wy: Math.round(cy / (canvas.height / WORLD_H)),
    };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = toWorld(e); if (!pos) return;
    dragStart.current = { wx: pos.wx, wy: pos.wy };
    setDragging(true);
    setSelection(null);
    setValidationError(null);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging || !dragStart.current) return;
    const pos = toWorld(e); if (!pos) return;
    const x = Math.min(dragStart.current.wx, pos.wx);
    const y = Math.min(dragStart.current.wy, pos.wy);
    const w = Math.abs(pos.wx - dragStart.current.wx);
    const h = Math.abs(pos.wy - dragStart.current.wy);
    setSelection({ x, y, w, h });
  };

  const onMouseUp = () => {
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
    // Megnyitjuk a ClaimModal-t
    setModalRegion({ x: selection.x, y: selection.y, width: selection.w, height: selection.h });
  };

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ position: "relative", width: "100%" }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", cursor: dragging ? "crosshair" : "cell" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { setDragging(false); }}
        />
      </div>

      {validationError && (
        <div style={{
          color: "#f87171", fontSize: "0.78rem", fontFamily: "monospace",
          background: "rgba(239,68,68,0.1)", borderRadius: "0.5rem",
          padding: "0.5rem 0.75rem", textAlign: "center",
        }}>
          ⚠ {validationError}
        </div>
      )}

      {selection && isRectInsideCapsule(selection.x, selection.y, selection.w, selection.h) && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            onClick={() => setModalRegion({ x: selection.x, y: selection.y, width: selection.w, height: selection.h })}
            style={{
              padding: "0.65rem 1.5rem", borderRadius: "0.6rem", border: "none",
              background: "linear-gradient(135deg,#14f195,#9945ff)",
              color: "#000", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
            }}
          >
            Claim {(selection.w * selection.h).toLocaleString()} px →
          </button>
        </div>
      )}

      {modalRegion && (
        <ClaimModal
          region={modalRegion}
          availableQuota={availableQuota}
          onClose={() => { setModalRegion(null); setSelection(null); }}
        />
      )}
    </div>
  );
}   