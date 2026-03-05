-- AlterTable
ALTER TABLE "core"."contributors" ADD COLUMN "buddy_opt_in" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "core"."buddy_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contributor_id" UUID NOT NULL,
    "buddy_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "buddy_assignments_pkey" PRIMARY KEY ("id")
);

-- Ensure at most one active assignment per contributor
CREATE UNIQUE INDEX "buddy_assignments_one_active_per_contributor"
ON "core"."buddy_assignments" ("contributor_id")
WHERE "is_active" = true;

-- AddForeignKey
ALTER TABLE "core"."buddy_assignments" ADD CONSTRAINT "buddy_assignments_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."buddy_assignments" ADD CONSTRAINT "buddy_assignments_buddy_id_fkey" FOREIGN KEY ("buddy_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
