import { FastifyPluginAsync } from "fastify";
import { prisma } from "@1bp/database";

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

};

export { telegramRoutes };