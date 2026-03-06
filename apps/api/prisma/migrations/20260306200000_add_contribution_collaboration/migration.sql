-- CreateEnum
CREATE TYPE "core"."CollaborationRole" AS ENUM ('PRIMARY_AUTHOR', 'CO_AUTHOR', 'COMMITTER', 'ISSUE_ASSIGNEE');

-- CreateEnum
CREATE TYPE "core"."CollaborationStatus" AS ENUM ('DETECTED', 'CONFIRMED', 'DISPUTED', 'OVERRIDDEN');

-- CreateTable
CREATE TABLE "core"."contribution_collaborations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contribution_id" UUID NOT NULL,
    "contributor_id" UUID NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "role" "core"."CollaborationRole" NOT NULL,
    "split_percentage" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "status" "core"."CollaborationStatus" NOT NULL DEFAULT 'DETECTED',
    "detection_source" TEXT NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "dispute_comment" TEXT,
    "overridden_by_id" UUID,
    "override_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contribution_collaborations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contribution_collaborations_current_key" ON "core"."contribution_collaborations"("contribution_id", "contributor_id", "is_current");

-- CreateIndex
CREATE INDEX "idx_contribution_collaborations_contribution" ON "core"."contribution_collaborations"("contribution_id");

-- CreateIndex
CREATE INDEX "idx_contribution_collaborations_contributor" ON "core"."contribution_collaborations"("contributor_id");

-- CreateIndex
CREATE INDEX "idx_contribution_collaborations_current" ON "core"."contribution_collaborations"("contribution_id", "is_current");

-- CreateIndex
CREATE INDEX "idx_contribution_collaborations_status" ON "core"."contribution_collaborations"("status");

-- AddForeignKey
ALTER TABLE "core"."contribution_collaborations" ADD CONSTRAINT "contribution_collaborations_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "core"."contributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."contribution_collaborations" ADD CONSTRAINT "contribution_collaborations_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."contribution_collaborations" ADD CONSTRAINT "contribution_collaborations_overridden_by_id_fkey" FOREIGN KEY ("overridden_by_id") REFERENCES "core"."contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
