-- CreateEnum
CREATE TYPE "UtilityPaymentWorkflowStatus" AS ENUM (
  'TENANT_SUBMITTED',
  'COLLECTOR_CONFIRMED',
  'HANDED_TO_CASHIER',
  'CASHIER_CONFIRMED',
  'REJECTED'
);

-- AlterEnum
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'WATER_COLLECTOR';
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'ELECTRICITY_COLLECTOR';
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'GAS_COLLECTOR';

-- AlterTable
ALTER TABLE "utility_bill_payments"
  ADD COLUMN IF NOT EXISTS "utilityType" "UtilityType",
  ADD COLUMN IF NOT EXISTS "workflowStatus" "UtilityPaymentWorkflowStatus" NOT NULL DEFAULT 'TENANT_SUBMITTED',
  ADD COLUMN IF NOT EXISTS "tenantDeclaredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "tenantDeclaredAmount" DECIMAL(65,30),
  ADD COLUMN IF NOT EXISTS "collectorId" TEXT,
  ADD COLUMN IF NOT EXISTS "collectorConfirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "collectorConfirmedAmount" DECIMAL(65,30),
  ADD COLUMN IF NOT EXISTS "collectorHandoverAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "handoverDueAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lateHandoverNotifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cashierNote" TEXT;

-- Backfill utilityType for existing rows
UPDATE "utility_bill_payments" p
SET "utilityType" = b."type"
FROM "utility_bills" b
WHERE p."utilityBillId" = b."id" AND p."utilityType" IS NULL;

-- Ensure utilityType is non-null after backfill
ALTER TABLE "utility_bill_payments"
  ALTER COLUMN "utilityType" SET NOT NULL;

-- Backfill workflow from already confirmed/cancelled records
UPDATE "utility_bill_payments"
SET "workflowStatus" = 'CASHIER_CONFIRMED'
WHERE "status" = 'CONFIRMED';

UPDATE "utility_bill_payments"
SET "workflowStatus" = 'REJECTED'
WHERE "status" = 'CANCELLED';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "utility_bill_payments_utilityType_source_workflowStatus_idx"
  ON "utility_bill_payments"("utilityType", "source", "workflowStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "utility_bill_payments_handoverDueAt_workflowStatus_source_idx"
  ON "utility_bill_payments"("handoverDueAt", "workflowStatus", "source");
