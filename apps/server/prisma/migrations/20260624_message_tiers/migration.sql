ALTER TABLE "streamer_profiles"
  ADD COLUMN IF NOT EXISTS "message_tiers" JSONB NOT NULL DEFAULT '[]';
