CREATE TABLE "LedgerState" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "epoch" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerState_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LedgerState_epoch_nonnegative" CHECK ("epoch" >= 0)
);

INSERT INTO "LedgerState" ("id", "epoch") VALUES ('default', 0);

CREATE TABLE "LedgerEntry" (
  "eventId" INTEGER NOT NULL,
  "orderId" INTEGER NOT NULL,
  "finalState" "OrderStatus" NOT NULL,
  "epoch" INTEGER NOT NULL,
  "placedAt" TIMESTAMP(3) NOT NULL,
  "finalizedAt" TIMESTAMP(3) NOT NULL,
  "deliveredAt" TIMESTAMP(3),
  "totalChargeCents" INTEGER,
  CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("eventId"),
  CONSTRAINT "LedgerEntry_epoch_nonnegative" CHECK ("epoch" >= 0),
  CONSTRAINT "LedgerEntry_charge_nonnegative" CHECK ("totalChargeCents" IS NULL OR "totalChargeCents" >= 0),
  CONSTRAINT "LedgerEntry_terminal_state" CHECK ("finalState" IN ('DELIVERED', 'REJECTED', 'CANCELLED')),
  CONSTRAINT "LedgerEntry_terminal_charge" CHECK ("finalState" = 'DELIVERED' OR "totalChargeCents" = 0),
  CONSTRAINT "LedgerEntry_delivery_timestamp" CHECK (
    ("finalState" = 'DELIVERED' AND "deliveredAt" IS NOT NULL)
    OR ("finalState" <> 'DELIVERED' AND "deliveredAt" IS NULL)
  )
);

CREATE INDEX "LedgerEntry_epoch_finalizedAt_idx" ON "LedgerEntry"("epoch", "finalizedAt");
CREATE INDEX "LedgerEntry_orderId_idx" ON "LedgerEntry"("orderId");

CREATE FUNCTION prevent_ledger_entry_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Ledger entries are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "LedgerEntry_no_update_or_delete"
BEFORE UPDATE OR DELETE ON "LedgerEntry"
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_entry_mutation();

CREATE TRIGGER "LedgerEntry_no_truncate"
BEFORE TRUNCATE ON "LedgerEntry"
FOR EACH STATEMENT EXECUTE FUNCTION prevent_ledger_entry_mutation();
