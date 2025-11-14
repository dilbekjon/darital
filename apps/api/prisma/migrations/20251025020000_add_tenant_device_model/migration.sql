-- CreateTable
CREATE TABLE IF NOT EXISTS "tenant_devices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "fcm_token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_devices_fcm_token_key" ON "tenant_devices"("fcm_token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tenant_devices_tenant_id_idx" ON "tenant_devices"("tenant_id");
