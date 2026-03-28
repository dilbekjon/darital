ALTER TABLE "units" ADD COLUMN "occupiedFloors" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

UPDATE "units"
SET "occupiedFloors" = CASE
  WHEN "floor" IS NULL THEN ARRAY[]::INTEGER[]
  ELSE ARRAY["floor"]
END;

ALTER TABLE "buildings" ALTER COLUMN "floorsCount" SET DEFAULT 1;

UPDATE "buildings"
SET "floorsCount" = 1
WHERE "floorsCount" < 1;
