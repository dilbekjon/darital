ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "tenantConfirmedAmount" DECIMAL(65,30),
  ADD COLUMN IF NOT EXISTS "collectorReceivedAmount" DECIMAL(65,30);

CREATE INDEX IF NOT EXISTS "Payment_tenantConfirmedAmount_idx"
  ON "Payment" ("tenantConfirmedAmount");
