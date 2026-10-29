-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RESUME', 'EDUCATIONAL_CERTIFICATE', 'INTERNSHIP_CERTIFICATE', 'EXPERIENCE_CERTIFICATE', 'OTHER');

-- CreateTable
CREATE TABLE "applicant_documents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "DocumentType" NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "checksum_sha256" VARCHAR(64),
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "application_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "applicant_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "applicant_documents_storage_key_key" ON "applicant_documents"("storage_key");

-- CreateIndex
CREATE INDEX "applicant_documents_user_id_type_deleted_at_idx" ON "applicant_documents"("user_id", "type", "deleted_at");

-- CreateIndex
CREATE INDEX "applicant_documents_user_id_is_archived_idx" ON "applicant_documents"("user_id", "is_archived");

-- AddForeignKey
ALTER TABLE "applicant_documents" ADD CONSTRAINT "applicant_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

