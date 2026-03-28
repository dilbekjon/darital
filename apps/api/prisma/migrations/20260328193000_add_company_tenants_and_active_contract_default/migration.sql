ALTER TABLE "Tenant" ADD COLUMN "companyId" TEXT;

CREATE INDEX "Tenant_companyId_idx" ON "Tenant"("companyId");

ALTER TABLE "Tenant"
ADD CONSTRAINT "Tenant_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Contract" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
