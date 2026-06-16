import { prisma } from "@1bp/database";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_ID  = process.env.TELEGRAM_GROUP_ID;  

// ── Helper: handle → numeric chatId lookup ─────────────────────────────────
async function getChatIdByHandle(handle: string): Promise<string | null> {
  const clean = handle.replace(/^@/, "").toLowerCase();
  const record = await prisma.telegramVerification.findUnique({
    where: { handle: clean },
  });
  return record?.chatId ?? null;
}

async function sendMessage(chatId: string | number, text: string): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN not set");
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });
    const data = await res.json();
    if (!data.ok) console.warn("[Telegram] Send failed:", data.description);
    return data.ok;
  } catch (err) {
    console.error("[Telegram] Error:", err);
    return false;
  }
}

// ── DM: Quota warning (AT_RISK) ──────────────────────────────────────────────
export async function sendQuotaWarning(
  handle: string,
  walletAddress: string,
  onChain: bigint,
  locked: bigint,
  deficit: bigint,
  graceHours: number
): Promise<boolean> {
  const chatId = await getChatIdByHandle(handle);
  if (!chatId) {
    console.log(`[Telegram] No chatId for ${handle}, skipping DM`);
    return false;
  }
  const msg =
    `⚠️ <b>1BillionPixel — Quota Warning</b>\n\n` +
    `Wallet: <code>${walletAddress.slice(0,8)}...${walletAddress.slice(-4)}</code>\n\n` +
    `🔴 Token balance: <b>${Number(onChain).toLocaleString()} $1BPX</b>\n` +
    `📐 Claimed pixels: <b>${Number(locked).toLocaleString()} px</b>\n` +
    `❗ Deficit: <b>${Number(deficit).toLocaleString()} $1BPX</b>\n\n` +
    `You have <b>${graceHours} hour${graceHours !== 1 ? "s" : ""}</b> to buy back tokens.\n` +
    `If you don't, your areas will be proportionally resized.\n\n` +
    `👉 <a href="https://pump.fun/coin/">Buy $1BPX on PumpFun</a>`;
  return sendMessage(chatId, msg);
}

// ── DM: Areas resized ────────────────────────────────────────────────────────
export async function sendResizeNotification(
  handle: string,
  walletAddress: string,
  onChain: bigint
): Promise<boolean> {
  const chatId = await getChatIdByHandle(handle);
  if (!chatId) {
    console.log(`[Telegram] No chatId for ${handle}, skipping DM`);
    return false;
  }
  const msg =
    `📉 <b>1BillionPixel — Areas Resized</b>\n\n` +
    `Wallet: <code>${walletAddress.slice(0,8)}...${walletAddress.slice(-4)}</code>\n\n` +
    `Your claimed areas have been proportionally reduced to match your ` +
    `current balance of <b>${Number(onChain).toLocaleString()} $1BPX</b>.\n\n` +
    `To restore your areas, send a message to support@1bpx.fun.\n\n` +
    `👉 <a href="https://pump.fun/coin/">Buy $1BPX on PumpFun</a>`;
  return sendMessage(chatId, msg);
}
// ── DM: Area released (too low balance for minimum size) ────────────────────────────────
export async function sendAreaReleasedNotification(
  handle: string,
  walletAddress: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<boolean> {
  const chatId = await getChatIdByHandle(handle);
  if (!chatId) return false;

  const msg =
    `🗑 <b>1BillionPixel — Area Released</b>\n\n` +
    `Wallet: <code>${walletAddress.slice(0,8)}...${walletAddress.slice(-4)}</code>\n\n` +
    `Your area at (${x}, ${y}) — <b>${width}×${height} px</b> — ` +
    `has been <b>released</b> because your token balance dropped below the ` +
    `minimum area size (100×100 px).\n\n` +
    `👉 <a href="https://pump.fun/coin/">Buy $1BPX on PumpFun</a> to reclaim your spot.`;

  return sendMessage(chatId, msg);
}

// ── DM: Quota restored ────────────────────────────
export async function sendQuotaRestoredNotification(
  handle: string,
  walletAddress: string,
  onChain: bigint
): Promise<boolean> {
  const chatId = await getChatIdByHandle(handle);
  if (!chatId) {
    console.log(`[Telegram] No chatId for ${handle}, skipping DM`);
    return false;
  }
  const msg =
    `✅ <b>1BillionPixel — Quota Restored</b>\n\n` +
    `Wallet: <code>${walletAddress.slice(0,8)}...${walletAddress.slice(-4)}</code>\n\n` +
    `Your token balance is back to <b>${Number(onChain).toLocaleString()} $1BPX</b>.\n` +
    `All your areas are now <b>ACTIVE</b> again. 🎉`;
  return sendMessage(chatId, msg);
}
// ── Group: Area released, claimable ──────────────────────────────────
export async function sendAreaAvailableToGroup(params: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Promise<boolean> {
  if (!GROUP_ID || !BOT_TOKEN) return false;

  const { x, y, width, height } = params;
  const pixels = (width * height).toLocaleString();
  const canvasUrl = `https://1billionpixel.fun/`;

  const msg =
    `🟢 <b>New Area Available!</b>\n\n` +
    `📐 Size: <b>${width}×${height}</b> = <b>${pixels} px</b>\n` +
    `📍 Position: (${x}, ${y})\n\n` +
    `A pixel area has just been released — grab it before someone else does!\n\n` +
    `👉 <a href="${canvasUrl}">Claim now on 1BillionPixel.fun →</a>`;

  return sendMessage(GROUP_ID!, msg);
}
// ── DM: Moderation Notification ──────────────────────────────────────────
export async function sendModerationNotification(
  handle: string,
  walletAddress: string,
  action: "warn" | "punish" | "ban"| "unban" | "bonus",
  meta?:{ pixels?: number; reason?: string }
): Promise<boolean> {
  const chatId = await getChatIdByHandle(handle);
  if (!chatId) return false;

  const short = `${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}`;
const wallet = `Wallet: <code>${short}</code>\n\n`;

const messages: Record<string, string> = {
  warn:
    `⚠️ <b>1BillionPixel — Content Warning</b>\n\n` + wallet +
    `Your pixel area has been removed due to a content violation.\n` +
    `Your quota has been restored. This is your first warning.\n\n` +
    `Please review our <a href="https://1billionpixel.fun/faq">community guidelines</a>.`,

  punish:
    `🚫 <b>1BillionPixel — Content Violation</b>\n\n` + wallet +
    `Your pixel area has been removed and your quota has been permanently reduced due to a repeated violation.`,

  ban:
    `🔴 <b>1BillionPixel — Wallet Banned</b>\n\n` + wallet +
    `Your wallet has been banned due to repeated content violations. You can no longer claim pixel areas.`,

  unban:
    `✅ <b>1BillionPixel — Wallet Unbanned</b>\n\n` + wallet +
    `Your wallet ban has been lifted and your violation count has been reset.\n\n` +
    `👉 <a href="https://1billionpixel.fun">Claim your pixels →</a>`,
};

if (action === "bonus") {
  const bonusMsg =
    `🎁 <b>1BillionPixel — Bonus Pixels!</b>\n\n` + wallet +
    `You've received <b>${meta?.pixels?.toLocaleString() ?? "?"} bonus pixels</b>! 🎉\n` +
    (meta?.reason ? `Reason: ${meta.reason}\n\n` : `\n`) +
    `👉 <a href="https://1billionpixel.fun">Claim your area →</a>`;
  return sendMessage(chatId, bonusMsg);
}

return sendMessage(chatId, messages[action]);
}
// ── Group: New claim notify ────────────────────────────────────────────────
export async function sendNewClaimToGroup(params: {
  walletAddress: string;
  x: number;
  y: number;
  width: number;
  height: number;
  areaId: string;
  imageUrl?: string;
  link?: string;
}): Promise<boolean> {
  if (!GROUP_ID || !BOT_TOKEN) return false;

  const { walletAddress, x, y, width, height, imageUrl, link, areaId } = params;
  const pixels = (width * height).toLocaleString();
  const shortWallet = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  const focusUrl = `https://1bpx.fun/canvas/live?area=${areaId}`;

  const caption =
    `🖼 <b>New Pixel Claim!</b>\n\n` +
    `👛 Wallet: <code>${shortWallet}</code>\n` +
    `📐 Size: <b>${width}×${height}</b> = <b>${pixels} px</b>\n` +
    `📍 Position: (${x}, ${y})\n` +
    (link ? `🔗 <a href="${link}">${link}</a>\n` : "") +
    `\n👉 <a href="${focusUrl}">View on 1BillionPixel.fun →</a>`;

  if (imageUrl) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: GROUP_ID,
          photo: imageUrl,
          caption,
          parse_mode: "HTML",
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        console.warn("[Telegram] sendPhoto failed:", data.description, "→ falling back to text");
        return sendMessage(GROUP_ID, caption);
      }
      return data.ok;
    } catch (err) {
      console.error("[Telegram] sendPhoto error:", err);
      return sendMessage(GROUP_ID, caption);
    }
  }

  // Fallback: no image → standard text message
  return sendMessage(GROUP_ID, caption);
}