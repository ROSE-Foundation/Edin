-- CreateEnum
CREATE TYPE "core"."NotificationType" AS ENUM (
  'EVALUATION_COMPLETED',
  'PEER_FEEDBACK_AVAILABLE',
  'ANNOUNCEMENT_POSTED',
  'CONTRIBUTION_TO_DOMAIN',
  'TASK_ASSIGNED',
  'ARTICLE_FEEDBACK',
  'ARTICLE_PUBLISHED'
);

-- CreateTable
CREATE TABLE "core"."notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "contributor_id" UUID NOT NULL,
  "type" "core"."NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "entity_id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "read_at" TIMESTAMP(3),

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_notifications_contributor_unread" ON "core"."notifications"("contributor_id", "read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_notifications_contributor_created" ON "core"."notifications"("contributor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_notifications_contributor_category" ON "core"."notifications"("contributor_id", "category", "read");

-- AddForeignKey
ALTER TABLE "core"."notifications" ADD CONSTRAINT "notifications_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
