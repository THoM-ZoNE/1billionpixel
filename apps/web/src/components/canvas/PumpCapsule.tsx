"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";

const CANVAS_W = 42986;
const CANVAS_H = 26867;
const DISPLAY_RATIO = 2.4;
const SCALE_X = DISPLAY_RATIO / (CANVAS_W / CANVAS_H); // ≈ 1.501

export function PumpCapsule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loupeRef  = useRef<HTMLCanvasElement>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const LOUPE_SIZE = 160;
  const LOUPE_ZOOM = 4;

  const drawCapsulePath = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    const r = H / 2;
    const leftCx  = r * SCALE_X;
    const rightCx = W - r * SCALE_X;
    ctx.beginPath();
    ctx.moveTo(leftCx, 0);
    ctx.lineTo(rightCx, 0);
    ctx.arc(rightCx, r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(leftCx, H);
    ctx.arc(leftCx, r, r, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
  };

  const drawMain = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    drawCapsulePath(ctx, W, H);
    ctx.clip();
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    api.get<any>("/canvas/areas?x=0&y=0&w=40000&h=25000")
      .then((resp) => {
        const areas = Array.isArray(resp) ? resp : (resp?.areas ?? []);
        // X skálába SCALE_X beépítve
        const scaleXpx = (W / CANVAS_W) * SCALE_X;
        const scaleYpx = H / CANVAS_H;

        const draws = areas.map((area: any) => {
          const dx = area.x * scaleXpx;
          const dy = area.y * scaleYpx;
          const dw = Math.max(1, area.width  * scaleXpx);
          const dh = Math.max(1, area.height * scaleYpx);

          return new Promise<void>((resolve) => {
            if ((area.status as string) === "FORBIDDEN") {
              ctx.save();
              drawCapsulePath(ctx, W, H);
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
                drawCapsulePath(ctx, W, H);
                ctx.clip();
                // képet visszakorrigálva az eredeti arányban rajzoljuk
                const imgW = dw / SCALE_X;
                const imgX = dx + (dw - imgW) / 2;
                ctx.drawImage(img, imgX, dy, imgW, dh);
                ctx.restore();
                resolve();
              };
              img.onerror = () => {
                ctx.save();
                drawCapsulePath(ctx, W, H);
                ctx.clip();
                ctx.fillStyle = area.status === "AT_RISK" ? "#f59e0b" : "#7C3AED";
                ctx.fillRect(dx, dy, dw, dh);
                ctx.restore();
                resolve();
              };
              img.src = area.imageUrl;
            } else {
              ctx.save();
              drawCapsulePath(ctx, W, H);
              ctx.clip();
              ctx.fillStyle = area.status === "AT_RISK" ? "#f59e0b" : "#7C3AED";
              ctx.fillRect(dx, dy, dw, dh);
              ctx.restore();
              resolve();
            }
          });
        });

        Promise.all(draws).then(() => {
          drawCapsulePath(ctx, W, H);
          ctx.strokeStyle = "rgba(20,241,149,0.5)";
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeAndDraw = () => {
      const parentWidth = canvas.parentElement?.clientWidth ?? 800;
      canvas.width  = parentWidth;
      canvas.height = Math.round(parentWidth / DISPLAY_RATIO);
      drawMain(canvas);
    };
    resizeAndDraw();
    window.addEventListener("resize", resizeAndDraw);
    return () => window.removeEventListener("resize", resizeAndDraw);
  }, [drawMain]);

  useEffect(() => {
    const loupe  = loupeRef.current;
    const canvas = canvasRef.current;
    if (!loupe || !canvas || !mouse) return;
    const ctx = loupe.getContext("2d");
    if (!ctx) return;
    const half = LOUPE_SIZE / 2;
    ctx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.clip();
    const srcX = mouse.x - half / LOUPE_ZOOM;
    const srcY = mouse.y - half / LOUPE_ZOOM;
    const srcW = LOUPE_SIZE / LOUPE_ZOOM;
    const srcH = LOUPE_SIZE / LOUPE_ZOOM;
    ctx.drawImage(canvas, srcX, srcY, srcW, srcH, 0, 0, LOUPE_SIZE, LOUPE_SIZE);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(half, half, half - 1, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(153,69,255,0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(half, half - 10); ctx.lineTo(half, half + 10);
    ctx.moveTo(half - 10, half); ctx.lineTo(half + 10, half);
    ctx.stroke();
  }, [mouse]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect   = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width  / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    setMouse({
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    });
  };

  const loupeLeft = mouse ? (mouse.x / (canvasRef.current?.width  ?? 1)) * 100 : 50;
  const loupeTop  = mouse ? (mouse.y / (canvasRef.current?.height ?? 1)) * 100 : 50;

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: "100%" }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height: "auto", cursor: "crosshair" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setMouse(null)}
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