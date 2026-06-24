ALTER TABLE "alert_settings"
  ADD COLUMN IF NOT EXISTS "celebrity_voice_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "celebrity_voice_id" TEXT,
  ADD COLUMN IF NOT EXISTS "celebrity_voice_min_amount" INTEGER NOT NULL DEFAULT 1000;
