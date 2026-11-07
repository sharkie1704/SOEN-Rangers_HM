-- Preserve the fare charged at placement for future delivery summaries.
ALTER TABLE "Order"
ADD COLUMN "restaurantName" TEXT,
ADD COLUMN "deliveryFeeCents" INTEGER,
ADD COLUMN "serviceFeeCents" INTEGER,
ADD COLUMN "smallOrderSurchargeCents" INTEGER,
ADD COLUMN "fareTotalCents" INTEGER;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_fare_snapshot_complete"
CHECK (
  ("deliveryFeeCents" IS NULL AND "serviceFeeCents" IS NULL AND "smallOrderSurchargeCents" IS NULL AND "fareTotalCents" IS NULL)
  OR
  ("deliveryFeeCents" IS NOT NULL AND "serviceFeeCents" IS NOT NULL AND "smallOrderSurchargeCents" IS NOT NULL AND "fareTotalCents" IS NOT NULL)
);

CREATE TABLE "OrderSummary" (
  "orderId" INTEGER NOT NULL,
  "customerId" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "restaurantName" TEXT NOT NULL,
  "subtotalCents" INTEGER NOT NULL,
  "deliveryFeeCents" INTEGER NOT NULL,
  "serviceFeeCents" INTEGER NOT NULL,
  "smallOrderSurchargeCents" INTEGER NOT NULL,
  "totalCents" INTEGER NOT NULL,
  "placedAt" TIMESTAMP(3) NOT NULL,
  "deliveredAt" TIMESTAMP(3) NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrderSummary_pkey" PRIMARY KEY ("orderId")
);

CREATE INDEX "OrderSummary_customerId_deliveredAt_idx"
ON "OrderSummary"("customerId", "deliveredAt");

ALTER TABLE "OrderSummary"
ADD CONSTRAINT "OrderSummary_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
