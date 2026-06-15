-- AlterEnum
ALTER TYPE "core"."ActivityEventType" ADD VALUE 'TRACK_RECORD_MILESTONE_CROSSED';

-- AlterEnum
ALTER TYPE "core"."NotificationType" ADD VALUE 'TRACK_RECORD_MILESTONE';

-- CreateEnum
CREATE TYPE "evaluation"."TrackRecordMilestoneType" AS ENUM ('CONSISTENCY', 'DURATION', 'VOLUME', 'CROSS_DOMAIN', 'CUSTOM');

-- CreateTable
CREATE TABLE "evaluation"."track_record_evaluations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contributor_id" UUID NOT NULL,
    "evaluation_period_start" TIMESTAMP(3) NOT NULL,
    "evaluation_period_end" TIMESTAMP(3) NOT NULL,
    "consistency_score" DECIMAL(5,2) NOT NULL,
    "engagement_duration_months" INTEGER NOT NULL,
    "contribution_count" INTEGER NOT NULL,
    "domain_breadth" INTEGER NOT NULL,
    "active_weeks_ratio" DECIMAL(3,2) NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "track_record_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation"."track_record_milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contributor_id" UUID NOT NULL,
    "milestone_type" "evaluation"."TrackRecordMilestoneType" NOT NULL,
    "threshold_name" TEXT NOT NULL,
    "threshold_config_snapshot" JSONB NOT NULL,
    "crossed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "track_record_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_track_record_evals_contributor_computed" ON "evaluation"."track_record_evaluations"("contributor_id", "computed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_track_record_evals_computed" ON "evaluation"."track_record_evaluations"("computed_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_track_record_milestones_contributor_type_name" ON "evaluation"."track_record_milestones"("contributor_id", "milestone_type", "threshold_name");

-- CreateIndex
CREATE INDEX "idx_track_record_milestones_contributor_crossed" ON "evaluation"."track_record_milestones"("contributor_id", "crossed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_track_record_milestones_type" ON "evaluation"."track_record_milestones"("milestone_type");

-- AddForeignKey
ALTER TABLE "evaluation"."track_record_evaluations" ADD CONSTRAINT "track_record_evaluations_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation"."track_record_milestones" ADD CONSTRAINT "track_record_milestones_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
