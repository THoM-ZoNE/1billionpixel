let ws: WebSocket | null = null;
const listeners = new Map<string, Set<(data: any) => void>>();

export const connectWebSocket = () => {
  if (ws?.readyState === WebSocket.OPEN) return;
  
  const url = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000/ws";
  ws = new WebSocket(url);

  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      listeners.get(data.type)?.forEach((fn) => fn(data));
      listeners.get("*")?.forEach((fn) => fn(data));
    } catch {
      // invalid JSON – figyelmen kívül hagyja
    }
  };

  ws.onclose = () => setTimeout(connectWebSocket, 3000);
  
  ws.onerror = (err) => {
    console.warn("[ws] connection error, retrying...");
  };
};

export const onCanvasEvent = (type: string, fn: (data: any) => void) => {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type)!.add(fn);
  return () => listeners.get(type)?.delete(fn);
};
