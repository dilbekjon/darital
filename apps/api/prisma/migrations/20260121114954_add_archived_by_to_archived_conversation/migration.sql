-- AlterTable
-- Add archiveReason (nullable)
ALTER TABLE "archived_conversations" ADD COLUMN IF NOT EXISTS "archiveReason" TEXT;

-- Add archivedBy (nullable first, then update existing records, then make required)
ALTER TABLE "archived_conversations" ADD COLUMN IF NOT EXISTS "archivedBy" TEXT;

-- Update existing records with default value
UPDATE "archived_conversations" SET "archivedBy" = 'system' WHERE "archivedBy" IS NULL;

-- Now make it required
ALTER TABLE "archived_conversations" ALTER COLUMN "archivedBy" SET NOT NULL;
