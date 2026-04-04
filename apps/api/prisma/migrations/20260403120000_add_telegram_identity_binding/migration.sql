-- Persist Telegram account identity to avoid repeated re-authentication flows
ALTER TABLE "TelegramUser"
ADD COLUMN "telegramUserId" TEXT,
ADD COLUMN "telegramUsername" TEXT;

CREATE UNIQUE INDEX "TelegramUser_telegramUserId_key" ON "TelegramUser"("telegramUserId");

