-- CreateEnum
CREATE TYPE "core"."ActivityEventType" AS ENUM ('CONTRIBUTION_NEW', 'EVALUATION_COMPLETED', 'ANNOUNCEMENT_CREATED', 'MEMBER_JOINED', 'TASK_COMPLETED');

-- CreateTable
CREATE TABLE "core"."activity_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_type" "core"."ActivityEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contributor_id" UUID NOT NULL,
    "domain" "core"."ContributorDomain" NOT NULL,
    "contribution_type" "core"."ContributionType",
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_activity_events_created_at" ON "core"."activity_events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_activity_events_domain_created_at" ON "core"."activity_events"("domain", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_activity_events_contributor_id" ON "core"."activity_events"("contributor_id");

-- AddForeignKey
ALTER TABLE "core"."activity_events" ADD CONSTRAINT "activity_events_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
