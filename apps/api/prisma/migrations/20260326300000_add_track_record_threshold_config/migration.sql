-- CreateTable
CREATE TABLE "evaluation"."track_record_threshold_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "milestone_type" "evaluation"."TrackRecordMilestoneType" NOT NULL,
    "threshold_name" TEXT NOT NULL,
    "threshold_rules" JSONB NOT NULL,
    "outcome_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "track_record_threshold_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_threshold_config_type_name" ON "evaluation"."track_record_threshold_config"("milestone_type", "threshold_name");

-- CreateIndex
CREATE INDEX "idx_threshold_config_active" ON "evaluation"."track_record_threshold_config"("is_active");

-- Seed milestone thresholds
INSERT INTO "evaluation"."track_record_threshold_config" ("id", "milestone_type", "threshold_name", "threshold_rules", "outcome_type", "is_active", "created_at") VALUES
(gen_random_uuid(), 'DURATION', '3-month active contributor', '{"conditions":[{"field":"engagement_duration_months","operator":">=","value":3},{"field":"active_weeks_ratio","operator":">=","value":0.6}]}', 'ROLE_ELIGIBILITY', true, now()),
(gen_random_uuid(), 'DURATION', '6-month consistent contributor', '{"conditions":[{"field":"engagement_duration_months","operator":">=","value":6},{"field":"active_weeks_ratio","operator":">=","value":0.7}]}', 'ROLE_ELIGIBILITY', true, now()),
(gen_random_uuid(), 'DURATION', '12-month sustained contributor', '{"conditions":[{"field":"engagement_duration_months","operator":">=","value":12},{"field":"active_weeks_ratio","operator":">=","value":0.6}]}', 'SALARY_TIER', true, now()),
(gen_random_uuid(), 'CROSS_DOMAIN', 'Multi-domain contributor', '{"conditions":[{"field":"domain_breadth","operator":">=","value":2},{"field":"contribution_count","operator":">=","value":10}]}', 'SERVICE_ACCESS', true, now()),
(gen_random_uuid(), 'VOLUME', 'Century contributor', '{"conditions":[{"field":"contribution_count","operator":">=","value":100}]}', 'INVITATION', true, now());
