const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_ID  = process.env.TELEGRAM_GROUP_ID;

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
  const chatId = handle.startsWith("@") ? handle : `@${handle}`;
  const msg =
    `⚠️ <b>1BillionPixel — Quota Warning</b>\n\n` +
    `Wallet: <code>${walletAddress.slice(0,8)}...${walletAddress.slice(-4)}</code>\n\n` +
    `🔴 Token balance: <b>${Number(onChain).toLocaleString()} $1BPX</b>\n` +
    `📐 Claimed pixels: <b>${Number(locked).toLocaleString()} px</b>\n` +
    `❗ Deficit: <b>${Number(deficit).toLocaleString()} $1BPX</b>\n\n` +
    `You have <b>${graceHours} hour${graceHours !== 1 ? "s" : ""}</b> to buy back tokens.\n` +
    `If you don't, your areas will be proportionally resized.\n\n` +
    `👉 <a href="https://pump.fun">Buy $1BPX on PumpFun</a>`;
  return sendMessage(chatId, msg);
}

// ── DM: Areas resized ────────────────────────────────────────────────────────
export async function sendResizeNotification(
  handle: string,
  walletAddress: string,
  onChain: bigint
): Promise<boolean> {
  const chatId = handle.startsWith("@") ? handle : `@${handle}`;
  const msg =
    `📉 <b>1BillionPixel — Areas Resized</b>\n\n` +
    `Wallet: <code>${walletAddress.slice(0,8)}...${walletAddress.slice(-4)}</code>\n\n` +
    `Your claimed areas have been proportionally reduced to match your ` +
    `current balance of <b>${Number(onChain).toLocaleString()} $1BPX</b>.\n\n` +
    `To restore your areas, buy back the tokens and re-claim.\n\n` +
    `👉 <a href="https://pump.fun">Buy $1BPX on PumpFun</a>`;
  return sendMessage(chatId, msg);
}

// ── DM: Quota restored (visszavásárolta a tokent) ────────────────────────────
export async function sendQuotaRestoredNotification(
  handle: string,
  walletAddress: string,
  onChain: bigint
): Promise<boolean> {
  const chatId = handle.startsWith("@") ? handle : `@${handle}`;
  const msg =
    `✅ <b>1BillionPixel — Quota Restored</b>\n\n` +
    `Wallet: <code>${walletAddress.slice(0,8)}...${walletAddress.slice(-4)}</code>\n\n` +
    `Your token balance is back to <b>${Number(onChain).toLocaleString()} $1BPX</b>.\n` +
    `All your areas are now <b>ACTIVE</b> again. 🎉`;
  return sendMessage(chatId, msg);
}

// ── Group: Új claim értesítés ────────────────────────────────────────────────
export async function sendNewClaimToGroup(params: {
  walletAddress: string;
  x: number;
  y: number;
  width: number;
  height: number;
  imageUrl?: string;
  link?: string;
}): Promise<boolean> {
  if (!GROUP_ID) return false;
  const { walletAddress, x, y, width, height, imageUrl, link } = params;
  const pixels = (width * height).toLocaleString();
  const shortWallet = `${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}`;

  const msg =
    `🖼 <b>New Pixel Claim!</b>\n\n` +
    `👛 Wallet: <code>${shortWallet}</code>\n` +
    `📐 Size: <b>${width}×${height}</b> = <b>${pixels} px</b>\n` +
    `📍 Position: (${x}, ${y})\n` +
    (link ? `🔗 <a href="${link}">${link}</a>\n` : "") +
    (imageUrl ? `\n🖼 <a href="${imageUrl}">View image</a>` : "") +
    `\n\n👉 <a href="https://1billionpixel.fun/canvas/live">View on canvas</a>`;

  return sendMessage(GROUP_ID, msg);
}