-- Add tenant confirmation step for cash workflow
ALTER TABLE "payments"
ADD COLUMN "tenantConfirmedBy" TEXT,
ADD COLUMN "tenantConfirmedAt" TIMESTAMP(3);

CREATE INDEX "payments_tenantConfirmedAt_idx" ON "payments"("tenantConfirmedAt");
