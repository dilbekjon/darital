-- TenantSetupToken table for SMS magic links
CREATE TABLE "tenant_setup_tokens" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_setup_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_setup_tokens_token_key" ON "tenant_setup_tokens"("token");

CREATE INDEX "tenant_setup_tokens_tenantId_idx" ON "tenant_setup_tokens"("tenantId");
CREATE INDEX "tenant_setup_tokens_token_idx" ON "tenant_setup_tokens"("token");
CREATE INDEX "tenant_setup_tokens_expiresAt_idx" ON "tenant_setup_tokens"("expiresAt");

ALTER TABLE "tenant_setup_tokens" ADD CONSTRAINT "tenant_setup_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Make phone unique
CREATE UNIQUE INDEX "Tenant_phone_key" ON "Tenant"("phone");
