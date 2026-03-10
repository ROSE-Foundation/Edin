-- CreateTable
CREATE TABLE "publication"."article_views" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referral_source" TEXT,
    "time_on_page_seconds" INTEGER,
    "scroll_depth_percent" INTEGER,
    "visitor_hash" VARCHAR(16) NOT NULL,

    CONSTRAINT "article_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication"."article_reward_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "evaluation_id" UUID,
    "composite_score" DECIMAL(5,2),
    "author_id" UUID NOT NULL,
    "editor_id" UUID,
    "author_share_percent" INTEGER NOT NULL DEFAULT 80,
    "editor_share_percent" INTEGER NOT NULL DEFAULT 20,
    "allocated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "article_reward_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_article_views_article_viewed_at" ON "publication"."article_views"("article_id", "viewed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_article_views_dedup" ON "publication"."article_views"("article_id", "visitor_hash");

-- CreateIndex
CREATE UNIQUE INDEX "article_reward_allocations_article_id_key" ON "publication"."article_reward_allocations"("article_id");

-- CreateIndex
CREATE INDEX "idx_article_reward_author" ON "publication"."article_reward_allocations"("author_id");

-- CreateIndex
CREATE INDEX "idx_article_reward_editor" ON "publication"."article_reward_allocations"("editor_id");

-- AddForeignKey
ALTER TABLE "publication"."article_views" ADD CONSTRAINT "article_views_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "publication"."articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."article_reward_allocations" ADD CONSTRAINT "article_reward_allocations_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "publication"."articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."article_reward_allocations" ADD CONSTRAINT "article_reward_allocations_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication"."article_reward_allocations" ADD CONSTRAINT "article_reward_allocations_editor_id_fkey" FOREIGN KEY ("editor_id") REFERENCES "core"."contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
