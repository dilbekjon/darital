-- AlterTable
ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "utilityElectricityEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "utilityGasEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "utilityWaterEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "UtilityTariffConfig" (
  "id" TEXT NOT NULL,
  "electricityPerKwh" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "gasPerM3" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "waterPerM3" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UtilityTariffConfig_pkey" PRIMARY KEY ("id")
);
