"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  WORLD_W, WORLD_H, WORLD_RATIO,
  drawCapsulePath,
} from "@/lib/capsuleConfig";

const LOUPE_SIZE = 160;
const LOUPE_ZOOM = 4;

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
    const scaleX = W / WORLD_W;
    const scaleY = H / WORLD_H;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    drawCapsulePath(ctx, scaleX, scaleY);
    ctx.clip();
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Lekérés a teljes world méretben
    api.get<any>(`/canvas/areas?x=0&y=0&w=${WORLD_W}&h=${WORLD_H}`)
      .then((resp) => {
        const areas = Array.isArray(resp) ? resp : (resp?.areas ?? []);

        const draws = areas.map((area: any) => {
          const dx = area.x * scaleX;
          const dy = area.y * scaleY;
          const dw = Math.max(1, area.width  * scaleX);
          const dh = Math.max(1, area.height * scaleY);

          return new Promise<void>((resolve) => {
            if ((area.status as string) === "FORBIDDEN") {
              ctx.save();
              drawCapsulePath(ctx, scaleX, scaleY);
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
                drawCapsulePath(ctx, scaleX, scaleY);
                ctx.clip();
                // Képet torzítás nélkül rajzoljuk (scaleX === scaleY egyforma skála)
                ctx.drawImage(img, dx, dy, dw, dh);
                ctx.restore();
                resolve();
              };
              img.onerror = () => {
                ctx.save();
                drawCapsulePath(ctx, scaleX, scaleY);
                ctx.clip();
                ctx.fillStyle = area.status === "AT_RISK" ? "#f59e0b" : "#7C3AED";
                ctx.fillRect(dx, dy, dw, dh);
                ctx.restore();
                resolve();
              };
              img.src = area.imageUrl;
            } else {
              ctx.save();
              drawCapsulePath(ctx, scaleX, scaleY);
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
          drawCapsulePath(ctx, scaleX, scaleY);
          ctx.strokeStyle = "rgba(20,241,149,0.5)";
          ctx.lineWidth   = 2;
          ctx.stroke();
        });
      })
      .catch(console.error);
  }, []);

  // ─── Resize ──────────────────────────────────────────────────────────────────
  useEffect(() => {
  const canvas = canvasRef.current; if (!canvas) return;
  const resizeAndDraw = () => {
    // Egy frame-et várunk, hogy a CSS aspect-ratio kiszámolódjon
    requestAnimationFrame(() => {
      const parentWidth = canvas.parentElement?.clientWidth ?? 800;
      if (parentWidth === 0) return; // még nem renderelt
      canvas.width  = parentWidth;
      canvas.height = Math.round(parentWidth / WORLD_RATIO);
      drawMain(canvas);
    });
  };
  resizeAndDraw();
  window.addEventListener("resize", resizeAndDraw);
  return () => window.removeEventListener("resize", resizeAndDraw);
}, [drawMain]);

  // ─── Loupe ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loupe  = loupeRef.current;
    const canvas = canvasRef.current;
    if (!loupe || !canvas || !mouse) return;
    const ctx = loupe.getContext("2d"); if (!ctx) return;
    const half = LOUPE_SIZE / 2;
    ctx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
    ctx.save();
    ctx.beginPath(); ctx.arc(half, half, half, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(canvas,
      mouse.x - half / LOUPE_ZOOM, mouse.y - half / LOUPE_ZOOM,
      LOUPE_SIZE / LOUPE_ZOOM, LOUPE_SIZE / LOUPE_ZOOM,
      0, 0, LOUPE_SIZE, LOUPE_SIZE
    );
    ctx.restore();
    ctx.beginPath(); ctx.arc(half, half, half - 1, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(153,69,255,0.9)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(half, half - 10); ctx.lineTo(half, half + 10);
    ctx.moveTo(half - 10, half); ctx.lineTo(half + 10, half);
    ctx.stroke();
  }, [mouse]);

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
      style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}
      title="Click to open Live Canvas"
    >
      <div style={{ position: "relative", width: "100%" }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height: "auto", cursor: "crosshair" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setMouse(null)}
          onClick={handleClick}
        />
        {mouse && (
          <canvas
            ref={loupeRef}
            width={LOUPE_SIZE}
            height={LOUPE_SIZE}
            style={{
              position: "absolute",
              left: `calc(${loupeLeft}% + 16px)`,
              top:  `calc(${loupeTop}% - ${LOUPE_SIZE / 2}px)`,
              pointerEvents: "none",
              borderRadius: "50%",
              boxShadow: "0 0 12px rgba(153,69,255,0.7)",
            }}
          />
        )}
      </div>
    </div>
  );
}
