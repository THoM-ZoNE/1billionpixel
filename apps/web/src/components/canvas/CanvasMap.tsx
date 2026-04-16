"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const TOTAL_PIXELS = 1_000_000_000;
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const ASPECT_RATIOS: Record<string, [number, number]> = {
  "16:9": [16, 9],
  "4:3":  [4, 3],
  "1:1":  [1, 1],
  "21:9": [21, 9],
};

interface PixelArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  imageUrl: string | null;
  walletAddress: string | null;
  status: string;
}

function getCanvasDimensions(ratio: [number, number]): [number, number] {
  const [rw, rh] = ratio;
  const W = Math.round(Math.sqrt(TOTAL_PIXELS * rw / rh));
  const H = Math.round(TOTAL_PIXELS / W);
  return [W, H];
}

export default function CanvasMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [aspectKey, setAspectKey] = useState("16:9");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [areas, setAreas] = useState<PixelArea[]>([]);
  const [loading, setLoading] = useState(true);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const [canvasW, canvasH] = getCanvasDimensions(ASPECT_RATIOS[aspectKey]);

  // Területek betöltése
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/canvas/areas`)
      .then(r => r.json())
      .then(data => setAreas(data.areas ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dW = container.clientWidth;
    const dH = container.clientHeight;
    canvas.width = dW;
    canvas.height = dH;

    const baseScale = Math.min(dW / canvasW, dH / canvasH);
    const scale = baseScale * zoom;
    const offsetX = (dW - canvasW * scale) / 2 + pan.x;
    const offsetY = (dH - canvasH * scale) / 2 + pan.y;

    ctx.clearRect(0, 0, dW, dH);

    // Háttér
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(offsetX, offsetY, canvasW * scale, canvasH * scale);

    // Rács
    if (scale > 0.0005) {
      const gridStep = Math.max(1000, Math.round(50 / scale)) * scale;
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.5;
      for (let gx = offsetX; gx < offsetX + canvasW * scale; gx += gridStep) {
        ctx.beginPath(); ctx.moveTo(gx, offsetY); ctx.lineTo(gx, offsetY + canvasH * scale); ctx.stroke();
      }
      for (let gy = offsetY; gy < offsetY + canvasH * scale; gy += gridStep) {
        ctx.beginPath(); ctx.moveTo(offsetX, gy); ctx.lineTo(offsetX + canvasW * scale, gy); ctx.stroke();
      }
    }

    // Lefoglalt területek
    areas.forEach((area) => {
      const ax = offsetX + area.x * scale;
      const ay = offsetY + area.y * scale;
      const aw = Math.max(2, area.width * scale);
      const ah = Math.max(2, area.height * scale);

      ctx.fillStyle = area.status === "AT_RISK"
        ? "rgba(234, 179, 8, 0.45)"   // sárga = at risk
        : "rgba(34, 197, 94, 0.45)";  // zöld = active
      ctx.fillRect(ax, ay, aw, ah);

      ctx.strokeStyle = area.status === "AT_RISK" ? "#eab308" : "#22c55e";
      ctx.lineWidth = 1;
      ctx.strokeRect(ax, ay, aw, ah);
    });

    // Keret
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, offsetY, canvasW * scale, canvasH * scale);
  }, [areas, canvasW, canvasH, zoom, pan]);

  useEffect(() => { draw(); }, [draw]);

  // Zoom
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setZoom(z => Math.min(500, Math.max(0.5, z * factor)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  // Pan
  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  };
  const onMouseUp = () => { isDragging.current = false; };

  // Ugrás az első claimed területre
  const jumpToFirst = () => {
    if (!areas.length || !containerRef.current) return;
    const container = containerRef.current;
    const baseScale = Math.min(container.clientWidth / canvasW, container.clientHeight / canvasH);
    const targetZoom = 50;
    const scale = baseScale * targetZoom;
    const area = areas[0];
    setZoom(targetZoom);
    setPan({
      x: container.clientWidth / 2 - (area.x + area.width / 2) * scale,
      y: container.clientHeight / 2 - (area.y + area.height / 2) * scale,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-white/60">Képarány:</span>
        {Object.keys(ASPECT_RATIOS).map(k => (
          <button
            key={k}
            onClick={() => { setAspectKey(k); setZoom(1); setPan({ x: 0, y: 0 }); }}
            className={`px-3 py-1 rounded text-sm font-mono transition ${
              aspectKey === k
                ? "bg-green-500 text-black"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            {k}
          </button>
        ))}
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="px-3 py-1 rounded text-sm bg-white/10 text-white/70 hover:bg-white/20 ml-auto"
        >
          Reset
        </button>
        {areas.length > 0 && (
          <button
            onClick={jumpToFirst}
            className="px-3 py-1 rounded text-sm bg-green-500/20 text-green-400 hover:bg-green-500/30"
          >
            → Claimed területre
          </button>
        )}
      </div>

      {/* Info */}
      <div className="text-xs text-white/40 font-mono">
        Canvas: {canvasW.toLocaleString()} × {canvasH.toLocaleString()} px &nbsp;|&nbsp;
        Zoom: {zoom.toFixed(1)}× &nbsp;|&nbsp;
        {loading ? "Loading..." : `${areas.length} areas`}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden border border-white/10 cursor-grab active:cursor-grabbing"
        style={{ height: "420px", background: "#060b14" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
            Loading canvas...
          </div>
        )}
        <div className="absolute bottom-3 right-3 text-xs text-white/30 select-none pointer-events-none">
          Scroll = zoom &nbsp;|&nbsp; Drag = pan
        </div>
      </div>
    </div>
  );
}
