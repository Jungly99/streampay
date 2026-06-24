ALTER TABLE "streamer_profiles"
  ADD COLUMN IF NOT EXISTS "verification_requested_at" TIMESTAMP;
