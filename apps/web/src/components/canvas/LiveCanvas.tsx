"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { onCanvasEvent, connectWebSocket } from "@/lib/websocket";

import { api } from "@/lib/api";
import {
  WORLD_W, WORLD_H, WORLD_RATIO,
  drawCapsulePath,
} from "@/lib/capsuleConfig";
import { useSearchParams } from "next/navigation";

const POLL_MS    = 30_000;

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
function animateZoomTo(
  targetWX: number, targetWY: number,
  targetZoom: number,
  canvasW: number, canvasH: number,
  startZoom: number, startOffset: { x: number; y: number },
  onFrame: (z: number, o: { x: number; y: number }) => void,
  onDone: () => void
) {
  const duration = 1400;
  const startTime = performance.now();
  const scaleX = canvasW / WORLD_W;
  const scaleY = canvasH / WORLD_H;
  const endZoom = targetZoom;
  const endOffset = clampOffset(
    canvasW / 2 - targetWX * scaleX * endZoom,
    canvasH / 2 - targetWY * scaleY * endZoom,
    endZoom, canvasW, canvasH
  );

  function step(now: number) {
    const t = Math.min((now - startTime) / duration, 1);
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // ease in-out cubic
    const z  = startZoom + (endZoom  - startZoom)  * e;
    const ox = startOffset.x + (endOffset.x - startOffset.x) * e;
    const oy = startOffset.y + (endOffset.y - startOffset.y) * e;
    onFrame(z, { x: ox, y: oy });
    if (t < 1) requestAnimationFrame(step);
    else onDone();
  }
  requestAnimationFrame(step);
}
export function LiveCanvas() {
  // ── 1. Refs ────────────────────────────────────────────────────────────
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const imgCache   = useRef<Map<string, HTMLImageElement>>(new Map());
  const isDragging = useRef(false);
  const dragStart  = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const zoomRef    = useRef(1);
  const offsetRef  = useRef({ x: 0, y: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pulseStartRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const drawRef = useRef<() => void>(() => {});
  const hoveredAreaRef = useRef<PixelArea | null>(null);
  const dragMovedRef   = useRef(false);
  const [selectedArea, setSelectedArea] = useState<PixelArea | null>(null);
  const zoomIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // ── Focus area (URL paraméterből) ─────────────────────────────────────
  const focusAreaRef    = useRef<PixelArea | null>(null);
  const searchParams    = useSearchParams();
  const focusAreaId     = searchParams.get("area");
  const hasZoomedRef = useRef(false);
  const areasRef = useRef<PixelArea[]>([]);

  // ── 2. State ───────────────────────────────────────────────────────────
  const [areas,       setAreas]       = useState<PixelArea[]>([]);
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [zoom,        setZoom]        = useState(1);
  const [offset,      setOffset]      = useState({ x: 0, y: 0 });
  const [mouse,       setMouse]       = useState<{ cx: number; cy: number; sx: number; sy: number } | null>(null);
  const [tooltip,     setTooltip]     = useState<{ area: PixelArea; x: number; y: number } | null>(null);
  const [lastUpdate,  setLastUpdate]  = useState("");
  const [gifOverlays, setGifOverlays] = useState<PixelArea[]>([]);
  const [hoveredArea, setHoveredArea] = useState<PixelArea | null>(null);
  const [copied, setCopied] = useState(false);
    // ── 3. Draw ────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const frameScaleX   = W / WORLD_W;
    const frameScaleY   = H / WORLD_H;

    const zoom   = zoomRef.current;
    const offset = offsetRef.current;

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
    // ── Focus pulse highlight ──────────────────────────────────────────
    const focusArea = focusAreaRef.current;
    if (focusArea) {
      if (pulseStartRef.current === 0) pulseStartRef.current = Date.now();
      const elapsed = (Date.now() - pulseStartRef.current) / 1000;
      const pulse = (Math.sin(elapsed * Math.PI * 1.2) + 1) / 2;
      const fsx = focusArea.x * contentScaleX + ox;
      const fsy = focusArea.y * contentScaleY + oy;
      const fsw = focusArea.width  * contentScaleX;
      const fsh = focusArea.height * contentScaleY;
      ctx.save();
      ctx.strokeStyle = `rgba(20, 241, 149, ${0.4 + pulse * 0.6})`;
      ctx.lineWidth   = 3;
      ctx.shadowColor = "rgba(20, 241, 149, 0.7)";
      ctx.shadowBlur  = 6 + pulse * 10;
      ctx.strokeRect(fsx, fsy, fsw, fsh);
      ctx.restore();
    } else {
      pulseStartRef.current = 0;
    }
    ctx.restore();
 // Capsule border stroke
      drawCapsulePath(ctx, frameScaleX, frameScaleY, 0, 0);
      ctx.strokeStyle = "rgba(20,241,149,1.5)";
      ctx.lineWidth = 2;
      ctx.stroke();

    
  }, [areas]); // ← csak areas! zoom és offset ref-ből jön
  // draw ref szinkronizáció — mindig a legfrissebb draw-t tartalmazza
  useEffect(() => { drawRef.current = draw; }, [draw]);
  // ── 4. Ref szinkronizáció + draw trigger ──────────────────────────────
  useEffect(() => { zoomRef.current = zoom; drawRef.current(); }, [zoom, draw]);
  useEffect(() => { offsetRef.current = offset; drawRef.current(); }, [offset, draw]);

  // ── 5. Data polling ────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [ar, st] = await Promise.all([
        api.get<any>(`/canvas/areas?x=0&y=0&w=${WORLD_W}&h=${WORLD_H}`),
        api.get<Stats>("/canvas/stats"),
      ]);
      const allAreas = Array.isArray(ar) ? ar : (ar?.areas ?? []);
      setAreas(allAreas);
      areasRef.current = allAreas;
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

  // ── 6. WebSocket ──────────────────────────────────────────────────────
  useEffect(() => {
    connectWebSocket();
    const unsubClaimed  = onCanvasEvent("AREA_CLAIMED",  () => loadData());
    const unsubUploaded = onCanvasEvent("IMAGE_UPLOADED", () => loadData());
    const unsubUpdate   = onCanvasEvent("CANVAS_UPDATE",  () => loadData());
    return () => { unsubClaimed(); unsubUploaded(); unsubUpdate(); };
  }, [loadData]);
   // ── Focus area from URL parameters ────────────────────────────────────────
useEffect(() => {
  if (!focusAreaId) return;

  // Várjuk meg amíg az areas betölt, de NE legyen dependency
  const tryFocus = () => {
    if (hasZoomedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // areas-t közvetlenül olvassuk a setAreas ref-en keresztül — nem kell dependency
    // Helyette: polingolunk amíg megérkezik
    const area = areasRef.current.find((a: PixelArea) => a.id === focusAreaId);
    if (!area) return;

    hasZoomedRef.current = true;
    focusAreaRef.current = area;

    const centerWX = area.x + area.width  / 2;
    const centerWY = area.y + area.height / 2;
    const targetZoom = Math.min(10, Math.max(4,
      Math.min(
        (canvas.width  * 0.3) / (area.width  * (canvas.width  / WORLD_W)),
        (canvas.height * 0.3) / (area.height * (canvas.height / WORLD_H))
      )
    ));

    animateZoomTo(
      centerWX, centerWY, targetZoom,
      canvas.width, canvas.height,
      zoomRef.current, offsetRef.current,
      (z, o) => {
        zoomRef.current   = z;
        offsetRef.current = o;
        setZoom(z);
        setOffset(o);
      },
      () => { {}
        const animate = () => {
          drawRef.current();
          if (focusAreaRef.current) {
            rafRef.current = requestAnimationFrame(animate);
          }
        };
        rafRef.current = requestAnimationFrame(animate);
        setTimeout(() => {
          cancelAnimationFrame(rafRef.current);
          focusAreaRef.current = null;
          pulseStartRef.current = 0;
          drawRef.current();
        }, 5000);
      }
    );
  };

  // Pollingolunk 100ms-enként amíg az area megérkezik (max 10mp)
  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    tryFocus();
    if (hasZoomedRef.current || attempts > 100) clearInterval(poll);
  }, 100);

  return () => {
    clearInterval(poll);
    cancelAnimationFrame(rafRef.current);
  };
}, [focusAreaId]); // ← CSAK focusAreaId! Nem areas, nem draw
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
  const canvas = canvasRef.current;
  if (!canvas) return;

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();

    const rect   = canvas.getBoundingClientRect();
    // Canvas-koordinátára konvertálás
    const mouseX = (e.clientX - rect.left) * (canvas.width  / rect.width);
    const mouseY = (e.clientY - rect.top)  * (canvas.height / rect.height);

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const oldZ  = zoomRef.current;
    const newZ  = Math.min(20, Math.max(0.95, oldZ * delta));

    // Egér köré zoom: az egér alatti pont fix marad
    const rawX = mouseX - (mouseX - offsetRef.current.x) * (newZ / oldZ);
    const rawY = mouseY - (mouseY - offsetRef.current.y) * (newZ / oldZ);

    const clamped = clampOffset(rawX, rawY, newZ, canvas.width, canvas.height);

    // Refek azonnali frissítése — draw() már az új értékeket látja
    zoomRef.current   = newZ;
    offsetRef.current = clamped;

    // React state szinkronizálás (UI frissítéshez, pl. zoom % kijelző)
    setZoom(newZ);
    setOffset(clamped);
  };

  canvas.addEventListener("wheel", onWheel, { passive: false });
  return () => canvas.removeEventListener("wheel", onWheel);
}, []); // deps üres — ref-eken keresztül mindig friss értéket lát

  // ── 9. Mouse events ────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
  if (e.button !== 0) return;
  isDragging.current  = true;
  dragMovedRef.current = false;  // ← reset
  dragStart.current = { mx: e.clientX, my: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
};

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = canvasRef.current; if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) * (canvas.width  / rect.width);
  const cy = (e.clientY - rect.top)  * (canvas.height / rect.height);
  setMouse({ cx, cy, sx: e.clientX, sy: e.clientY });

  if (isDragging.current) {
    dragMovedRef.current = true;
    const raw = {
      x: dragStart.current.ox + (e.clientX - dragStart.current.mx) * (canvas.width  / rect.width),
      y: dragStart.current.oy + (e.clientY - dragStart.current.my) * (canvas.height / rect.height),
    };
    const clamped = clampOffset(raw.x, raw.y, zoomRef.current, canvas.width, canvas.height);
    offsetRef.current = clamped;        // ← ref azonnali frissítés
    setOffset(clamped);
    setTooltip(null);
    hoveredAreaRef.current = null;      // ← drag közben ne legyen hover
  } else {
    const wx = (cx - offsetRef.current.x) / ((canvas.width  / WORLD_W) * zoomRef.current);
    const wy = (cy - offsetRef.current.y) / ((canvas.height / WORLD_H) * zoomRef.current);
    const hit = areas.find(a =>
      wx >= a.x && wx <= a.x + a.width &&
      wy >= a.y && wy <= a.y + a.height
    ) ?? null;

    // Hover keret: csak ha változott, újrarajzolás
    if (hoveredAreaRef.current?.id !== hit?.id) {
      hoveredAreaRef.current = hit;
      setHoveredArea(hit ?? null);
      drawRef.current();
    }

    // Cursor frissítés
    canvas.style.cursor = hit ? "pointer" : "crosshair";

    setTooltip(hit ? { area: hit, x: e.clientX, y: e.clientY } : null);
  }
};

  const onMouseUp    = () => { isDragging.current = false; };
  const onMouseLeave = () => {
  isDragging.current = false;
  hoveredAreaRef.current = null;
  setMouse(null);
  setTooltip(null);
  drawRef.current();
};

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
  if (dragMovedRef.current) return;  // drag volt, nem klikk
  const canvas = canvasRef.current; if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) * (canvas.width  / rect.width);
  const cy = (e.clientY - rect.top)  * (canvas.height / rect.height);
  const wx = (cx - offsetRef.current.x) / ((canvas.width  / WORLD_W) * zoomRef.current);
  const wy = (cy - offsetRef.current.y) / ((canvas.height / WORLD_H) * zoomRef.current);
  const hit = areas.find(a =>
    wx >= a.x && wx <= a.x + a.width &&
    wy >= a.y && wy <= a.y + a.height
  );
  setSelectedArea(hit ?? null);
};

  // ── 10. Touch events ───────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    isDragging.current = true;
    dragStart.current = { mx: touch.clientX, my: touch.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
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
    setOffset(clampOffset(raw.x, raw.y, zoomRef.current, canvas.width, canvas.height));
    setTooltip(null);
  };

  const onTouchEnd = () => { isDragging.current = false; };

  // ── 11. GIF overlay pozíció ────────────────────────────────────────────
    const getGifStyle = useCallback((area: PixelArea): React.CSSProperties => {
  const canvas = canvasRef.current;
  if (!canvas) return { display: "none" };
  const W = canvas.width;
  const H = canvas.height;
  const cssW = canvas.offsetWidth;
  const cssH = canvas.offsetHeight;
  const scaleX = cssW / W;
  const scaleY = cssH / H;
  const contentScaleX = (W / WORLD_W) * zoom;   // ← state, nem ref
  const contentScaleY = (H / WORLD_H) * zoom;
  const left   = (area.x * contentScaleX + offset.x) * scaleX;
  const top    = (area.y * contentScaleY + offset.y) * scaleY;
  const width  = area.width  * contentScaleX * scaleX;
  const height = area.height * contentScaleY * scaleY;
  return {
    position: "absolute", left, top, width, height,
    pointerEvents: "none",
    imageRendering: "pixelated" as const,
    objectFit: "fill" as const,
    overflow: "hidden",
  };
},[zoom, offset]);

const getHoverStyle = useCallback((area: PixelArea): React.CSSProperties => {
  const canvas = canvasRef.current;
  if (!canvas) return { display: "none" };
  const W = canvas.width;
  const H = canvas.height;
  const cssW = canvas.offsetWidth;
  const cssH = canvas.offsetHeight;
  const scaleX = cssW / W;
  const scaleY = cssH / H;
  const contentScaleX = (W / WORLD_W) * zoom;
  const contentScaleY = (H / WORLD_H) * zoom;
  const left   = (area.x * contentScaleX + offset.x) * scaleX;
  const top    = (area.y * contentScaleY + offset.y) * scaleY;
  const width  = area.width  * contentScaleX * scaleX;
  const height = area.height * contentScaleY * scaleY;
  return {
    position:        "absolute",
    left, top, width, height,
    pointerEvents:   "none",
    backgroundColor: "rgba(20, 241, 149, 0.4)",
    mixBlendMode:    "screen" as const,
    zIndex:          10,  // GIF-ek fölé
  };
}, [zoom, offset]);

// ── Zoom helper ──────────────────────────────────────────────────────
const zoomAroundCenter = useCallback((newZ: number) => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const oldZ = zoomRef.current;
  const cx = canvas.width  / 2;  // canvas közepe
  const cy = canvas.height / 2;

  const rawX = cx - (cx - offsetRef.current.x) * (newZ / oldZ);
  const rawY = cy - (cy - offsetRef.current.y) * (newZ / oldZ);
  const clamped = clampOffset(rawX, rawY, newZ, canvas.width, canvas.height);

  zoomRef.current   = newZ;
  offsetRef.current = clamped;
  setZoom(newZ);
  setOffset(clamped);
}, []);

const startZoom = (direction: 1 | -1) => {
  // Azonnal egy lépés
  zoomAroundCenter(direction === 1
    ? Math.min(20, zoomRef.current * 1.1)
    : Math.max(0.95, zoomRef.current * 0.9)
  );
  // Majd folyamatosan
  zoomIntervalRef.current = setInterval(() => {
    zoomAroundCenter(direction === 1
      ? Math.min(20, zoomRef.current * 1.1)
      : Math.max(0.95, zoomRef.current * 0.9)
    );
  }, 150); // ms — ezt állíthatod
};

const stopZoom = () => {
  if (zoomIntervalRef.current) {
    clearInterval(zoomIntervalRef.current);
    zoomIntervalRef.current = null;
  }
};

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
      overflow:"hidden",
    }}
  >
    <canvas
      ref={canvasRef}
      width={800}
      height={Math.round(800 / WORLD_RATIO)}
      style={{
        cursor: isDragging.current ? "grabbing" : hoveredAreaRef.current ? "pointer" : "crosshair",
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

  {/* Hover highlight — GIF-ek felett */}
  {hoveredArea && (
    <div style={getHoverStyle(hoveredArea)} />
  )}

</div>
  </div>
        {selectedArea && (
  <div
    onClick={() => setSelectedArea(null)}
    style={{
      position: "fixed", inset: 0,
      zIndex: 300, cursor: "default",
    }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: "fixed",
        bottom: 80, left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(6,10,6,0.97)",
        border: "1px solid rgba(153,69,255,0.35)",
        borderRadius: 12,
        padding: "1rem 1.25rem",
        minWidth: 280, maxWidth: 360,
        boxShadow: "0 0 40px rgba(153,69,255,0.15)",
        display: "flex", flexDirection: "column", gap: "0.5rem",
        zIndex: 301,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "#9945FF", letterSpacing: "0.1em" }}>
          PIXEL AREA INFO
        </span>
        <button
          onClick={() => setSelectedArea(null)}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: "1rem", cursor: "pointer" }}
        >✕</button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "linear-gradient(90deg, #9945FF, #14F195)", opacity: 0.3 }} />

      {/* Info sorok */}
      {[
        ["Wallet",  selectedArea.walletAddress
          ? `${selectedArea.walletAddress.slice(0,6)}...${selectedArea.walletAddress.slice(-4)}`
          : "—"],
        ["Position", `(${selectedArea.x}, ${selectedArea.y})`],
        ["Size",    `${selectedArea.width} × ${selectedArea.height} px`],
        ["Pixels",  `${(selectedArea.width * selectedArea.height).toLocaleString()} px`],
      ].map(([label, value]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
          <span style={{ fontFamily: "monospace", fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{label}</span>
          <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "rgba(255,255,255,0.75)" }}>{value}</span>
        </div>
      ))}

      {/* Link */}
      {selectedArea.link && (
        <a
          href={selectedArea.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "monospace", fontSize: "0.68rem",
            color: "#14F195",
            textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap",
            textDecoration: "none",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: "0.5rem", marginTop: "0.25rem",
          }}
        >
          🔗 {selectedArea.link}
        </a>
      )}

      {/* Zoom to area + Link másoló */}
      <style>{`
  .area-action-btn {
    transition: background 180ms ease, border-color 180ms ease, color 180ms ease;
  }
  .area-action-btn:hover {
    background: rgba(153, 69, 255, 0.25) !important;
    border-color: rgba(153, 69, 255, 0.6) !important;
    color: rgba(200, 150, 255, 1) !important;
  }
`}</style>
<div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
  <a
    href={`/canvas/live?area=${selectedArea.id}`}
    className="area-action-btn"
    style={{
      flex: 1,
      padding: "0.5rem",
      background: "rgba(153,69,255,0.1)",
      border: "1px solid rgba(153,69,255,0.25)",
      borderRadius: 6,
      fontFamily: "monospace", fontSize: "0.7rem",
      color: "rgba(153,69,255,0.9)",
      textAlign: "center", textDecoration: "none",
      cursor: "pointer",
    }}
  >
    🔍 Zoom to area
  </a>

  <button
  className="area-action-btn"
    onClick={() => {
      const url = `${window.location.origin}/canvas/live?area=${selectedArea.id}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }}
    title="Copy area link"
    style={{
      padding: "0.5rem 0.75rem",
      background: "rgba(153,69,255,0.1)",
      border: "1px solid rgba(153,69,255,0.25)",
      borderRadius: 6,
      color: "rgba(153,69,255,0.9)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    {copied
  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14F195" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
}
  </button>
</div>
    </div>
  </div>
)}

        {/* Zoom controls */}
        <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: "0.5rem", alignItems: "center", background: "rgba(6,10,6,0.85)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "0.4rem 0.9rem" }}>
          <button
  onMouseDown={() => startZoom(-1)}
  onMouseUp={stopZoom}
  onMouseLeave={stopZoom}   // ← ha elhúzza az egeret, leáll
  onTouchStart={() => startZoom(-1)}
  onTouchEnd={stopZoom} style={{ background: "none", border: "none", color: "#14f195", fontSize: "1.1rem", cursor: "pointer", padding: "0 4px" }}>{"−"}</button>
          <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "rgba(255,255,255,0.5)", minWidth: 36, textAlign: "center" }}>{zp}%</span>
          <button
  onMouseDown={() => startZoom(1)}
  onMouseUp={stopZoom}
  onMouseLeave={stopZoom}
  onTouchStart={() => startZoom(1)}
  onTouchEnd={stopZoom} style={{ background: "none", border: "none", color: "#14f195", fontSize: "1.1rem", cursor: "pointer", padding: "0 4px" }}>{"+"}</button>
          <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)", margin: "0 4px" }}></span>
          <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: "0.65rem", fontFamily: "monospace", cursor: "pointer", letterSpacing: "0.05em" }}>RESET</button>
        </div>
      </div>
    </div>
  );
}