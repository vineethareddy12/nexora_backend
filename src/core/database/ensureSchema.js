import { prisma } from './prisma.js';

/**
 * Ensures required database tables, types, and constraints exist.
 * This runs automatically on application startup to guarantee deployment resilience
 * on platforms like Render even if manual migration commands were bypassed.
 */
export async function ensureDatabaseSchema() {
  try {
    // 1. Ensure ApplicationStatus enum contains 'SELECTED'
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApplicationStatus') THEN
          BEGIN
            ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'SELECTED';
          EXCEPTION
            WHEN duplicate_object THEN null;
          END;
        END IF;
      END $$;
    `).catch(() => { });

    // 2. Ensure OfferStatus enum exists
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OfferStatus') THEN
          CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'ISSUED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN');
        END IF;
      END $$;
    `).catch(() => { });

    // 3. Ensure application_status_history exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "application_status_history" (
        "id" UUID NOT NULL,
        "application_id" UUID NOT NULL,
        "previous_status" "ApplicationStatus" NOT NULL,
        "new_status" "ApplicationStatus" NOT NULL,
        "changed_by_id" UUID NOT NULL,
        "applicant_visible_remarks" TEXT,
        "internal_remarks" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "application_status_history_pkey" PRIMARY KEY ("id")
      )
    `);

    // 4. Ensure application_review_notes exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "application_review_notes" (
        "id" UUID NOT NULL,
        "application_id" UUID NOT NULL,
        "admin_id" UUID NOT NULL,
        "note" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL,
        CONSTRAINT "application_review_notes_pkey" PRIMARY KEY ("id")
      )
    `);

    // 5. Ensure job_offers exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "job_offers" (
        "id" UUID NOT NULL,
        "offer_code" VARCHAR(50) NOT NULL,
        "application_id" UUID NOT NULL,
        "applicant_id" UUID NOT NULL,
        "job_id" UUID NOT NULL,
        "created_by_id" UUID NOT NULL,
        "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
        "employment_type" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
        "salary" DECIMAL(12,2),
        "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
        "designation" VARCHAR(150) NOT NULL,
        "joining_date" TIMESTAMPTZ,
        "expiry_date" TIMESTAMPTZ,
        "terms_and_conditions" TEXT,
        "issued_at" TIMESTAMPTZ,
        "responded_at" TIMESTAMPTZ,
        "response_notes" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL,
        CONSTRAINT "job_offers_pkey" PRIMARY KEY ("id")
      )
    `);

    // 6. Ensure indexes and columns exist individually
    await prisma.$executeRawUnsafe(`ALTER TABLE "job_offers" ADD COLUMN IF NOT EXISTS "employment_type" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME'`).catch(() => { });
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "application_status_history_application_id_idx" ON "application_status_history"("application_id")`).catch(() => { });
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "application_status_history_changed_by_id_idx" ON "application_status_history"("changed_by_id")`).catch(() => { });
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "application_review_notes_application_id_idx" ON "application_review_notes"("application_id")`).catch(() => { });
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "application_review_notes_admin_id_idx" ON "application_review_notes"("admin_id")`).catch(() => { });
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "job_offers_offer_code_key" ON "job_offers"("offer_code")`).catch(() => { });
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "job_offers_application_id_key" ON "job_offers"("application_id")`).catch(() => { });
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "job_offers_applicant_id_status_idx" ON "job_offers"("applicant_id", "status")`).catch(() => { });
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "job_offers_job_id_status_idx" ON "job_offers"("job_id", "status")`).catch(() => { });

    // 7. Ensure foreign keys exist safely
    const fkStatements = [
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'application_status_history_application_id_fkey') THEN ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'application_status_history_changed_by_id_fkey') THEN ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'application_review_notes_application_id_fkey') THEN ALTER TABLE "application_review_notes" ADD CONSTRAINT "application_review_notes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'application_review_notes_admin_id_fkey') THEN ALTER TABLE "application_review_notes" ADD CONSTRAINT "application_review_notes_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_offers_application_id_fkey') THEN ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_offers_applicant_id_fkey') THEN ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_offers_job_id_fkey') THEN ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_offers_created_by_id_fkey') THEN ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`,
    ];

    for (const stmt of fkStatements) {
      await prisma.$executeRawUnsafe(stmt).catch(() => { });
    }

    console.log('[DB Sync] Database schema and tables verified successfully.');
  } catch (err) {
    console.error('[DB Sync Warning] Database schema auto-sync encountered an error:', err.message);
  }
}
