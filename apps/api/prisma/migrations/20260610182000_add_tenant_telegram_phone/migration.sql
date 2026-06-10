ALTER TABLE "Tenant"
ADD COLUMN "telegramPhone" TEXT;

UPDATE "Tenant"
SET "telegramPhone" = "phone"
WHERE "telegramPhone" IS NULL;

CREATE UNIQUE INDEX "Tenant_telegramPhone_key" ON "Tenant"("telegramPhone");
CREATE INDEX "Tenant_telegramPhone_idx" ON "Tenant"("telegramPhone");
