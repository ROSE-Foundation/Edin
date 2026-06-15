-- AlterEnum
ALTER TYPE "core"."ActivityEventType" ADD VALUE 'NOMINATION_VOTE_CAST';

-- CreateTable
CREATE TABLE "core"."nomination_votes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nomination_id" UUID NOT NULL,
    "voter_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nomination_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_nomination_votes_nomination_voter" ON "core"."nomination_votes"("nomination_id", "voter_id");

-- CreateIndex
CREATE INDEX "idx_nomination_votes_nomination" ON "core"."nomination_votes"("nomination_id");

-- CreateIndex
CREATE INDEX "idx_nomination_votes_voter" ON "core"."nomination_votes"("voter_id");

-- AddForeignKey
ALTER TABLE "core"."nomination_votes" ADD CONSTRAINT "nomination_votes_nomination_id_fkey" FOREIGN KEY ("nomination_id") REFERENCES "core"."community_nominations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."nomination_votes" ADD CONSTRAINT "nomination_votes_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
