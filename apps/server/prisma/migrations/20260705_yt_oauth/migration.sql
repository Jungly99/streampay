ALTER TABLE "streamer_profiles"
  ADD COLUMN IF NOT EXISTS "yt_refresh_token" TEXT,
  ADD COLUMN IF NOT EXISTS "yt_channel_title" TEXT;
