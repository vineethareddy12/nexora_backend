-- AlterTable
ALTER TABLE "company_profiles" ADD COLUMN IF NOT EXISTS "careers_email" VARCHAR(255);
ALTER TABLE "company_profiles" ADD COLUMN IF NOT EXISTS "secondary_phone" VARCHAR(60);
ALTER TABLE "company_profiles" ADD COLUMN IF NOT EXISTS "operating_hours" VARCHAR(255);
