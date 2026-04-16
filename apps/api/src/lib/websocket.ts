import WebSocket from "ws";

const clients = new Set<any>();

export const registerClient = (socket: any) => {
  clients.add(socket);
  socket.on("close", () => clients.delete(socket));
};

export const broadcastCanvasUpdate = (payload: object) => {
  const msg = JSON.stringify(payload);
  for (const socket of clients) {
    try {
      if (socket.readyState === 1) socket.send(msg); // 1 = OPEN
    } catch { /* silent */ }
  }
};

