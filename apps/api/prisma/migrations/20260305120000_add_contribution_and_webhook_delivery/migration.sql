-- CreateEnum
CREATE TYPE "core"."ContributionSource" AS ENUM ('GITHUB');

-- CreateEnum
CREATE TYPE "core"."ContributionType" AS ENUM ('COMMIT', 'PULL_REQUEST', 'CODE_REVIEW');

-- CreateEnum
CREATE TYPE "core"."ContributionStatus" AS ENUM ('INGESTED', 'ATTRIBUTED', 'EVALUATED');

-- CreateEnum
CREATE TYPE "core"."WebhookDeliveryStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "core"."contributions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contributor_id" UUID,
    "repository_id" UUID NOT NULL,
    "source" "core"."ContributionSource" NOT NULL DEFAULT 'GITHUB',
    "source_ref" TEXT NOT NULL,
    "contribution_type" "core"."ContributionType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "raw_data" JSONB NOT NULL,
    "normalized_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "core"."ContributionStatus" NOT NULL DEFAULT 'INGESTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."webhook_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "delivery_id" TEXT NOT NULL,
    "repository_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "status" "core"."WebhookDeliveryStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contributions_contributor_created_idx" ON "core"."contributions"("contributor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "contributions_repo_type_idx" ON "core"."contributions"("repository_id", "contribution_type");

-- CreateIndex
CREATE UNIQUE INDEX "contributions_source_repo_ref_key" ON "core"."contributions"("source", "repository_id", "source_ref");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_deliveries_delivery_id_key" ON "core"."webhook_deliveries"("delivery_id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_repo_idx" ON "core"."webhook_deliveries"("repository_id");

-- AddForeignKey
ALTER TABLE "core"."contributions" ADD CONSTRAINT "contributions_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "core"."contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."contributions" ADD CONSTRAINT "contributions_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "core"."monitored_repositories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "core"."monitored_repositories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
