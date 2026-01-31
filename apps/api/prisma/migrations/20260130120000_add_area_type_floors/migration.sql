-- CreateEnum
CREATE TYPE "AreaType" AS ENUM ('OPEN_AREA', 'BUILDING');

-- AlterTable
ALTER TABLE "buildings" ADD COLUMN "areaType" "AreaType" NOT NULL DEFAULT 'BUILDING';
ALTER TABLE "buildings" ADD COLUMN "floorsCount" INTEGER NOT NULL DEFAULT 0;
