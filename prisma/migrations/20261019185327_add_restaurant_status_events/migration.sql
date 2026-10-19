-- CreateTable
CREATE TABLE "RestaurantStatusEvent" (
    "id" SERIAL NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fromStatus" "RestaurantStatus" NOT NULL,
    "toStatus" "RestaurantStatus" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RestaurantStatusEvent_restaurantId_idx" ON "RestaurantStatusEvent"("restaurantId");
