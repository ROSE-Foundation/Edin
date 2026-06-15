-- CreateEnum
CREATE TYPE "evaluation"."TrackRecordOutcomeType" AS ENUM ('ROLE_ELIGIBILITY', 'SALARY_TIER', 'SERVICE_ACCESS', 'INVITATION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "evaluation"."TrackRecordOutcomeStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "evaluation"."track_record_outcomes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "milestone_id" UUID NOT NULL,
    "contributor_id" UUID NOT NULL,
    "outcome_type" "evaluation"."TrackRecordOutcomeType" NOT NULL,
    "outcome_details" JSONB NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "status" "evaluation"."TrackRecordOutcomeStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,

    CONSTRAINT "track_record_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_track_record_outcomes_milestone_type" ON "evaluation"."track_record_outcomes"("milestone_id", "outcome_type");

-- CreateIndex
CREATE INDEX "idx_track_record_outcomes_contributor_status" ON "evaluation"."track_record_outcomes"("contributor_id", "status");

-- CreateIndex
CREATE INDEX "idx_track_record_outcomes_type" ON "evaluation"."track_record_outcomes"("outcome_type");

-- AddForeignKey
ALTER TABLE "evaluation"."track_record_outcomes" ADD CONSTRAINT "track_record_outcomes_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "evaluation"."track_record_milestones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation"."track_record_outcomes" ADD CONSTRAINT "track_record_outcomes_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterEnum
ALTER TYPE "core"."ActivityEventType" ADD VALUE 'TRACK_RECORD_OUTCOME_GRANTED';

-- AlterEnum
ALTER TYPE "core"."NotificationType" ADD VALUE 'TRACK_RECORD_OUTCOME';
