ALTER TABLE "alert_settings"
  ADD COLUMN IF NOT EXISTS "alert_sound_type" TEXT NOT NULL DEFAULT 'coin',
  ADD COLUMN IF NOT EXISTS "custom_alert_sound_url" TEXT;
