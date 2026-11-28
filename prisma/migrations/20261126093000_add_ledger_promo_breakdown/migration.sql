ALTER TABLE "LedgerEntry"
ADD COLUMN "subtotalCents" INTEGER,
ADD COLUMN "deliveryFeeCents" INTEGER,
ADD COLUMN "serviceFeeCents" INTEGER,
ADD COLUMN "smallOrderSurchargeCents" INTEGER,
ADD COLUMN "discountCents" INTEGER,
ADD COLUMN "promoCode" TEXT;
