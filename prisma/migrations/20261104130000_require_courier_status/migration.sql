-- Couriers created since the last backfill would otherwise make the constraint fail
UPDATE "User" SET "courierStatus" = 'OFFLINE' WHERE "role" = 'COURIER' AND "courierStatus" IS NULL;

-- A courier must always have a status. Prisma's schema can't express CHECK constraints, so this rule only lives here.
ALTER TABLE "User" ADD CONSTRAINT "User_courier_has_status" CHECK ("role" <> 'COURIER' OR "courierStatus" IS NOT NULL);
