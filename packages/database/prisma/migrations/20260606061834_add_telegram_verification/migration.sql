CREATE TABLE IF NOT EXISTS "TelegramVerification" (
    "handle"     TEXT NOT NULL,
    "chatId"     TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TelegramVerification_pkey" PRIMARY KEY ("handle")
);