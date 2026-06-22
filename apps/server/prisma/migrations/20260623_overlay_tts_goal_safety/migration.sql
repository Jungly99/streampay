ALTER TABLE "alert_settings"
  ADD COLUMN IF NOT EXISTS "tts_rate"                FLOAT   NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS "tts_pitch"               FLOAT   NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS "min_alert_amount"        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "min_tts_amount"          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "goal_bar_color"          TEXT    NOT NULL DEFAULT '#7c3aed',
  ADD COLUMN IF NOT EXISTS "enable_goal_celebration" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "enable_birthday"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "birthday_template"       TEXT    NOT NULL DEFAULT 'Happy Birthday {name}! 🎂',
  ADD COLUMN IF NOT EXISTS "enable_profanity_filter" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "custom_blocklist"        TEXT    NOT NULL DEFAULT '';
