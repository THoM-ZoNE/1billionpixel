import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma }            from "@1bp/database";
import { syncWalletBalance } from "../services/solana.js";
import { verifySignature }   from "../lib/auth.js";

const walletRoutes: FastifyPluginAsync = async (app) => {

  // GET /api/wallet/:address  — load wallet state
  app.get<{ Params: { address: string } }>("/:address", async (req, reply) => {
    const { address } = req.params;
    const wallet = await syncWalletBalance(address);
    return reply.send(wallet);
  });

  // POST /api/wallet/connect  — wallet connect + sign verification
  app.post("/connect", async (req, reply) => {
    const { address, message, signature } = z.object({
      address:   z.string().length(44),
      message:   z.string(),
      signature: z.string(),
    }).parse(req.body);

    const valid = verifySignature(address, message, signature);
    if (!valid) return reply.status(401).send({ error: "Invalid signature" });

    const wallet = await syncWalletBalance(address);
    return reply.send({ ok: true, wallet });
  });

  // GET /api/wallet/:address/areas  — all pixel areas for wallet
  app.get<{ Params: { address: string } }>("/:address/areas", async (req, reply) => {
    const areas = await prisma.pixelArea.findMany({
      where:   { walletAddress: req.params.address, status: { not: "RELEASED" } },
      orderBy: { claimedAt: "asc" },
    });
    return reply.send(areas);
  });
};

export { walletRoutes };
