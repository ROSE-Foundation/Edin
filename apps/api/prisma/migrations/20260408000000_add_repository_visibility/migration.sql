-- CreateEnum
CREATE TYPE "core"."RepositoryVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'UNKNOWN');

-- AlterTable
ALTER TABLE "core"."monitored_repositories"
    ADD COLUMN "visibility" "core"."RepositoryVisibility" NOT NULL DEFAULT 'UNKNOWN';
