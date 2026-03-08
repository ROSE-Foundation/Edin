-- CreateEnum
CREATE TYPE "core"."TaskStatus" AS ENUM ('AVAILABLE', 'CLAIMED', 'IN_PROGRESS', 'COMPLETED', 'EVALUATED', 'RETIRED');

-- CreateEnum
CREATE TYPE "core"."TaskDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateTable
CREATE TABLE "core"."tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "domain" "core"."ContributorDomain" NOT NULL,
    "difficulty" "core"."TaskDifficulty" NOT NULL,
    "estimated_effort" TEXT NOT NULL,
    "status" "core"."TaskStatus" NOT NULL DEFAULT 'AVAILABLE',
    "claimed_by_id" UUID,
    "claimed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_tasks_domain_status" ON "core"."tasks"("domain", "status");

-- CreateIndex
CREATE INDEX "idx_tasks_claimed_by_id" ON "core"."tasks"("claimed_by_id");

-- CreateIndex
CREATE INDEX "idx_tasks_status" ON "core"."tasks"("status");

-- CreateIndex
CREATE INDEX "idx_tasks_created_by_id" ON "core"."tasks"("created_by_id");

-- AddForeignKey
ALTER TABLE "core"."tasks" ADD CONSTRAINT "tasks_claimed_by_id_fkey" FOREIGN KEY ("claimed_by_id") REFERENCES "core"."contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."tasks" ADD CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
