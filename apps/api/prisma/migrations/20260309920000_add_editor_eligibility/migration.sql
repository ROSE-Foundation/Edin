-- CreateEnum
CREATE TYPE "publication"."EditorApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- AlterEnum
ALTER TYPE "core"."NotificationType" ADD VALUE 'EDITOR_APPLICATION_SUBMITTED';

-- CreateTable
CREATE TABLE "publication"."editor_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contributor_id" UUID NOT NULL,
    "domain" "core"."ContributorDomain" NOT NULL,
    "status" "publication"."EditorApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "application_statement" VARCHAR(300) NOT NULL,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "revoked_at" TIMESTAMP(3),
    "revoked_by_id" UUID,
    "revoke_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "editor_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication"."editor_eligibility_criteria" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "domain" "core"."ContributorDomain" NOT NULL,
    "min_contribution_count" INTEGER NOT NULL DEFAULT 10,
    "min_governance_weight" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "max_concurrent_assignments" INTEGER NOT NULL DEFAULT 5,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" UUID,

    CONSTRAINT "editor_eligibility_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "editor_applications_contributor_domain_key" ON "publication"."editor_applications"("contributor_id", "domain");

-- CreateIndex
CREATE INDEX "idx_editor_application_status" ON "publication"."editor_applications"("status");

-- CreateIndex
CREATE INDEX "idx_editor_application_contributor_id" ON "publication"."editor_applications"("contributor_id");

-- CreateIndex
CREATE UNIQUE INDEX "editor_eligibility_criteria_domain_key" ON "publication"."editor_eligibility_criteria"("domain");

-- AddForeignKey
ALTER TABLE "publication"."editor_applications" ADD CONSTRAINT "editor_applications_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."editor_applications" ADD CONSTRAINT "editor_applications_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "core"."contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."editor_applications" ADD CONSTRAINT "editor_applications_revoked_by_id_fkey" FOREIGN KEY ("revoked_by_id") REFERENCES "core"."contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."editor_eligibility_criteria" ADD CONSTRAINT "editor_eligibility_criteria_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "core"."contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default eligibility criteria for all domains
INSERT INTO "publication"."editor_eligibility_criteria" ("id", "domain", "min_contribution_count", "min_governance_weight", "max_concurrent_assignments", "updated_at")
VALUES
  (gen_random_uuid(), 'Technology', 10, 0, 5, NOW()),
  (gen_random_uuid(), 'Fintech', 10, 0, 5, NOW()),
  (gen_random_uuid(), 'Impact', 10, 0, 5, NOW()),
  (gen_random_uuid(), 'Governance', 10, 0, 5, NOW());
