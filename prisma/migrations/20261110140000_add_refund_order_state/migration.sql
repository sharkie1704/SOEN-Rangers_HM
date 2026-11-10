ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUNDED' AFTER 'DELIVERED';
ALTER TYPE "OrderAction" ADD VALUE IF NOT EXISTS 'REFUND';

ALTER TABLE "LedgerEntry" DROP CONSTRAINT IF EXISTS "LedgerEntry_terminal_state";
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_terminal_state"
  CHECK ("finalState" IN ('DELIVERED', 'REFUNDED', 'REJECTED', 'CANCELLED'));

ALTER TABLE "LedgerEntry" DROP CONSTRAINT IF EXISTS "LedgerEntry_terminal_charge";
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_terminal_charge"
  CHECK ("finalState" = 'DELIVERED' OR "totalChargeCents" = 0);
