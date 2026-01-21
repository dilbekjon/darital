-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "archiveReason" TEXT,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "archiveReason" TEXT,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "archiveReason" TEXT,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subjectUz" TEXT NOT NULL,
    "subjectRu" TEXT NOT NULL,
    "subjectEn" TEXT NOT NULL,
    "bodyUz" TEXT NOT NULL,
    "bodyRu" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archived_messages" (
    "id" TEXT NOT NULL,
    "originalId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderRole" "SenderRole" NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT,
    "fileUrl" TEXT,
    "status" "MessageStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archived_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archived_conversations" (
    "id" TEXT NOT NULL,
    "originalId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adminId" TEXT,
    "topic" TEXT,
    "status" "ConversationStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archived_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archived_audit_logs" (
    "id" TEXT NOT NULL,
    "originalId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "subject" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archived_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archived_notifications" (
    "id" TEXT NOT NULL,
    "originalId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archived_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_code_key" ON "email_templates"("code");

-- CreateIndex
CREATE INDEX "archived_messages_conversationId_idx" ON "archived_messages"("conversationId");

-- CreateIndex
CREATE INDEX "archived_messages_archivedAt_idx" ON "archived_messages"("archivedAt");

-- CreateIndex
CREATE INDEX "archived_conversations_tenantId_idx" ON "archived_conversations"("tenantId");

-- CreateIndex
CREATE INDEX "archived_conversations_archivedAt_idx" ON "archived_conversations"("archivedAt");

-- CreateIndex
CREATE INDEX "archived_audit_logs_actorId_idx" ON "archived_audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "archived_audit_logs_archivedAt_idx" ON "archived_audit_logs"("archivedAt");

-- CreateIndex
CREATE INDEX "archived_notifications_tenantId_idx" ON "archived_notifications"("tenantId");

-- CreateIndex
CREATE INDEX "archived_notifications_archivedAt_idx" ON "archived_notifications"("archivedAt");

-- CreateIndex
CREATE INDEX "Contract_isArchived_idx" ON "Contract"("isArchived");

-- CreateIndex
CREATE INDEX "Invoice_isArchived_idx" ON "Invoice"("isArchived");

-- CreateIndex
CREATE INDEX "Tenant_isArchived_idx" ON "Tenant"("isArchived");
