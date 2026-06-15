-- CreateEnum
CREATE TYPE "core"."NewspaperEditionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "core"."NewspaperItemSourceType" AS ENUM ('PRIZE_AWARDED', 'TRACK_RECORD_MILESTONE', 'PEER_NOMINATION_RECEIVED', 'CONTRIBUTION_EVALUATED', 'CROSS_DOMAIN_COLLABORATION', 'CUSTOM');

-- AlterEnum
ALTER TYPE "core"."ActivityEventType" ADD VALUE 'NEWSPAPER_EDITION_PUBLISHED';

-- AlterEnum
ALTER TYPE "core"."NotificationType" ADD VALUE 'NEWSPAPER_EDITION_PUBLISHED';

-- CreateTable
CREATE TABLE "core"."newspaper_editions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "edition_number" INTEGER NOT NULL,
    "status" "core"."NewspaperEditionStatus" NOT NULL DEFAULT 'DRAFT',
    "temporal_span_start" TIMESTAMP(3) NOT NULL,
    "temporal_span_end" TIMESTAMP(3) NOT NULL,
    "event_count" INTEGER NOT NULL DEFAULT 0,
    "event_density" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "significance_distribution" JSONB NOT NULL,
    "reference_scale_metadata" JSONB NOT NULL,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newspaper_editions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."newspaper_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "edition_id" UUID NOT NULL,
    "source_event_type" "core"."NewspaperItemSourceType" NOT NULL,
    "source_event_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "chatham_house_label" TEXT NOT NULL,
    "significance_score" INTEGER NOT NULL,
    "algorithmic_rank" INTEGER NOT NULL,
    "editorial_rank_override" INTEGER,
    "community_vote_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newspaper_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "newspaper_editions_edition_number_key" ON "core"."newspaper_editions"("edition_number");

-- CreateIndex
CREATE INDEX "idx_newspaper_editions_status" ON "core"."newspaper_editions"("status");

-- CreateIndex
CREATE INDEX "idx_newspaper_editions_number_desc" ON "core"."newspaper_editions"("edition_number" DESC);

-- CreateIndex
CREATE INDEX "idx_newspaper_editions_temporal_span" ON "core"."newspaper_editions"("temporal_span_start", "temporal_span_end");

-- CreateIndex
CREATE INDEX "idx_newspaper_items_edition_rank" ON "core"."newspaper_items"("edition_id", "algorithmic_rank");

-- CreateIndex
CREATE INDEX "idx_newspaper_items_channel" ON "core"."newspaper_items"("channel_id");

-- CreateIndex
CREATE INDEX "idx_newspaper_items_edition_channel" ON "core"."newspaper_items"("edition_id", "channel_id");

-- CreateIndex
CREATE INDEX "idx_newspaper_items_source_event" ON "core"."newspaper_items"("source_event_id");

-- CreateIndex
CREATE INDEX "idx_newspaper_items_significance" ON "core"."newspaper_items"("significance_score" DESC);

-- AddCheckConstraint (NP-NFR1: discrete integer tiers 1-5 only)
ALTER TABLE "core"."newspaper_items"
  ADD CONSTRAINT "chk_newspaper_items_significance_score"
  CHECK ("significance_score" >= 1 AND "significance_score" <= 5);

-- AddForeignKey
ALTER TABLE "core"."newspaper_items" ADD CONSTRAINT "newspaper_items_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "core"."newspaper_editions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."newspaper_items" ADD CONSTRAINT "newspaper_items_source_event_id_fkey" FOREIGN KEY ("source_event_id") REFERENCES "core"."activity_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."newspaper_items" ADD CONSTRAINT "newspaper_items_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "core"."channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
