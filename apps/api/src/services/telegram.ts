const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendTelegramMessage(handle: string, text: string): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN not set, skipping notification");
    return false;
  }

  // handle lehet "@username" vagy csak "username"
  const chatId = handle.startsWith("@") ? handle : `@${handle}`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.warn("[Telegram] Send failed:", data.description);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Telegram] Error:", err);
    return false;
  }
}