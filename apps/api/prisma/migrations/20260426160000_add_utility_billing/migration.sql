-- CreateEnum
CREATE TYPE "UtilityType" AS ENUM ('WATER', 'ELECTRICITY', 'GAS');

-- CreateEnum
CREATE TYPE "UtilityBillStatus" AS ENUM ('DRAFT', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- AlterEnum
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'WATER_OPERATOR';
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'ELECTRICITY_OPERATOR';
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'GAS_OPERATOR';

-- CreateTable
CREATE TABLE "utility_bills" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unitId" TEXT,
    "type" "UtilityType" NOT NULL,
    "billingMonth" TIMESTAMP(3) NOT NULL,
    "startReading" DECIMAL(65,30),
    "endReading" DECIMAL(65,30),
    "consumption" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" "UtilityBillStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utility_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utility_bill_payments" (
    "id" TEXT NOT NULL,
    "utilityBillId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'OFFLINE',
    "source" "PaymentSource" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT,
    "createdByRole" TEXT,
    "note" TEXT,
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utility_bill_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utility_bills_tenantId_type_billingMonth_key" ON "utility_bills"("tenantId", "type", "billingMonth");

-- CreateIndex
CREATE INDEX "utility_bills_type_billingMonth_idx" ON "utility_bills"("type", "billingMonth");

-- CreateIndex
CREATE INDEX "utility_bills_status_idx" ON "utility_bills"("status");

-- CreateIndex
CREATE INDEX "utility_bills_tenantId_status_idx" ON "utility_bills"("tenantId", "status");

-- CreateIndex
CREATE INDEX "utility_bill_payments_utilityBillId_status_idx" ON "utility_bill_payments"("utilityBillId", "status");

-- CreateIndex
CREATE INDEX "utility_bill_payments_createdAt_idx" ON "utility_bill_payments"("createdAt");

-- AddForeignKey
ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utility_bills" ADD CONSTRAINT "utility_bills_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utility_bill_payments" ADD CONSTRAINT "utility_bill_payments_utilityBillId_fkey" FOREIGN KEY ("utilityBillId") REFERENCES "utility_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
