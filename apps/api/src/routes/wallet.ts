import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma }            from "@1bp/database";
import { syncWalletBalance } from "../services/solana.js";
import { verifySignature }   from "../lib/auth.js";

const walletRoutes: FastifyPluginAsync = async (app) => {

  // GET /api/wallet/:address  — load wallet state
  // Csak akkor szinkronizál on-chain, ha a wallet még nem létezik, vagy az adat
  // régebbi 5 percnél. Ez megakadályozza, hogy oldalfrissítésre felulírja a
  // manuális kvótát (a manualOverride check a syncWalletBalance-ban is benn van).
  app.get<{ Params: { address: string } }>("/:address", async (req, reply) => {
    const { address } = req.params;
    const existing = await prisma.wallet.findUnique({ where: { address } });
    if (!existing) {
      // Új wallet — létrehozzuk on-chain adatokkal
      const wallet = await syncWalletBalance(address);
      return reply.send(wallet);
    }
    const STALE_MS = 5 * 60 * 1000; // 5 perc
    const isStale = Date.now() - existing.lastSynced.getTime() > STALE_MS;
    if (isStale) {
      const wallet = await syncWalletBalance(address);
      return reply.send(wallet);
    }
    // Friss adat — közvetlen DB válasz, nincs on-chain hívás
    // Fontos: BigInt mezőket kötelező string-re konvertálni (JSON.stringify nem kezeli a BigInt-et)
    return reply.send({
      address:         existing.address,
      totalQuota:      existing.totalQuota.toString(),
      lockedPixels:    existing.lockedPixels.toString(),
      availableQuota:  existing.availableQuota.toString(),
      gracePeriodEnd:  existing.gracePeriodEnd,
      lastSynced:      existing.lastSynced,
      createdAt:       existing.createdAt,
      manualOverride:  existing.manualOverride,
      skipSignature:   existing.skipSignature,
    });
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
