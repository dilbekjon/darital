CREATE TYPE "PaymentSource" AS ENUM ('ONLINE', 'BANK', 'CASH');

ALTER TABLE "Contract"
ADD COLUMN "bankAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "cashAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

ALTER TABLE "Invoice"
ADD COLUMN "bankAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "cashAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

ALTER TABLE "Payment"
ADD COLUMN "source" "PaymentSource" NOT NULL DEFAULT 'ONLINE';

UPDATE "Contract"
SET "bankAmount" = "amount",
    "cashAmount" = 0
WHERE "bankAmount" = 0 AND "cashAmount" = 0;

UPDATE "Invoice"
SET "bankAmount" = "amount",
    "cashAmount" = 0
WHERE "bankAmount" = 0 AND "cashAmount" = 0;

UPDATE "Payment"
SET "source" = CASE
  WHEN "method" = 'ONLINE' THEN 'ONLINE'::"PaymentSource"
  ELSE 'CASH'::"PaymentSource"
END;
