ALTER TABLE "streamer_profiles" ADD COLUMN IF NOT EXISTS "stream_embed_enabled" BOOLEAN NOT NULL DEFAULT false;
