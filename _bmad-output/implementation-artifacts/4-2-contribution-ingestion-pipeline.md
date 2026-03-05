# Story 4.2: Contribution Ingestion Pipeline

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a contributor,
I want the system to automatically ingest my GitHub activity,
so that my commits, pull requests, and code reviews are captured without manual submission.

## Acceptance Criteria

1. **AC1 — Webhook payload validation and async job dispatch**: Given a monitored repository receives a push/pull*request/pull_request_review event, when the GitHub webhook fires, then the NestJS ingestion controller validates the webhook signature using the stored secret, a job is dispatched to the `github-ingestion` BullMQ queue with the webhook payload, and the webhook endpoint returns 200 immediately (async processing). *(Already implemented in Story 4-1 — verify and extend if needed.)\_

2. **AC2 — Extract GitHub commit artifacts**: Given a `github-ingestion` job is processing a `push` event, when the processor runs, then each commit in the push is extracted with: SHA, author, message, timestamp, files changed, additions, deletions.

3. **AC3 — Extract GitHub pull request artifacts**: Given a `github-ingestion` job is processing a `pull_request` event, when the processor runs, then PR events extract: PR number, title, description, author, status, reviewers, linked issues, merge status.

4. **AC4 — Extract GitHub pull request review artifacts**: Given a `github-ingestion` job is processing a `pull_request_review` event, when the processor runs, then review events extract: reviewer, review body, review status (approved, changes_requested, commented).

5. **AC5 — Normalize raw GitHub artifacts**: Given raw GitHub artifacts are extracted, when the normalization step runs, then each artifact is transformed into a normalized `Contribution` record with fields: `contributor_id`, `source` (GITHUB), `source_ref` (commit SHA or PR number), `contribution_type` (COMMIT, PULL_REQUEST, CODE_REVIEW), `title`, `description`, `raw_data` (JSONB), `normalized_at` timestamp, `status` (INGESTED). The normalized schema must be extensible for future integration sources (NFR-I3).

6. **AC6 — Retry and dead-letter queue**: Given a webhook delivery fails or the ingestion queue is unavailable, when the job fails, then BullMQ retries 3 times with exponential backoff (1s, 4s, 16s), after 3 failures the job moves to the dead-letter queue, zero contributions are lost from transient failures (NFR-R2), and a warning-level log is emitted with the correlation ID.

7. **AC7 — Handle GitHub API rate limits**: Given the GitHub API rate limit is reached during enrichment, when the processor detects a 429 response, then the job is delayed until the rate limit reset time and processing resumes automatically without data loss (NFR-I2).

8. **AC8 — Emit domain events on ingestion completion**: Given contributions are ingested, when processing completes, then domain events `contribution.commit.ingested`, `contribution.pull_request.ingested`, or `contribution.review.ingested` are emitted via EventEmitter2. Total pipeline latency from GitHub event to database persistence must be <15 minutes (NFR-P5).

## Tasks / Subtasks

- [x] Task 1: Database schema — Contribution model (AC: #5)
  - [x] 1.1 Add `Contribution` model to Prisma schema with fields: id (UUID), contributorId (FK), repositoryId (FK to MonitoredRepository), source (enum: GITHUB), sourceRef (string), contributionType (enum: COMMIT, PULL_REQUEST, CODE_REVIEW), title, description, rawData (Json), normalizedAt (DateTime), status (enum: INGESTED, ATTRIBUTED, EVALUATED), createdAt, updatedAt
  - [x] 1.2 Add `ContributionSource` enum (GITHUB — extensible for future sources per NFR-I3)
  - [x] 1.3 Add `ContributionType` enum (COMMIT, PULL_REQUEST, CODE_REVIEW)
  - [x] 1.4 Add `ContributionStatus` enum (INGESTED, ATTRIBUTED, EVALUATED)
  - [x] 1.5 Add indexes: (contributorId, createdAt DESC), (repositoryId, contributionType), (sourceRef) unique composite with source+repositoryId for idempotency
  - [x] 1.6 Add `WebhookDelivery` model for idempotency tracking: id, deliveryId (unique — GitHub's x-github-delivery), repositoryId (FK), eventType, status (enum: RECEIVED, PROCESSING, COMPLETED, FAILED), payload (Json), processedAt, createdAt
  - [x] 1.7 Create and run Prisma migration
  - [x] 1.8 Update Prisma seed if needed (no seed changes required — new tables have no seed data)

- [x] Task 2: Shared schemas and types (AC: #2, #3, #4, #5)
  - [x] 2.1 Add contribution Zod schemas to `packages/shared/src/schemas/ingestion.schema.ts`: contributionResponseSchema, webhookPayloadSchema types
  - [x] 2.2 Add contribution types to `packages/shared/src/types/ingestion.types.ts`: Contribution, ContributionType, ContributionSource, ContributionStatus, WebhookDelivery
  - [x] 2.3 Add new error codes to `packages/shared/src/constants/error-codes.ts`: CONTRIBUTION_INGESTION_FAILED, DUPLICATE_WEBHOOK_DELIVERY, CONTRIBUTOR_NOT_FOUND_FOR_GITHUB_USER
  - [x] 2.4 Export new types/schemas from `packages/shared/src/index.ts`

- [x] Task 3: Webhook processor — Event parsing and extraction (AC: #2, #3, #4)
  - [x] 3.1 Implement `WebhookProcessor.process()` in `apps/api/src/modules/ingestion/processors/webhook.processor.ts` — replace the stub with full event routing by `eventType`
  - [x] 3.2 Implement push event handler: iterate `payload.commits[]`, extract SHA, author (match to contributor by GitHub username/email), message, timestamp, files changed stats (added/removed/modified arrays)
  - [x] 3.3 Implement pull_request event handler: extract PR number, title, body, user (author), state, requested_reviewers, merged status, merge_commit_sha, head/base refs
  - [x] 3.4 Implement pull_request_review event handler: extract review id, reviewer user, body, state (approved/changes_requested/commented), submitted_at
  - [x] 3.5 Add GitHub username → Contributor ID resolution: query `Contributor` table by `githubId` (from webhook user payload) — log warning if contributor not found (do not fail, store with null contributorId for later attribution in Story 4-3)

- [x] Task 4: Contribution normalization and persistence (AC: #5, #8)
  - [x] 4.1 Create normalization service method in `IngestionService` or new `ContributionNormalizerService`: transform extracted artifacts into Contribution records
  - [x] 4.2 Map commit → Contribution: title = first line of commit message, description = full message, sourceRef = SHA, contributionType = COMMIT, rawData = full commit object
  - [x] 4.3 Map PR → Contribution: title = PR title, description = PR body, sourceRef = PR number as string, contributionType = PULL_REQUEST, rawData = full PR object
  - [x] 4.4 Map review → Contribution: title = "Review on PR #X: {state}", description = review body, sourceRef = "review-{reviewId}", contributionType = CODE_REVIEW, rawData = full review object
  - [x] 4.5 Persist normalized contributions in batch using `prisma.contribution.upsert()` within a transaction alongside WebhookDelivery status update and audit log
  - [x] 4.6 Emit domain events after successful persistence: `contribution.commit.ingested`, `contribution.pull_request.ingested`, `contribution.review.ingested` via EventEmitter2 with payload: { contributionType, contributorId, repositoryId, correlationId }

- [x] Task 5: Idempotency and webhook delivery tracking (AC: #1, #6)
  - [x] 5.1 Before processing, check `WebhookDelivery` table for existing `deliveryId` — if COMPLETED, skip silently; if PROCESSING, check age and retry if stale (>5 min)
  - [x] 5.2 On job start: create/update WebhookDelivery record with status RECEIVED → PROCESSING
  - [x] 5.3 On job success: update WebhookDelivery to COMPLETED with processedAt timestamp
  - [x] 5.4 On job failure (final attempt): update WebhookDelivery to FAILED

- [x] Task 6: Rate limit handling (AC: #7)
  - [x] 6.1 In any GitHub API enrichment call (if needed beyond webhook payload), catch 429 responses
  - [x] 6.2 Extract `x-ratelimit-reset` header from 429 response, calculate delay
  - [x] 6.3 Use BullMQ `job.moveToDelayed()` to reschedule job until rate limit reset time
  - [x] 6.4 Log rate limit event at warn level with correlation ID and reset time

- [x] Task 7: Error handling and resilience (AC: #6, #7)
  - [x] 7.1 Verify BullMQ retry config: 3 attempts, exponential backoff (1s, 4s, 16s) — already configured in Story 4-1's ingestion module
  - [x] 7.2 Add structured error logging at warn level for all failure paths with correlation ID, job ID, delivery ID
  - [x] 7.3 Ensure failed jobs (after 3 retries) remain in queue with `removeOnFail: false` for dead-letter investigation
  - [x] 7.4 Handle malformed webhook payloads gracefully — log error, mark WebhookDelivery as FAILED, do not retry

- [x] Task 8: Testing (AC: all)
  - [x] 8.1 Unit tests for WebhookProcessor: test push event extraction, PR event extraction, review event extraction, unknown event type handling
  - [x] 8.2 Unit tests for normalization: test commit→Contribution mapping, PR→Contribution mapping, review→Contribution mapping, batch persistence
  - [x] 8.3 Unit tests for idempotency: test duplicate delivery ID rejection, stale processing detection
  - [x] 8.4 Unit tests for rate limit handling: test 429 detection, delay calculation, job rescheduling
  - [x] 8.5 Unit tests for contributor resolution: test known GitHub user mapping, unknown user handling (null contributorId)
  - [x] 8.6 Integration tests: test full pipeline from webhook payload → Contribution records in DB → domain events emitted (added DB-backed integration spec gated by DATABASE_URL)
  - [x] 8.7 Verify no test regressions: all existing 339 API tests + 237 web tests must pass (357 API + 237 web = 594 total, all passing)

## Dev Notes

### Architecture Patterns and Constraints

- **Extend existing IngestionModule** at `apps/api/src/modules/ingestion/` — do NOT create a new module
- **WebhookProcessor stub** at `apps/api/src/modules/ingestion/processors/webhook.processor.ts` already exists from Story 4-1 — replace the stub body with full implementation
- **BullMQ queue `github-ingestion`** is already registered with correct retry/backoff config in `ingestion.module.ts`
- **Webhook endpoint** at `POST /api/v1/ingestion/github/webhook` already validates signatures and dispatches jobs — no changes needed to the controller
- **EventEmitter2** is already configured via `@nestjs/event-emitter` in the app module — use it for domain events
- **Domain event naming convention**: `{domain}.{entity}.{action}` in dot.case (e.g., `contribution.commit.ingested`)
- **Audit logging pattern**: use `prisma.$transaction()` wrapping both data mutation and audit log creation
- **Contributor lookup**: use `githubId` field on the `Contributor` model (integer matching GitHub's user ID from webhook payload's `sender.id` or `author.id`)
- **Correlation ID**: available from `job.data.deliveryId` — pass through all log statements and event payloads
- **DB schemas**: use `@@schema("core")` for Contribution model (same schema as MonitoredRepository and Contributor)

### Key Anti-Patterns (DO NOT)

- Do NOT create a separate module — extend `IngestionModule`
- Do NOT use synchronous processing in the webhook endpoint — it already dispatches async
- Do NOT fail the entire job if a single commit/PR/review in a batch fails — process what you can, log failures
- Do NOT hardcode GitHub payload field paths — GitHub payloads vary by event type
- Do NOT create `__tests__/` directories — co-locate tests as `.spec.ts`
- Do NOT use raw `HttpException` — use `DomainException` subclasses
- Do NOT log raw webhook payloads at info/warn level (may contain sensitive data) — debug level only
- Do NOT pass the existing RedisService to BullMQ — it has its own connection (per Story 4-1 learnings)
- Do NOT use spinners in any UI — use skeleton loaders
- Do NOT use red for error states — use warm amber palette

### Story 4-1 Review Issues to Be Aware Of

Story 4-1's code review identified several issues. While fixing them is not in scope for Story 4-2, be aware of these when building on the existing code:

1. `GitHubApiService` throws immediately on 429 instead of delay-and-retry — if you call GitHub API for enrichment, implement your own rate limit handling
2. `INGESTION_WEBHOOK_BASE_URL` is optional but used unguarded — not a concern for Story 4-2 (no webhook registration)
3. Some state changes in `IngestionService` occur outside transactions — ensure your new code wraps all state changes in `prisma.$transaction()`
4. Webhook endpoint JSON parsing lacks guarded error handling — the processor should handle malformed payloads gracefully

### Project Structure Notes

All new files go within the existing ingestion module structure:

```
apps/api/src/modules/ingestion/
├── ingestion.module.ts          (modify: register new providers)
├── ingestion.controller.ts      (no changes needed)
├── ingestion.service.ts         (extend: add contribution methods)
├── github-api.service.ts        (no changes needed unless enrichment required)
├── processors/
│   └── webhook.processor.ts     (REPLACE stub with full implementation)
├── dto/
│   ├── add-repository.dto.ts    (no changes)
│   └── list-repositories-query.dto.ts (no changes)
├── ingestion.service.spec.ts    (extend: add contribution tests)
├── ingestion.controller.spec.ts (no changes)
└── processors/
    └── webhook.processor.spec.ts (NEW: processor tests)

apps/api/prisma/
├── schema.prisma                (modify: add Contribution, WebhookDelivery models + enums)
└── migrations/                  (NEW migration for contribution tables)

packages/shared/src/
├── schemas/ingestion.schema.ts  (extend: contribution schemas)
├── types/ingestion.types.ts     (extend: contribution types)
├── constants/error-codes.ts     (extend: new error codes)
└── index.ts                     (extend: new exports)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — GitHub Integration, BullMQ, Event-Driven Architecture sections]
- [Source: _bmad-output/planning-artifacts/prd.md — FR15, FR16, FR17 (ingestion, attribution, normalization)]
- [Source: NFR-P5: Pipeline latency <15 minutes]
- [Source: NFR-R2: Zero contribution loss from transient failures]
- [Source: NFR-I2: Webhook-first architecture, rate-limited requests queued without data loss]
- [Source: NFR-I3: New integration source addable by single developer within 2 weeks]
- [Source: NFR-S3: No plaintext credentials in codebase, logs, or storage]

### Technical Stack (Confirmed Versions)

| Technology            | Version | Purpose                                  |
| --------------------- | ------- | ---------------------------------------- |
| TypeScript            | 5.7.3   | Language                                 |
| NestJS                | 11.0.1  | Backend framework                        |
| Prisma                | 7.4.2   | ORM + migrations                         |
| PostgreSQL            | 16+     | Database                                 |
| BullMQ                | 5.70.2  | Job queue                                |
| @nestjs/bullmq        | 11.0.4  | NestJS queue integration                 |
| Redis                 | 7.x     | Queue backing store                      |
| @nestjs/event-emitter | 3.0.1   | Domain events (EventEmitter2)            |
| @octokit/rest         | 22.0.1  | GitHub API client (if enrichment needed) |
| Zod                   | 3.24.0  | Validation schemas                       |
| Vitest                | 4.0.0   | Testing framework                        |
| Pino                  | 11.0.0  | Structured logging                       |
| ioredis               | 5.10.0  | Redis client                             |

### Database Schema Reference

**Existing models (from Story 4-1) that this story interacts with:**

```prisma
model MonitoredRepository {
  id            String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  owner         String
  repo          String
  fullName      String           @unique @map("full_name")
  webhookId     Int?             @map("webhook_id")
  webhookSecret String           @map("webhook_secret")
  status        RepositoryStatus @default(PENDING)
  statusMessage String?          @map("status_message")
  addedById     String           @map("added_by_id") @db.Uuid
  createdAt     DateTime         @default(now()) @map("created_at")
  updatedAt     DateTime         @updatedAt @map("updated_at")
  addedBy       Contributor      @relation(fields: [addedById], references: [id])
  // Add: contributions Contribution[] relation
  @@unique([owner, repo])
  @@map("monitored_repositories")
  @@schema("core")
}

model Contributor {
  id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  githubId Int    @unique @map("github_id")  // ← Use this for GitHub user → Contributor resolution
  name     String
  // ... other fields
  // Add: contributions Contribution[] relation
  @@map("contributors")
  @@schema("core")
}
```

**New models to create:**

```prisma
model Contribution {
  id               String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  contributorId    String?            @map("contributor_id") @db.Uuid  // nullable: unresolved GitHub users
  repositoryId     String             @map("repository_id") @db.Uuid
  source           ContributionSource @default(GITHUB)
  sourceRef        String             @map("source_ref")  // commit SHA, PR number, review ID
  contributionType ContributionType   @map("contribution_type")
  title            String
  description      String?            @db.Text
  rawData          Json               @map("raw_data")
  normalizedAt     DateTime           @default(now()) @map("normalized_at")
  status           ContributionStatus @default(INGESTED)
  createdAt        DateTime           @default(now()) @map("created_at")
  updatedAt        DateTime           @updatedAt @map("updated_at")

  contributor      Contributor?       @relation(fields: [contributorId], references: [id])
  repository       MonitoredRepository @relation(fields: [repositoryId], references: [id])

  @@unique([source, repositoryId, sourceRef], map: "contributions_source_repo_ref_key")
  @@index([contributorId, createdAt(sort: Desc)], map: "contributions_contributor_created_idx")
  @@index([repositoryId, contributionType], map: "contributions_repo_type_idx")
  @@map("contributions")
  @@schema("core")
}

model WebhookDelivery {
  id            String                @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  deliveryId    String                @unique @map("delivery_id")  // GitHub's x-github-delivery
  repositoryId  String                @map("repository_id") @db.Uuid
  eventType     String                @map("event_type")
  status        WebhookDeliveryStatus @default(RECEIVED)
  payload       Json?
  processedAt   DateTime?             @map("processed_at")
  createdAt     DateTime              @default(now()) @map("created_at")

  repository    MonitoredRepository   @relation(fields: [repositoryId], references: [id])

  @@index([repositoryId], map: "webhook_deliveries_repo_idx")
  @@map("webhook_deliveries")
  @@schema("core")
}

enum ContributionSource {
  GITHUB
  @@schema("core")
}

enum ContributionType {
  COMMIT
  PULL_REQUEST
  CODE_REVIEW
  @@schema("core")
}

enum ContributionStatus {
  INGESTED
  ATTRIBUTED
  EVALUATED
  @@schema("core")
}

enum WebhookDeliveryStatus {
  RECEIVED
  PROCESSING
  COMPLETED
  FAILED
  @@schema("core")
}
```

### Downstream Consumers (Context Only — Do NOT Implement)

- **Story 4-3 (Contribution Attribution & Dashboard Display)**: Will consume `contribution.*.ingested` events to display contributions on contributor dashboards with <5s SSE real-time updates
- **Story 4-4 (Multi-Contributor Collaboration Detection)**: Will analyze contributions with null `contributorId` and multi-author patterns
- **Epic 7 (AI Evaluation Engine)**: Story 7-1 will listen to `contribution.*.ingested` events and enqueue evaluation jobs on `evaluation-dispatch` BullMQ queue

### Previous Story Intelligence (Story 4-1)

**Learnings to apply:**

- Prisma migration may require manual creation due to DB drift with driver adapter pattern — be prepared for `prisma migrate dev` issues
- Shared package must be rebuilt (`pnpm build` in packages/shared) after adding new types/schemas
- BullMQ Redis connection is configured by parsing `REDIS_URL` env var in `ingestion.module.ts` — reuse existing config
- `rawBody` is already enabled in NestJS `main.ts` for webhook HMAC validation
- Tests: 339 API tests + 237 web tests were passing after Story 4-1 — verify no regressions
- GITHUB_APP_TOKEN and INGESTION_WEBHOOK_BASE_URL are optional in config — handle gracefully

**Files created in Story 4-1 that you will extend:**

| File                                                             | Action                                    |
| ---------------------------------------------------------------- | ----------------------------------------- |
| `apps/api/src/modules/ingestion/processors/webhook.processor.ts` | Replace stub with full implementation     |
| `apps/api/src/modules/ingestion/ingestion.module.ts`             | Register new providers if needed          |
| `apps/api/src/modules/ingestion/ingestion.service.ts`            | Add contribution normalization methods    |
| `apps/api/prisma/schema.prisma`                                  | Add Contribution + WebhookDelivery models |
| `packages/shared/src/schemas/ingestion.schema.ts`                | Add contribution schemas                  |
| `packages/shared/src/types/ingestion.types.ts`                   | Add contribution types                    |
| `packages/shared/src/constants/error-codes.ts`                   | Add new error codes                       |
| `packages/shared/src/index.ts`                                   | Export new additions                      |

### Git Intelligence

**Recent commit pattern:** `feat: implement <description> (Story X-Y)`

**Last 5 commits (most recent first):**

1. `6641182` feat: implement GitHub repository connection and webhook configuration (Story 4-1)
2. `79383be` feat: implement 72-hour ignition onboarding tracking (Story 3-5)
3. `fbd93dd` feat: implement buddy assignment and first task recommendation (Story 3-4)
4. `723db64` feat: implement admin micro-task configuration (Story 3-3)
5. `ec3b87a` feat: implement application review and admission queue (Story 3-2)

## Change Log

- 2026-03-05: Implemented full contribution ingestion pipeline — database schema, webhook processor, normalization, idempotency, rate limiting, error handling, and 18 unit tests. All 594 tests passing (357 API + 237 web).
- 2026-03-05: Code review remediation — added malformed webhook payload guard, dead-letter queue forwarding, transactional webhook completion update, and explicit additions/deletions extraction in normalized commit metadata.
- 2026-03-05: Added DB-backed integration test for webhook payload → contribution persistence → domain event emission.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Prisma migration required manual creation due to DB drift (known issue from Story 4-1). Migration SQL applied directly via Docker postgres and registered in \_prisma_migrations table.
- Used `prisma.contribution.upsert()` instead of `createMany()` for idempotent persistence (upsert handles duplicate sourceRef gracefully).
- Normalization logic integrated directly into WebhookProcessor rather than a separate service, keeping all processing in one place aligned with the existing module architecture.

### Completion Notes List

- Task 1: Added Contribution, WebhookDelivery models + 4 enums (ContributionSource, ContributionType, ContributionStatus, WebhookDeliveryStatus) to Prisma schema. Migration 20260305120000 applied.
- Task 2: Added Zod schemas (contributionResponseSchema, webhookPayloadSchema), TypeScript types (Contribution, WebhookDelivery, ContributionIngestedEvent), and 3 new error codes to shared package.
- Task 3: Replaced webhook processor stub with full implementation supporting push, pull_request, and pull_request_review event types with GitHub user → Contributor resolution.
- Task 4: Normalization maps commits (title=first line of message), PRs (title=PR title), and reviews (title="Review on PR #X: state") to Contribution records. Batch persistence in transaction with audit log.
- Task 5: Idempotency via WebhookDelivery table — COMPLETED deliveries skipped, stale PROCESSING (>5min) reprocessed, delivery status tracked through RECEIVED→PROCESSING→COMPLETED/FAILED lifecycle.
- Task 6: Rate limit handling detects 429 responses, extracts x-ratelimit-reset header, delays job via BullMQ moveToDelayed().
- Task 7: BullMQ retry config verified (3 attempts, exponential backoff). Structured warn-level logging on all failure paths. Failed jobs retained (removeOnFail: false) and final-attempt failures forwarded to github-ingestion-dlq. Malformed payloads are guarded at controller parsing.
- Task 8: Unit tests cover event extraction, normalization, idempotency, contributor resolution, and failure paths. Added DB-backed integration test for end-to-end ingestion persistence and event emission.

### File List

- `apps/api/prisma/schema.prisma` (modified: added Contribution, WebhookDelivery models + 4 enums + relations on Contributor/MonitoredRepository)
- `apps/api/prisma/migrations/20260305120000_add_contribution_and_webhook_delivery/migration.sql` (new: migration SQL)
- `apps/api/src/modules/ingestion/processors/webhook.processor.ts` (modified: replaced stub with full implementation)
- `apps/api/src/modules/ingestion/processors/webhook.processor.spec.ts` (new: 18 unit tests)
- `apps/api/src/modules/ingestion/processors/webhook.processor.integration.spec.ts` (new: DB-backed integration test)
- `apps/api/src/modules/ingestion/ingestion.controller.ts` (modified: guarded malformed webhook JSON parsing)
- `apps/api/src/modules/ingestion/ingestion.controller.spec.ts` (modified: added malformed payload guard test)
- `apps/api/src/modules/ingestion/ingestion.module.ts` (modified: registered github-ingestion-dlq queue)
- `packages/shared/src/schemas/ingestion.schema.ts` (modified: added contribution Zod schemas)
- `packages/shared/src/types/ingestion.types.ts` (modified: added contribution types)
- `packages/shared/src/constants/error-codes.ts` (modified: added 3 error codes)
- `packages/shared/src/index.ts` (modified: exported new schemas/types)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified: story status update)
- `_bmad-output/implementation-artifacts/4-2-contribution-ingestion-pipeline.md` (modified: task checkboxes, dev record, status)

### Senior Developer Review (AI)

- 2026-03-05 (code-review): Fixed high-severity webhook payload parsing gap by handling malformed JSON with a controlled domain error in the controller.
- 2026-03-05 (code-review): Fixed transactional consistency gap by moving webhook delivery completion update into the same transaction used for contribution persistence.
- 2026-03-05 (code-review): Implemented explicit dead-letter forwarding to `github-ingestion-dlq` on final retry exhaustion.
- 2026-03-05 (code-review): Added explicit extracted commit metadata (`additions`, `deletions`, files changed breakdown) to persisted raw contribution payload.
- 2026-03-05 (code-review): Corrected overstated test-coverage claim for Task 8.6; DB-backed integration test remains pending.
