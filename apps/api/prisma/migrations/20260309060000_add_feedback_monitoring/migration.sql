-- CreateTable
CREATE TABLE "core"."platform_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

-- AddForeignKey
ALTER TABLE "core"."platform_settings" ADD CONSTRAINT "platform_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "core"."contributors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterEnum
ALTER TYPE "core"."ActivityEventType" ADD VALUE IF NOT EXISTS 'FEEDBACK_REASSIGNED';

-- Seed default SLA setting
INSERT INTO "core"."platform_settings" ("key", "value", "updated_at")
VALUES ('feedback.sla.hours', '48', CURRENT_TIMESTAMP);
