# Story 7.1: Evaluation Pipeline & Code Evaluation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a contributor,
I want my code contributions to be automatically evaluated for quality,
so that I receive objective, timely feedback on my work without waiting for human reviewers.

## Acceptance Criteria (BDD)

### AC1: Event-Driven Evaluation Dispatch

**Given** a normalized contribution of type CODE exists in the system (ingested via Epic 4)
**When** the domain event `contribution.commit.ingested` or `contribution.pull-request.ingested` is emitted
**Then** the evaluation service listens and enqueues a job on the `evaluation-dispatch` BullMQ queue
**And** the job payload includes: contributionId, contributionType, contributorId, normalized artifact data, and a correlationId for tracing (NFR-O2)
**And** the queue uses dead-letter configuration so failed jobs are never lost (NFR-R2)

### AC2: Code Evaluation Processing

**Given** a code evaluation job is dequeued by the `code-evaluation` processor
**When** the processor analyzes the contribution
**Then** it evaluates four dimensions: complexity (cyclomatic complexity, nesting depth), maintainability (naming clarity, modularity, separation of concerns), test coverage (presence and quality of associated tests), and standards adherence (linting compliance, project convention alignment)
**And** each dimension produces a sub-score on a 0-100 scale
**And** a composite contribution score is calculated as a weighted combination of the dimension sub-scores with a task complexity multiplier and domain normalization factor (FR58 basic scoring)
**And** the final score is on a 0-100 scale with full provenance stored (formula version, weights, raw inputs)
**And** processing completes within 30 minutes for code evaluations (NFR-P6)

### AC3: Result Persistence & Event Emission

**Given** a code evaluation completes successfully
**When** the result is persisted
**Then** the evaluation record is stored in the `evaluation` schema with: contributionId, contributorId, evaluationModelVersion, dimensionScores, compositeScore, formulaVersion, rawInputs, timestamps
**And** the score is tracked at a single temporal horizon (FR60 single-horizon — session-level score recorded with timestamp for future aggregation)
**And** a domain event `evaluation.score.completed` is emitted (consumed by Activity Feed in Epic 5 and Notifications in Epic 5)
**And** the evaluation score is cached in Redis for quick dashboard retrieval

### AC4: Error Handling & Graceful Degradation

**Given** the evaluation processor encounters a transient failure (API timeout, resource exhaustion)
**When** the job fails
**Then** BullMQ retries with exponential backoff (NFR-R2)
**And** if all retries are exhausted, the job moves to the dead-letter queue
**And** the contribution displays as "Evaluation pending" on the contributor's dashboard — not an error state (NFR-R3 graceful degradation)
**And** an alert is fired if evaluation throughput drops >50% (NFR-O1)

### AC5: Dashboard Evaluation Status Display

**Given** the contributor views their dashboard
**When** an evaluation is in progress
**Then** the contribution shows a calm "Evaluation in progress" status with a skeleton loader (UX spec: no countdown timers, no urgency signals)

## Tasks / Subtasks

### Task 1: Shared Types, Schemas & Constants (AC: #1, #2, #3, #4, #5)

- [x] 1.1 Create `packages/shared/src/types/evaluation.types.ts`:
  - `EvaluationStatus`: `'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'`
  - `EvaluationModelStatus`: `'ACTIVE' | 'DEPRECATED' | 'RETIRED'`
  - `EvaluationDimensionKey`: `'complexity' | 'maintainability' | 'testCoverage' | 'standardsAdherence'`
  - `EvaluationDimensionScoreDto`: `{ score: number; explanation: string }`
  - `EvaluationDimensionScoresDto`: `Record<EvaluationDimensionKey, EvaluationDimensionScoreDto>`
  - `EvaluationDto`: `{ id: string; contributionId: string; contributorId: string; modelId: string; status: EvaluationStatus; compositeScore: number | null; dimensionScores: EvaluationDimensionScoresDto | null; narrative: string | null; formulaVersion: string | null; startedAt: string | null; completedAt: string | null; createdAt: string; updatedAt: string }`
  - `EvaluationWithContributionDto`: `EvaluationDto & { contribution: { id: string; title: string; contributionType: string; sourceRef: string } }`
  - `EvaluationModelDto`: `{ id: string; name: string; version: string; provider: string; status: EvaluationModelStatus; createdAt: string }`
  - `EvaluationDispatchJobDto`: `{ contributionId: string; contributionType: string; contributorId: string; correlationId: string }`
  - `EvaluationCompletedEvent`: `{ eventType: 'evaluation.score.completed'; timestamp: string; correlationId: string; actorId: string; payload: { evaluationId: string; contributionId: string; contributorId: string; contributionTitle: string; contributionType: string; compositeScore: number; domain: string | null } }`
  - `EvaluationFailedEvent`: `{ eventType: 'evaluation.score.failed'; timestamp: string; correlationId: string; actorId: string; payload: { evaluationId: string; contributionId: string; contributorId: string; reason: string } }`
  - `EvaluationScoringWeights`: `Record<EvaluationDimensionKey, number>`
  - `EvaluationProvenanceDto`: `{ formulaVersion: string; weights: EvaluationScoringWeights; taskComplexityMultiplier: number; domainNormalizationFactor: number; modelPromptVersion: string; inputTokenCount?: number; outputTokenCount?: number }`
- [x] 1.2 Create `packages/shared/src/schemas/evaluation.schema.ts`:
  - `evaluationStatusEnum`: `z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'])`
  - `evaluationQuerySchema`: `z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(50).default(20), status: evaluationStatusEnum.optional(), contributionId: z.string().uuid().optional() })`
- [x] 1.3 Add error codes to `packages/shared/src/constants/error-codes.ts`:
  - `EVALUATION_NOT_FOUND: 'EVALUATION_NOT_FOUND'`
  - `EVALUATION_ALREADY_EXISTS: 'EVALUATION_ALREADY_EXISTS'`
  - `EVALUATION_MODEL_UNAVAILABLE: 'EVALUATION_MODEL_UNAVAILABLE'`
  - `EVALUATION_FAILED: 'EVALUATION_FAILED'`
- [x] 1.4 Add `'EVALUATION_COMPLETED'` to `ActivityEventType` in `packages/shared/src/types/activity.types.ts`
- [x] 1.5 Add `'EVALUATION_COMPLETED'` to `packages/shared/src/schemas/activity.schema.ts`
- [x] 1.6 Export all new types, schemas, and constants from `packages/shared/src/index.ts`

### Task 2: Database Schema Updates (AC: #1, #2, #3)

- [x] 2.1 Add `Evaluation` model to `apps/api/prisma/schema.prisma` in `evaluation` schema:

  ```prisma
  model Evaluation {
    id              String           @id @db.Uuid
    contributionId  String           @map("contribution_id") @db.Uuid
    contributorId   String           @map("contributor_id") @db.Uuid
    modelId         String?          @map("model_id") @db.Uuid
    status          EvaluationStatus @default(PENDING)
    compositeScore  Decimal?         @map("composite_score") @db.Decimal(5, 2)
    dimensionScores Json?            @map("dimension_scores")
    narrative       String?          @db.Text
    formulaVersion  String?          @map("formula_version")
    rawInputs       Json?            @map("raw_inputs")
    metadata        Json?
    startedAt       DateTime?        @map("started_at")
    completedAt     DateTime?        @map("completed_at")
    createdAt       DateTime         @default(now()) @map("created_at")
    updatedAt       DateTime         @updatedAt @map("updated_at")

    contribution    Contribution     @relation(fields: [contributionId], references: [id])
    contributor     Contributor      @relation(fields: [contributorId], references: [id])
    model           EvaluationModel? @relation(fields: [modelId], references: [id])

    @@unique([contributionId])
    @@index([contributorId, createdAt], map: "idx_evaluations_contributor_created")
    @@index([status], map: "idx_evaluations_status")
    @@map("evaluations")
    @@schema("evaluation")
  }
  ```

- [x] 2.2 Add `EvaluationModel` model to `apps/api/prisma/schema.prisma`:

  ```prisma
  model EvaluationModel {
    id          String               @id @db.Uuid
    name        String
    version     String
    provider    String
    config      Json?
    status      EvaluationModelStatus @default(ACTIVE)
    createdAt   DateTime             @default(now()) @map("created_at")

    evaluations Evaluation[]

    @@unique([name, version])
    @@map("evaluation_models")
    @@schema("evaluation")
  }
  ```

- [x] 2.3 Add enums to `apps/api/prisma/schema.prisma`:

  ```prisma
  enum EvaluationStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
    FAILED
    @@schema("evaluation")
  }

  enum EvaluationModelStatus {
    ACTIVE
    DEPRECATED
    RETIRED
    @@schema("evaluation")
  }
  ```

- [x] 2.4 Add `EVALUATION_COMPLETED` to `ActivityEventType` enum in Prisma schema
- [x] 2.5 Add `evaluations Evaluation[]` relation to `Contribution` model in `core` schema
- [x] 2.6 Add `evaluations Evaluation[]` relation to `Contributor` model in `core` schema
- [x] 2.7 Create Prisma migration: `apps/api/prisma/migrations/20260309120000_add_evaluation_pipeline/migration.sql`
  - CREATE SCHEMA `evaluation` IF NOT EXISTS
  - CREATE TYPE `evaluation."EvaluationStatus"` AS ENUM
  - CREATE TYPE `evaluation."EvaluationModelStatus"` AS ENUM
  - CREATE TABLE `evaluation.evaluation_models` with columns
  - CREATE TABLE `evaluation.evaluations` with columns and FKs
  - ALTER TYPE `core."ActivityEventType"` ADD VALUE IF NOT EXISTS `'EVALUATION_COMPLETED'`
  - INSERT seed evaluation model: `name='code-evaluator'`, `version='v1.0.0'`, `provider='anthropic'`, `status='ACTIVE'`, `config = { modelId: 'claude-sonnet-4-5-20250514', promptVersion: 'code-eval-v1' }`
- [x] 2.8 Run `npx prisma generate` to regenerate client

### Task 3: Backend — Evaluation Module Setup (AC: #1, #2, #3)

- [x] 3.1 Create `apps/api/src/modules/evaluation/evaluation.module.ts`:
  - Imports: `PrismaModule`, `CaslModule`, `BullModule.registerQueue({ name: 'evaluation-dispatch' })`, `BullModule.registerQueue({ name: 'code-evaluation' })`
  - Controllers: `EvaluationController`
  - Providers: `EvaluationService`, `EvaluationDispatchProcessor`, `CodeEvaluationProcessor`, `EvaluationModelRegistry`, `CodeEvaluationProvider`
  - Exports: `EvaluationService`
- [x] 3.2 Register `EvaluationModule` in `apps/api/src/app.module.ts`

### Task 4: Backend — Evaluation Model Registry (AC: #2, #3)

- [x] 4.1 Create `apps/api/src/modules/evaluation/models/evaluation-model.registry.ts`:
  - `getActiveModel(type: 'code' | 'documentation'): Promise<EvaluationModel>` — queries `evaluationModel` table for active model matching type prefix (e.g., `code-evaluator`)
  - `recordModelUsage(modelId: string): void` — log model selection for observability
  - Logger: `private readonly logger = new Logger(EvaluationModelRegistry.name)`
- [x] 4.2 Create `apps/api/src/modules/evaluation/providers/evaluation-provider.interface.ts`:
  ```typescript
  export interface CodeEvaluationInput {
    contributionId: string;
    contributionType: string;
    repositoryName: string;
    files: Array<{
      filename: string;
      status: string;
      additions: number;
      deletions: number;
      patch?: string;
    }>;
    commitMessage?: string;
    pullRequestTitle?: string;
    pullRequestDescription?: string;
  }
  export interface CodeEvaluationOutput {
    dimensions: Record<EvaluationDimensionKey, { score: number; explanation: string }>;
    narrative: string;
    rawModelOutput: string;
  }
  export interface EvaluationProvider {
    evaluateCode(input: CodeEvaluationInput): Promise<CodeEvaluationOutput>;
  }
  ```
- [x] 4.3 Create `apps/api/src/modules/evaluation/providers/anthropic-evaluation.provider.ts`:
  - Implements `EvaluationProvider` interface
  - Uses `@anthropic-ai/sdk` to call Claude API
  - Constructs structured prompt with evaluation rubric for 4 code dimensions
  - Parses Claude response into `CodeEvaluationOutput` (structured JSON via tool use or system prompt)
  - Handles API errors with retries and logging
  - Configurable via: `ANTHROPIC_API_KEY`, `EVALUATION_MODEL_ID` (default: `claude-sonnet-4-5-20250514`)
  - Logger: `private readonly logger = new Logger(AnthropicEvaluationProvider.name)`
- [x] 4.4 Add `@anthropic-ai/sdk` dependency to `apps/api/package.json`
- [x] 4.5 Add environment variables to `.env.example`:
  - `ANTHROPIC_API_KEY=` (required for evaluation)
  - `EVALUATION_MODEL_ID=claude-sonnet-4-5-20250514` (configurable)
  - `EVALUATION_ENABLED=true` (feature flag)
- [x] 4.6 Add tests to `apps/api/src/modules/evaluation/models/evaluation-model.registry.spec.ts`:
  - Test: getActiveModel returns active model for type
  - Test: getActiveModel throws EVALUATION_MODEL_UNAVAILABLE when no active model

### Task 5: Backend — Evaluation Dispatch (AC: #1, #4)

- [x] 5.1 Add event listeners in `apps/api/src/modules/evaluation/evaluation.service.ts`:
  - `@OnEvent('contribution.commit.ingested')` — `handleContributionIngested(event)`
  - `@OnEvent('contribution.pull-request.ingested')` — same handler
  - Validates contribution type is CODE (skip DOCUMENTATION for now — Story 7-2)
  - Checks feature flag (`EVALUATION_ENABLED` env var)
  - Checks no existing Evaluation for this contributionId (idempotent)
  - Creates `Evaluation` record with `status: PENDING`
  - Enqueues job on `evaluation-dispatch` queue with: `{ evaluationId, contributionId, contributionType, contributorId, correlationId }`
  - Log: `'Evaluation dispatched'` with `{ module: 'evaluation', contributionId, correlationId }`
- [x] 5.2 Create `apps/api/src/modules/evaluation/processors/evaluation-dispatch.processor.ts`:
  - `@Processor('evaluation-dispatch')` extending `WorkerHost`
  - Loads contribution from DB to determine type
  - Routes CODE contributions to `code-evaluation` queue
  - Routes DOCUMENTATION contributions → log warning "Not yet implemented" (Story 7-2)
  - Updates Evaluation status to `IN_PROGRESS`, sets `startedAt`
  - Dead-letter queue configuration in module: `{ attempts: 3, backoff: { type: 'exponential', delay: 5000 } }`
  - Error handling: updates Evaluation status to `FAILED` on permanent failure
- [x] 5.3 Add dispatch tests to `apps/api/src/modules/evaluation/evaluation.service.spec.ts`:
  - Test: handleContributionIngested creates PENDING evaluation and enqueues job
  - Test: handleContributionIngested skips DOCUMENTATION contributions
  - Test: handleContributionIngested is idempotent (skips if evaluation exists)
  - Test: handleContributionIngested skips when EVALUATION_ENABLED is false

### Task 6: Backend — Code Evaluation Processor (AC: #2, #3, #4)

- [x] 6.1 Create `apps/api/src/modules/evaluation/processors/code-evaluation.processor.ts`:
  - `@Processor('code-evaluation')` extending `WorkerHost`
  - Injects: `PrismaService`, `EvaluationModelRegistry`, `CodeEvaluationProvider`, `EventEmitter2`, `RedisService`
  - Process flow:
    1. Load Evaluation + Contribution (with contributor domain) from DB
    2. Get active model from registry
    3. Prepare `CodeEvaluationInput` from contribution metadata (files, diff, commit message)
    4. Call `evaluationProvider.evaluateCode(input)` to get dimension scores + narrative
    5. Compute composite score using formula:
       ```
       composite = (complexity * 0.20 + maintainability * 0.35 + testCoverage * 0.25 + standardsAdherence * 0.20) * taskComplexityMultiplier * domainNormalizationFactor
       ```
    6. Persist result: update Evaluation with `compositeScore`, `dimensionScores`, `narrative`, `formulaVersion`, `rawInputs`, `modelId`, `completedAt`, `status: COMPLETED`
    7. Cache score in Redis: `evaluation:${contributionId}` with 24h TTL
    8. Emit `evaluation.score.completed` event
  - `taskComplexityMultiplier`: compute from contribution size (files changed, lines added). Default: `Math.min(1.0 + (totalFiles - 1) * 0.05, 1.5)`
  - `domainNormalizationFactor`: `1.0` for MVP (calibrated per domain in future stories)
  - `FORMULA_VERSION = 'v1.0.0'`
  - Error handling: catch provider errors, update Evaluation to `FAILED`, re-throw for BullMQ retry
  - Logger: structured logging at job start, provider call, score computation, completion
- [x] 6.2 Add constants to `packages/shared/src/constants/evaluation.ts`:
  - `DEFAULT_CODE_WEIGHTS: EvaluationScoringWeights = { complexity: 0.20, maintainability: 0.35, testCoverage: 0.25, standardsAdherence: 0.20 }`
  - `FORMULA_VERSION = 'v1.0.0'`
  - `MAX_EVALUATION_FILES = 50` (skip files beyond this threshold)
  - `MAX_PATCH_LENGTH = 10000` (truncate large diffs)
  - `EVALUATION_CACHE_TTL = 86400` (24 hours in seconds)
- [x] 6.3 Add processor tests to `apps/api/src/modules/evaluation/processors/code-evaluation.processor.spec.ts`:
  - Test: processes code contribution and produces 4 dimension scores
  - Test: computes composite score with correct formula and weights
  - Test: persists evaluation result with full provenance
  - Test: emits evaluation.score.completed event with correct payload
  - Test: caches score in Redis
  - Test: updates status to FAILED on provider error
  - Test: applies task complexity multiplier based on contribution size
  - Test: truncates large diffs to MAX_PATCH_LENGTH

### Task 7: Backend — Evaluation Service Methods (AC: #3, #5)

- [x] 7.1 Add methods to `apps/api/src/modules/evaluation/evaluation.service.ts`:
  - `getEvaluation(evaluationId: string): Promise<EvaluationWithContribution>` — load from DB with contribution relation, throw EVALUATION_NOT_FOUND if missing
  - `getEvaluationByContribution(contributionId: string): Promise<Evaluation | null>` — check Redis cache first (`evaluation:${contributionId}`), fallback to DB query
  - `getEvaluationsForContributor(contributorId: string, query: EvaluationQuery): Promise<{ items, pagination }>` — cursor-based pagination, order by `createdAt DESC`, include contribution relation
  - `getEvaluationStatus(contributionId: string): Promise<EvaluationStatus | null>` — lightweight status check (Redis cache or DB)
- [x] 7.2 Add service tests:
  - Test: getEvaluation returns evaluation with contribution
  - Test: getEvaluation throws EVALUATION_NOT_FOUND
  - Test: getEvaluationByContribution checks Redis first
  - Test: getEvaluationByContribution falls back to DB
  - Test: getEvaluationsForContributor paginates correctly

### Task 8: Backend — Evaluation Controller (AC: #3, #5)

- [x] 8.1 Create `apps/api/src/modules/evaluation/evaluation.controller.ts`:
  - `@Controller({ path: 'evaluations', version: '1' })`
  - `@UseGuards(JwtAuthGuard)`
  - `GET /api/v1/evaluations/:id` — `getEvaluation(id)` with CASL check (own evaluations or admin)
  - `GET /api/v1/evaluations` — `getEvaluationsForContributor(user.id, query)` — own evaluations list with pagination
  - `GET /api/v1/evaluations/contribution/:contributionId` — `getEvaluationByContribution(contributionId)` with ownership check
  - `GET /api/v1/evaluations/contribution/:contributionId/status` — lightweight status endpoint for dashboard polling
  - All endpoints use `createSuccessResponse(data, correlationId, pagination?)`
  - Log: key API calls with module, userId, correlationId
- [x] 8.2 Add controller tests to `apps/api/src/modules/evaluation/evaluation.controller.spec.ts`:
  - Test: GET /:id returns evaluation for owner
  - Test: GET /:id returns 404 for missing evaluation
  - Test: GET / returns paginated evaluations for current user
  - Test: GET /contribution/:id returns evaluation by contribution
  - Test: GET /contribution/:id/status returns lightweight status

### Task 9: Backend — Integration (Activity, Notification) (AC: #3)

- [x] 9.1 Add `@OnEvent('evaluation.score.completed')` listener to `apps/api/src/modules/activity/activity.service.ts`:
  - Create activity event: `EVALUATION_COMPLETED` type
  - Title: `"Your contribution '${contributionTitle}' has been evaluated"`
  - Metadata: `{ evaluationId, contributionId, contributionType, compositeScore, domain }`
  - Attributed to `contributorId` (the person whose work was evaluated)
- [x] 9.2 Add `@OnEvent('evaluation.score.completed')` listener to `apps/api/src/modules/notification/notification.service.ts`:
  - Enqueue `EVALUATION_COMPLETED` notification for the contributor
  - Category: `'evaluation'`
  - Title: `"Your contribution has been evaluated"`
  - Description: `"${contributionType}: ${contributionTitle} — Score: ${compositeScore}"`
  - EntityId: `evaluationId`
  - Follow existing `handleFeedbackReviewAssigned` pattern with try/catch
- [x] 9.3 Add `EVALUATION_COMPLETED` to `NotificationType` enum if not already present
- [x] 9.4 Add integration tests:
  - Test: activity event created on evaluation.score.completed
  - Test: notification enqueued for contributor on evaluation.score.completed

### Task 10: Frontend — Evaluation Status Display (AC: #5)

- [x] 10.1 Create `apps/web/hooks/use-evaluations.ts`:
  - `useEvaluationStatus(contributionId: string | null)`: `useQuery` for `GET /api/v1/evaluations/contribution/:id/status`
    - Query key: `['evaluations', 'status', contributionId]`
    - Enabled only when `contributionId` is non-null
    - staleTime: 30_000
    - refetchInterval: 60_000 when status is `PENDING` or `IN_PROGRESS` (poll until done)
  - `useEvaluation(evaluationId: string | null)`: `useQuery` for `GET /api/v1/evaluations/:id`
    - Query key: `['evaluations', evaluationId]`
    - Enabled only when `evaluationId` is non-null
  - `useMyEvaluations()`: `useInfiniteQuery` for `GET /api/v1/evaluations`
    - Query key: `['evaluations', 'mine']`
    - Cursor-based pagination
- [x] 10.2 Create `apps/web/components/features/evaluation/evaluation-status-badge.tsx`:
  - Props: `{ status: EvaluationStatus | null; compositeScore?: number | null }`
  - States:
    - `null` → no badge (no evaluation exists)
    - `PENDING` / `IN_PROGRESS` → skeleton pulse with text "Evaluation in progress" (warm neutral, no urgency)
    - `COMPLETED` → subtle indicator with descriptive label (e.g., "Evaluated" with warm accent), NOT the score itself
    - `FAILED` → "Evaluation pending" (graceful, NOT an error display)
  - Styling: `inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[11px]`
  - Warm tones only — NO red/green for evaluation states (UX spec critical constraint)
  - Accessibility: `role="status"`, `aria-label` describing current state
- [x] 10.3 Integrate `EvaluationStatusBadge` into existing contribution display:
  - Locate the contribution card/list component in `apps/web/components/features/` (from Story 4-3)
  - Add `useEvaluationStatus(contributionId)` hook call
  - Render `EvaluationStatusBadge` alongside contribution info
  - Position: secondary information area, NOT headline position (UX spec: insight before numbers)

### Task 11: Testing & Verification (AC: #1-#5)

- [x] 11.1 Build shared package: `pnpm --filter @edin/shared build` — verify new types/schemas compile
- [x] 11.2 Run full API test suite — verify 0 regressions
- [x] 11.3 Run full web test suite — verify 0 regressions (TypeScript check: `pnpm --filter web exec tsc --noEmit`)
- [x] 11.4 Verify all new tests pass
- [x] 11.5 Manual smoke test: trigger evaluation dispatch via test event, verify queue processing, check DB persistence, verify Redis cache, verify activity/notification integration

## Dev Notes

### Architecture Patterns — MUST FOLLOW

- **Module pattern**: Create NEW `apps/api/src/modules/evaluation/` module. Do NOT extend existing feedback or ingestion modules
- **Queue architecture**: Two BullMQ queues — `evaluation-dispatch` (routes jobs) and `code-evaluation` (processes code). Separate queues prevent slow evaluation jobs from blocking dispatch (architecture mandate)
- **AI provider abstraction**: Interface + concrete implementation. `EvaluationProvider` interface in `providers/evaluation-provider.interface.ts`, concrete `AnthropicEvaluationProvider` in `providers/anthropic-evaluation.provider.ts`. Inject via NestJS DI for testability
- **Prisma imports**: Import from `../../../generated/prisma/client/client.js` — NOT from `@prisma/client` (Prisma 7 local generation)
- **API response**: Always use `createSuccessResponse(data, correlationId, pagination?)` from `apps/api/src/common/types/api-response.type.ts`
- **Error handling**: Use `DomainException` from `apps/api/src/common/exceptions/domain.exception.ts` with error codes from `@edin/shared`
- **Event emission**: `eventEmitter.emit('event.name', { eventType, timestamp, correlationId, actorId, payload })` — same structure as all other events
- **DTO validation**: Zod `safeParse()` with error mapping to `DomainException` (follow existing pattern in `feedback-admin.controller.ts`)
- **Testing**: Vitest with `describe/it/expect/vi/beforeEach`. Mock Prisma, services. Co-locate spec files with source
- **Logging**: `private readonly logger = new Logger(ClassName.name)` with structured context `{ module: 'evaluation', ... }`
- **Audit logging**: All evaluation state changes must create `prisma.auditLog.create` entries inside `$transaction`
- **Redis caching**: Use existing `RedisService` pattern. Key format: `evaluation:${contributionId}`. TTL: 24h
- **Feature flag**: `EVALUATION_ENABLED` env var. When `false`, event listeners skip dispatch. This is a safety mechanism for deployments
- **Domain-separated schema**: Models go in `@@schema("evaluation")` — the `evaluation` PostgreSQL schema. Create the schema in the migration if it doesn't exist

### Critical Code Reuse — DO NOT REINVENT

| What                         | Where                                                                           | Why                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| BullMQ processor pattern     | `apps/api/src/modules/feedback/feedback-assignment.processor.ts`                | `@Processor`, `WorkerHost`, job processing, error handling                   |
| BullMQ queue registration    | `apps/api/src/modules/feedback/feedback.module.ts`                              | `BullModule.registerQueue({ name: '...' })` with `defaultJobOptions`         |
| Event listener pattern       | `apps/api/src/modules/notification/notification.service.ts`                     | `@OnEvent` with `enqueueNotification()`, try/catch, structured error logging |
| Activity event listener      | `apps/api/src/modules/activity/activity.service.ts`                             | `@OnEvent` with activity creation, metadata payload                          |
| Controller CASL guards       | `apps/api/src/modules/feedback/feedback-admin.controller.ts`                    | `@UseGuards`, `@CheckAbility`, `createSuccessResponse`                       |
| Zod validation in controller | `apps/api/src/modules/feedback/feedback-admin.controller.ts`                    | `safeParse()` → `DomainException` mapping                                    |
| Cursor-based pagination      | `apps/api/src/modules/feedback/feedback.service.ts` (getAssignmentsForReviewer) | Keyset pagination using `createdAt\|id` cursor pattern                       |
| Redis caching                | `apps/api/src/common/redis/redis.service.ts`                                    | `get/set/del` with TTL pattern                                               |
| Transaction + audit log      | `apps/api/src/modules/feedback/feedback.service.ts`                             | `$transaction` with `tx.auditLog.create`                                     |
| Test mock patterns           | `apps/api/src/modules/feedback/feedback.service.spec.ts`                        | mockPrisma, `$transaction` mock, vi.fn() patterns                            |
| Domain badge colors          | `apps/web/lib/domain-colors.ts`                                                 | `DOMAIN_COLORS[domain]` for domain-specific styling                          |
| TanStack Query hooks         | `apps/web/hooks/use-feedback-monitoring.ts`                                     | `useQuery`, `useMutation`, `useInfiniteQuery` patterns                       |
| API client wrapper           | `apps/web/lib/api-client.ts`                                                    | `apiClient<T>('/api/v1/path', options)`                                      |

### Scoring Formula Specification (FR58)

```typescript
// FORMULA_VERSION = 'v1.0.0'
const DEFAULT_CODE_WEIGHTS = {
  complexity: 0.2,
  maintainability: 0.35,
  testCoverage: 0.25,
  standardsAdherence: 0.2,
};

function computeCompositeScore(
  dimensions: Record<EvaluationDimensionKey, { score: number }>,
  weights: EvaluationScoringWeights = DEFAULT_CODE_WEIGHTS,
  taskComplexityMultiplier: number = 1.0,
  domainNormalizationFactor: number = 1.0,
): number {
  const weightedSum = Object.entries(weights).reduce(
    (sum, [key, weight]) => sum + dimensions[key].score * weight,
    0,
  );
  return Math.min(
    100,
    Math.round(weightedSum * taskComplexityMultiplier * domainNormalizationFactor),
  );
}

// taskComplexityMultiplier: based on contribution size
// Small (1-3 files, <100 lines): 1.0
// Medium (4-10 files, 100-500 lines): 1.05
// Large (11-30 files, 500-1500 lines): 1.10
// Very Large (30+ files, 1500+ lines): 1.15
```

### AI Evaluation Prompt Strategy

The `AnthropicEvaluationProvider` sends a structured prompt to Claude:

```
System: You are a code quality evaluator for the Edin platform. Evaluate the following
code contribution across 4 dimensions. Return a JSON object with scores (0-100) and
brief explanations for each dimension.

Evaluation Dimensions:
1. Complexity (0-100): Lower cyclomatic complexity, shallow nesting, clear control flow = higher score
2. Maintainability (0-100): Clear naming, good modularity, separation of concerns = higher score
3. Test Coverage (0-100): Test files present, good assertions, edge cases covered = higher score
4. Standards Adherence (0-100): Consistent style, linting compliance, project conventions = higher score

Also provide a 2-4 sentence narrative summary describing what quality was demonstrated.

Return ONLY valid JSON in this format:
{
  "complexity": { "score": <0-100>, "explanation": "<1-2 sentences>" },
  "maintainability": { "score": <0-100>, "explanation": "<1-2 sentences>" },
  "testCoverage": { "score": <0-100>, "explanation": "<1-2 sentences>" },
  "standardsAdherence": { "score": <0-100>, "explanation": "<1-2 sentences>" },
  "narrative": "<2-4 sentence narrative>"
}
```

**Critical**: The prompt version is stored as `modelPromptVersion` in the evaluation's `rawInputs` for full provenance. When the prompt changes, increment the version.

### Contribution Data Access

The evaluation processor needs code content from the contribution. Approach:

1. **Primary**: Load `Contribution` record from DB — the `metadata` JSON field stores GitHub data including file list, additions, deletions
2. **For diffs**: The contribution's `sourceRef` (commit SHA or PR number) can be used to fetch diff content from GitHub API if not stored in metadata
3. **If GitHub API needed**: Import `IngestionModule` and use `GithubApiService.getCommitDiff(owner, repo, sha)` or similar
4. **Fallback**: If contribution metadata includes enough data (file names, line counts), evaluate based on available info without full diff

Check the `Contribution` model and `ingestion.service.ts` to determine what data is available in `metadata`.

### BullMQ Queue Configuration

```typescript
// evaluation-dispatch queue (lightweight, fast routing)
BullModule.registerQueue({
  name: 'evaluation-dispatch',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

// code-evaluation queue (heavy, AI-dependent)
BullModule.registerQueue({
  name: 'code-evaluation',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 }, // Longer backoff for AI API
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 2000 },
  },
});
```

### UX Requirements — Evaluation Status (CRITICAL)

**From UX Design Specification — These are NON-NEGOTIABLE:**

- **No countdown timers or urgency signals** — The evaluation "waits patiently"
- **No red/green colors for evaluation states** — Use warm neutral tones
- **"Evaluation in progress" uses calm language** — Not "Processing..." or "Working..."
- **Scores are NEVER headline numbers** — Story 7-3 implements the narrative display. For Story 7-1, only show status, not scores
- **Skeleton loader** for in-progress state — gentle pulse animation, not spinner
- **"Evaluation pending"** for failed state — NOT "Error" or "Failed" (graceful degradation)

**Status Badge Styling:**

| Status      | Text                     | Color                  | Style                      |
| ----------- | ------------------------ | ---------------------- | -------------------------- |
| PENDING     | "Evaluation in progress" | `text-brand-secondary` | Skeleton pulse             |
| IN_PROGRESS | "Evaluation in progress" | `text-brand-secondary` | Skeleton pulse             |
| COMPLETED   | "Evaluated"              | `text-brand-accent/80` | Subtle warm badge          |
| FAILED      | "Evaluation pending"     | `text-brand-secondary` | Same as PENDING (no error) |

### Performance Requirements

| Metric                          | Target                     | Source |
| ------------------------------- | -------------------------- | ------ |
| Code evaluation processing      | <30 minutes                | NFR-P6 |
| Evaluation result API response  | <500ms p95                 | NFR-P4 |
| Redis cache hit rate for scores | >80%                       | NFR-P4 |
| Evaluation dispatch latency     | <5 seconds                 | NFR-O1 |
| Dead-letter queue monitoring    | Alert on >50% failure rate | NFR-O1 |

### Database Notes

- **New schema**: `evaluation` (PostgreSQL schema, domain-separated from `core`)
- **New tables**: `evaluations`, `evaluation_models`
- **New enums**: `EvaluationStatus`, `EvaluationModelStatus`
- **New activity enum value**: `EVALUATION_COMPLETED` in `ActivityEventType`
- **Cross-schema relations**: `Evaluation.contributionId` → `core.contributions.id`, `Evaluation.contributorId` → `core.contributors.id`
- **Unique constraint**: `@@unique([contributionId])` — one evaluation per contribution
- **Indexes**: `idx_evaluations_contributor_created` for dashboard queries, `idx_evaluations_status` for queue processing

### Event Flow — Evaluation Pipeline

```
1. GitHub webhook → Ingestion Service → creates Contribution record
2. Ingestion Service emits 'contribution.commit.ingested' event
3. EvaluationService.handleContributionIngested() listener fires
4. Listener checks: feature flag ON, contribution type is CODE, no existing evaluation
5. Creates Evaluation record (status: PENDING)
6. Enqueues job on 'evaluation-dispatch' queue
7. EvaluationDispatchProcessor dequeues:
   a. Updates Evaluation status to IN_PROGRESS
   b. Routes CODE → 'code-evaluation' queue
8. CodeEvaluationProcessor dequeues:
   a. Loads Contribution + contributor domain from DB
   b. Gets active model from EvaluationModelRegistry
   c. Prepares CodeEvaluationInput from contribution metadata
   d. Calls AnthropicEvaluationProvider.evaluateCode()
   e. Computes composite score (formula v1.0.0)
   f. Updates Evaluation: scores, narrative, provenance, status → COMPLETED
   g. Caches in Redis
   h. Emits 'evaluation.score.completed' event
9. ActivityService listener → creates EVALUATION_COMPLETED activity event
10. NotificationService listener → enqueues notification for contributor
11. Frontend polling detects status change → shows "Evaluated" badge
```

### Error Handling Flow

```
CodeEvaluationProcessor fails (e.g., Anthropic API timeout):
1. BullMQ retries with exponential backoff (10s, 40s, 160s)
2. After 3 attempts, job moves to dead-letter queue
3. Evaluation status remains IN_PROGRESS (not updated to FAILED until DLQ)
4. DLQ processor (if implemented) updates status to FAILED
5. Dashboard shows "Evaluation pending" (graceful — same as PENDING)
6. Alert fires if >50% of evaluations fail (throughput monitoring)
```

### New Dependencies

| Package             | Version   | Purpose                             |
| ------------------- | --------- | ----------------------------------- |
| `@anthropic-ai/sdk` | `^0.39.0` | Claude API client for AI evaluation |

### Project Structure Notes

**New Files:**

- `packages/shared/src/types/evaluation.types.ts` — Evaluation DTOs and event types
- `packages/shared/src/schemas/evaluation.schema.ts` — Zod validation schemas
- `packages/shared/src/constants/evaluation.ts` — Scoring weights, formula version, limits
- `apps/api/prisma/migrations/20260309120000_add_evaluation_pipeline/migration.sql` — Migration
- `apps/api/src/modules/evaluation/evaluation.module.ts` — Module definition
- `apps/api/src/modules/evaluation/evaluation.service.ts` — Core service + event listeners
- `apps/api/src/modules/evaluation/evaluation.service.spec.ts` — Service tests
- `apps/api/src/modules/evaluation/evaluation.controller.ts` — API controller
- `apps/api/src/modules/evaluation/evaluation.controller.spec.ts` — Controller tests
- `apps/api/src/modules/evaluation/models/evaluation-model.registry.ts` — Model versioning
- `apps/api/src/modules/evaluation/models/evaluation-model.registry.spec.ts` — Registry tests
- `apps/api/src/modules/evaluation/providers/evaluation-provider.interface.ts` — Provider interface
- `apps/api/src/modules/evaluation/providers/anthropic-evaluation.provider.ts` — Claude implementation
- `apps/api/src/modules/evaluation/processors/evaluation-dispatch.processor.ts` — Dispatch queue processor
- `apps/api/src/modules/evaluation/processors/code-evaluation.processor.ts` — Code evaluation processor
- `apps/api/src/modules/evaluation/processors/code-evaluation.processor.spec.ts` — Processor tests
- `apps/web/hooks/use-evaluations.ts` — Frontend evaluation hooks
- `apps/web/components/features/evaluation/evaluation-status-badge.tsx` — Status display component

**Modified Files:**

- `packages/shared/src/types/activity.types.ts` — Add EVALUATION_COMPLETED
- `packages/shared/src/schemas/activity.schema.ts` — Add EVALUATION_COMPLETED
- `packages/shared/src/constants/error-codes.ts` — Add evaluation error codes
- `packages/shared/src/index.ts` — Export new types/schemas/constants
- `apps/api/prisma/schema.prisma` — Add evaluation models, enums, relations
- `apps/api/src/app.module.ts` — Register EvaluationModule
- `apps/api/src/modules/activity/activity.service.ts` — Add evaluation event listener
- `apps/api/src/modules/notification/notification.service.ts` — Add evaluation notification listener
- `apps/api/package.json` — Add @anthropic-ai/sdk dependency

### Previous Story Intelligence (6-3: Feedback Monitoring & Tracking)

**Key Learnings from Story 6-3:**

- Shared package must be built before API tests: `pnpm --filter @edin/shared build` — constants resolve to `undefined` until compiled
- Pre-existing TypeScript errors in `activity.service.ts` (null vs undefined type mismatches with Prisma 7) — do not try to fix these
- All admin operations use `$transaction` with audit log entries — maintain this pattern
- The `eventEmitter.emit` pattern uses standardized payload: `{ eventType, timestamp, correlationId, actorId, payload }`
- ESLint does NOT allow unused underscore-prefixed params (e.g., `_user`) — remove `@CurrentUser()` entirely from endpoints that don't use it
- Prettier formatting must pass before commit — run `npx prettier --write` on all new files
- React Compiler lint rule forbids `setState` inside `useEffect` — use `key` prop for state reset instead
- Controller methods that only need guards but not user data should NOT have `@CurrentUser()` parameter

### Git Intelligence

Recent commits follow pattern: `feat: implement [feature description] (Story X-Y)`. Most recent commit: `b3fc2fb feat: implement feedback monitoring dashboard with SLA tracking and reassignment (Story 6-3)`. Working tree has unrelated changes from Story 4-1 ingestion work.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 7, Story 7.1]
- [Source: _bmad-output/planning-artifacts/prd.md — FR21-FR27, FR58, FR60 (Evaluation requirements)]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR-P6 (<30min code eval), NFR-R2 (dead-letter), NFR-O1 (alerting)]
- [Source: _bmad-output/planning-artifacts/prd.md — AI/ML Technical Constraints (model transparency, bias monitoring)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Evaluation module structure, BullMQ patterns, DB schema]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Narrative-first data, no red/green, calm evaluation UX]
- [Source: apps/api/src/modules/feedback/feedback.module.ts — BullMQ queue registration pattern]
- [Source: apps/api/src/modules/feedback/feedback.service.ts — Service patterns, transaction, event emission]
- [Source: apps/api/src/modules/notification/notification.service.ts — @OnEvent listener pattern]
- [Source: apps/api/src/modules/activity/activity.service.ts — Activity event creation pattern]
- [Source: apps/api/prisma/schema.prisma — Schema structure, domain separation, existing models]

## Change Log

| Change                                 | Date       | Version |
| -------------------------------------- | ---------- | ------- |
| Story created with full task breakdown | 2026-03-09 | 1.0     |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

N/A

### Completion Notes List

- All 11 tasks implemented across shared types, database schema, backend services, processors, controller, integration (activity + notification), frontend hooks, and evaluation status badge
- Code review completed — 6 findings (2 HIGH, 4 MEDIUM) fixed:
  1. Added ownership check to `GET /contribution/:id/status` endpoint (security)
  2. Wired `contributionId` query filter in `getEvaluationsForContributor` (logic bug)
  3. Created missing `evaluation-dispatch.processor.spec.ts` (5 tests)
  4. Created missing `anthropic-evaluation.provider.spec.ts` (8 tests)
  5. Moved `rawModelOutput` from `rawInputs` to `metadata` column (data separation)
  6. Added `EVALUATION_ENABLED=false` test case
- Redis cache now includes `contributorId` for ownership check on status endpoint
- Total: 42 tests passing across 6 test files
- `EVALUATION_COMPLETED` activity event type and notification type were already present in enums (skipped Tasks 1.4, 1.5, 2.4, 9.3)

### File List

**New Files:**

- `packages/shared/src/types/evaluation.types.ts`
- `packages/shared/src/schemas/evaluation.schema.ts`
- `packages/shared/src/constants/evaluation.ts`
- `apps/api/prisma/migrations/20260309120000_add_evaluation_pipeline/migration.sql`
- `apps/api/src/modules/evaluation/evaluation.module.ts`
- `apps/api/src/modules/evaluation/evaluation.service.ts`
- `apps/api/src/modules/evaluation/evaluation.service.spec.ts`
- `apps/api/src/modules/evaluation/evaluation.controller.ts`
- `apps/api/src/modules/evaluation/evaluation.controller.spec.ts`
- `apps/api/src/modules/evaluation/models/evaluation-model.registry.ts`
- `apps/api/src/modules/evaluation/models/evaluation-model.registry.spec.ts`
- `apps/api/src/modules/evaluation/providers/evaluation-provider.interface.ts`
- `apps/api/src/modules/evaluation/providers/anthropic-evaluation.provider.ts`
- `apps/api/src/modules/evaluation/providers/anthropic-evaluation.provider.spec.ts`
- `apps/api/src/modules/evaluation/processors/evaluation-dispatch.processor.ts`
- `apps/api/src/modules/evaluation/processors/evaluation-dispatch.processor.spec.ts`
- `apps/api/src/modules/evaluation/processors/code-evaluation.processor.ts`
- `apps/api/src/modules/evaluation/processors/code-evaluation.processor.spec.ts`
- `apps/web/hooks/use-evaluations.ts`
- `apps/web/components/features/evaluation/evaluation-status-badge.tsx`

**Modified Files:**

- `packages/shared/src/constants/error-codes.ts` — Added 4 evaluation error codes
- `packages/shared/src/index.ts` — Exported new evaluation types, schemas, constants
- `apps/api/prisma/schema.prisma` — Added Evaluation, EvaluationModel models, enums, relations
- `apps/api/src/app.module.ts` — Registered EvaluationModule
- `apps/api/src/modules/activity/activity.service.ts` — Added evaluation.score.completed listener
- `apps/api/src/modules/notification/notification.service.ts` — Added evaluation notification listener
- `apps/api/package.json` — Added @anthropic-ai/sdk ^0.39.0
- `apps/api/.env.example` — Added ANTHROPIC_API_KEY, EVALUATION_MODEL_ID, EVALUATION_ENABLED
- `apps/web/components/features/contributions/contribution-detail.tsx` — Integrated evaluation status badge
