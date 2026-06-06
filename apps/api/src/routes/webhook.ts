import { FastifyPluginAsync } from "fastify";
import { syncWalletBalance }  from "../services/solana.js";
import { checkGracePeriods }  from "../jobs/gracePeriod.js";

const webhookRoutes: FastifyPluginAsync = async (app) => {

  // POST /api/webhook/helius
  app.post("/helius", async (req, reply) => {
    const sig    = req.headers["helius-webhook-secret"] as string;
    const secret = process.env.HELIUS_WEBHOOK_SECRET!;
    if (sig !== secret) return reply.status(401).send({ error: "Unauthorized" });

    const events   = req.body as any[];
    const TOKEN_MINT = process.env.TOKEN_MINT ?? process.env.NEXT_PUBLIC_TOKEN_MINT!;

    for (const event of events) {
      const changes = event.accountData?.flatMap((a: any) => a.tokenBalanceChanges ?? []);
      for (const change of changes ?? []) {
        if (change.mint === TOKEN_MINT) {
          await syncWalletBalance(change.userAccount);
          await checkGracePeriods(change.userAccount);
        }
      }
    }

    return reply.send({ ok: true });
  });

  app.post("/telegram", async (req, reply) => {
  const update = req.body as any;
  const msg    = update?.message;

  if (msg?.text === "/start" && msg.from?.username) {
    const handle = msg.from.username.toLowerCase();
    const chatId = String(msg.chat.id);

    // Mentés DB-be
    await prisma.telegramVerification.upsert({
      where:  { handle },
      update: { chatId, verifiedAt: new Date() },
      create: { handle, chatId, verifiedAt: new Date() },
    });

    // Welcome üzenet
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text:
          `👋 <b>Welcome to 1BillionPixel Bot!</b>\n\n` +
          `✅ Your handle <b>@${handle}</b> is now verified!\n\n` +
          `I'll notify you if your pixel quota drops below your claimed areas.\n\n` +
          `Add <b>@${handle}</b> in the claim form on ` +
          `<a href="https://1billionpixel.fun">1billionpixel.fun</a> to activate alerts.`,
        parse_mode: "HTML",
      }),
    });
  }

  return reply.send({ ok: true });
});


  
};

export { webhookRoutes };