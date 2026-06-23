-- Nurea TV applications have no micro-task: allow micro_task_domain / micro_task_response to be NULL.
ALTER TABLE "core"."applications" ALTER COLUMN "micro_task_domain" DROP NOT NULL;
ALTER TABLE "core"."applications" ALTER COLUMN "micro_task_response" DROP NOT NULL;
