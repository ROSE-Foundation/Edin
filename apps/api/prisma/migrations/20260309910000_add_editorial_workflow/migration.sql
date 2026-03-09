-- CreateEnum
CREATE TYPE "publication"."EditorialDecision" AS ENUM ('APPROVE', 'REQUEST_REVISIONS', 'REJECT');

-- CreateTable
CREATE TABLE "publication"."editorial_feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "editor_id" UUID NOT NULL,
    "decision" "publication"."EditorialDecision" NOT NULL,
    "overall_assessment" TEXT NOT NULL,
    "revision_requests" JSONB,
    "article_version" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "editorial_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication"."inline_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "feedback_id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "editor_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "highlight_start" INTEGER NOT NULL,
    "highlight_end" INTEGER NOT NULL,
    "article_version" INTEGER NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inline_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_editorial_feedback_article_id" ON "publication"."editorial_feedback"("article_id");

-- CreateIndex
CREATE INDEX "idx_inline_comments_article_id_version" ON "publication"."inline_comments"("article_id", "article_version");

-- CreateIndex
CREATE INDEX "idx_articles_editor_id_status" ON "publication"."articles"("editor_id", "status");

-- AddForeignKey
ALTER TABLE "publication"."editorial_feedback" ADD CONSTRAINT "editorial_feedback_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "publication"."articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."editorial_feedback" ADD CONSTRAINT "editorial_feedback_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."inline_comments" ADD CONSTRAINT "inline_comments_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "publication"."editorial_feedback"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."inline_comments" ADD CONSTRAINT "inline_comments_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "publication"."articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."inline_comments" ADD CONSTRAINT "inline_comments_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
