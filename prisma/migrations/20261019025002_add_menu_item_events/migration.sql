-- CreateTable
CREATE TABLE "MenuItemEvent" (
    "id" SERIAL NOT NULL,
    "menuItemId" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuItemEvent_menuItemId_idx" ON "MenuItemEvent"("menuItemId");
