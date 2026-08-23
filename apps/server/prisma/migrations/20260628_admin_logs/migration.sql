CREATE TABLE IF NOT EXISTS "admin_logs" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "admin_id"    TEXT,
  "admin_email" TEXT NOT NULL,
  "admin_name"  TEXT,
  "action"      TEXT NOT NULL,
  "entity"      TEXT,
  "entity_id"   TEXT,
  "detail"      TEXT,
  "ip"          TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "admin_logs_admin_id_idx"  ON "admin_logs"("admin_id");
CREATE INDEX IF NOT EXISTS "admin_logs_created_at_idx" ON "admin_logs"("created_at");
