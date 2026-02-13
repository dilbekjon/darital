-- AlterTable
ALTER TABLE "units" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedBy" TEXT,
ADD COLUMN "archiveReason" TEXT;

-- CreateIndex
CREATE INDEX "units_isArchived_idx" ON "units"("isArchived");
