-- Restore the singleton row used to serialize billing ledger writes.
INSERT INTO "LedgerState" ("id", "epoch", "updatedAt")
VALUES ('default', 0, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
