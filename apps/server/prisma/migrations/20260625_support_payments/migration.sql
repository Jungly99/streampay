CREATE TABLE IF NOT EXISTS "support_payments" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "order_id"   TEXT NOT NULL UNIQUE,
  "payment_id" TEXT,
  "amount"     INTEGER NOT NULL,
  "name"       TEXT,
  "message"    TEXT,
  "status"     TEXT NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "paid_at"    TIMESTAMP
);
