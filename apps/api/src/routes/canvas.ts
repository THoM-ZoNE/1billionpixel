import { FastifyPluginAsync } from "fastify";
import { getCanvasAreas, getCanvasStats, claimArea } from "../services/canvas";
import { verifyWalletSignature } from "../middleware/walletAuth";
import { saveImageLocally } from "../services/storage";

const canvasRoutes: FastifyPluginAsync = async (app) => {
  
  // GET /api/canvas/areas
  app.get("/areas", async (req, reply) => {
    const {
      x = 0,
      y = 0,
      w = 50000,
      h = 50000,
    } = req.query as { x?: number; y?: number; w?: number; h?: number };

    const areas = await getCanvasAreas({
      x: Number(x),
      y: Number(y),
      w: Number(w),
      h: Number(h),
    });

    return reply.send({ areas });
  });

  // GET /api/canvas/stats
  app.get("/stats", async (_req, reply) => {
    const stats = await getCanvasStats();
    return reply.send(stats);
  });

  // GET /api/canvas/live
  app.get("/live", async (_req, reply) => {
    const stats = await getCanvasStats();
    return reply.send(stats);
  });

  // POST /api/canvas/claim
  app.post(
    "/claim",
    { preHandler: verifyWalletSignature },
    async (req, reply) => {
      const walletAddress = (req as any).walletAddress as string;

      let imageUrl: string | undefined;
      let imageKey: string | undefined;
      let imageType: string | undefined;

      // Multipart: image + JSON fields
      const parts = req.parts();
      const fields: Record<string, string> = {};

      for await (const part of parts) {
        if (part.type === "file" && part.fieldname === "image") {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);
          const mime = part.mimetype;

          if (!["image/jpeg", "image/png", "image/gif"].includes(mime)) {
            return reply.status(400).send({ error: "Invalid image type" });
          }

          const saved = await saveImageLocally(buffer, mime);
          imageUrl = saved.url;
          imageKey = saved.key;
          imageType = saved.type;
        } else if (part.type === "field") {
          fields[part.fieldname] = part.value as string;
        }
      }

      // Validation
      const x = parseInt(fields.x);
      const y = parseInt(fields.y);
      const width = parseInt(fields.width);
      const height = parseInt(fields.height);

      if (
        isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height) ||
        width <= 0 || height <= 0 ||
        x < 0 || y < 0 ||
        x + width > 100000 || y + height > 100000 // canvas size limit
      ) {
        return reply.status(400).send({ error: "Invalid coordinates or dimensions" });
      }

      try {
        const area = await claimArea({
          walletAddress,
          x,
          y,
          width,
          height,
          imageUrl,
          imageKey,
          imageType,
          link: fields.link ?? undefined,
        });

        return reply.status(201).send({
          success: true,
          area: {
            id: area.id,
            x: area.x,
            y: area.y,
            width: area.width,
            height: area.height,
            pixelCount: area.pixelCount.toString(),
            imageUrl: area.imageUrl,
            status: area.status,
            claimedAt: area.claimedAt,
          },
        });
      } catch (err: any) {
        const msg = err.message ?? "Unknown error";

        if (msg.startsWith("OVERLAP")) {
          return reply.status(409).send({ error: "Area overlaps with existing claim" });
        }
        if (msg.startsWith("WALLET_NOT_FOUND")) {
          return reply.status(404).send({ error: "Wallet not found" });
        }
        if (msg.startsWith("INSUFFICIENT_QUOTA")) {
          return reply.status(402).send({ error: "Insufficient pixel quota", detail: msg });
        }

        console.error("[claim]", err);
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );
};

export default canvasRoutes;
