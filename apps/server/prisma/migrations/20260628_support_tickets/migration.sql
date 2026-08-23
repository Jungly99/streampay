CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "streamer_id" TEXT NOT NULL REFERENCES "streamer_profiles"("id") ON DELETE CASCADE,
  "subject"     TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'OPEN',
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ticket_messages" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "ticket_id"  TEXT NOT NULL REFERENCES "support_tickets"("id") ON DELETE CASCADE,
  "body"       TEXT NOT NULL,
  "from_admin" BOOLEAN NOT NULL DEFAULT false,
  "admin_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "support_tickets_streamer_id_idx" ON "support_tickets"("streamer_id");
CREATE INDEX IF NOT EXISTS "ticket_messages_ticket_id_idx"   ON "ticket_messages"("ticket_id");
