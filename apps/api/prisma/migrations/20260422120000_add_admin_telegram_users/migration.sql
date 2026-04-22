CREATE TABLE "admin_telegram_users" (
  "id" TEXT NOT NULL,
  "adminId" TEXT,
  "chatId" TEXT NOT NULL,
  "telegramUserId" TEXT,
  "telegramUsername" TEXT,
  "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
  "authStep" TEXT,
  "pendingAdminId" TEXT,
  "pendingEmail" TEXT,
  "otpHash" TEXT,
  "otpExpiresAt" TIMESTAMP(3),
  "otpAttempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "admin_telegram_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_telegram_users_chatId_key" ON "admin_telegram_users"("chatId");
CREATE UNIQUE INDEX "admin_telegram_users_telegramUserId_key" ON "admin_telegram_users"("telegramUserId");
CREATE INDEX "admin_telegram_users_adminId_idx" ON "admin_telegram_users"("adminId");
CREATE INDEX "admin_telegram_users_pendingEmail_idx" ON "admin_telegram_users"("pendingEmail");
