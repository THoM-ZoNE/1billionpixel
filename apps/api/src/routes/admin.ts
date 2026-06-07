// apps/api/src/routes/admin.ts
import { FastifyPluginAsync } from "fastify";
import { prisma } from "@1bp/database";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  sendAreaAvailableToGroup,    
  sendModerationNotification,  
} from "../services/telegram.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "jwt_titkos_kulcs";

const adminRoutes: FastifyPluginAsync = async (app) => {

  // ✅ Login — UNPROTECTED
  app.post<{ Body: { email: string; password: string } }>(
    "/login",
    async (req, reply) => {
      console.log("JWT_SECRET:", process.env.JWT_SECRET ? "OK ✓" : "MISSING ✗");
      const { email, password } = req.body;
      const admin = await prisma.adminUser.findUnique({ where: { email } });
      if (!admin) return reply.status(401).send({ error: "Invalid email or password" });
      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (!valid) return reply.status(401).send({ error: "Invalid email or password" });
      const token = jwt.sign(
        { adminId: admin.id, email: admin.email },
        JWT_SECRET,
        { expiresIn: "8h" }
      );
      return { token };
    }
  );

  // ✅ Protected sub-plugin
  await app.register(async (protectedApp) => {

    // JWT preHandler — minden route-ra ebben a pluginben
    protectedApp.addHook("preHandler", async (req, reply) => {
      const auth = req.headers["authorization"];
      if (!auth?.startsWith("Bearer ")) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
      try {
        jwt.verify(auth.slice(7), JWT_SECRET);
      } catch {
        return reply.status(401).send({ error: "Token expired or invalid" });
      }
    });

    // GET /admin/wallets — areas + skipSignature
    protectedApp.get("/wallets", async () => {
      const wallets = await prisma.wallet.findMany({
        include: {
          areas: {
            select: {
              id: true,
              x: true,
              y: true,
              width: true,
              height: true,
              imageUrl: true,
              status: true,
            },
          },
        },
        orderBy: { totalQuota: "desc" },
      });
      return wallets.map(w => ({
        ...w,
        totalQuota: Number(w.totalQuota),
        lockedPixels: Number(w.lockedPixels),
      }));
    });

    // PATCH /admin/wallets/:address/quota
    protectedApp.patch<{ Params: { address: string }; Body: { quota: number } }>(
      "/wallets/:address/quota",
      async (req) => {
        // First fetch current lockedPixels value,
        // so availableQuota = new quota - already reserved pixels
        const existing = await prisma.wallet.findUnique({
          where: { address: req.params.address },
          select: { lockedPixels: true },
        });
        const newTotal  = BigInt(req.body.quota);
        const locked    = existing?.lockedPixels ?? 0n;
        const available = newTotal >= locked ? newTotal - locked : 0n;

        const wallet = await prisma.wallet.update({
          where: { address: req.params.address },
          data: {
            totalQuota:     newTotal,
            availableQuota: available,
            manualOverride: true,
          },
        });
        return {
          ...wallet,
          totalQuota:     Number(wallet.totalQuota),
          lockedPixels:   Number(wallet.lockedPixels),
          availableQuota: Number(wallet.availableQuota),
        };
      }
    );

    // PATCH /admin/wallets/:address/skip-signature
    protectedApp.patch<{ Params: { address: string }; Body: { skipSignature: boolean } }>(
      "/wallets/:address/skipSignature",
      async (req) => {
        return prisma.wallet.update({
          where: { address: req.params.address },
          data: { skipSignature: req.body.skipSignature },
        });
      }
    );

    // POST /admin/test-wallet
    protectedApp.post<{ Body: { address: string; quota?: number; skipSignature?: boolean } }>(
  "/test-wallet",
  async (req) => {
    const { address, quota = 10_000_000, skipSignature = false } = req.body;
    // For existing wallet, take reserved pixels into account
    const existing = await prisma.wallet.findUnique({
      where: { address },
      select: { lockedPixels: true },
    });
    const newTotal  = BigInt(quota);
    const locked    = existing?.lockedPixels ?? 0n;
    const available = newTotal >= locked ? newTotal - locked : 0n;

    const wallet = await prisma.wallet.upsert({
      where: { address },
      update: { totalQuota: newTotal, availableQuota: available, manualOverride: true, skipSignature },
      create: { address, totalQuota: newTotal, availableQuota: newTotal, manualOverride: true, skipSignature },
    });
    return {
      ...wallet,
      totalQuota:     Number(wallet.totalQuota),
      lockedPixels:   Number(wallet.lockedPixels),
      availableQuota: Number(wallet.availableQuota),
    };
  }
);

    // DELETE /admin/areas/:id
protectedApp.delete<{ Params: { id: string } }>("/areas/:id", async (req, reply) => {
  const area = await prisma.pixelArea.findUnique({
    where: { id: req.params.id },
  });
  if (!area) return reply.status(404).send({ error: "Not found" });

  // Delete in transaction and restore quota
  await prisma.$transaction([
    // 1. Delete area
    prisma.pixelArea.delete({ where: { id: req.params.id } }),

    // 2. Decrement lockedPixels + restore availableQuota
    prisma.wallet.update({
      where: { address: area.walletAddress },
      data: {
        lockedPixels: { decrement: area.pixelCount },
        availableQuota: { increment: area.pixelCount },
      },
    }),
  ]);
  await sendAreaAvailableToGroup({
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
    });
  return { ok: true };
});

    // PATCH /admin/areas/:id/status
    protectedApp.patch<{ Params: { id: string }; Body: { status: string } }>(
      "/areas/:id/status",
      async (req) => {
        return prisma.pixelArea.update({
          where: { id: req.params.id },
          data: { status: req.body.status as any },
        });
      }
    );

    protectedApp.get("/forbidden", async () => {
  return prisma.pixelArea.findMany({
    where: { status: "FORBIDDEN" },
    select: { id: true, x: true, y: true, width: true, height: true },
  });
});

    // DELETE /admin/forbidden
protectedApp.delete("/forbidden", async () => {
  // Get all forbidden areas with wallet address and pixel count
  const forbiddenAreas = await prisma.pixelArea.findMany({
    where: { status: "FORBIDDEN" },
    select: { walletAddress: true, pixelCount: true },
  });

  // Aggregate per wallet
  const quotaMap = new Map<string, bigint>();
  for (const a of forbiddenAreas) {
    quotaMap.set(a.walletAddress, (quotaMap.get(a.walletAddress) ?? 0n) + a.pixelCount);
  }

  // Delete in transaction + restore quota for every affected wallet
  await prisma.$transaction([
    prisma.pixelArea.deleteMany({ where: { status: "FORBIDDEN" } }),
    ...Array.from(quotaMap.entries()).map(([address, pixels]) =>
      prisma.wallet.update({
        where: { address },
        data: {
          lockedPixels: { decrement: pixels },
          availableQuota: { increment: pixels },
        },
      })
    ),
  ]);

  return { deleted: forbiddenAreas.length };
});
protectedApp.post<{
  Body: { areaId: string; action: "warn" | "punish" | "ban" }
}>(
  "/moderate",
  async (req, reply) => {
    const { areaId, action } = req.body;

    const area = await prisma.pixelArea.findUnique({
      where: { id: areaId },
      include: { wallet: true },
    });
    if (!area) return reply.status(404).send({ error: "Area not found" });

    const pixelCount = area.pixelCount;

    if (action === "warn") {
      // 1. alkalom: kép törölve, quota visszakapja
      await prisma.$transaction([
        prisma.pixelArea.delete({ where: { id: areaId } }),
        prisma.wallet.update({
          where: { address: area.walletAddress },
          data: {
            lockedPixels:   { decrement: pixelCount },
            availableQuota: { increment: pixelCount },
            violationCount: { increment: 1 },
          },
        }),
      ]);
      if (area.wallet.telegramHandle) {
      await sendModerationNotification(area.wallet.telegramHandle, area.walletAddress, "warn");
    }
    await sendAreaAvailableToGroup({ x: area.x, y: area.y, width: area.width, height: area.height });
      return { ok: true, action: "warn", message: "Image removed, quota restored, violation +1" };
    }

    if (action === "punish") {
      // 2. alkalom: kép törölve, quota elvész
      await prisma.$transaction([
        prisma.pixelArea.delete({ where: { id: areaId } }),
        prisma.wallet.update({
          where: { address: area.walletAddress },
          data: {
            lockedPixels:   { decrement: pixelCount },
            // availableQuota NEM nő vissza → quota elveszik
            violationCount: { increment: 1 },
          },
        }),
      ]);
      if (area.wallet.telegramHandle) {
      await sendModerationNotification(area.wallet.telegramHandle, area.walletAddress, "punish");
    }
    await sendAreaAvailableToGroup({ x: area.x, y: area.y, width: area.width, height: area.height });
      return { ok: true, action: "punish", message: "Image removed, quota lost, violation +1" };
    }

    if (action === "ban") {
      // 3. alkalom: kép törölve, quota elvész, wallet bannolva
      await prisma.$transaction([
        prisma.pixelArea.delete({ where: { id: areaId } }),
        prisma.wallet.update({
          where: { address: area.walletAddress },
          data: {
            lockedPixels:   { decrement: pixelCount },
            violationCount: { increment: 1 },
            bannedAt:       new Date(),
          },
        }),
      ]);
      if (area.wallet.telegramHandle) {
      await sendModerationNotification(area.wallet.telegramHandle, area.walletAddress, "ban");
    }
    await sendAreaAvailableToGroup({ x: area.x, y: area.y, width: area.width, height: area.height });
      return { ok: true, action: "ban", message: "Image removed, quota lost, wallet banned" };
    }

    return reply.status(400).send({ error: "Invalid action. Use: warn | punish | ban" });
  }
);

// POST /admin/wallets/:address/unban
protectedApp.post<{ Params: { address: string } }>(
  "/wallets/:address/unban",
  async (req) => {
    return prisma.wallet.update({
      where: { address: req.params.address },
      data: { bannedAt: null, violationCount: 0 },
    });
  }
);
  });
};

export default adminRoutes;