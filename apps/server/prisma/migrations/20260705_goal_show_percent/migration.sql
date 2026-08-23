ALTER TABLE "alert_settings" ADD COLUMN IF NOT EXISTS "goal_show_percent" BOOLEAN NOT NULL DEFAULT true;
