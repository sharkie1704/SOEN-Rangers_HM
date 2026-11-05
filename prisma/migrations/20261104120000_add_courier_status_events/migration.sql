-- CreateTable
CREATE TABLE "CourierStatusEvent" (
    "id" SERIAL NOT NULL,
    "courierId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromStatus" "CourierStatus" NOT NULL,
    "toStatus" "CourierStatus" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourierStatusEvent_courierId_idx" ON "CourierStatusEvent"("courierId");

-- Couriers who registered before registration set a status start off duty
UPDATE "User" SET "courierStatus" = 'OFFLINE' WHERE "role" = 'COURIER' AND "courierStatus" IS NULL;
