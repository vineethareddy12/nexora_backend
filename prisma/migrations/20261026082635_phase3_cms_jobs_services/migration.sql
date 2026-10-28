-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('ON_SITE', 'HYBRID', 'REMOTE');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED');

-- CreateTable
CREATE TABLE "company_profiles" (
    "id" UUID NOT NULL,
    "company_name" VARCHAR(160) NOT NULL,
    "logo_url" TEXT,
    "short_description" VARCHAR(500) NOT NULL,
    "about" TEXT NOT NULL,
    "mission" TEXT NOT NULL,
    "vision" TEXT NOT NULL,
    "areas_of_expertise" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "business_capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(60) NOT NULL,
    "address" TEXT NOT NULL,
    "website_url" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "short_description" VARCHAR(320) NOT NULL,
    "full_description" TEXT,
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tech_stack" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "icon_name" VARCHAR(60),
    "image_url" TEXT,
    "display_order" SMALLINT NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "job_code" VARCHAR(50) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "department" VARCHAR(120) NOT NULL,
    "location" VARCHAR(140) NOT NULL,
    "employment_type" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "work_mode" "WorkMode" NOT NULL DEFAULT 'HYBRID',
    "experience_required" VARCHAR(80) NOT NULL,
    "salary_range" VARCHAR(100),
    "description" TEXT NOT NULL,
    "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "required_qualifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "required_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferred_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "number_of_openings" SMALLINT DEFAULT 1,
    "application_deadline" TIMESTAMPTZ,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_enquiries" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30),
    "subject" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "admin_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "contact_enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE INDEX "services_is_published_display_order_idx" ON "services"("is_published", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_job_code_key" ON "jobs"("job_code");

-- CreateIndex
CREATE INDEX "jobs_status_application_deadline_idx" ON "jobs"("status", "application_deadline");

-- CreateIndex
CREATE INDEX "jobs_department_work_mode_idx" ON "jobs"("department", "work_mode");

-- CreateIndex
CREATE INDEX "contact_enquiries_status_created_at_idx" ON "contact_enquiries"("status", "created_at");
