// apps/api/src/routes/ws.ts
import { FastifyPluginAsync } from "fastify";

const wsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/ws", { websocket: true }, (socket, req) => {
    console.log("[ws] client connected");

    socket.on("message", (msg) => {
      // echo vagy broadcast logika ide
    });

    socket.on("close", () => {
      console.log("[ws] client disconnected");
    });
  });
};

export default wsRoutes;
