import { FastifyPluginAsync } from "fastify";
import { prisma } from "@1bp/database";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const telegramRoutes: FastifyPluginAsync = async (app) => {

  // POST /api/telegram/verify-handle
  app.post<{ Body: { handle: string } }>(
    "/verify-handle",
    {
      schema: {
        body: {
          type: "object",
          required: ["handle"],
          properties: {
            handle: { type: "string", minLength: 3, maxLength: 64 }
          }
        }
      }
    },
    async (req, reply) => {
      const handle = req.body.handle.replace(/^@/, "").toLowerCase().trim();

      const record = await prisma.telegramVerification.findUnique({
        where: { handle },
      });

      return reply.send({
        handle: `@${handle}`,
        verified: !!record,
      });
    }
  );

  // POST /api/telegram/webhook
  app.post<{ Body: any }>("/webhook", async (req, reply) => {
    const update = req.body as { message?: any; callback_query?: any };
    const message = update?.message;

    if (message?.text?.startsWith("/start") && message?.chat?.type === "private") {
      const chatId = String(message.chat.id);
      const username = message.from?.username?.toLowerCase();

      if (username) {
        await prisma.telegramVerification.upsert({
          where: { handle: username },
          update: { chatId },
          create: { handle: username, chatId, verifiedAt: new Date() },
        });
        console.log(`[Telegram] Saved chatId ${chatId} for @${username}`);

        // Welcome message
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text:
              `✅ <b>Your Telegram account has been successfully linked!</b>\n\n` +
              `You will now receive notifications about your 1BillionPixel areas if your quota is at risk.\n\n` +
              `👉 <a href="https://1bpx.fun">Back to the site</a>`,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        });
      }
    }

    return reply.send({ ok: true });
  });

};

export { telegramRoutes };