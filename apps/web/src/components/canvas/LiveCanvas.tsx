"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { onCanvasEvent, connectWebSocket } from "@/lib/websocket";

import { api } from "@/lib/api";
import {
  WORLD_W, WORLD_H, WORLD_RATIO,
  CAPSULE_W, CAPSULE_H, CAPSULE_OFFSET_X, CAPSULE_OFFSET_Y,
  drawCapsulePath,
  canvasToWorld,
} from "@/lib/capsuleConfig";

const POLL_MS    = 30_000;
const LOUPE_SIZE = 160;
const LOUPE_ZOOM = 5;

interface PixelArea {
  id: string;
  x: number; y: number;
  width: number; height: number;
  imageUrl?: string | null;
  link?: string | null;
  status: "ACTIVE" | "AT_RISK" | "FORBIDDEN";
  walletAddress?: string;
}
interface Stats {
  pixelsClaimed: number;
  pixelsRemaining: number;
  percentFilled: number;
  owners: number;
}

function clampOffset(ox: number, oy: number, zoom: number, W: number, H: number): { x: number; y: number } {
  const scaledW = W * zoom;
  const scaledH = H * zoom;
  const x = scaledW <= W ? (W - scaledW) / 2 : Math.max(W - scaledW, Math.min(0, ox));
  const y = scaledH <= H ? (H - scaledH) / 2 : Math.max(H - scaledH, Math.min(0, oy));
  return { x, y };
}

export function LiveCanvas() {
  // ── 1. Refs ────────────────────────────────────────────────────────────
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const loupeRef   = useRef<HTMLCanvasElement>(null);
  const imgCache   = useRef<Map<string, HTMLImageElement>>(new Map());
  const isDragging = useRef(false);
  const dragStart  = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const zoomRef    = useRef(1);
  const offsetRef  = useRef({ x: 0, y: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ── 2. State ───────────────────────────────────────────────────────────
  const [areas,       setAreas]       = useState<PixelArea[]>([]);
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [zoom,        setZoom]        = useState(1);
  const [offset,      setOffset]      = useState({ x: 0, y: 0 });
  const [mouse,       setMouse]       = useState<{ cx: number; cy: number; sx: number; sy: number } | null>(null);
  const [tooltip,     setTooltip]     = useState<{ area: PixelArea; x: number; y: number } | null>(null);
  const [lastUpdate,  setLastUpdate]  = useState("");
  const [gifOverlays, setGifOverlays] = useState<PixelArea[]>([]);

  // ── 3. Ref szinkronizáció ──────────────────────────────────────────────
  useEffect(() => { zoomRef.current   = zoom;   }, [zoom]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  // ── 4. Draw ────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const frameScaleX   = W / WORLD_W;
    const frameScaleY   = H / WORLD_H;
    const contentScaleX = frameScaleX * zoom;
    const contentScaleY = frameScaleY * zoom;
    const ox = offset.x;
    const oy = offset.y;

    ctx.save();
    drawCapsulePath(ctx, frameScaleX, frameScaleY, 0, 0);
    ctx.clip();

    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.fillStyle = "rgba(160, 20, 20, 0.55)";
    ctx.beginPath();
    drawCapsulePath(ctx, contentScaleX, contentScaleY, ox, oy);
    ctx.rect(ox, oy, WORLD_W * contentScaleX, WORLD_H * contentScaleY);
    ctx.fill("evenodd");
    ctx.restore();

    const gridStepWorld = Math.max(1, Math.round(40 / zoom)) * (WORLD_W / W);
    const gridStepX = gridStepWorld * contentScaleX;
    const gridStepY = gridStepWorld * contentScaleY;
    ctx.strokeStyle = "rgba(20,241,149,0.055)";
    ctx.lineWidth = 0.5;
    const startGridX = Math.floor(-ox / gridStepX) * gridStepX + ox;
    const startGridY = Math.floor(-oy / gridStepY) * gridStepY + oy;
    for (let x = startGridX; x < W; x += gridStepX) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = startGridY; y < H; y += gridStepY) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    areas.forEach((area) => {
      const sx = area.x * contentScaleX + ox;
      const sy = area.y * contentScaleY + oy;
      const sw = Math.max(1, area.width  * contentScaleX);
      const sh = Math.max(1, area.height * contentScaleY);
      if (sx + sw < 0 || sy + sh < 0 || sx > W || sy > H) return;

      if (area.imageUrl) {
        if (area.imageUrl.toLowerCase().includes(".gif")) {
          ctx.fillStyle = "#0d0d0d";
          ctx.fillRect(sx, sy, sw, sh);
          return;
        }
        let img = imgCache.current.get(area.imageUrl);
        if (!img) {
          img = new Image();
          img.crossOrigin = "anonymous";
          img.src = area.imageUrl;
          img.onload = () => draw();
          imgCache.current.set(area.imageUrl, img);
        }
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, sx, sy, sw, sh);
        } else {
          ctx.fillStyle = area.status === "AT_RISK" ? "rgba(245,158,11,0.6)" : "#7C3AED";
          ctx.fillRect(sx, sy, sw, sh);
        }
      } else {
        ctx.fillStyle = area.status === "AT_RISK" ? "rgba(245,158,11,0.6)" : "#7C3AED";
        ctx.fillRect(sx, sy, sw, sh);
      }
    });

    ctx.restore();

    //ctx.save();
    //ctx.fillStyle = "rgba(0, 0, 0, 0.47)";
    //ctx.beginPath();
    //ctx.rect(0, 0, W, H);
    //drawCapsulePath(ctx, frameScaleX, frameScaleY, 0, 0);
    //ctx.fill("evenodd");
    //ctx.restore();

    drawCapsulePath(ctx, frameScaleX, frameScaleY, 0, 0);
    ctx.strokeStyle = "rgba(20,241,149,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [areas, zoom, offset]);

  useEffect(() => { draw(); }, [draw]);

  // ── 5. Loupe ───────────────────────────────────────────────────────────
  useEffect(() => {
    const loupe  = loupeRef.current;
    const canvas = canvasRef.current;
    if (!loupe || !canvas || !mouse) return;
    const ctx  = loupe.getContext("2d"); if (!ctx) return;
    const half = LOUPE_SIZE / 2;
    ctx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
    ctx.save();
    ctx.beginPath(); ctx.arc(half, half, half, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(canvas, mouse.cx - half / LOUPE_ZOOM, mouse.cy - half / LOUPE_ZOOM, LOUPE_SIZE / LOUPE_ZOOM, LOUPE_SIZE / LOUPE_ZOOM, 0, 0, LOUPE_SIZE, LOUPE_SIZE);
    ctx.restore();
    ctx.beginPath(); ctx.arc(half, half, half - 1, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(153,69,255,0.9)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(half, half - 12); ctx.lineTo(half, half + 12);
    ctx.moveTo(half - 12, half); ctx.lineTo(half + 12, half);
    ctx.stroke();
  }, [mouse]);

  // ── 6. Data polling ────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [ar, st] = await Promise.all([
        api.get<any>(`/canvas/areas?x=0&y=0&w=${WORLD_W}&h=${WORLD_H}`),
        api.get<Stats>("/canvas/stats"),
      ]);
      const allAreas = Array.isArray(ar) ? ar : (ar?.areas ?? []);
      setAreas(allAreas);
      setGifOverlays(allAreas.filter((a: PixelArea) => a.imageUrl?.toLowerCase().includes(".gif")));
      setStats(st);
      setLastUpdate(new Date().toLocaleTimeString("en-EN"));
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, POLL_MS);
    return () => clearInterval(iv);
  }, [loadData]);

  // ── 6b. WebSocket ──────────────────────────────────────────────────────
  useEffect(() => {
    connectWebSocket();
    const unsubClaimed  = onCanvasEvent("AREA_CLAIMED",  () => loadData());
    const unsubUploaded = onCanvasEvent("IMAGE_UPLOADED", () => loadData());
    const unsubUpdate   = onCanvasEvent("CANVAS_UPDATE",  () => loadData());
    return () => { unsubClaimed(); unsubUploaded(); unsubUpdate(); };
  }, [loadData]);

  // ── 7. Resize ────────────────────────────────────────────────────────────
useEffect(() => {
  const canvas = canvasRef.current;
  const wrapper = wrapperRef.current;
  if (!canvas || !wrapper) return;

  const resize = () => {
  requestAnimationFrame(() => {
    const outer = wrapperRef.current?.parentElement; // a flex container
    if (!outer) return;
    const availW = outer.getBoundingClientRect().width;
    if (availW === 0) { setTimeout(resize, 100); return; }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // A canvas max 800px széles (asztali), mobilon a rendelkezésre álló szélességre szűkül
    const newW = Math.floor(availW);
const newH = Math.round(newW / WORLD_RATIO);

    canvas.width  = newW;
    canvas.height = newH;
    draw();
  });
};

  resize();
  const obs = new ResizeObserver(resize);
  obs.observe(wrapper);
  return () => obs.disconnect();
}, [draw]);

  // ── 8. Wheel zoom ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect   = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) * (canvas.width  / rect.width);
      const mouseY = (e.clientY - rect.top)  * (canvas.height / rect.height);
      const delta  = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(z => {
        const nz = Math.min(10, Math.max(0.95, z * delta));
        setOffset(o => {
          const raw = { x: mouseX - (mouseX - o.x) * (nz / z), y: mouseY - (mouseY - o.y) * (nz / z) };
          return clampOffset(raw.x, raw.y, nz, canvas.width, canvas.height);
        });
        return nz;
      });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  // ── 9. Mouse events ────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width  / rect.width);
    const cy = (e.clientY - rect.top)  * (canvas.height / rect.height);
    setMouse({ cx, cy, sx: e.clientX, sy: e.clientY });
    if (isDragging.current) {
      const raw = {
        x: dragStart.current.ox + (e.clientX - dragStart.current.mx) * (canvas.width  / rect.width),
        y: dragStart.current.oy + (e.clientY - dragStart.current.my) * (canvas.height / rect.height),
      };
      setOffset(clampOffset(raw.x, raw.y, zoomRef.current, canvas.width, canvas.height));
      setTooltip(null);
    } else {
      const wx = (cx - offsetRef.current.x) / ((canvas.width  / WORLD_W) * zoomRef.current);
      const wy = (cy - offsetRef.current.y) / ((canvas.height / WORLD_H) * zoomRef.current);
      const hit = areas.find(a => wx >= a.x && wx <= a.x + a.width && wy >= a.y && wy <= a.y + a.height);
      setTooltip(hit ? { area: hit, x: e.clientX, y: e.clientY } : null);
    }
  };

  const onMouseUp    = () => { isDragging.current = false; };
  const onMouseLeave = () => { isDragging.current = false; setMouse(null); setTooltip(null); };

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width  / rect.width);
    const cy = (e.clientY - rect.top)  * (canvas.height / rect.height);
    const wx = (cx - offsetRef.current.x) / ((canvas.width  / WORLD_W) * zoomRef.current);
    const wy = (cy - offsetRef.current.y) / ((canvas.height / WORLD_H) * zoomRef.current);
    const hit = areas.find(a => wx >= a.x && wx <= a.x + a.width && wy >= a.y && wy <= a.y + a.height);
    if (hit?.link) window.open(hit.link, "_blank", "noopener,noreferrer");
  };

  // ── 10. Touch events ───────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    isDragging.current = true;
    dragStart.current = { mx: touch.clientX, my: touch.clientY, ox: offset.x, oy: offset.y };
  };

  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const raw = {
      x: dragStart.current.ox + (touch.clientX - dragStart.current.mx) * (canvas.width / rect.width),
      y: dragStart.current.oy + (touch.clientY - dragStart.current.my) * (canvas.height / rect.height),
    };
    setOffset(clampOffset(raw.x, raw.y, zoom, canvas.width, canvas.height));
    setTooltip(null);
  };

  const onTouchEnd = () => { isDragging.current = false; };

  // ── 11. GIF overlay pozíció ────────────────────────────────────────────
  const getGifStyle = useCallback((area: PixelArea): React.CSSProperties => {
  const canvas = canvasRef.current;
  if (!canvas) return { display: "none" };

  const W = canvas.width;   // belső pixel szélesség
  const H = canvas.height;  // belső pixel magasság

  // CSS megjelenített méret (maxWidth/maxHeight miatt kisebb lehet)
  const cssW = canvas.offsetWidth;
  const cssH = canvas.offsetHeight;

  const scaleX = cssW / W;
  const scaleY = cssH / H;

  const contentScaleX = (W / WORLD_W) * zoom;
  const contentScaleY = (H / WORLD_H) * zoom;

  const left   = (area.x * contentScaleX + offset.x) * scaleX;
  const top    = (area.y * contentScaleY + offset.y) * scaleY;
  const width  = (area.width  * contentScaleX) * scaleX;
  const height = (area.height * contentScaleY) * scaleY;

  return {
    position:       "absolute",
    left,
    top,
    width,
    height,
    pointerEvents:  "none",
    imageRendering: "pixelated" as const,
    objectFit:      "fill" as const,
    // Kapszulán kívülre kerülő részek elrejtése
    overflow:       "hidden",
  };
}, [zoom, offset]);

  const zp = Math.round(zoom * 100);
  return (
    <div style={{ minHeight: "100vh", background: "#060a06", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.5rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(6,10,6,1)", position: "sticky", top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#14f195", textDecoration: "none", letterSpacing: "0.15em" }}>{"← 1BP.FUN"}</a>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <span style={{ fontSize: "0.65rem", color: "rgba(20,241,149,0.7)", fontFamily: "monospace", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#14f195", display: "inline-block", boxShadow: "0 0 6px #14f195" }}></span>
            LIVE
          </span>
          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{zp}%</span>
        </div>
      </div>

      {/* Canvas area */}
<div style={{
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  backgroundColor: "transparent",
  padding: "0 16px",   // ← mobil oldal padding
  boxSizing: "border-box",
  paddingBottom: "48px",
  width: "100%",
  minWidth: 0,
}}>
  <div
    ref={wrapperRef}
    className="capsule-glow-wrapper live-canvas-glow"
    style={{
      position: "relative",
      lineHeight: 0,
      display: "inline-block",
    }}
  >
    <canvas
      ref={canvasRef}
      width={800}
      height={Math.round(800 / WORLD_RATIO)}
      style={{
        cursor: isDragging.current ? "grabbing" : "crosshair",
        display: "block",
        maxWidth: "100%",
        maxHeight: "calc(100vh - 120px)",
        imageRendering: "pixelated",
        position: "relative",
        touchAction: "none",
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    />

    {/* GIF overlay — változatlan */}
    <div style={{
      position: "absolute",
      top: 0, left: 0,
      width: "100%", height: "100%",
      pointerEvents: "none",
      zIndex: 2,
      clipPath: "inset(calc(8.33% + 2px) calc(8.33% + 2px) calc(8.33% + 2px) calc(8.33% + 2px) round 17.51% / 41.67%)",
    }}>
      {gifOverlays.map((area) => (
        <img key={area.id} src={area.imageUrl!} alt="" style={getGifStyle(area)} />
      ))}
    </div>
  </div>

        {/* Tooltip */}
        {tooltip && (
          <div style={{ position: "fixed", left: tooltip.x + 14, top: tooltip.y - 10, background: "rgba(6,10,6,0.97)", border: "1px solid rgba(20,241,149,0.25)", borderRadius: 6, padding: "0.5rem 0.75rem", pointerEvents: "none", zIndex: 200, minWidth: 160, boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>
            <div style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "#14f195", marginBottom: 4 }}>
              {tooltip.area.walletAddress ? `${tooltip.area.walletAddress.slice(0, 4)}...${tooltip.area.walletAddress.slice(-4)}` : "Unknown"}
            </div>
            <div style={{ fontFamily: "monospace", fontSize: "0.65rem", color: "rgba(255,255,255,0.5)" }}>
              {tooltip.area.width}{"×"}{tooltip.area.height}{" px @ ("}{tooltip.area.x},{tooltip.area.y}{")"}
            </div>
            {tooltip.area.link && (
              <div style={{ fontFamily: "monospace", fontSize: "0.6rem", color: "rgba(20,241,149,0.6)", marginTop: 4, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: 180 }}>
                {"🔗 "}{tooltip.area.link}
              </div>
            )}
          </div>
        )}

        {/* Zoom controls */}
        <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: "0.5rem", alignItems: "center", background: "rgba(6,10,6,0.85)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "0.4rem 0.9rem" }}>
          <button onClick={() => { const nz = Math.max(0.80, zoom - 0.1); const canvas = canvasRef.current; if (!canvas) { setZoom(nz); return; } setZoom(nz); setOffset(o => clampOffset(o.x, o.y, nz, canvas.width, canvas.height)); }} style={{ background: "none", border: "none", color: "#14f195", fontSize: "1.1rem", cursor: "pointer", padding: "0 4px" }}>{"−"}</button>
          <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", minWidth: 36, textAlign: "center" }}>{zp}%</span>
          <button onClick={() => { const nz = Math.min(10, zoom + 0.1); const canvas = canvasRef.current; if (!canvas) { setZoom(nz); return; } setZoom(nz); setOffset(o => clampOffset(o.x, o.y, nz, canvas.width, canvas.height)); }} style={{ background: "none", border: "none", color: "#14f195", fontSize: "1.1rem", cursor: "pointer", padding: "0 4px" }}>{"+"}</button>
          <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)", margin: "0 4px" }}></span>
          <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: "0.65rem", fontFamily: "monospace", cursor: "pointer", letterSpacing: "0.05em" }}>RESET</button>
        </div>
      </div>
    </div>
  );
}