import { FastifyPluginAsync } from "fastify";
import { prisma }             from "@1bp/database";
import { saveImageLocally } from "../services/storage.js";
import { resizeForArea }      from "../services/imageProcessor.js";
import { verifySignature }    from "../lib/auth.js";
import { broadcastCanvasUpdate } from "../lib/websocket.js";
import { ALLOWED_MIME_TYPES } from "@1bp/shared";

const uploadRoutes: FastifyPluginAsync = async (app) => {

  // POST /api/upload/:areaId  — upload image to a claimed area
  app.post<{ Params: { areaId: string } }>("/:areaId", async (req, reply) => {
    const parts = req.parts();
    let file: any = null;
    let walletAddress = "";
    let signature = "";
    let message = "";

    // skipSignature check
  const wallet = await prisma.wallet.findUnique({ where: { address: walletAddress } });
  if (!wallet?.skipSignature) {
    if (!signature || !message) {
      return reply.status(401).send({ error: "Signature required" });
    }
    const valid = verifySignature(walletAddress, message, signature);
    if (!valid) return reply.status(401).send({ error: "Invalid signature" });
  }

    for await (const part of parts) {
      if (part.type === "file") {
        file = part;
      } else {
        if (part.fieldname === "walletAddress") walletAddress = part.value as string;
        if (part.fieldname === "signature")     signature     = part.value as string;
        if (part.fieldname === "message")       message       = part.value as string;
      }
    }

    if (!file) return reply.status(400).send({ error: "No file provided" });

    // 1. Auth
    const valid = verifySignature(walletAddress, message, signature);
    if (!valid) return reply.status(401).send({ error: "Invalid signature" });

    // 2. MIME check
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype))
      return reply.status(400).send({ error: "File type not allowed. Use JPG, PNG or GIF." });

    // 3. Load area
    const area = await prisma.pixelArea.findUnique({ where: { id: req.params.areaId } });
    if (!area || area.walletAddress !== walletAddress)
      return reply.status(404).send({ error: "Area not found" });

    // 4. Read & resize image
    const buffer    = await file.toBuffer();
    const processed = await resizeForArea(buffer, file.mimetype, area.width, area.height);

    // 5. Upload to R2
    const { url: imageUrl, key, type } = await saveImageLocally(processed, file.mimetype);

    // 6. Update DB
    await prisma.pixelArea.update({
      where: { id: area.id },
      data:  { imageUrl, imageKey: key, imageType: file.mimetype.split("/")[1] },
    });

    // 7. WebSocket broadcast
    broadcastCanvasUpdate({ type: "IMAGE_UPLOADED", areaId: area.id, imageUrl,
      x: area.x, y: area.y, width: area.width, height: area.height });

    return reply.send({ ok: true, imageUrl });
  });
};

export { uploadRoutes };
