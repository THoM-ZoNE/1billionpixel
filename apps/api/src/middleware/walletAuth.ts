import { FastifyRequest, FastifyReply } from "fastify";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { prisma } from "src/db";

export async function verifyWalletSignature(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const walletAddress = req.headers["walletaddress"] as string | undefined;
  const signature    = req.headers["signature"]      as string | undefined;
  const claimMessage = req.headers["x-claim-message"] as string | undefined;

  if (!walletAddress) {
    return reply.status(401).send({ error: "Missing wallet address" });
  }
  // ── skipSignature ellenőrzés ──
  const wallet = await prisma.wallet.findUnique({ where: { address: walletAddress } });
  if (wallet?.skipSignature) {
    // Sign ellenőrzés ki van kapcsolva ennél a walletnél — átmegyünk
    // FONTOS: walletAddress-t be kell írni a req-be, különben a canvas route-ban undefined lesz
    (req as any).walletAddress = walletAddress;
    return;
  }
  // Normál sign ellenőrzés
  if (!signature || !claimMessage) {
    return reply.status(401).send({ error: "Missing signature or message" });
  }
  try {
    const messageBytes    = new TextEncoder().encode(claimMessage);
    const signatureBytes  = bs58.decode(signature);
    const publicKeyBytes  = bs58.decode(walletAddress);

    const valid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

    if (!valid) {
      return reply.status(401).send({ error: "Invalid signature" });
    }

    (req as any).walletAddress = walletAddress;
  } catch (e) {
    return reply.status(401).send({ error: "Signature verification failed" });
  }
}
