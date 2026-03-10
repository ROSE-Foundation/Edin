-- CreateEnum
CREATE TYPE "evaluation"."TemporalHorizon" AS ENUM ('SESSION', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "evaluation"."ScoreTrend" AS ENUM ('RISING', 'STABLE', 'DECLINING');

-- CreateTable
CREATE TABLE "evaluation"."scoring_formula_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version" SERIAL NOT NULL,
    "ai_eval_weight" DECIMAL(3,2) NOT NULL DEFAULT 0.40,
    "peer_feedback_weight" DECIMAL(3,2) NOT NULL DEFAULT 0.25,
    "complexity_weight" DECIMAL(3,2) NOT NULL DEFAULT 0.20,
    "domain_norm_weight" DECIMAL(3,2) NOT NULL DEFAULT 0.15,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "created_by" UUID NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scoring_formula_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation"."contribution_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contribution_id" UUID NOT NULL,
    "contributor_id" UUID NOT NULL,
    "composite_score" DECIMAL(5,2) NOT NULL,
    "ai_eval_score" DECIMAL(5,2) NOT NULL,
    "peer_feedback_score" DECIMAL(5,2),
    "complexity_multiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "domain_norm_factor" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "formula_version_id" UUID NOT NULL,
    "raw_inputs" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contribution_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation"."temporal_score_aggregates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contributor_id" UUID NOT NULL,
    "horizon" "evaluation"."TemporalHorizon" NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "aggregated_score" DECIMAL(5,2) NOT NULL,
    "contribution_count" INTEGER NOT NULL DEFAULT 0,
    "trend" "evaluation"."ScoreTrend" NOT NULL DEFAULT 'STABLE',
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temporal_score_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contribution_scores_contribution_id_key" ON "evaluation"."contribution_scores"("contribution_id");

-- CreateIndex
CREATE INDEX "idx_contribution_scores_contributor_created" ON "evaluation"."contribution_scores"("contributor_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "temporal_score_aggregates_contributor_horizon_period_key" ON "evaluation"."temporal_score_aggregates"("contributor_id", "horizon", "period_start");

-- CreateIndex
CREATE INDEX "idx_temporal_aggregates_contributor_horizon_period" ON "evaluation"."temporal_score_aggregates"("contributor_id", "horizon", "period_start" DESC);

-- AddForeignKey
ALTER TABLE "evaluation"."contribution_scores" ADD CONSTRAINT "contribution_scores_formula_version_id_fkey" FOREIGN KEY ("formula_version_id") REFERENCES "evaluation"."scoring_formula_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
