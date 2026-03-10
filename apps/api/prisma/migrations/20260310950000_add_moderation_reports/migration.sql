-- CreateTable
CREATE TABLE "publication"."moderation_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "plagiarism_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ai_content_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "flag_type" VARCHAR(50),
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagged_passages" JSONB,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "admin_id" UUID,
    "admin_action" VARCHAR(50),
    "admin_reason" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_moderation_reports_article_id" ON "publication"."moderation_reports"("article_id");

-- CreateIndex
CREATE INDEX "idx_moderation_reports_flagged_status" ON "publication"."moderation_reports"("is_flagged", "status");

-- AddForeignKey
ALTER TABLE "publication"."moderation_reports" ADD CONSTRAINT "moderation_reports_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "publication"."articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."moderation_reports" ADD CONSTRAINT "moderation_reports_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "core"."contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
