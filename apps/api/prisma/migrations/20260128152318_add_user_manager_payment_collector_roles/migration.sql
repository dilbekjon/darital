-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminRole" ADD VALUE 'USER_MANAGER';
ALTER TYPE "AdminRole" ADD VALUE 'PAYMENT_COLLECTOR';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "collectedAt" TIMESTAMP(3),
ADD COLUMN     "collectedBy" TEXT,
ADD COLUMN     "collectorNote" TEXT;

-- CreateIndex
CREATE INDEX "Payment_collectedBy_idx" ON "Payment"("collectedBy");
