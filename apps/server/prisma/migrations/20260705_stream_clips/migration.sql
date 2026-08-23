ALTER TABLE "streamer_profiles"
  ADD COLUMN IF NOT EXISTS "clip_default_duration" INTEGER NOT NULL DEFAULT 60;

CREATE TABLE IF NOT EXISTS "stream_clips" (
  "id"           TEXT NOT NULL,
  "streamer_id"  TEXT NOT NULL,
  "video_id"     TEXT NOT NULL,
  "title"        TEXT NOT NULL,
  "requested_by" TEXT NOT NULL,
  "stream_secs"  INTEGER NOT NULL,
  "duration"     INTEGER NOT NULL DEFAULT 60,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stream_clips_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "stream_clips"
  ADD CONSTRAINT "stream_clips_streamer_id_fkey"
  FOREIGN KEY ("streamer_id") REFERENCES "streamer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "stream_clips_streamer_id_video_id_stream_secs_key"
  ON "stream_clips"("streamer_id", "video_id", "stream_secs");
