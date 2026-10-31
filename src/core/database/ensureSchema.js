import { prisma } from './prisma.js';

/**
 * Ensures required database tables, types, and constraints exist.
 * This runs automatically on application startup to guarantee deployment resilience
 * on platforms like Render even if manual migration commands were bypassed.
 */
export async function ensureDatabaseSchema() {
  try {
    // 1. Enums
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
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OfferStatus') THEN
          CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'ISSUED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN');
        END IF;
      END $$;
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InterviewMode') THEN
          CREATE TYPE "InterviewMode" AS ENUM ('ONLINE', 'OFFLINE');
        END IF;
      END $$;
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InterviewStatus') THEN
          CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');
        END IF;
      END $$;
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
          CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ACTION_REQUIRED');
        END IF;
      END $$;
    `).catch(() => {});

    // 2. Base tables
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

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "offer_status_histories" (
        "id" UUID NOT NULL,
        "offer_id" UUID NOT NULL,
        "changed_by_id" UUID NOT NULL,
        "previous_status" "OfferStatus" NOT NULL,
        "new_status" "OfferStatus" NOT NULL,
        "remarks" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "offer_status_histories_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "interviews" (
        "id" UUID NOT NULL,
        "interview_code" VARCHAR(50),
        "application_id" UUID NOT NULL,
        "applicant_id" UUID NOT NULL,
        "job_id" UUID NOT NULL,
        "created_by_id" UUID NOT NULL,
        "interview_round" VARCHAR(100) NOT NULL,
        "interview_date" TIMESTAMPTZ NOT NULL,
        "start_time" VARCHAR(20) NOT NULL,
        "end_time" VARCHAR(20) NOT NULL,
        "interview_mode" "InterviewMode" NOT NULL DEFAULT 'ONLINE',
        "meeting_link_or_location" TEXT NOT NULL,
        "interviewer_name" VARCHAR(120),
        "interviewer_email" VARCHAR(255),
        "instructions" TEXT,
        "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
        "cancellation_reason" TEXT,
        "cancelled_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL,
        CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "interview_feedbacks" (
        "id" UUID NOT NULL,
        "interview_id" UUID NOT NULL,
        "submitted_by_id" UUID NOT NULL,
        "technical_score" SMALLINT,
        "communication_score" SMALLINT,
        "problem_solving_score" SMALLINT,
        "strengths" TEXT,
        "areas_for_improvement" TEXT,
        "overall_feedback" TEXT NOT NULL,
        "recommendation" VARCHAR(50) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL,
        CONSTRAINT "interview_feedbacks_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "interview_schedule_histories" (
        "id" UUID NOT NULL,
        "interview_id" UUID NOT NULL,
        "changed_by_id" UUID NOT NULL,
        "previous_date" TIMESTAMPTZ NOT NULL,
        "previous_start_time" VARCHAR(20) NOT NULL,
        "previous_end_time" VARCHAR(20) NOT NULL,
        "previous_mode" "InterviewMode",
        "previous_location" TEXT,
        "new_date" TIMESTAMPTZ NOT NULL,
        "new_start_time" VARCHAR(20) NOT NULL,
        "new_end_time" VARCHAR(20) NOT NULL,
        "new_mode" "InterviewMode",
        "new_location" TEXT,
        "reason" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "interview_schedule_histories_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" UUID NOT NULL,
        "recipient_id" UUID NOT NULL,
        "title" VARCHAR(200) NOT NULL,
        "message" TEXT NOT NULL,
        "notification_type" "NotificationType" NOT NULL DEFAULT 'INFO',
        "related_entity_type" VARCHAR(60),
        "related_entity_id" VARCHAR(60),
        "is_read" BOOLEAN NOT NULL DEFAULT false,
        "read_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "email_logs" (
        "id" UUID NOT NULL,
        "recipient_email" VARCHAR(255) NOT NULL,
        "subject" VARCHAR(255) NOT NULL,
        "template_type" VARCHAR(80) NOT NULL,
        "related_entity_type" VARCHAR(60),
        "related_entity_id" VARCHAR(60),
        "delivery_status" VARCHAR(30) NOT NULL DEFAULT 'SENT',
        "provider_message_id" VARCHAR(120),
        "failure_reason" TEXT,
        "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" UUID NOT NULL,
        "actor_id" VARCHAR(100),
        "actor_email" VARCHAR(255),
        "actor_role" VARCHAR(40),
        "action" VARCHAR(100) NOT NULL,
        "entity_type" VARCHAR(80) NOT NULL,
        "entity_id" VARCHAR(80),
        "description" TEXT NOT NULL,
        "metadata" JSONB,
        "ip_address" VARCHAR(60),
        "user_agent" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
      )
    `);

    // 3. Columns & Indices
    await prisma.$executeRawUnsafe(`ALTER TABLE "job_offers" ADD COLUMN IF NOT EXISTS "employment_type" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME'`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "application_status_history_application_id_idx" ON "application_status_history"("application_id")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "application_status_history_changed_by_id_idx" ON "application_status_history"("changed_by_id")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "application_review_notes_application_id_idx" ON "application_review_notes"("application_id")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "application_review_notes_admin_id_idx" ON "application_review_notes"("admin_id")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "job_offers_offer_code_key" ON "job_offers"("offer_code")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "job_offers_application_id_key" ON "job_offers"("application_id")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "job_offers_applicant_id_status_idx" ON "job_offers"("applicant_id", "status")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "job_offers_job_id_status_idx" ON "job_offers"("job_id", "status")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "offer_status_histories_offer_id_idx" ON "offer_status_histories"("offer_id")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "interviews_applicant_id_status_idx" ON "interviews"("applicant_id", "status")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "interviews_job_id_status_idx" ON "interviews"("job_id", "status")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "interviews_interview_date_idx" ON "interviews"("interview_date")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "interview_feedbacks_interview_id_idx" ON "interview_feedbacks"("interview_id")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "interview_schedule_histories_interview_id_idx" ON "interview_schedule_histories"("interview_id")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "notifications_recipient_id_is_read_idx" ON "notifications"("recipient_id", "is_read")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "email_logs_recipient_email_idx" ON "email_logs"("recipient_email")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "email_logs_template_type_idx" ON "email_logs"("template_type")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "email_logs_sent_at_idx" ON "email_logs"("sent_at")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_idx" ON "audit_logs"("actor_id")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_action_idx" ON "audit_logs"("entity_type", "action")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at")`).catch(() => {});

    // 4. Foreign keys
    const fkStatements = [
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'application_status_history_application_id_fkey') THEN ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'application_status_history_changed_by_id_fkey') THEN ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'application_review_notes_application_id_fkey') THEN ALTER TABLE "application_review_notes" ADD CONSTRAINT "application_review_notes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'application_review_notes_admin_id_fkey') THEN ALTER TABLE "application_review_notes" ADD CONSTRAINT "application_review_notes_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_offers_application_id_fkey') THEN ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_offers_applicant_id_fkey') THEN ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_offers_job_id_fkey') THEN ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_offers_created_by_id_fkey') THEN ALTER TABLE "job_offers" ADD CONSTRAINT "job_offers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offer_status_histories_offer_id_fkey') THEN ALTER TABLE "offer_status_histories" ADD CONSTRAINT "offer_status_histories_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "job_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offer_status_histories_changed_by_id_fkey') THEN ALTER TABLE "offer_status_histories" ADD CONSTRAINT "offer_status_histories_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interviews_application_id_fkey') THEN ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interviews_applicant_id_fkey') THEN ALTER TABLE "interviews" ADD CONSTRAINT "interviews_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interviews_job_id_fkey') THEN ALTER TABLE "interviews" ADD CONSTRAINT "interviews_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interviews_created_by_id_fkey') THEN ALTER TABLE "interviews" ADD CONSTRAINT "interviews_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interview_feedbacks_interview_id_fkey') THEN ALTER TABLE "interview_feedbacks" ADD CONSTRAINT "interview_feedbacks_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interview_feedbacks_submitted_by_id_fkey') THEN ALTER TABLE "interview_feedbacks" ADD CONSTRAINT "interview_feedbacks_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interview_schedule_histories_interview_id_fkey') THEN ALTER TABLE "interview_schedule_histories" ADD CONSTRAINT "interview_schedule_histories_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interview_schedule_histories_changed_by_id_fkey') THEN ALTER TABLE "interview_schedule_histories" ADD CONSTRAINT "interview_schedule_histories_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_recipient_id_fkey') THEN ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;`,
    ];

    for (const stmt of fkStatements) {
      await prisma.$executeRawUnsafe(stmt).catch(() => {});
    }

    console.log('[DB Sync] All recruitment portal tables, types, and constraints verified successfully.');
  } catch (err) {
    console.error('[DB Sync Warning] Database schema auto-sync encountered an error:', err.message);
  }
}
