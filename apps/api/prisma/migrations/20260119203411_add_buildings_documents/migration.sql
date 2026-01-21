-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('LEASE_AGREEMENT', 'ID_COPY', 'PASSPORT', 'PAYMENT_RECEIPT', 'CONTRACT_ATTACHMENT', 'OTHER');

-- AlterTable
ALTER TABLE "units" ADD COLUMN     "buildingId" TEXT;

-- CreateTable
CREATE TABLE "buildings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "description" TEXT,
    "totalUnits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "contractId" TEXT,
    "paymentId" TEXT,
    "type" "DocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_tenantId_idx" ON "documents"("tenantId");

-- CreateIndex
CREATE INDEX "documents_contractId_idx" ON "documents"("contractId");

-- CreateIndex
CREATE INDEX "documents_paymentId_idx" ON "documents"("paymentId");

-- CreateIndex
CREATE INDEX "units_buildingId_idx" ON "units"("buildingId");

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
