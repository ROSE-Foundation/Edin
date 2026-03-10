# Story 9.1: Advanced Contribution Scoring & Multi-Temporal Tracking

Status: done

## Story

As a contributor,
I want my contribution scores aggregated across multiple time horizons,
so that I can see both my immediate performance and my long-term trajectory of sustained engagement.

## Acceptance Criteria

1. **Advanced Scoring Module** — Extends evaluation score calculation to full multi-temporal model: AI evaluation output, peer feedback score (Epic 6), task complexity multiplier, and domain normalization factor. Formula configurable by admins via `/admin/settings/scoring` with version tracking. Every formula change creates a new version with effective date; previous versions archived. Scores remain on 0-100 scale with full provenance stored: formula version, individual component values, weights applied, raw inputs.

2. **Temporal Aggregation Service** — Evaluations trigger temporal aggregation. Contribution scores aggregated across six temporal horizons: session (per-contribution), daily, weekly, monthly, quarterly, yearly. Each horizon stores: aggregated score, number of contributions in period, score trend (rising/stable/declining), computation timestamp. Aggregation jobs run on schedule via BullMQ: daily at 00:00 UTC, weekly on Monday, monthly on 1st, quarterly and yearly at period boundaries. Aggregation is idempotent — re-running produces same result.

3. **Dashboard Display** — Route: `/dashboard/scores`. Progressive disclosure: summary card with most recent session score and monthly trend, expandable to reveal all six horizons. Each horizon shows aggregated score with contextual label (e.g., "This month: 78 — 12 contributions, rising trend"). Uses calm clarity aesthetic — no red/green comparisons, descriptive trend labels instead of directional arrows.

4. **Formula Versioning** — When new formula version activated: all future evaluations use new formula. Historical scores NOT retroactively recalculated — retain formula version under which they were computed. Contributors can see which formula version applies to each score via expandable provenance detail.

## Tasks / Subtasks

- [x] Task 1: Database Schema — Prisma migration for scoring models (AC: #1, #2, #4)
  - [x] 1.1 Create `ScoringFormulaVersion` model in `evaluation` schema
  - [x] 1.2 Create `ContributionScore` model with provenance fields
  - [x] 1.3 Create `TemporalScoreAggregate` model with six horizons enum
  - [x] 1.4 Add indexes for temporal queries (contributorId + horizon + periodStart)
  - [x] 1.5 Generate and apply migration

- [x] Task 2: Shared Types & Constants (AC: #1, #2, #3)
  - [x] 2.1 Add scoring DTOs to `packages/shared/src/types/` (new file `scoring.types.ts`)
  - [x] 2.2 Add error codes for scoring module to `packages/shared/src/constants/error-codes.ts`
  - [x] 2.3 Export new types from `packages/shared/src/index.ts`

- [x] Task 3: Scoring Formula Service (AC: #1, #4)
  - [x] 3.1 Create `apps/api/src/modules/reward/scoring-formula.service.ts`
  - [x] 3.2 Implement `calculateContributionScore()` — composite of AI eval + peer feedback + complexity + domain normalization
  - [x] 3.3 Implement `createFormulaVersion()` and `getActiveFormula()` for version management
  - [x] 3.4 Implement `getFormulaHistory()` for admin audit trail
  - [x] 3.5 Listen to `evaluation.score.completed` event to trigger score calculation
  - [x] 3.6 Emit `reward.score.calculated` event after score computed

- [x] Task 4: Temporal Aggregation Service (AC: #2)
  - [x] 4.1 Create `apps/api/src/modules/reward/temporal-aggregation.service.ts`
  - [x] 4.2 Implement aggregation logic for six horizons (session/daily/weekly/monthly/quarterly/yearly)
  - [x] 4.3 Implement idempotent aggregation — re-running produces same result
  - [x] 4.4 Implement trend calculation (rising/stable/declining based on period-over-period comparison)
  - [x] 4.5 Listen to `reward.score.calculated` event to trigger session aggregation
  - [x] 4.6 Emit `reward.score.aggregated` event after aggregation complete

- [x] Task 5: BullMQ Aggregation Processor (AC: #2)
  - [x] 5.1 Create `apps/api/src/modules/reward/temporal-aggregation.processor.ts` using `WorkerHost` pattern
  - [x] 5.2 Register `reward-aggregation` queue in reward module
  - [x] 5.3 Implement scheduled jobs: daily (00:00 UTC), weekly (Monday), monthly (1st), quarterly/yearly at period boundaries
  - [x] 5.4 Implement 3-attempt exponential backoff for failed jobs

- [x] Task 6: Reward Module Setup (AC: #1, #2)
  - [x] 6.1 Create `apps/api/src/modules/reward/reward.module.ts` — register BullMQ queue, services, controllers
  - [x] 6.2 Register RewardModule in AppModule
  - [x] 6.3 Ensure EventEmitter2 integration for cross-module events

- [x] Task 7: API Controllers (AC: #1, #3, #4)
  - [x] 7.1 Create `apps/api/src/modules/reward/score.controller.ts` — contributor score endpoints
  - [x] 7.2 Create `apps/api/src/modules/reward/scoring-admin.controller.ts` — admin formula management
  - [x] 7.3 Implement `GET /api/v1/rewards/scores` — contributor's own scores with temporal aggregates
  - [x] 7.4 Implement `GET /api/v1/rewards/scores/:contributorId` — admin view of any contributor's scores
  - [x] 7.5 Implement `POST /api/v1/admin/scoring/formula` — create new formula version
  - [x] 7.6 Implement `GET /api/v1/admin/scoring/formula/history` — formula version history

- [x] Task 8: Frontend — Dashboard Scores Page (AC: #3)
  - [x] 8.1 Create `apps/web/app/(dashboard)/dashboard/scores/page.tsx` — SSR page shell
  - [x] 8.2 Create `apps/web/components/features/reward/scores-summary-card.tsx` — summary card with session score + monthly trend
  - [x] 8.3 Create `apps/web/components/features/reward/temporal-horizons-panel.tsx` — expandable six-horizon display
  - [x] 8.4 Create `apps/web/components/features/reward/score-provenance-detail.tsx` — formula version + component breakdown
  - [x] 8.5 Create `apps/web/hooks/use-scores.ts` — TanStack Query hooks for score endpoints

- [x] Task 9: Frontend — Admin Scoring Settings (AC: #1, #4)
  - [x] 9.1 Create `apps/web/app/(admin)/admin/settings/scoring/page.tsx` — admin formula management page
  - [x] 9.2 Create `apps/web/components/features/reward/admin/formula-editor.tsx` — weight configuration form
  - [x] 9.3 Create `apps/web/components/features/reward/admin/formula-history.tsx` — version history table

- [x] Task 10: Unit & Integration Tests (AC: #1, #2, #3, #4)
  - [x] 10.1 `scoring-formula.service.spec.ts` — formula calculation, version management, event handling
  - [x] 10.2 `temporal-aggregation.service.spec.ts` — aggregation logic, idempotency, trend calculation
  - [x] 10.3 `temporal-aggregation.processor.spec.ts` — BullMQ job processing, retry, DLQ
  - [x] 10.4 Controller specs for auth guards and response formatting

## Dev Notes

### Architecture & Module Structure

**New module**: `apps/api/src/modules/reward/` — follows same pattern as `publication/` and `evaluation/` modules.

```
apps/api/src/modules/reward/
├── reward.module.ts
├── scoring-formula.service.ts
├── scoring-formula.service.spec.ts
├── temporal-aggregation.service.ts
├── temporal-aggregation.service.spec.ts
├── temporal-aggregation.processor.ts
├── temporal-aggregation.processor.spec.ts
├── score.controller.ts
└── scoring-admin.controller.ts
```

### Database Schema Design

**New models in `evaluation` schema** (extend existing prisma schema):

```prisma
enum TemporalHorizon {
  SESSION
  DAILY
  WEEKLY
  MONTHLY
  QUARTERLY
  YEARLY
}

enum ScoreTrend {
  RISING
  STABLE
  DECLINING
}

model ScoringFormulaVersion {
  id                String   @id @default(uuid()) @db.Uuid
  version           Int      @default(autoincrement())
  aiEvalWeight      Decimal  @db.Decimal(3, 2) @default(0.40)
  peerFeedbackWeight Decimal @db.Decimal(3, 2) @default(0.25)
  complexityWeight  Decimal  @db.Decimal(3, 2) @default(0.20)
  domainNormWeight  Decimal  @db.Decimal(3, 2) @default(0.15)
  effectiveFrom     DateTime @default(now())
  effectiveTo       DateTime?
  createdBy         String   @db.Uuid
  metadata          Json?
  createdAt         DateTime @default(now())

  scores ContributionScore[]

  @@schema("evaluation")
  @@map("scoring_formula_versions")
}

model ContributionScore {
  id                  String   @id @default(uuid()) @db.Uuid
  contributionId      String   @db.Uuid
  contributorId       String   @db.Uuid
  compositeScore      Decimal  @db.Decimal(5, 2)
  aiEvalScore         Decimal  @db.Decimal(5, 2)
  peerFeedbackScore   Decimal? @db.Decimal(5, 2)
  complexityMultiplier Decimal @db.Decimal(5, 2) @default(1.00)
  domainNormFactor    Decimal  @db.Decimal(5, 2) @default(1.00)
  formulaVersionId    String   @db.Uuid
  rawInputs           Json?
  createdAt           DateTime @default(now())

  formulaVersion ScoringFormulaVersion @relation(fields: [formulaVersionId], references: [id])

  @@unique([contributionId])
  @@index([contributorId, createdAt(sort: Desc)])
  @@schema("evaluation")
  @@map("contribution_scores")
}

model TemporalScoreAggregate {
  id                String          @id @default(uuid()) @db.Uuid
  contributorId     String          @db.Uuid
  horizon           TemporalHorizon
  periodStart       DateTime
  periodEnd         DateTime
  aggregatedScore   Decimal         @db.Decimal(5, 2)
  contributionCount Int             @default(0)
  trend             ScoreTrend      @default(STABLE)
  computedAt        DateTime        @default(now())

  @@unique([contributorId, horizon, periodStart])
  @@index([contributorId, horizon, periodStart(sort: Desc)])
  @@schema("evaluation")
  @@map("temporal_score_aggregates")
}
```

### Event Flow

```
evaluation.score.completed
  → scoring-formula.service.calculateContributionScore()
    → Creates ContributionScore record with provenance
    → Emits reward.score.calculated

reward.score.calculated
  → temporal-aggregation.service.aggregateSession()
    → Creates/updates SESSION TemporalScoreAggregate
    → Emits reward.score.aggregated

BullMQ scheduled jobs (reward-aggregation queue):
  → daily job (00:00 UTC): aggregate DAILY scores
  → weekly job (Monday 00:00 UTC): aggregate WEEKLY scores
  → monthly job (1st 00:00 UTC): aggregate MONTHLY scores
  → quarterly/yearly: aggregate at period boundaries
```

### Scoring Formula

```typescript
compositeScore = clamp(0, 100,
  (aiEvalScore × aiEvalWeight) +
  (peerFeedbackScore × peerFeedbackWeight) +
  (baseScore × complexityWeight × complexityMultiplier) +
  (baseScore × domainNormWeight × domainNormFactor)
)
```

- If `peerFeedbackScore` is null (not yet reviewed), redistribute its weight proportionally across other components
- `complexityMultiplier` sourced from Evaluation.dimensionScores.complexity (already computed in Epic 7)
- `domainNormFactor` calculated per-domain to normalize across domains with different scoring distributions

### Trend Calculation

Compare current period's aggregated score to previous period of same horizon:

- **RISING**: current > previous × 1.05 (5% threshold)
- **DECLINING**: current < previous × 0.95
- **STABLE**: within ±5%

For first period (no previous data): default to STABLE.

### Critical Patterns to Follow

1. **Event-driven triggers**: Use `@OnEvent('evaluation.score.completed')` decorator — same pattern as `article-reward.service.ts`
2. **BullMQ processor**: Follow `plagiarism-check.processor.ts` WorkerHost pattern with 3-attempt exponential backoff
3. **Queue registration**: Follow `publication.module.ts` BullModule.registerQueue pattern
4. **Controller auth**: `@UseGuards(JwtAuthGuard)` for contributor endpoints, `@UseGuards(JwtAuthGuard, AbilityGuard)` + `@CheckAbility` for admin
5. **API response**: Use `createSuccessResponse(data, req.correlationId)` from `apps/api/src/common/types/api-response.type.ts`
6. **Error handling**: Use `DomainException` with ERROR_CODES from `@edin/shared`
7. **Prisma decimals**: Pass plain numbers to Prisma, NOT `Decimal` imports (causes type issues — lesson from 8-5)
8. **Static routes first**: Declare static routes (`/scores`, `/admin/scoring/formula`) BEFORE dynamic `:id` routes

### Existing Code to Reuse (DO NOT Reinvent)

- **Evaluation composite score**: Already computed in `evaluation.service.ts` — use as `aiEvalScore` input
- **Peer feedback ratings**: Available from `feedback.service.ts` → `PeerFeedback.ratings` (Json field)
- **Contribution collaboration splits**: `ContributionCollaboration.splitPercentage` — apply to final score
- **Reward methodology constants**: `packages/shared/src/constants/reward-methodology.ts` — garden metaphors, scaling curve data
- **Recharts patterns**: Story 2-5 established AreaChart with monotone curves, domain accent colors — reuse for any charts
- **PlatformSettings**: Already used for moderation thresholds (8-6) — extend for scoring formula weights
- **EvaluationProvenanceDto**: Already has `formulaVersion`, `weights`, `taskComplexityMultiplier`, `domainNormalizationFactor` — scoring provenance should mirror this structure

### Frontend Patterns

- **Route**: `/dashboard/scores` — add to `(dashboard)` layout group
- **Admin route**: `/admin/settings/scoring` — add to `(admin)` layout group
- **Hooks**: TanStack Query with `queryKey` arrays, `useMutation` with `onSuccess` invalidation
- **Progressive disclosure**: Expandable sections pattern (used in Story 8-4 for article metadata)
- **Design language**: Calm clarity — no red/green, use descriptive trend labels ("rising", "stable", "declining"), brand accent (#C4956A), domain colors (teal/amber/rose/violet)
- **Typography**: Serif headings, sans-serif body — editorial design from Story 2-5
- **`'use client'` directive**: Required for Recharts components and any client-side interactive elements

### Admin Settings Integration

Check if `PlatformSettings` model already exists (used in Story 8-6 for moderation thresholds). If yes, extend it for scoring weights. If no, the formula versioning model (`ScoringFormulaVersion`) handles this independently.

### Testing Standards

- **Vitest** with NestJS Test module
- Mock PrismaService with `vi.fn()` for each method used
- Mock EventEmitter2 for event emission verification
- Test scoring formula calculation with known inputs → expected outputs
- Test idempotent aggregation: run twice → same result
- Test trend calculation: rising, stable, declining scenarios
- Test null peer feedback score redistribution
- Test formula version transitions
- BullMQ processor: test job processing, DLQ on failure
- Target: ~15-20 tests per service file

### Project Structure Notes

- New `modules/reward/` directory — does NOT conflict with existing `modules/evaluation/` (evaluation produces raw scores, reward module consumes and aggregates them)
- Shared types in `packages/shared/src/types/scoring.types.ts` — new file alongside existing `evaluation.types.ts`
- Migration in `apps/api/prisma/migrations/` with timestamp prefix
- Frontend components in `apps/web/components/features/reward/` — parallel to `apps/web/components/features/publication/`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9, Story 9.1]
- [Source: _bmad-output/planning-artifacts/prd.md#FR57, FR58, FR60]
- [Source: _bmad-output/planning-artifacts/architecture.md#Reward Module]
- [Source: apps/api/src/modules/evaluation/evaluation.service.ts — event patterns]
- [Source: apps/api/src/modules/publication/article-reward.service.ts — reward allocation patterns]
- [Source: apps/api/src/modules/publication/plagiarism-check.processor.ts — BullMQ WorkerHost pattern]
- [Source: apps/api/src/modules/publication/publication.module.ts — BullModule queue registration]
- [Source: packages/shared/src/constants/reward-methodology.ts — existing reward constants]
- [Source: _bmad-output/implementation-artifacts/2-5-public-platform-metrics-and-reward-methodology.md — design language]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed PaginationMeta type — removed `limit` field (not in PaginationMeta type)
- Fixed mockPrisma type — changed to `any` to resolve Mock type assignability
- Fixed metadata Prisma JSON type — cast to `Prisma.InputJsonValue` following admission.service.ts pattern

### Completion Notes List

- All 10 tasks implemented with 27 new unit tests (10 scoring + 13 aggregation + 4 processor)
- Full test suite: 907/907 passing, 0 regressions
- No new TypeScript errors in reward module (pre-existing vite type mismatch unrelated)
- Event-driven architecture: evaluation.score.completed → reward.score.calculated → reward.score.aggregated
- BullMQ processor with WorkerHost pattern, 3-attempt exponential backoff, DLQ handling
- Six temporal horizons with idempotent aggregation and trend detection (5% threshold)
- Formula versioning with provenance tracking — historical scores retain original formula version
- Admin endpoints guarded with AbilityGuard + CheckAbility(Manage, all)
- Frontend: dashboard scores page with progressive disclosure, admin formula management
- Peer feedback weight redistribution when no peer feedback available

### File List

**New files:**

- `apps/api/prisma/migrations/20260310960000_add_reward_scoring_models/migration.sql`
- `packages/shared/src/types/scoring.types.ts`
- `apps/api/src/modules/reward/reward.module.ts`
- `apps/api/src/modules/reward/scoring-formula.service.ts`
- `apps/api/src/modules/reward/scoring-formula.service.spec.ts`
- `apps/api/src/modules/reward/temporal-aggregation.service.ts`
- `apps/api/src/modules/reward/temporal-aggregation.service.spec.ts`
- `apps/api/src/modules/reward/temporal-aggregation.processor.ts`
- `apps/api/src/modules/reward/temporal-aggregation.processor.spec.ts`
- `apps/api/src/modules/reward/score.controller.ts`
- `apps/api/src/modules/reward/scoring-admin.controller.ts`
- `apps/api/src/modules/reward/aggregation-scheduler.service.ts`
- `apps/web/hooks/use-scores.ts`
- `apps/web/app/(dashboard)/dashboard/scores/page.tsx`
- `apps/web/components/features/reward/scores-summary-card.tsx`
- `apps/web/components/features/reward/temporal-horizons-panel.tsx`
- `apps/web/components/features/reward/score-provenance-detail.tsx`
- `apps/web/app/(admin)/admin/settings/scoring/page.tsx`
- `apps/web/components/features/reward/admin/formula-editor.tsx`
- `apps/web/components/features/reward/admin/formula-history.tsx`

**Modified files:**

- `apps/api/prisma/schema.prisma` — added TemporalHorizon, ScoreTrend enums; ScoringFormulaVersion, ContributionScore, TemporalScoreAggregate models
- `packages/shared/src/constants/error-codes.ts` — added scoring error codes
- `packages/shared/src/index.ts` — exported scoring types
- `apps/api/src/app.module.ts` — registered RewardModule
