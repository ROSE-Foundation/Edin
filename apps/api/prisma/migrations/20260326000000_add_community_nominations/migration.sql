-- CreateEnum
CREATE TYPE "core"."NominationStatus" AS ENUM ('OPEN', 'AWARDED', 'EXPIRED', 'WITHDRAWN');

-- AlterEnum
ALTER TYPE "core"."ActivityEventType" ADD VALUE 'PEER_NOMINATION_RECEIVED';
ALTER TYPE "core"."NotificationType" ADD VALUE 'PEER_NOMINATION_RECEIVED';

-- CreateTable
CREATE TABLE "core"."community_nominations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nominator_id" UUID NOT NULL,
    "nominee_id" UUID NOT NULL,
    "prize_category_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "rationale" TEXT NOT NULL,
    "status" "core"."NominationStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_nominations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_community_nominations_nominee_status" ON "core"."community_nominations"("nominee_id", "status");

-- CreateIndex
CREATE INDEX "idx_community_nominations_cooldown" ON "core"."community_nominations"("nominator_id", "nominee_id", "prize_category_id");

-- CreateIndex
CREATE INDEX "idx_community_nominations_expiry" ON "core"."community_nominations"("status", "expires_at");

-- AddForeignKey
ALTER TABLE "core"."community_nominations" ADD CONSTRAINT "community_nominations_nominator_id_fkey" FOREIGN KEY ("nominator_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."community_nominations" ADD CONSTRAINT "community_nominations_nominee_id_fkey" FOREIGN KEY ("nominee_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."community_nominations" ADD CONSTRAINT "community_nominations_prize_category_id_fkey" FOREIGN KEY ("prize_category_id") REFERENCES "core"."prize_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."community_nominations" ADD CONSTRAINT "community_nominations_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "core"."channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
