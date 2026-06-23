-- Email/password authentication: password hash on contributors + setup-token table.
ALTER TABLE "core"."contributors" ADD COLUMN "password_hash" TEXT;

CREATE TABLE "core"."password_setup_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contributor_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_setup_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_setup_tokens_token_hash_key" ON "core"."password_setup_tokens"("token_hash");
CREATE INDEX "password_setup_tokens_contributor_id_idx" ON "core"."password_setup_tokens"("contributor_id");

ALTER TABLE "core"."password_setup_tokens"
  ADD CONSTRAINT "password_setup_tokens_contributor_id_fkey"
  FOREIGN KEY ("contributor_id") REFERENCES "core"."contributors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
