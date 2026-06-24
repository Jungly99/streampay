ALTER TABLE "streamer_profiles"
  ADD COLUMN IF NOT EXISTS "message_max_length" INTEGER NOT NULL DEFAULT 100;

-- Update default for new streamers (existing ones keep their current value)
ALTER TABLE "streamer_profiles"
  ALTER COLUMN "min_donation_amount" SET DEFAULT 100;
