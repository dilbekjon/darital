-- ============================================
-- CHAT SYSTEM MIGRATION
-- Run this manually if Prisma migration fails
-- ============================================

-- Step 1: Create Enums
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'PENDING', 'CLOSED');
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');
CREATE TYPE "SenderRole" AS ENUM ('TENANT', 'ADMIN');

-- Step 2: Create Conversation Table
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adminId" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create Message Table
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderRole" "SenderRole" NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT,
    "fileUrl" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create Indexes
CREATE INDEX "conversations_tenantId_idx" ON "conversations"("tenantId");
CREATE INDEX "conversations_adminId_idx" ON "conversations"("adminId");
CREATE INDEX "conversations_status_idx" ON "conversations"("status");
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- Step 5: Add Foreign Keys
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_adminId_fkey" 
    FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" 
    FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('conversations', 'messages');

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('conversations', 'messages');

-- Count records (should be 0)
SELECT 'conversations' as table_name, COUNT(*) as count FROM conversations
UNION ALL
SELECT 'messages' as table_name, COUNT(*) as count FROM messages;

