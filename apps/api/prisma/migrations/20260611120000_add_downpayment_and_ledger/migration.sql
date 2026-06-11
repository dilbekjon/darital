-- Contract downpayment fields (credited to tenant balance wallet at contract creation)
ALTER TABLE "Contract"
  ADD COLUMN "downPaymentAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "downPaymentBankAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "downPaymentCashAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- Invoice balance-settlement tracking
ALTER TABLE "Invoice"
  ADD COLUMN "balancePaidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "ledgerChargedAt" TIMESTAMP(3);

-- UtilityBill balance-settlement tracking
ALTER TABLE "utility_bills"
  ADD COLUMN "balancePaidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "ledgerChargedAt" TIMESTAMP(3);

-- Ledger entry type enum
CREATE TYPE "LedgerEntryType" AS ENUM ('DEPOSIT', 'RENT_CHARGE', 'UTILITY_CHARGE', 'PAYMENT', 'ADJUSTMENT', 'REVERSAL');

-- Tenant balance ledger (immutable history of wallet movements)
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "balanceAfter" DECIMAL(65,30) NOT NULL,
    "description" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contractId" TEXT,
    "invoiceId" TEXT,
    "utilityBillId" TEXT,
    "paymentId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ledger_entries_tenantId_occurredAt_idx" ON "ledger_entries"("tenantId", "occurredAt");
CREATE INDEX "ledger_entries_type_idx" ON "ledger_entries"("type");

ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
