"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { connectWebSocket, onCanvasEvent } from "@/lib/websocket";
import { api } from "@/lib/api";
import {
  WORLD_W, WORLD_H, WORLD_RATIO,
  drawCapsulePath,
  CAPSULE_H,
  CAPSULE_W,
  CAPSULE_OFFSET_Y,
  CAPSULE_OFFSET_X,
} from "@/lib/capsuleConfig";

export function PumpCapsule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loupeRef  = useRef<HTMLCanvasElement>(null);
  const router    = useRouter();
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);

  const drawMain = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;

    // scaleX/scaleY: world px → canvas px (uniform, no distortion)
    const scaleX = W / CAPSULE_W;
    const scaleY = H / CAPSULE_H;
    const ox = -CAPSULE_OFFSET_X * scaleX;
    const oy = -CAPSULE_OFFSET_Y * scaleY;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    drawCapsulePath(ctx, scaleX, scaleY, ox, oy);
    ctx.clip();
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Lekérés a teljes world méretben
    api.get<any>(`/canvas/areas?x=0&y=0&w=${WORLD_W}&h=${WORLD_H}`)
      .then((resp) => {
        const areas = Array.isArray(resp) ? resp : (resp?.areas ?? []);

        const draws = areas.map((area: any) => {
          const dx = area.x * scaleX + ox;
          const dy = area.y * scaleY + oy;
          const dw = Math.max(1, area.width  * scaleX);
          const dh = Math.max(1, area.height * scaleY);

          return new Promise<void>((resolve) => {
            if ((area.status as string) === "FORBIDDEN") {
              ctx.save();
              drawCapsulePath(ctx, scaleX, scaleY, ox, oy);
              ctx.clip();
              ctx.fillStyle = "rgba(255, 30, 30, 0.35)";
              ctx.fillRect(dx, dy, dw, dh);
              ctx.restore();
              resolve();
              return;
            }
            if (area.imageUrl) {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => {
                ctx.save();
                drawCapsulePath(ctx, scaleX, scaleY, ox, oy);
                ctx.clip();
                // Képet torzítás nélkül rajzoljuk (scaleX === scaleY egyforma skála)
                ctx.drawImage(img, dx, dy, dw, dh);
                ctx.restore();
                resolve();
              };
              img.onerror = () => {
                ctx.save();
                drawCapsulePath(ctx, scaleX, scaleY, ox, oy);
                ctx.clip();
                ctx.fillStyle = area.status === "AT_RISK" ? "#f59e0b" : "#7C3AED";
                ctx.fillRect(dx, dy, dw, dh);
                ctx.restore();
                resolve();
              };
              img.src = area.imageUrl;
            } else {
              ctx.save();
              drawCapsulePath(ctx, scaleX, scaleY, ox, oy);
              ctx.clip();
              ctx.fillStyle = area.status === "AT_RISK" ? "#f59e0b" : "#7C3AED";
              ctx.fillRect(dx, dy, dw, dh);
              ctx.restore();
              resolve();
            }
          });
        });

        Promise.all(draws).then(() => {
          // Kapszula stroke
          drawCapsulePath(ctx, scaleX, scaleY, ox, oy);
          ctx.strokeStyle = "rgba(20,241,149,0.5)";
          ctx.lineWidth   = 2;
          ctx.stroke();
        });
      })
      .catch(console.error);
  }, []);
  // ─── Polling + WebSocket refresh ─────────────────────────────────────
const POLL_MS = 15_000; // 15 másodperc

useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  
  // Polling
  const interval = setInterval(() => {
    drawMain(canvas);
  }, POLL_MS);

  // WebSocket — azonnali frissítés claim után
  const { connectWebSocket, onCanvasEvent } = require("@/lib/websocket");
  connectWebSocket();
  const unsubClaimed  = onCanvasEvent("AREA_CLAIMED",  () => drawMain(canvas));
  const unsubUploaded = onCanvasEvent("IMAGE_UPLOADED", () => drawMain(canvas));

  return () => {
    clearInterval(interval);
    unsubClaimed?.();
    unsubUploaded?.();
  };
}, [drawMain]);
 // ─── Resize ──────────────────────────────────────────────────────────────────
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const resizeAndDraw = () => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  
  const container = canvas.closest(".capsule-solana") as HTMLElement | null;
  const inner = canvas.closest(".capsule-solana-inner") as HTMLElement | null;
  const parent = canvas.parentElement;
  
  console.log("capsule-solana width:", container?.getBoundingClientRect().width);
  console.log("capsule-solana-inner width:", inner?.getBoundingClientRect().width);
  console.log("parent div width:", parent?.getBoundingClientRect().width);
  console.log("canvas CSS width:", canvas.getBoundingClientRect().width);
  console.log("canvas.width attrib:", canvas.width);
  
  const w = Math.floor(container?.getBoundingClientRect().width ?? 800);
  console.log("→ setting canvas.width to:", w);
  
  if (w === 0) { setTimeout(resizeAndDraw, 50); return; }
  canvas.width  = w;
  canvas.height = Math.round(w / WORLD_RATIO);
  drawMain(canvas);
};

  resizeAndDraw();
  window.addEventListener("resize", resizeAndDraw);
  return () => window.removeEventListener("resize", resizeAndDraw);
}, [drawMain]);

  // ─── Mouse ───────────────────────────────────────────────────────────────────
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    setMouse({
      x: (e.clientX - rect.left) * (canvas.width  / rect.width),
      y: (e.clientY - rect.top)  * (canvas.height / rect.height),
    });
  };

  // Kattintásra → Live Canvas megnyitása
  const handleClick = () => {
    router.push("/canvas/live");
  };

  const loupeLeft = mouse ? (mouse.x / (canvasRef.current?.width  ?? 1)) * 100 : 50;
  const loupeTop  = mouse ? (mouse.y / (canvasRef.current?.height ?? 1)) * 100 : 50;

 return (
  <div
    style={{
      cursor: "pointer",
      lineHeight: 0,
      fontSize: 0,
      borderRadius: "996px",
      overflow: "hidden",
    }}
    title="Click to open Live Canvas"
  >
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "auto" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMouse(null)}
      onClick={handleClick}
    />
  </div>
);
}
