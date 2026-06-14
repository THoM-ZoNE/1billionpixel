import "dotenv/config";
import Fastify, { fastify } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import wsRoutes from "./routes/ws";
import { walletRoutes }  from "./routes/wallet.js";
import { pixelRoutes }   from "./routes/pixel.js";
import { uploadRoutes }  from "./routes/upload.js";
import canvasRoutes  from "./routes/canvas.js";
console.log("CANVAS ROUTES LOADED", __filename);
import { webhookRoutes } from "./routes/webhook.js";
import { startCronJobs } from "./jobs/cron.js";
import adminRoutes from "./routes/admin";
import path from "path";
import { runQuotaEnforcer } from "./jobs/quotaEnforcer.js";
import { telegramRoutes } from "./routes/telegram.js";

async function main() {
  // BigInt -> string global serialization
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  const app = Fastify({ logger: true });

  await app.register(cors,      { origin: process.env.FRONTEND_URL ?? "*" });
  await app.register(rateLimit, { global: false, max: 100, timeWindow: "1 minute", keyGenerator: (req) => req.headers["x-forwarded-for"]?.toString() ?? req.ip, });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  await app.register(websocket);

  app.register(walletRoutes,  { prefix: "/api/wallet"  });
  app.register(pixelRoutes,   { prefix: "/api/pixel"   });
  app.register(uploadRoutes,  { prefix: "/api/upload"  });
  app.register(canvasRoutes,  { prefix: "/api/canvas"  });
  app.register(webhookRoutes, { prefix: "/api/webhook" });
  app.register(wsRoutes);
  app.register(fastifyStatic, {root: path.join(process.cwd(), "uploads"),prefix: "/uploads/",});
  app.register(adminRoutes, { prefix: "/api/admin" });
  app.register(telegramRoutes, { prefix: "/api/telegram" });

  startCronJobs();

    app.listen({ port: 4000, host: "0.0.0.0" }, (err) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    console.log("🚀 API running on http://localhost:4000");
  });

  // Cron — app.log, nem fastify.log ✅
  const CRON_INTERVAL_MS = Number(process.env.QUOTA_CHECK_INTERVAL_MS ?? 60 * 60 * 1000);

  setInterval(() => {
    runQuotaEnforcer().catch(err =>
      app.log.error({ err }, "QuotaEnforcer failed")
    );
  }, CRON_INTERVAL_MS);

  setTimeout(() => {
    runQuotaEnforcer().catch(err =>
      app.log.error({ err }, "QuotaEnforcer initial run failed")
    );
  }, 30_000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// ✅ Ez marad (csak egyszer, a main() után)
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};