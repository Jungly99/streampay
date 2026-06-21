-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('streamer', 'viewer');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('INITIATED', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "OverlayTemplate" AS ENUM ('superchat', 'colorful', 'custom');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "account_type" "AccountType" NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streamer_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT,
    "channel_name" TEXT,
    "channel_link" TEXT,
    "bio" TEXT,
    "avatar_url" TEXT,
    "social_twitter" TEXT,
    "social_instagram" TEXT,
    "social_youtube" TEXT,
    "social_twitch" TEXT,
    "social_discord" TEXT,
    "social_kick" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "min_donation_amount" INTEGER NOT NULL DEFAULT 11,
    "overlay_token" TEXT,
    "cashfree_beneficiary_id" TEXT,
    "discord_webhook_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "streamer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streamer_bank_details" (
    "id" TEXT NOT NULL,
    "streamer_id" TEXT NOT NULL,
    "account_holder_name" TEXT,
    "account_number" TEXT,
    "ifsc_code" TEXT,
    "bank_name" TEXT,
    "invoice_name" TEXT,
    "street_address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "streamer_bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_settings" (
    "id" TEXT NOT NULL,
    "streamer_id" TEXT NOT NULL,
    "template" "OverlayTemplate" NOT NULL DEFAULT 'superchat',
    "bg_color" TEXT NOT NULL DEFAULT '#1a1a2e',
    "bg_opacity" INTEGER NOT NULL DEFAULT 100,
    "text_color" TEXT NOT NULL DEFAULT '#ffffff',
    "font_size" INTEGER NOT NULL DEFAULT 24,
    "font_style" TEXT NOT NULL DEFAULT 'Arial',
    "text_bold" BOOLEAN NOT NULL DEFAULT true,
    "text_italic" BOOLEAN NOT NULL DEFAULT false,
    "text_underline" BOOLEAN NOT NULL DEFAULT false,
    "animation_style" TEXT NOT NULL DEFAULT 'slideDown',
    "enable_border" BOOLEAN NOT NULL DEFAULT false,
    "tts_enabled" BOOLEAN NOT NULL DEFAULT true,
    "tts_volume" INTEGER NOT NULL DEFAULT 100,
    "tts_voice" TEXT NOT NULL DEFAULT 'en-IN',
    "voice_messages_enabled" BOOLEAN NOT NULL DEFAULT false,
    "alert_duration" INTEGER NOT NULL DEFAULT 8,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_message_tiers" (
    "id" TEXT NOT NULL,
    "streamer_id" TEXT NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "min_amount" INTEGER NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "voice_message_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overlay_goals" (
    "id" TEXT NOT NULL,
    "streamer_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "target_amount" INTEGER NOT NULL,
    "current_amount" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "overlay_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL,
    "streamer_id" TEXT NOT NULL,
    "viewer_id" TEXT,
    "donor_name" TEXT NOT NULL,
    "message" TEXT,
    "voice_message_url" TEXT,
    "amount" INTEGER NOT NULL,
    "platform_fee_pct" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "fee_amount" DECIMAL(10,2),
    "net_amount" DECIMAL(10,2),
    "cf_order_id" TEXT NOT NULL,
    "cf_payment_id" TEXT,
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "alert_sent" BOOLEAN NOT NULL DEFAULT false,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "settlement_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "streamer_id" TEXT NOT NULL,
    "gross_amount" INTEGER NOT NULL,
    "fee_pct" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "fee_amount" DECIMAL(10,2) NOT NULL,
    "net_amount" DECIMAL(10,2) NOT NULL,
    "cf_transfer_id" TEXT,
    "status" "SettlementStatus" NOT NULL DEFAULT 'INITIATED',
    "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMP(3),
    "failure_reason" TEXT,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "streamer_id" TEXT NOT NULL,
    "settlement_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "gross_amount" DECIMAL(10,2) NOT NULL,
    "fee_amount" DECIMAL(10,2) NOT NULL,
    "net_amount" DECIMAL(10,2) NOT NULL,
    "gst_details" JSONB,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewer_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viewer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "viewer_id" TEXT NOT NULL,
    "streamer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "streamer_profiles_user_id_key" ON "streamer_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "streamer_profiles_username_key" ON "streamer_profiles"("username");

-- CreateIndex
CREATE UNIQUE INDEX "streamer_profiles_overlay_token_key" ON "streamer_profiles"("overlay_token");

-- CreateIndex
CREATE UNIQUE INDEX "streamer_bank_details_streamer_id_key" ON "streamer_bank_details"("streamer_id");

-- CreateIndex
CREATE UNIQUE INDEX "alert_settings_streamer_id_key" ON "alert_settings"("streamer_id");

-- CreateIndex
CREATE UNIQUE INDEX "donations_cf_order_id_key" ON "donations"("cf_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_settlement_id_key" ON "invoices"("settlement_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "viewer_profiles_user_id_key" ON "viewer_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "follows_viewer_id_streamer_id_key" ON "follows"("viewer_id", "streamer_id");

-- AddForeignKey
ALTER TABLE "streamer_profiles" ADD CONSTRAINT "streamer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streamer_bank_details" ADD CONSTRAINT "streamer_bank_details_streamer_id_fkey" FOREIGN KEY ("streamer_id") REFERENCES "streamer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_settings" ADD CONSTRAINT "alert_settings_streamer_id_fkey" FOREIGN KEY ("streamer_id") REFERENCES "streamer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_message_tiers" ADD CONSTRAINT "voice_message_tiers_streamer_id_fkey" FOREIGN KEY ("streamer_id") REFERENCES "streamer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overlay_goals" ADD CONSTRAINT "overlay_goals_streamer_id_fkey" FOREIGN KEY ("streamer_id") REFERENCES "streamer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_streamer_id_fkey" FOREIGN KEY ("streamer_id") REFERENCES "streamer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_streamer_id_fkey" FOREIGN KEY ("streamer_id") REFERENCES "streamer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_streamer_id_fkey" FOREIGN KEY ("streamer_id") REFERENCES "streamer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewer_profiles" ADD CONSTRAINT "viewer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_streamer_id_fkey" FOREIGN KEY ("streamer_id") REFERENCES "streamer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
