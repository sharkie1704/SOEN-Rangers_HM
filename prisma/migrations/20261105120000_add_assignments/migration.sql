-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('OFFERED', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "AssignmentAction" AS ENUM ('OFFER', 'ACCEPT', 'DECLINE');

-- CreateTable
CREATE TABLE "Assignment" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "courierId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentEvent" (
    "id" SERIAL NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AssignmentAction" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Assignment_orderId_idx" ON "Assignment"("orderId");

-- CreateIndex
CREATE INDEX "Assignment_courierId_idx" ON "Assignment"("courierId");

-- CreateIndex
CREATE INDEX "AssignmentEvent_assignmentId_idx" ON "AssignmentEvent"("assignmentId");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentEvent" ADD CONSTRAINT "AssignmentEvent_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_one_active_per_order" ON "Assignment"("orderId") WHERE "status" IN ('OFFERED', 'ACCEPTED');
CREATE UNIQUE INDEX "Assignment_one_active_per_courier" ON "Assignment"("courierId") WHERE "status" IN ('OFFERED', 'ACCEPTED');
