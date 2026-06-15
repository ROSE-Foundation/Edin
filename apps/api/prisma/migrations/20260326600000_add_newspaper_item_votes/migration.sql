-- CreateTable
CREATE TABLE "core"."newspaper_item_votes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "newspaper_item_id" UUID NOT NULL,
    "voter_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newspaper_item_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_newspaper_item_votes_item_voter" ON "core"."newspaper_item_votes"("newspaper_item_id", "voter_id");

-- CreateIndex
CREATE INDEX "idx_newspaper_item_votes_item_id" ON "core"."newspaper_item_votes"("newspaper_item_id");

-- CreateIndex
CREATE INDEX "idx_newspaper_item_votes_voter_id" ON "core"."newspaper_item_votes"("voter_id");

-- AddForeignKey
ALTER TABLE "core"."newspaper_item_votes" ADD CONSTRAINT "newspaper_item_votes_newspaper_item_id_fkey" FOREIGN KEY ("newspaper_item_id") REFERENCES "core"."newspaper_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."newspaper_item_votes" ADD CONSTRAINT "newspaper_item_votes_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
