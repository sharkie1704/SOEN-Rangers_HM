-- CreateEnum
CREATE TYPE "CourierStatus" AS ENUM ('OFFLINE', 'IDLE', 'ASSIGNED', 'CARRYING');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "courierLat" DOUBLE PRECISION,
ADD COLUMN     "courierLng" DOUBLE PRECISION,
ADD COLUMN     "courierStatus" "CourierStatus";

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION;
