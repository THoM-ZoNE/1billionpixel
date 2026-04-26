import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "@1bp/database";
import { syncWalletBalance } from "../services/solana.js";
import { checkAreaAvailable } from "../services/canvas.js";
import { getAdjacentFreeSpaces } from "../services/adjacency.js";
import { verifySignature } from "../lib/auth.js";
import { broadcastCanvasUpdate } from "../lib/websocket.js";
import { CANVAS_W, CANVAS_H, MIN_AREA_SIZE } from "@1bp/shared";

// ───────────────────────────────────────────────────────────────────────────────
// Capsule geometry — backend single source of truth for claim validation
// Ha később lehet, ezt érdemes @1bp/shared-be áttenni, hogy frontend/backend ugyanazt használja
// ───────────────────────────────────────────────────────────────────────────────
const CAPSULE_W = 51136;
const CAPSULE_H = 21494;
const CAPSULE_R = 10747;

const WORLD_W = 61363;
const WORLD_H = 25793;

const CAPSULE_OFFSET_X = 5114;
const CAPSULE_OFFSET_Y = 2150;

function isInsideCapsule(wx: number, wy: number): boolean {
  const lx = wx - CAPSULE_OFFSET_X;
  const ly = wy - CAPSULE_OFFSET_Y;

  if (lx < 0 || ly < 0 || lx > CAPSULE_W || ly > CAPSULE_H) return false;

  const midY = CAPSULE_H / 2;

  if (lx < CAPSULE_R) {
    const dx = lx - CAPSULE_R;
    const dy = ly - midY;
    return dx * dx + dy * dy <= CAPSULE_R * CAPSULE_R;
  }

  if (lx > CAPSULE_W - CAPSULE_R) {
    const dx = lx - (CAPSULE_W - CAPSULE_R);
    const dy = ly - midY;
    return dx * dx + dy * dy <= CAPSULE_R * CAPSULE_R;
  }

  return true;
}

function isRectInsideCapsule(
  wx: number,
  wy: number,
  ww: number,
  wh: number
): boolean {
  if (ww <= 0 || wh <= 0) return false;

  return (
    isInsideCapsule(wx, wy) &&
    isInsideCapsule(wx + ww, wy) &&
    isInsideCapsule(wx, wy + wh) &&
    isInsideCapsule(wx + ww, wy + wh)
  );
}

async function overlapsForbiddenZone(
  x: number,
  y: number,
  width: number,
  height: number
) {
  return prisma.pixelArea.findFirst({
    where: {
      status: "FORBIDDEN",
      x: { lt: x + width },
      y: { lt: y + height },
      AND: [
        { x: { gte: x - width + 1 } },
        { y: { gte: y - height + 1 } },
      ],
    },
    select: { id: true },
  });
}

const ClaimSchema = z.object({
  walletAddress: z.string().length(44),
  x: z.number().int().min(0).max(WORLD_W),
  y: z.number().int().min(0).max(WORLD_H),
  width: z.number().int().min(10).max(WORLD_W),
  height: z.number().int().min(10).max(WORLD_H),
  signature: z.string().optional(),
  message: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.width * data.height < MIN_AREA_SIZE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Minimum area is ${MIN_AREA_SIZE} pixels`,
      path: ["width"],
    });
  }

  if (data.x + data.width > WORLD_W) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Selection exceeds world width",
      path: ["width"],
    });
  }

  if (data.y + data.height > WORLD_H) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Selection exceeds world height",
      path: ["height"],
    });
  }
});

const pixelRoutes: FastifyPluginAsync = async (app) => {
  app.post("/claim", async (req, reply) => {
    const body = ClaimSchema.parse(req.body);

    // 0. Hard backend geometry validation
    if (!isRectInsideCapsule(body.x, body.y, body.width, body.height)) {
      return reply.status(400).send({ error: "Outside capsule bounds" });
    }

    // 1. Verify wallet ownership — skipSignature esetén átugorjuk
    const walletForSigCheck = await prisma.wallet.findUnique({
      where: { address: body.walletAddress },
      select: { skipSignature: true },
    });

    const shouldSkipSignature = walletForSigCheck?.skipSignature === true;

    if (!shouldSkipSignature) {
      if (!body.message || !body.signature) {
        return reply.status(400).send({ error: "message and signature required" });
      }

      const valid = verifySignature(body.walletAddress, body.message, body.signature);
      if (!valid) return reply.status(401).send({ error: "Invalid signature" });
    }

    // 2. Wallet lekérése DB-ből
    const dbWallet = await prisma.wallet.findUnique({
      where: { address: body.walletAddress },
    });

    if (!dbWallet) {
      return reply.status(404).send({ error: "Wallet not found" });
    }

    // 3. Check quota
    const requestedPixels = BigInt(body.width) * BigInt(body.height);
    const effectiveAvailable = dbWallet.totalQuota - dbWallet.lockedPixels;

    if (effectiveAvailable < requestedPixels) {
      return reply.status(400).send({
        error: "Insufficient pixel quota",
        available: effectiveAvailable.toString(),
        requested: requestedPixels.toString(),
      });
    }

    // 4. Explicit FORBIDDEN overlap guard
    const forbiddenHit = await overlapsForbiddenZone(
      body.x,
      body.y,
      body.width,
      body.height
    );

    if (forbiddenHit) {
      return reply.status(409).send({ error: "Forbidden zone" });
    }

    // 5. Check area availability
    const isAvailable = await checkAreaAvailable(
      body.x,
      body.y,
      body.width,
      body.height
    );

    if (!isAvailable) {
      return reply.status(409).send({ error: "Area already occupied" });
    }

    // 6. Create area in DB
    const area = await prisma.$transaction(async (tx) => {
      const newArea = await tx.pixelArea.create({
        data: {
          walletAddress: body.walletAddress,
          x: body.x,
          y: body.y,
          width: body.width,
          height: body.height,
          pixelCount: requestedPixels,
          status: "ACTIVE",
        },
      });

      await tx.wallet.update({
        where: { address: body.walletAddress },
        data: {
          lockedPixels: { increment: requestedPixels },
          availableQuota: { decrement: requestedPixels },
        },
      });

      return newArea;
    });

    // 7. Broadcast WebSocket update
    broadcastCanvasUpdate({ type: "AREA_CLAIMED", area });

    return reply.status(201).send(area);
  });

  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const { walletAddress, signature, message } = z.object({
      walletAddress: z.string(),
      signature: z.string(),
      message: z.string(),
    }).parse(req.body);

    const valid = verifySignature(walletAddress, message, signature);
    if (!valid) return reply.status(401).send({ error: "Invalid signature" });

    const area = await prisma.pixelArea.findUnique({ where: { id: req.params.id } });
    if (!area || area.walletAddress !== walletAddress) {
      return reply.status(404).send({ error: "Area not found" });
    }

    await prisma.$transaction([
      prisma.pixelArea.update({
        where: { id: area.id },
        data: { status: "RELEASED" },
      }),
      prisma.wallet.update({
        where: { address: walletAddress },
        data: {
          lockedPixels: { decrement: area.pixelCount },
          availableQuota: { increment: area.pixelCount },
        },
      }),
    ]);

    broadcastCanvasUpdate({
      type: "AREA_RELEASED",
      areaId: area.id,
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
    });

    return reply.send({ ok: true });
  });
};

export { pixelRoutes };