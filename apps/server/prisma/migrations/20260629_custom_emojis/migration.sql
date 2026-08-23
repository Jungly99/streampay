ALTER TABLE "streamer_profiles"
  ADD COLUMN IF NOT EXISTS "custom_emojis" TEXT NOT NULL DEFAULT '';
