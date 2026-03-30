CREATE TABLE "tenant_otps" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tenant_otps_tenantId_idx" ON "tenant_otps"("tenantId");
CREATE INDEX "tenant_otps_expiresAt_idx" ON "tenant_otps"("expiresAt");
CREATE INDEX "tenant_otps_usedAt_idx" ON "tenant_otps"("usedAt");

ALTER TABLE "tenant_otps" ADD CONSTRAINT "tenant_otps_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

