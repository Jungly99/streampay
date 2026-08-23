ALTER TABLE "alert_settings" ADD COLUMN IF NOT EXISTS "tts_voice_id" TEXT NOT NULL DEFAULT 'hi-IN-Standard-A';
