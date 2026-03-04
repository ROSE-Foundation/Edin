-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'DECLINED');

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "applicant_name" TEXT NOT NULL,
    "applicant_email" TEXT NOT NULL,
    "domain" "ContributorDomain" NOT NULL,
    "statement_of_interest" VARCHAR(300) NOT NULL,
    "micro_task_domain" "ContributorDomain" NOT NULL,
    "micro_task_response" TEXT NOT NULL,
    "micro_task_submission_url" TEXT,
    "gdpr_consent_version" TEXT NOT NULL,
    "gdpr_consented_at" TIMESTAMP(3) NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "contributor_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "micro_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "domain" "ContributorDomain" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expected_deliverable" TEXT NOT NULL,
    "estimated_effort" TEXT NOT NULL,
    "submission_format" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "micro_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit"."consent_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "consent_type" TEXT NOT NULL,
    "consent_version" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "micro_tasks_domain_key" ON "micro_tasks"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "applications_applicant_email_key" ON "applications"("applicant_email");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
