CREATE TABLE "PromoCode" (
  "code" TEXT NOT NULL,
  "percentOff" INTEGER NOT NULL,
  "minOrderCents" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("code"),
  CONSTRAINT "PromoCode_percentOff_range" CHECK ("percentOff" BETWEEN 1 AND 100),
  CONSTRAINT "PromoCode_minOrderCents_nonnegative" CHECK ("minOrderCents" >= 0)
);

ALTER TABLE "Order"
ADD COLUMN "promoCode" TEXT,
ADD COLUMN "discountCents" INTEGER;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_promo_snapshot_complete"
CHECK (("promoCode" IS NULL) = ("discountCents" IS NULL));

ALTER TABLE "OrderSummary"
ADD COLUMN "promoCode" TEXT,
ADD COLUMN "discountCents" INTEGER;

ALTER TABLE "OrderSummary"
ADD CONSTRAINT "OrderSummary_promo_snapshot_complete"
CHECK (("promoCode" IS NULL) = ("discountCents" IS NULL));
