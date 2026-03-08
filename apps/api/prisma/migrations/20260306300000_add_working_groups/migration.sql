-- CreateTable
CREATE TABLE "core"."working_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "domain" "core"."ContributorDomain" NOT NULL,
    "accent_color" TEXT NOT NULL,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "working_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."working_group_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "working_group_id" UUID NOT NULL,
    "contributor_id" UUID NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "working_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "working_groups_name_key" ON "core"."working_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "working_groups_domain_key" ON "core"."working_groups"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "working_group_members_group_contributor_key" ON "core"."working_group_members"("working_group_id", "contributor_id");

-- CreateIndex
CREATE INDEX "idx_working_group_members_contributor_id" ON "core"."working_group_members"("contributor_id");

-- CreateIndex
CREATE INDEX "idx_working_group_members_working_group_id" ON "core"."working_group_members"("working_group_id");

-- AddForeignKey
ALTER TABLE "core"."working_group_members" ADD CONSTRAINT "working_group_members_working_group_id_fkey" FOREIGN KEY ("working_group_id") REFERENCES "core"."working_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."working_group_members" ADD CONSTRAINT "working_group_members_contributor_id_fkey" FOREIGN KEY ("contributor_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
