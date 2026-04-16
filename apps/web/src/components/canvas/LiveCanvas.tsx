"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { api } from "@/lib/api";

const CANVAS_W=42986,CANVAS_H=26867,POLL_MS=10000,LOUPE_SIZE=160,LOUPE_ZOOM=5;

interface PixelArea{id:string;x:number;y:number;width:number;height:number;imageUrl?:string|null;link?:string|null;status:"ACTIVE"|"AT_RISK"|"FORBIDDEN";walletAddress?:string;}
interface Stats{pixelsClaimed:number;pixelsRemaining:number;percentFilled:number;owners:number;}

function capsulePath(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const WORLD_RATIO = 42986 / 26867;
  const CANVAS_RATIO = 2.4;
  const sx = CANVAS_RATIO / WORLD_RATIO; // ≈ 1.501

  const r = H / 2; // sugár a canvas magassága alapján
  const leftCx = r * sx;         // bal félkör középpontja X-ben nyújtva
  const rightCx = W - r * sx;    // jobb félkör

  ctx.beginPath();
  ctx.moveTo(leftCx, 0);
  ctx.lineTo(rightCx, 0);
  ctx.arc(rightCx, H / 2, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(leftCx, H);
  ctx.arc(leftCx, H / 2, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
}

function Tooltip({area,x,y}:{area:PixelArea;x:number;y:number}){return(<div style={{position:"fixed",left:x+14,top:y-8,background:"rgba(6,10,6,0.95)",border:"1px solid rgba(20,241,149,0.35)",borderRadius:8,padding:"7px 12px",fontSize:11,color:"#e2e8f0",pointerEvents:"none",zIndex:9999,maxWidth:240,backdropFilter:"blur(8px)"}}>{area.walletAddress&&<div style={{color:"rgba(20,241,149,0.85)",fontFamily:"monospace",fontSize:10}}>{area.walletAddress.slice(0,4)}...{area.walletAddress.slice(-4)}</div>}<div style={{color:"rgba(255,255,255,0.45)",fontSize:10}}>{area.x},{area.y} / {area.width}x{area.height}px</div>{area.link?<div style={{color:"#818cf8",marginTop:4,fontSize:10}}>{area.link.replace(/^https?:\/\//,"").slice(0,35)}</div>:<div style={{color:"rgba(255,255,255,0.2)",fontSize:10}}>no link</div>}</div>);}

export function LiveCanvas(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const loupeRef=useRef<HTMLCanvasElement>(null);
  const imgCache=useRef<Map<string,HTMLImageElement>>(new Map());
  const isDragging=useRef(false);
  const dragStart=useRef({mx:0,my:0,ox:0,oy:0});
  const [areas,setAreas]=useState<PixelArea[]>([]);
  const [stats,setStats]=useState<Stats|null>(null);
  const [zoom,setZoom]=useState(1);
  const [offset,setOffset]=useState({x:0,y:0});
  const [mouse,setMouse]=useState<{cx:number;cy:number;sx:number;sy:number}|null>(null);
  const [tooltip,setTooltip]=useState<{area:PixelArea;x:number;y:number}|null>(null);
  const [lastUpdate,setLastUpdate]=useState("");

  const draw = useCallback(() => {
  const canvas = canvasRef.current; if (!canvas) return;
  const ctx = canvas.getContext("2d"); if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.save(); capsulePath(ctx, W, H); ctx.clip();
  ctx.fillStyle = "#111"; ctx.fillRect(0, 0, W, H);

  const vcW = W * zoom, vcH = H * zoom, ox = offset.x, oy = offset.y;

  // ── SCALE_X: a 2.4:1 canvas vs 1.599:1 world arány különbsége ──
  const SCALE_X = (W / H) / (CANVAS_W / CANVAS_H); // ≈ 1.501

  const gridStep = Math.max(1, Math.round(40 / zoom)) * (CANVAS_W / W);
  const gss = (gridStep / CANVAS_W) * vcW;
  ctx.strokeStyle = "rgba(20,241,149,0.055)"; ctx.lineWidth = 0.5;
  const sgx = Math.floor(-ox / gss) * gss + ox;
  const sgy = Math.floor(-oy / gss) * gss + oy;
  for (let x = sgx; x < W; x += gss) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = sgy; y < H; y += gss) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // ── X skálánál SCALE_X kompenzáció, Y változatlan ──
  const sx2 = (vcW / CANVAS_W) * SCALE_X;
  const sy2 = vcH / CANVAS_H;

  areas.forEach((area) => {
    const sx = area.x * sx2 + ox;
    const sy = area.y * sy2 + oy;
    const sw = Math.max(1, area.width * sx2);
    const sh = Math.max(1, area.height * sy2);
    if (sx + sw < 0 || sy + sh < 0 || sx > W || sy > H) return;

    if ((area.status as string) === "FORBIDDEN") {
      // ✅ Marad a clip-en belül, nem kell külön restore
      ctx.fillStyle = "rgba(255, 30, 30, 0.35)";
      ctx.fillRect(sx, sy, sw, sh);
      return;
    }
      if(area.imageUrl){
        let img=imgCache.current.get(area.imageUrl);
        if(!img){img=new Image();img.crossOrigin="anonymous";img.src=area.imageUrl;img.onload=()=>draw();imgCache.current.set(area.imageUrl!,img!);}
        if(img.complete&&img.naturalWidth>0){ctx.drawImage(img,sx,sy,sw,sh);}
        else{ctx.fillStyle=area.status==="AT_RISK"?"rgba(245,158,11,0.6)":"#7C3AED";ctx.fillRect(sx,sy,sw,sh);}
      }else{ctx.fillStyle=area.status==="AT_RISK"?"rgba(245,158,11,0.6)":"#7C3AED";ctx.fillRect(sx,sy,sw,sh);}
    });
    ctx.restore();
    capsulePath(ctx,W,H);ctx.strokeStyle="rgba(20,241,149,0.5)";ctx.lineWidth=2;ctx.stroke();
  },[areas,zoom,offset]);

  useEffect(()=>{draw();},[draw]);
  useEffect(()=>{
    const loupe=loupeRef.current,canvas=canvasRef.current;
    if(!loupe||!canvas||!mouse)return;
    const ctx=loupe.getContext("2d");if(!ctx)return;
    const half=LOUPE_SIZE/2;
    ctx.clearRect(0,0,LOUPE_SIZE,LOUPE_SIZE);
    ctx.save();ctx.beginPath();ctx.arc(half,half,half,0,Math.PI*2);ctx.clip();
    ctx.drawImage(canvas,mouse.cx-half/LOUPE_ZOOM,mouse.cy-half/LOUPE_ZOOM,LOUPE_SIZE/LOUPE_ZOOM,LOUPE_SIZE/LOUPE_ZOOM,0,0,LOUPE_SIZE,LOUPE_SIZE);
    ctx.restore();
    ctx.beginPath();ctx.arc(half,half,half-1,0,Math.PI*2);ctx.strokeStyle="rgba(153,69,255,0.9)";ctx.lineWidth=2;ctx.stroke();
    ctx.strokeStyle="rgba(255,255,255,0.5)";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(half,half-12);ctx.lineTo(half,half+12);ctx.moveTo(half-12,half);ctx.lineTo(half+12,half);ctx.stroke();
  },[mouse]);

  const loadData=useCallback(async()=>{
    try{
      const [ar,st]=await Promise.all([api.get<any>(`/canvas/areas?x=0&y=0&w=${CANVAS_W}&h=${CANVAS_H}`),api.get<Stats>("/canvas/stats")]);
      setAreas(Array.isArray(ar)?ar:(ar?.areas??[]));
      setStats(st);
      setLastUpdate(new Date().toLocaleTimeString("en-EN"));
    }catch(_){}
  },[]);

  useEffect(()=>{loadData();const iv=setInterval(loadData,POLL_MS);return()=>clearInterval(iv);},[loadData]);

  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const resize=()=>{const w=canvas.parentElement?.clientWidth??800;canvas.width=w;canvas.height=Math.round(w/2.4);draw();};
    resize();window.addEventListener("resize",resize);return()=>window.removeEventListener("resize",resize);
  },[draw]);

  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const onWheel=(e:WheelEvent)=>{
    e.preventDefault();
    const canvas=canvasRef.current;if(!canvas)return;
    const rect=canvas.getBoundingClientRect();
    const mouseX=(e.clientX-rect.left)*(canvas.width/rect.width);
    const mouseY=(e.clientY-rect.top)*(canvas.height/rect.height);
    const delta=e.deltaY>0?0.9:1.1;
    setZoom(z=>{
      const nz=Math.min(10,Math.max(0.99,z*delta));
      setOffset(o=>({
        x:mouseX-(mouseX-o.x)*(nz/z),
        y:mouseY-(mouseY-o.y)*(nz/z),
      }));
      return nz;
    });
  };
    canvas.addEventListener("wheel",onWheel,{passive:false});
    return()=>canvas.removeEventListener("wheel",onWheel);
  },[]);

  const onMouseDown=(e:React.MouseEvent<HTMLCanvasElement>)=>{isDragging.current=true;dragStart.current={mx:e.clientX,my:e.clientY,ox:offset.x,oy:offset.y};};
  const onMouseMove=(e:React.MouseEvent<HTMLCanvasElement>)=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const rect=canvas.getBoundingClientRect();
    const cx=(e.clientX-rect.left)*(canvas.width/rect.width);
    const cy=(e.clientY-rect.top)*(canvas.height/rect.height);
    setMouse({cx,cy,sx:e.clientX,sy:e.clientY});
    if(isDragging.current){
      setOffset({x:dragStart.current.ox+(e.clientX-dragStart.current.mx)*(canvas.width/rect.width),y:dragStart.current.oy+(e.clientY-dragStart.current.my)*(canvas.height/rect.height)});
      setTooltip(null);
    }else{
      const vcW=canvas.width*zoom,vcH=canvas.height*zoom;
      const canvasX=(cx-offset.x)/(vcW/CANVAS_W),canvasY=(cy-offset.y)/(vcH/CANVAS_H);
      const hit=areas.find(a=>canvasX>=a.x&&canvasX<=a.x+a.width&&canvasY>=a.y&&canvasY<=a.y+a.height);
      if(hit)setTooltip({area:hit,x:e.clientX,y:e.clientY});else setTooltip(null);
    }
  };
  const onMouseUp=()=>{isDragging.current=false;};
  const onMouseLeave=()=>{isDragging.current=false;setMouse(null);setTooltip(null);};
  const onClick=(e:React.MouseEvent<HTMLCanvasElement>)=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const rect=canvas.getBoundingClientRect();
    const cx=(e.clientX-rect.left)*(canvas.width/rect.width);
    const cy=(e.clientY-rect.top)*(canvas.height/rect.height);
    const vcW=canvas.width*zoom,vcH=canvas.height*zoom;
    const canvasX=(cx-offset.x)/(vcW/CANVAS_W),canvasY=(cy-offset.y)/(vcH/CANVAS_H);
    const hit=areas.find(a=>canvasX>=a.x&&canvasX<=a.x+a.width&&canvasY>=a.y&&canvasY<=a.y+a.height);
    if(hit?.link)window.open(hit.link,"_blank","noopener,noreferrer");
  };

  const zp=Math.round(zoom*100);

  return(
    <div style={{minHeight:"100vh",background:"#060a06",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.75rem 1.5rem",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(6,10,6,0.97)",position:"sticky",top:0,zIndex:100}}>
        <a href="/" style={{fontFamily:"monospace",fontSize:"0.85rem",color:"#14f195",textDecoration:"none",letterSpacing:"0.15em"}}>{"← 1BP.FUN"}</a>
        <div style={{display:"flex",alignItems:"center",gap:"1.5rem"}}>
          <span style={{fontSize:"0.65rem",color:"rgba(20,241,149,0.7)",fontFamily:"monospace",display:"flex",alignItems:"center",gap:"0.4rem"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#14f195",display:"inline-block",boxShadow:"0 0 6px #14f195"}}></span>
            LIVE
          </span>
          <span style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.4)",fontFamily:"monospace"}}>{zp}%</span>
        </div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative"}}>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          style={{cursor:isDragging.current?"grabbing":"crosshair",display:"block",maxWidth:"100%",maxHeight:"calc(100vh - 120px)",imageRendering:"pixelated",filter:"drop-shadow(0 0 40px rgba(20,241,149,0.08))"}}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onClick={onClick}
        />
        {tooltip&&(
          <div style={{position:"fixed",left:tooltip.x+14,top:tooltip.y-10,background:"rgba(6,10,6,0.97)",border:"1px solid rgba(20,241,149,0.25)",borderRadius:6,padding:"0.5rem 0.75rem",pointerEvents:"none",zIndex:200,minWidth:160,boxShadow:"0 4px 24px rgba(0,0,0,0.5)"}}>
            <div style={{fontFamily:"monospace",fontSize:"0.7rem",color:"#14f195",marginBottom:4}}>{tooltip.area.walletAddress? `${tooltip.area.walletAddress.slice(0,4)}...${tooltip.area.walletAddress.slice(-4)}`: "Unknown"}</div>
            <div style={{fontFamily:"monospace",fontSize:"0.65rem",color:"rgba(255,255,255,0.5)"}}>
              {tooltip.area.width}{"×"}{tooltip.area.height}{"px @ ("}{tooltip.area.x},{tooltip.area.y}{")"}
            </div>
            {tooltip.area.link&&(
              <div style={{fontFamily:"monospace",fontSize:"0.6rem",color:"rgba(20,241,149,0.6)",marginTop:4,textOverflow:"ellipsis",overflow:"hidden",whiteSpace:"nowrap",maxWidth:180}}>
                {"\uD83D\uDD17 "}{tooltip.area.link}
              </div>
            )}
          </div>
        )}
        <div style={{position:"absolute",bottom:16,left:"50%",transform:"translateX(-50%)",display:"flex",gap:"0.5rem",alignItems:"center",background:"rgba(6,10,6,0.85)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:8,padding:"0.4rem 0.9rem"}}>
          <button onClick={()=>setZoom(z=>Math.max(0.99,z-0.1))} style={{background:"none",border:"none",color:"#14f195",fontSize:"1.1rem",cursor:"pointer",padding:"0 4px"}}>{"−"}</button>
          <span style={{fontFamily:"monospace",fontSize:"0.7rem",color:"rgba(255,255,255,0.5)",minWidth:36,textAlign:"center"}}>{zp}%</span>
          <button onClick={()=>setZoom(z=>Math.min(10,z+0.1))} style={{background:"none",border:"none",color:"#14f195",fontSize:"1.1rem",cursor:"pointer",padding:"0 4px"}}>{"+"}</button>
          <span style={{width:1,height:16,background:"rgba(255,255,255,0.1)",margin:"0 4px"}}></span>
          <button onClick={()=>{setZoom(1);setOffset({x:0,y:0});}} style={{background:"none",border:"none",color:"rgba(255,255,255,0.35)",fontSize:"0.65rem",fontFamily:"monospace",cursor:"pointer",letterSpacing:"0.05em"}}>RESET</button>
        </div>
      </div>
    </div>
  );
}