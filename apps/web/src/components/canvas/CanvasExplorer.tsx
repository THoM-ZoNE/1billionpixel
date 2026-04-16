"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { Stage, Layer, Rect, Image as KImage, Line } from "react-konva";
import Konva from "konva";
import useImage from "use-image";
import { useCanvasStore } from "@/store/canvasStore";
import { api } from "@/lib/api";
import { onCanvasEvent, connectWebSocket } from "@/lib/websocket";
import { CanvasRegion, CANVAS_W, CANVAS_H } from "@1bp/shared";

function GridLayer({ scale, stagePos, stageSize }: {
  scale: number;
  stagePos: { x: number; y: number };
  stageSize: { w: number; h: number };
}) {
  const vx = Math.max(0, -stagePos.x / scale);
  const vy = Math.max(0, -stagePos.y / scale);
  const vw = stageSize.w / scale;
  const vh = stageSize.h / scale;

  const rawCell = vw / 30;
  const mag = Math.pow(10, Math.floor(Math.log10(rawCell)));
  const cellSize =
    rawCell / mag < 2 ? mag :
    rawCell / mag < 5 ? mag * 2 :
    mag * 5;

  const lines: React.ReactElement[] = [];
  const color = "rgba(20,241,149,0.08)";
  const sw = 1 / scale;

  const startX = Math.floor(vx / cellSize) * cellSize;
  const startY = Math.floor(vy / cellSize) * cellSize;

  for (let x = startX; x <= vx + vw && x <= CANVAS_W; x += cellSize) {
    lines.push(
      <Line key={`v${x}`} points={[x, vy, x, vy + vh]}
        stroke={color} strokeWidth={sw} listening={false} />
    );
  }
  for (let y = startY; y <= vy + vh && y <= CANVAS_H; y += cellSize) {
    lines.push(
      <Line key={`h${y}`} points={[vx, y, vx + vw, y]}
        stroke={color} strokeWidth={sw} listening={false} />
    );
  }

  return <Layer listening={false}>{lines}</Layer>;
}

export function CanvasExplorer({ onRegionSelect }: { onRegionSelect: (r: CanvasRegion) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef     = useRef<Konva.Stage>(null);
  const [stageSize, setStageSize] = useState({ w: 800, h: 500 });
  const [scale,     setScale]     = useState(1);
  const [stagePos,  setStagePos]  = useState({ x: 0, y: 0 }); // ← hiányzott

  const { areas, setAreas, addArea, removeArea } = useCanvasStore();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const w = el.clientWidth;
      setStageSize({ w, h: Math.round(w * (25000 / 40000)) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const loadAreas = useCallback(async () => {
    const s = stageRef.current;
    if (!s) return;
    const sc  = s.scaleX();
    const pos = s.position();
    const vx  = Math.max(0, -pos.x / sc);
    const vy  = Math.max(0, -pos.y / sc);
    const vw  = Math.min(stageSize.w / sc, CANVAS_W);
    const vh  = Math.min(stageSize.h / sc, CANVAS_H);
    const data = await api.get<any[]>(
      `/canvas/areas?x=${Math.floor(vx)}&y=${Math.floor(vy)}&w=${Math.ceil(vw)}&h=${Math.ceil(vh)}`
    );
    setAreas(data);
  }, [setAreas, stageSize]);

  useEffect(() => {
    connectWebSocket();
    loadAreas();
    const offClaimed  = onCanvasEvent("AREA_CLAIMED",  (d) => addArea(d.area));
    const offReleased = onCanvasEvent("AREA_RELEASED", (d) => removeArea(d.areaId));
    const offUploaded = onCanvasEvent("IMAGE_UPLOADED", loadAreas);
    return () => { offClaimed(); offReleased(); offUploaded(); };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = stage.scaleX();
      const pointer  = stage.getPointerPosition();
      if (!pointer) return;

      const newScale = Math.max(0.05, Math.min(50,
        oldScale * (e.deltaY > 0 ? 0.9 : 1.1)
      ));
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      stage.scale({ x: newScale, y: newScale });
      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };
      stage.position(newPos);

      setScale(newScale);
      setStagePos(newPos); // ← frissítés
      loadAreas();
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [loadAreas]);

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos   = stage.getPointerPosition()!;
    const sc    = stage.scaleX();
    const stPos = stage.position();
    onRegionSelect({
      x: Math.floor((pos.x - stPos.x) / sc),
      y: Math.floor((pos.y - stPos.y) / sc),
      width: 100, height: 100,
    });
  };

  return (
    <div ref={containerRef} style={{
      width: "100%",
      borderRadius: "0.75rem",
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      <Stage
        ref={stageRef}
        width={stageSize.w}
        height={stageSize.h}
        draggable
        onDragMove={() => {           // ← frissítés drag közben
          const s = stageRef.current;
          if (s) setStagePos({ x: s.x(), y: s.y() });
        }}
        onDragEnd={() => {
          const s = stageRef.current;
          if (s) setStagePos({ x: s.x(), y: s.y() });
          loadAreas();
        }}
        onClick={handleClick}
        style={{ cursor: "crosshair", display: "block" }}
      >
        <Layer listening={false}>
          <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="#060a06" />
        </Layer>

        <GridLayer scale={scale} stagePos={stagePos} stageSize={stageSize} />

        <Layer>
  {Array.isArray(areas) && areas.map((area) => (
    <AreaRect key={area.id} area={area} />
  ))}
</Layer>
      </Stage>

      <div style={{
        padding: "0.4rem 1rem",
        fontSize: "0.7rem",
        color: "rgba(255,255,255,0.25)",
        textAlign: "center",
        background: "#060a06",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "1.5rem",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <span style={{ color: "rgba(20,241,149,0.7)" }}>● Available</span>
        <span style={{ color: "rgba(239,68,68,0.8)" }}>● Claimed</span>
        <span style={{ color: "rgba(245,158,11,0.8)" }}>● At Risk</span>
        <span>Scroll = zoom · Drag = pan · Click = select</span>
      </div>
    </div>
  );
}

function AreaRect({ area }: { area: any }) {
  const [img] = useImage(area.imageUrl ?? "");
  if (area.status === "FORBIDDEN") {
    return (
      <Rect
        x={area.x} y={area.y}
        width={area.width} height={area.height}
        fill="rgba(255, 30, 30, 0.35)"
        stroke="rgba(255, 30, 30, 0.6)"
        strokeWidth={1}
        listening={false}
      />
    );
  }
  const fill   = area.status === "AT_RISK" ? "rgba(245,158,11,0.4)" : "rgba(220,38,38,0.5)";
  const stroke = area.status === "AT_RISK" ? "#f59e0b" : "#ef4444";

  return (
    <>
      {img
        ? <KImage image={img} x={area.x} y={area.y} width={area.width} height={area.height} />
        : <Rect x={area.x} y={area.y} width={area.width} height={area.height}
                fill={fill} stroke={stroke} strokeWidth={1} listening={false} />
      }
    </>
  );
}
