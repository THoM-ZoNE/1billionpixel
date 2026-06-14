import { FastifyPluginAsync } from "fastify";
import { prisma }             from "@1bp/database";
import { saveImageLocally }   from "../services/storage.js";
import { resizeForArea }      from "../services/imageProcessor.js";
import { verifySignature }    from "../lib/auth.js";
import { broadcastCanvasUpdate } from "../lib/websocket.js";
import { ALLOWED_MIME_TYPES } from "@1bp/shared";

const uploadRoutes: FastifyPluginAsync = async (app) => {

  app.post<{ Params: { areaId: string } }>("/:areaId", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute",
        errorResponseBuilder: () => ({
          statusCode: 429,
          error: "Too Many Requests",
          message: "Max 10 uploads per minute.",
        }),
      },
    },
  }, async (req, reply) => {

    // ── 1. Multipart mezők kiolvasása ────────────────────────────────────────
    const parts = req.parts();
    let file: any = null;
    let walletAddress = "";
    let signature = "";
    let message = "";

    for await (const part of parts) {
      if (part.type === "file") {
        file = part;
      } else {
        if (part.fieldname === "walletAddress") walletAddress = part.value as string;
        if (part.fieldname === "signature")     signature     = part.value as string;
        if (part.fieldname === "message")       message       = part.value as string;
      }
    }

    // ── 2. Alapellenőrzések ──────────────────────────────────────────────────
    if (!file)          return reply.status(400).send({ error: "No file provided" });
    if (!walletAddress) return reply.status(400).send({ error: "walletAddress required" });

    // ── 3. Wallet lekérés ────────────────────────────────────────────────────
    const wallet = await prisma.wallet.findUnique({ where: { address: walletAddress } });
    if (!wallet) return reply.status(403).send({ error: "Wallet not found" });

    // ── 4. Ban check ─────────────────────────────────────────────────────────
    if (wallet.bannedAt) {
      return reply.status(403).send({ error: "Wallet is banned from uploading." });
    }

    // ── 5. Signature check (csak ha nincs skipSignature) ─────────────────────
    if (!wallet.skipSignature) {
      if (!signature || !message) {
        return reply.status(401).send({ error: "Signature required" });
      }
      const valid = verifySignature(walletAddress, message, signature);
      if (!valid) return reply.status(401).send({ error: "Invalid signature" });
    }

    // ── 6. MIME check ────────────────────────────────────────────────────────
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype))
      return reply.status(400).send({ error: "File type not allowed. Use JPG, PNG or GIF." });

    // ── 7. Area ellenőrzés ───────────────────────────────────────────────────
    const area = await prisma.pixelArea.findUnique({ where: { id: req.params.areaId } });
    if (!area || area.walletAddress !== walletAddress)
      return reply.status(404).send({ error: "Area not found" });

    // ── 8. Resize + WebP optimalizáció ───────────────────────────────────────
    const buffer    = await file.toBuffer();
    const processed = await resizeForArea(buffer, file.mimetype, area.width, area.height);

    // ── 9. Mentés ────────────────────────────────────────────────────────────
    const { url: imageUrl, key } = await saveImageLocally(processed.buffer, processed.ext);

    // ── 10. DB frissítés ─────────────────────────────────────────────────────
    await prisma.pixelArea.update({
      where: { id: area.id },
      data:  { imageUrl, imageKey: key, imageType: processed.ext },
    });

    // ── 11. WebSocket broadcast ──────────────────────────────────────────────
    broadcastCanvasUpdate({
      type: "IMAGE_UPLOADED", areaId: area.id, imageUrl,
      x: area.x, y: area.y, width: area.width, height: area.height,
    });

    return reply.send({ ok: true, imageUrl });
  });  // ← csak egyszer zárul

};

export { uploadRoutes };