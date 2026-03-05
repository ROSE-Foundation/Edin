-- CreateEnum
CREATE TYPE "core"."OnboardingMilestoneType" AS ENUM ('ACCOUNT_ACTIVATED', 'BUDDY_ASSIGNED', 'FIRST_TASK_VIEWED', 'FIRST_TASK_CLAIMED', 'FIRST_CONTRIBUTION_SUBMITTED');

-- CreateTable
CREATE TABLE "core"."onboarding_milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contributor_id" UUID NOT NULL,
    "milestone_type" "core"."OnboardingMilestoneType" NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "onboarding_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_milestones_contributor_type_key" ON "core"."onboarding_milestones"("contributor_id", "milestone_type");

-- AddForeignKey
ALTER TABLE "core"."onboarding_milestones" ADD CONSTRAINT "onboarding_milestones_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
