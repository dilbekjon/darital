-- Add tenant confirmation step for cash workflow
ALTER TABLE "Payment"
ADD COLUMN "tenantConfirmedBy" TEXT,
ADD COLUMN "tenantConfirmedAt" TIMESTAMP(3);

CREATE INDEX "Payment_tenantConfirmedAt_idx" ON "Payment"("tenantConfirmedAt");
