-- Add task linkage to contributions
ALTER TABLE "core"."contributions"
ADD COLUMN "task_id" UUID;

-- Index for contribution -> task lookups
CREATE INDEX "contributions_task_id_idx" ON "core"."contributions"("task_id");

-- Foreign key for optional task linkage
ALTER TABLE "core"."contributions"
ADD CONSTRAINT "contributions_task_id_fkey"
FOREIGN KEY ("task_id") REFERENCES "core"."tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
