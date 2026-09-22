-- AlterEnum
ALTER TYPE "AccountType" ADD VALUE IF NOT EXISTS 'referral';

-- AlterTable
ALTER TABLE "streamer_profiles" ADD COLUMN IF NOT EXISTS "referred_by_id" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "referral_partners" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_requested_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "referral_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "referral_bank_details" (
    "id" TEXT NOT NULL,
    "referral_partner_id" TEXT NOT NULL,
    "account_holder_name" TEXT,
    "account_number" TEXT,
    "ifsc_code" TEXT,
    "bank_name" TEXT,
    "upi_id" TEXT,
    "invoice_name" TEXT,
    "street_address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "referral_earnings" (
    "id" TEXT NOT NULL,
    "referral_partner_id" TEXT NOT NULL,
    "streamer_id" TEXT NOT NULL,
    "donation_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "settlement_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "referral_settlements" (
    "id" TEXT NOT NULL,
    "referral_partner_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'INITIATED',
    "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "transfer_ref" TEXT,

    CONSTRAINT "referral_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "referral_partners_user_id_key" ON "referral_partners"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "referral_partners_referral_code_key" ON "referral_partners"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "referral_bank_details_referral_partner_id_key" ON "referral_bank_details"("referral_partner_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "referral_earnings_donation_id_key" ON "referral_earnings"("donation_id");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "streamer_profiles" ADD CONSTRAINT "streamer_profiles_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "referral_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "referral_partners" ADD CONSTRAINT "referral_partners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "referral_bank_details" ADD CONSTRAINT "referral_bank_details_referral_partner_id_fkey" FOREIGN KEY ("referral_partner_id") REFERENCES "referral_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_referral_partner_id_fkey" FOREIGN KEY ("referral_partner_id") REFERENCES "referral_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_streamer_id_fkey" FOREIGN KEY ("streamer_id") REFERENCES "streamer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "donations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "referral_settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "referral_settlements" ADD CONSTRAINT "referral_settlements_referral_partner_id_fkey" FOREIGN KEY ("referral_partner_id") REFERENCES "referral_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
