ALTER TABLE "streamer_profiles"
  ADD COLUMN IF NOT EXISTS "platform_fee_pct" DECIMAL(5,2) NOT NULL DEFAULT 5.00;
