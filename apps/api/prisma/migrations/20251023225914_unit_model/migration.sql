-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('FREE', 'BUSY', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "area" DOUBLE PRECISION,
    "floor" INTEGER,
    "status" "UnitStatus" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);
