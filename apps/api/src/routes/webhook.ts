import { FastifyPluginAsync } from "fastify";
import crypto                   from "crypto";
import { syncWalletBalance }    from "../services/solana.js";
import { checkGracePeriods }    from "../jobs/gracePeriod.js";

const webhookRoutes: FastifyPluginAsync = async (app) => {

  // POST /api/webhook/helius  — Helius token transfer webhook
  app.post("/helius", async (req, reply) => {
    const sig    = req.headers["helius-webhook-secret"] as string;
    const secret = process.env.HELIUS_WEBHOOK_SECRET!;
    if (sig !== secret) return reply.status(401).send({ error: "Unauthorized" });

    const events = req.body as any[];
    const TOKEN_MINT = process.env.NEXT_PUBLIC_TOKEN_MINT!;

    for (const event of events) {
      const changes = event.accountData?.flatMap((a: any) => a.tokenBalanceChanges ?? []);
      for (const change of changes ?? []) {
        if (change.mint === TOKEN_MINT) {
          // Re-sync balance + trigger grace period check
          await syncWalletBalance(change.userAccount);
          await checkGracePeriods(change.userAccount);
        }
      }
    }

    return reply.send({ ok: true });
  });
};

export { webhookRoutes };
