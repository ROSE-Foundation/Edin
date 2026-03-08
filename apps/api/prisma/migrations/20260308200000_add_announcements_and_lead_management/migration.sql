-- Add sort_order to tasks for priority ordering
ALTER TABLE "core"."tasks"
ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- Add lead_contributor_id to working_groups for explicit WG Lead assignment
ALTER TABLE "core"."working_groups"
ADD COLUMN "lead_contributor_id" UUID;

-- Create announcements table
CREATE TABLE "core"."announcements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "working_group_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- Index for announcements by working group, ordered by created_at DESC
CREATE INDEX "idx_announcements_working_group_id_created_at" ON "core"."announcements"("working_group_id", "created_at" DESC);

-- Index for tasks by domain and sort_order
CREATE INDEX "idx_tasks_domain_sort_order" ON "core"."tasks"("domain", "sort_order");

-- Foreign key: working_groups.lead_contributor_id -> contributors.id
ALTER TABLE "core"."working_groups"
ADD CONSTRAINT "working_groups_lead_contributor_id_fkey"
FOREIGN KEY ("lead_contributor_id") REFERENCES "core"."contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign key: announcements.working_group_id -> working_groups.id
ALTER TABLE "core"."announcements"
ADD CONSTRAINT "announcements_working_group_id_fkey"
FOREIGN KEY ("working_group_id") REFERENCES "core"."working_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign key: announcements.author_id -> contributors.id
ALTER TABLE "core"."announcements"
ADD CONSTRAINT "announcements_author_id_fkey"
FOREIGN KEY ("author_id") REFERENCES "core"."contributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
