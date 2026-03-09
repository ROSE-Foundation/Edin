-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "evaluation";

-- CreateEnum
CREATE TYPE "evaluation"."EvaluationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "evaluation"."EvaluationModelStatus" AS ENUM ('ACTIVE', 'DEPRECATED', 'RETIRED');

-- CreateTable
CREATE TABLE "evaluation"."evaluation_models" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "config" JSONB,
    "status" "evaluation"."EvaluationModelStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation"."evaluations" (
    "id" UUID NOT NULL,
    "contribution_id" UUID NOT NULL,
    "contributor_id" UUID NOT NULL,
    "model_id" UUID,
    "status" "evaluation"."EvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "composite_score" DECIMAL(5,2),
    "dimension_scores" JSONB,
    "narrative" TEXT,
    "formula_version" TEXT,
    "raw_inputs" JSONB,
    "metadata" JSONB,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_models_name_version_key" ON "evaluation"."evaluation_models"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_contribution_id_key" ON "evaluation"."evaluations"("contribution_id");

-- CreateIndex
CREATE INDEX "idx_evaluations_contributor_created" ON "evaluation"."evaluations"("contributor_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_evaluations_status" ON "evaluation"."evaluations"("status");

-- AddForeignKey
ALTER TABLE "evaluation"."evaluations" ADD CONSTRAINT "evaluations_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "core"."contributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation"."evaluations" ADD CONSTRAINT "evaluations_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation"."evaluations" ADD CONSTRAINT "evaluations_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "evaluation"."evaluation_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: Insert default code evaluation model
INSERT INTO "evaluation"."evaluation_models" ("id", "name", "version", "provider", "config", "status", "created_at")
VALUES (
    gen_random_uuid(),
    'code-evaluator',
    'v1.0.0',
    'anthropic',
    '{"modelId": "claude-sonnet-4-5-20250514", "promptVersion": "code-eval-v1"}'::jsonb,
    'ACTIVE',
    CURRENT_TIMESTAMP
);
