ALTER TABLE "PromoCode"
ADD COLUMN "type" TEXT,
ADD COLUMN "value" INTEGER;

UPDATE "PromoCode"
SET "type" = 'percent',
    "value" = "percentOff";

ALTER TABLE "PromoCode"
ALTER COLUMN "type" SET NOT NULL,
ALTER COLUMN "value" SET NOT NULL;

ALTER TABLE "PromoCode"
ADD CONSTRAINT "PromoCode_type_check"
CHECK ("type" IN ('percent', 'fixed'));

ALTER TABLE "PromoCode"
ADD CONSTRAINT "PromoCode_value_check"
CHECK (
  ("type" = 'percent' AND "value" BETWEEN 1 AND 100)
  OR ("type" = 'fixed' AND "value" >= 0)
);

ALTER TABLE "PromoCode" DROP CONSTRAINT "PromoCode_percentOff_range";
ALTER TABLE "PromoCode" DROP COLUMN "percentOff";
