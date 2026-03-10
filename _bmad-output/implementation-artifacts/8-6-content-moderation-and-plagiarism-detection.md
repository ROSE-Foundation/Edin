# Story 8.6: Content Moderation & Plagiarism Detection

Status: done

## Story

As an admin,
I want to moderate published content and detect plagiarism before publication,
so that I can maintain editorial integrity and protect the platform's reputation.

## Acceptance Criteria

### AC1: Automated Plagiarism Detection on Article Submission

**Given** a contributor submits an article (status transitions to SUBMITTED)
**When** the `publication.article.submitted` event is processed
**Then** the system enqueues a plagiarism detection job on the `plagiarism-check` BullMQ queue (FR79)
**And** the detector checks for: potential plagiarism (text similarity against known sources) and undisclosed AI-generated content (statistical patterns indicating AI authorship)
**And** results are attached to the article as a moderation report with confidence scores

### AC2: Flagged Article Admin Review

**Given** the plagiarism check completes
**When** the report indicates potential issues (confidence above a configurable threshold)
**Then** the article is flagged for admin review before it enters editorial review
**And** the admin sees the flagged article at /admin/publication/moderation with: article title, author, flag type (plagiarism/AI-content), confidence score, and highlighted passages
**And** the admin can: dismiss the flag (false positive), request corrections from the author (with specific feedback), or reject the article

### AC3: Clean Article Proceeds to Editorial Review

**Given** the plagiarism check completes with no issues
**When** the confidence scores are below the threshold
**Then** the article proceeds to editorial review automatically (Story 8.2 flow)
**And** the clean moderation report is stored for audit purposes

### AC4: Admin Content Moderation Dashboard

**Given** I am an admin
**When** I navigate to /admin/publication/moderation
**Then** I see all flagged articles with moderation actions available: unpublish (removes from public view, status -> ARCHIVED), flag for review (sends article back to EDITORIAL_REVIEW with admin notes), and request corrections (notifies author with specific required changes) (FR78)
**And** every moderation action is recorded in the audit log with: admin ID, action taken, reason, timestamp (NFR-S6)
**And** the author is notified of any moderation action with a clear, respectful explanation

### AC5: Unpublished Article Handling

**Given** an article is unpublished via moderation
**When** the status transitions to ARCHIVED
**Then** the article is removed from public pages and search results
**And** the article remains accessible to the author and admin in their respective dashboards
**And** the URL returns a 410 Gone status for SEO purposes
**And** the domain event `publication.article.moderated` is emitted

## Tasks / Subtasks

### Backend

- [x] **Task 1: Database Schema — ModerationReport Model** (AC: 1, 2, 3)
  - [x] 1.1 Add `ModerationReport` model to `apps/api/prisma/schema.prisma` in the `publication` schema
  - [x] 1.2 Add `moderationReports ModerationReport[]` relation to `Article` model
  - [x] 1.3 Generate migration SQL with `--create-only` (no DB connection required)

- [x] **Task 2: BullMQ Plagiarism Check Queue Setup** (AC: 1)
  - [x] 2.1 Register `plagiarism-check` and `plagiarism-check-dlq` queues in `publication.module.ts`
  - [x] 2.2 Import `BullModule` in publication module (follow notification.module.ts pattern)
  - [x] 2.3 Configure default job options: attempts 3, exponential backoff 1000ms, removeOnComplete true, removeOnFail false

- [x] **Task 3: Moderation Service** (AC: 1, 2, 3)
  - [x] 3.1 Create `moderation.service.ts` with: enqueuePlagiarismCheck, handleModerationResult, getModerationReport, getFlaggedArticles, adminDismissFlag, adminRequestCorrections, adminRejectArticle, adminUnpublishArticle
  - [x] 3.2 Listen to `publication.article.submitted` event — enqueue plagiarism check job (MUST run BEFORE editorial assignment; use higher-priority event or modify the event flow)
  - [x] 3.3 Listen to `publication.moderation.completed` event — if CLEAN, emit `publication.article.moderation.cleared` to trigger editorial assignment; if FLAGGED, hold article in SUBMITTED status with flag
  - [x] 3.4 Admin actions: dismiss flag (proceed to editorial), request corrections (notify author, status -> REVISION_REQUESTED), reject (status -> ARCHIVED)

- [x] **Task 4: Plagiarism Check Processor** (AC: 1)
  - [x] 4.1 Create `plagiarism-check.processor.ts` extending `WorkerHost` (follow notification.processor.ts pattern)
  - [x] 4.2 Implement text similarity check: compute basic n-gram fingerprints against existing published articles in the database
  - [x] 4.3 Implement AI-content detection: compute statistical features (perplexity variance proxy via sentence-length distribution, vocabulary richness, repetition patterns)
  - [x] 4.4 Save ModerationReport with results; emit `publication.moderation.completed` event
  - [x] 4.5 DLQ routing on max retries exhausted (same pattern as notification processor)

- [x] **Task 5: Modify Event Flow — Moderation Before Editorial** (AC: 1, 3)
  - [x] 5.1 The `editorial.service.ts` currently listens to `publication.article.submitted` to auto-assign editors. Change it to listen to `publication.article.moderation.cleared` instead
  - [x] 5.2 This ensures: SUBMITTED -> plagiarism check -> (if clean) -> editorial assignment -> EDITORIAL_REVIEW
  - [x] 5.3 If flagged: article stays SUBMITTED until admin resolves. On admin dismiss, emit `publication.article.moderation.cleared`

- [x] **Task 6: Admin Moderation Controller** (AC: 2, 4, 5)
  - [x] 6.1 Create `moderation-admin.controller.ts` at path `admin/publication/moderation` version 1
  - [x] 6.2 Endpoints: GET flagged articles (with pagination), GET moderation report by article, POST dismiss flag, POST request corrections, POST reject article, POST unpublish article
  - [x] 6.3 All endpoints guarded with `@CheckAbility((ability) => ability.can(Action.Manage, 'Article'))`
  - [x] 6.4 All admin actions emit `publication.article.moderated` event and create audit log entries

- [x] **Task 7: 410 Gone Handler for Unpublished Articles** (AC: 5)
  - [x] 7.1 In `public-article.controller.ts`, when article status is ARCHIVED, return 410 Gone instead of 404
  - [x] 7.2 Ensure articles with ARCHIVED status are excluded from sitemap and public listing queries

### Frontend

- [x] **Task 8: Shared Types — Moderation DTOs** (AC: 1, 2, 4)
  - [x] 8.1 Add to `packages/shared/src/types/article.types.ts`: ModerationReportDto, FlaggedArticleDto, ModerationActionDto, ArticleModerationCompletedEvent, ArticleModeratedEvent
  - [x] 8.2 Add moderation error codes to `packages/shared/src/constants/error-codes.ts`: ARTICLE_MODERATION_PENDING, ARTICLE_ALREADY_FLAGGED, ARTICLE_NOT_FLAGGED
  - [x] 8.3 Export new types from `packages/shared/src/index.ts`

- [x] **Task 9: Admin Moderation Page** (AC: 2, 4)
  - [x] 9.1 Create page at `apps/web/app/(admin)/admin/publication/moderation/page.tsx`
  - [x] 9.2 Add "Moderation" link to admin navigation in `apps/web/app/(admin)/layout.tsx`
  - [x] 9.3 Follow existing admin page pattern: metadata, title, description, wrapper component

- [x] **Task 10: Admin Moderation Dashboard Component** (AC: 2, 4)
  - [x] 10.1 Create `apps/web/components/features/publication/admin/moderation-dashboard.tsx` — orchestrator component
  - [x] 10.2 Create `apps/web/components/features/publication/admin/flagged-articles-table.tsx` — table with: article title, author, flag type badge (plagiarism/AI-content), confidence score, date, action buttons
  - [x] 10.3 Create `apps/web/components/features/publication/admin/moderation-detail-dialog.tsx` — modal showing: full moderation report, highlighted passages, confidence breakdown, action buttons (dismiss/request corrections/reject)
  - [x] 10.4 Create `apps/web/components/features/publication/admin/moderation-action-dialog.tsx` — confirmation dialog for moderation actions with reason textarea

- [x] **Task 11: Data Fetching Hooks** (AC: 2, 4)
  - [x] 11.1 Create `apps/web/hooks/use-moderation.ts` with: useFlaggedArticles (cursor-based pagination), useModerationReport, useDismissFlag mutation, useRequestCorrections mutation, useRejectArticle mutation, useUnpublishArticle mutation

### Testing

- [x] **Task 12: Backend Tests** (AC: 1, 2, 3, 4, 5)
  - [x] 12.1 `moderation.service.spec.ts`: enqueuePlagiarismCheck (2 tests), handleModerationResult with CLEAN (2 tests), handleModerationResult with FLAGGED (2 tests), adminDismissFlag (2 tests), adminRequestCorrections (2 tests), adminRejectArticle (2 tests), adminUnpublishArticle (2 tests), getFlaggedArticles pagination (1 test)
  - [x] 12.2 `plagiarism-check.processor.spec.ts`: process clean article (1 test), process flagged article (1 test), DLQ routing on failure (1 test), similarity detection (2 tests), AI-content detection (2 tests)

- [x] **Task 13: Frontend Component Tests** (AC: 2, 4)
  - [x] 13.1 `flagged-articles-table.test.tsx`: loading state, empty state, renders flagged articles, action buttons, pagination (9 tests)
  - [x] 13.2 `moderation-detail-dialog.test.tsx`: renders report details, highlighted passages, confidence scores, action buttons trigger callbacks (10 tests)

## Dev Notes

### Architecture Patterns — MUST FOLLOW

**API Response Envelope:** Use `createSuccessResponse(data, correlationId, pagination?)` from `apps/api/src/common/types/api-response.type.ts`.

**Authentication & Authorization:** All admin moderation endpoints MUST use `@UseGuards(JwtAuthGuard, AbilityGuard)` with `@CheckAbility((ability) => ability.can(Action.Manage, 'Article'))`. Admin role has `can(Action.Manage, 'all')` in CASL ability factory (`apps/api/src/modules/auth/casl/ability.factory.ts:132`).

**Error Handling:** Use `DomainException` from `apps/api/src/common/exceptions/domain.exception.ts` with error codes from `@edin/shared`.

**Event-Driven Flow (CRITICAL):** The current flow is `submitArticle()` -> emits `publication.article.submitted` -> `editorial.service.ts` listens and assigns editor. The NEW flow must insert moderation between submission and editorial assignment:

```
submitArticle() → emits 'publication.article.submitted'
    ↓
moderation.service listens → enqueues plagiarism-check job
    ↓
plagiarism-check.processor runs checks → saves ModerationReport → emits 'publication.moderation.completed'
    ↓
moderation.service listens to 'publication.moderation.completed'
    ├─ CLEAN: emits 'publication.article.moderation.cleared'
    └─ FLAGGED: holds article, notifies admin
    ↓
editorial.service listens to 'publication.article.moderation.cleared' (CHANGED from 'publication.article.submitted')
    ↓
assigns editor → EDITORIAL_REVIEW
```

**BullMQ Queue Pattern:** Follow `apps/api/src/modules/notification/notification.module.ts` for queue registration and `notification.processor.ts` for WorkerHost processor pattern. Use `@InjectQueue('plagiarism-check')` and `@InjectQueue('plagiarism-check-dlq')`.

**Logging:** All service methods MUST include structured logging with `module: 'publication'`, entity IDs, and correlationId.

### Database Schema Additions

```prisma
model ModerationReport {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  articleId       String   @map("article_id") @db.Uuid
  plagiarismScore Decimal  @default(0) @map("plagiarism_score") @db.Decimal(5, 2)
  aiContentScore  Decimal  @default(0) @map("ai_content_score") @db.Decimal(5, 2)
  flagType        String?  @map("flag_type") @db.VarChar(50) // 'PLAGIARISM', 'AI_CONTENT', 'BOTH', null if clean
  isFlagged       Boolean  @default(false) @map("is_flagged")
  flaggedPassages Json?    @map("flagged_passages") // Array of { start, end, text, source?, type }
  status          String   @default("PENDING") @db.VarChar(20) // PENDING, CLEAN, FLAGGED, DISMISSED, REJECTED
  adminId         String?  @map("admin_id") @db.Uuid
  adminAction     String?  @map("admin_action") @db.VarChar(50) // DISMISS, REQUEST_CORRECTIONS, REJECT
  adminReason     String?  @map("admin_reason") @db.Text
  resolvedAt      DateTime? @map("resolved_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  article Article     @relation(fields: [articleId], references: [id], onDelete: Cascade)
  admin   Contributor? @relation("ModerationAdmin", fields: [adminId], references: [id])

  @@index([articleId], map: "idx_moderation_reports_article_id")
  @@index([isFlagged, status], map: "idx_moderation_reports_flagged_status")
  @@map("moderation_reports")
  @@schema("publication")
}
```

Add to Article model: `moderationReports ModerationReport[]`
Add to Contributor model: `moderationActions ModerationReport[] @relation("ModerationAdmin")`

### Existing Code to Modify

| File                                                            | Change                                                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `apps/api/prisma/schema.prisma`                                 | Add ModerationReport model + relations to Article and Contributor                                                        |
| `apps/api/src/modules/publication/publication.module.ts`        | Import BullModule, register queues, register ModerationService, ModerationAdminController, PlagiarismCheckProcessor      |
| `apps/api/src/modules/publication/editorial.service.ts`         | **CRITICAL:** Change `@OnEvent('publication.article.submitted')` to `@OnEvent('publication.article.moderation.cleared')` |
| `apps/api/src/modules/publication/public-article.controller.ts` | Return 410 Gone for ARCHIVED articles                                                                                    |
| `packages/shared/src/types/article.types.ts`                    | Add moderation DTOs and event types                                                                                      |
| `packages/shared/src/constants/error-codes.ts`                  | Add moderation error codes                                                                                               |
| `packages/shared/src/index.ts`                                  | Export new types                                                                                                         |
| `apps/web/app/(admin)/layout.tsx`                               | Add "Moderation" nav item pointing to `/admin/publication/moderation`                                                    |
| `apps/web/hooks/use-article.ts` or new `use-moderation.ts`      | Add moderation data fetching hooks                                                                                       |

### Module Structure

```
apps/api/src/modules/publication/
├── publication.module.ts                  (UPDATE: BullModule import, new providers/controllers)
├── article.service.ts                     (existing — DO NOT modify)
├── article.controller.ts                  (existing — DO NOT modify)
├── editorial.service.ts                   (UPDATE: change event listener from 'publication.article.submitted' to 'publication.article.moderation.cleared')
├── editorial.controller.ts               (existing — DO NOT modify)
├── editor-eligibility.service.ts          (existing — DO NOT modify)
├── editor-eligibility.controller.ts       (existing — DO NOT modify)
├── public-article.controller.ts           (UPDATE: 410 Gone for ARCHIVED)
├── article-metrics.service.ts             (existing — DO NOT modify)
├── article-metrics.controller.ts          (existing — DO NOT modify)
├── article-reward.service.ts              (existing — DO NOT modify)
├── moderation.service.ts                  (NEW — plagiarism check enqueue, moderation result handling, admin actions)
├── moderation.service.spec.ts             (NEW — tests)
├── moderation-admin.controller.ts         (NEW — admin endpoints for moderation)
├── plagiarism-check.processor.ts          (NEW — BullMQ processor)
├── plagiarism-check.processor.spec.ts     (NEW — tests)

apps/web/app/(admin)/admin/publication/
├── moderation/page.tsx                    (NEW — admin moderation page)

apps/web/components/features/publication/admin/
├── moderation-dashboard.tsx               (NEW — orchestrator)
├── flagged-articles-table.tsx             (NEW — table with actions)
├── flagged-articles-table.test.tsx        (NEW)
├── moderation-detail-dialog.tsx           (NEW — report detail modal)
├── moderation-detail-dialog.test.tsx      (NEW)
├── moderation-action-dialog.tsx           (NEW — confirmation modal)

apps/web/hooks/
├── use-moderation.ts                      (NEW — data fetching hooks)
```

### Plagiarism Detection Implementation

The plagiarism detection is a Phase 1 implementation using local heuristics (no external API calls). This keeps the system self-contained and avoids third-party dependencies:

**Text Similarity (Plagiarism Score):**

- Extract n-grams (3-word sliding window) from submitted article body
- Compare against n-grams from all PUBLISHED articles in the database
- Compute Jaccard similarity coefficient
- Flag if similarity exceeds configurable threshold (default: 0.3 / 30%)
- Store matched passages with source article references

**AI-Content Detection (AI Content Score):**

- Sentence length standard deviation (AI text tends toward uniform sentence length)
- Vocabulary richness (type-token ratio — AI text often has lower diversity)
- Repetition patterns (bigram/trigram repetition rate)
- Compute a composite heuristic score from these features
- Flag if score exceeds configurable threshold (default: 0.6 / 60%)

**Important:** These are heuristic indicators, not definitive detections. The moderation report should clearly communicate confidence levels and encourage admin human judgment.

### Configurable Thresholds

Store thresholds in the `PlatformSettings` table (already exists, used by settings.service.ts):

```typescript
const MODERATION_SETTINGS = {
  plagiarismThreshold: 0.3, // 30% similarity
  aiContentThreshold: 0.6, // 60% confidence
  autoPassBelow: 0.1, // Skip flagging below 10% on both
};
```

Load via existing `SettingsService` pattern from `apps/api/src/modules/settings/settings.service.ts`.

### Anti-Patterns to Avoid

- **DO NOT** call external plagiarism APIs — Phase 1 uses local heuristics only
- **DO NOT** block article submission on plagiarism check — it runs asynchronously via BullMQ
- **DO NOT** modify `article.service.ts` or the `submitArticle()` method — moderation plugs into the event flow
- **DO NOT** add a new article status for moderation — use the ModerationReport.status field as a parallel track; article stays SUBMITTED while moderation runs
- **DO NOT** create a separate NestJS module — add to existing `publication.module.ts`
- **DO NOT** skip audit logging for moderation actions — every admin action MUST be logged (NFR-S6)
- **DO NOT** show raw confidence scores to authors — only admins see the report. Authors only see respectful messages about corrections needed
- **DO NOT** auto-reject articles — always require admin human judgment for flagged content
- **DO NOT** use `@nestjs/bull` — use `@nestjs/bullmq` (project uses BullMQ, not Bull)
- **DO NOT** use `@Process()` decorator — use `WorkerHost` class with `process()` method (BullMQ pattern)

### UX Design Guidelines — Admin Moderation

**Admin Moderation Page:**

- Table layout matching existing admin patterns (feedback monitoring, review queue)
- Flag type displayed as color-coded badge: plagiarism (red-ish terra rose), AI-content (amber)
- Confidence score as percentage with visual bar
- Quick-action buttons on each row: "View Report", "Dismiss", "Act"
- Detailed report in modal/dialog (not a separate page)

**Color tokens:** Use existing CSS custom properties: `var(--color-brand-*)`, `var(--spacing-*)`, `var(--font-*)`.

**Admin Navigation:** Add after existing "Review Queue" link in `ADMIN_NAV_ITEMS`:

```typescript
{ href: '/admin/publication/moderation', label: 'Moderation' },
```

### Previous Story Learnings (from Story 8-5)

- **createSuccessResponse pattern:** Use `createSuccessResponse(data, req.correlationId)` with correlationId from request middleware
- **Service test pattern:** Mock `PrismaService` methods, use `@nestjs/testing` module builder
- **Controller route ordering:** Static routes (e.g., `flagged/`) MUST be declared before dynamic routes (`:id/`) to avoid routing conflicts
- **Decimal handling:** Pass plain numbers to Prisma, not Prisma Decimal imports
- **Event listener pattern:** `@OnEvent('event.name')` with try/catch and structured logging
- **CSS custom properties:** Use `var(--color-*)`, `var(--spacing-*)` — NOT hardcoded values
- **Hook pattern:** TanStack Query with queryKey arrays, useMutation with onSuccess invalidation
- **Component structure:** Dashboard orchestrator component wrapping sub-components

### Testing Standards

- **Vitest** for all tests (unit + component)
- **@nestjs/testing** for NestJS service tests
- Mock PrismaService, mock Queue (BullMQ), mock EventEmitter2
- Frontend: Vitest + React Testing Library
- Test plagiarism detection with known similar/dissimilar texts
- Test admin actions (dismiss, request corrections, reject) with proper state transitions
- Test event flow: submitted -> moderation -> cleared/flagged
- Test 410 Gone response for archived articles
- Co-locate tests: `*.spec.ts` for backend, `*.test.tsx` for frontend

### Performance Considerations

- Plagiarism check runs asynchronously via BullMQ — never blocks submission
- N-gram comparison: batch-load published articles in chunks, not all at once
- Index on `moderation_reports.is_flagged, status` for efficient admin dashboard queries
- Admin moderation page uses cursor-based pagination (consistent with platform pattern)

### Project Structure Notes

- Admin moderation components go in `components/features/publication/admin/` — alongside existing admin components
- Admin page at `(admin)/admin/publication/moderation/` — nested under publication admin section
- Hooks in `hooks/use-moderation.ts` — separate from existing `use-article.ts` to keep files focused
- No variances with existing project structure

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 8, Story 8.6]
- [Source: _bmad-output/planning-artifacts/prd.md — FR78 (content moderation), FR79 (plagiarism detection)]
- [Source: _bmad-output/planning-artifacts/architecture.md — BullMQ queues (plagiarism-check), Publication Module, EventEmitter2 patterns]
- [Source: apps/api/src/modules/publication/editorial.service.ts — Current event listener on publication.article.submitted]
- [Source: apps/api/src/modules/publication/article.service.ts — submitArticle() method and event emission]
- [Source: apps/api/src/modules/publication/publication.module.ts — Module registration pattern]
- [Source: apps/api/src/modules/notification/notification.module.ts — BullMQ queue registration pattern]
- [Source: apps/api/src/modules/notification/notification.processor.ts — WorkerHost processor pattern with DLQ]
- [Source: apps/api/src/modules/auth/casl/ability.factory.ts — Admin Manage all ability]
- [Source: apps/web/app/(admin)/layout.tsx — Admin navigation items]
- [Source: apps/web/components/features/feedback/admin/ — Admin component patterns (table, dialog, dashboard)]
- [Source: packages/shared/src/types/article.types.ts — Existing article types to extend]
- [Source: packages/shared/src/constants/error-codes.ts — Error code pattern]
- [Source: _bmad-output/implementation-artifacts/8-5-publication-metrics-and-reward-split.md — Previous story learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- All 13 tasks completed successfully
- Full test suite passes: 880 API tests + 537 web tests = 1,417 total (0 failures)
- Fixed regression in `editorial.service.spec.ts` — renamed `handleArticleSubmitted` to `handleModerationCleared` to match the event flow change
- 41 new tests added: 22 backend (moderation.service.spec.ts + plagiarism-check.processor.spec.ts) + 19 frontend (flagged-articles-table.test.tsx + moderation-detail-dialog.test.tsx)

### File List

**New Files:**

- `apps/api/prisma/migrations/20260310950000_add_moderation_reports/migration.sql`
- `apps/api/src/modules/publication/moderation.service.ts`
- `apps/api/src/modules/publication/moderation.service.spec.ts`
- `apps/api/src/modules/publication/plagiarism-check.processor.ts`
- `apps/api/src/modules/publication/plagiarism-check.processor.spec.ts`
- `apps/api/src/modules/publication/moderation-admin.controller.ts`
- `apps/web/app/(admin)/admin/publication/moderation/page.tsx`
- `apps/web/components/features/publication/admin/moderation-dashboard.tsx`
- `apps/web/components/features/publication/admin/flagged-articles-table.tsx`
- `apps/web/components/features/publication/admin/flagged-articles-table.test.tsx`
- `apps/web/components/features/publication/admin/moderation-detail-dialog.tsx`
- `apps/web/components/features/publication/admin/moderation-detail-dialog.test.tsx`
- `apps/web/components/features/publication/admin/moderation-action-dialog.tsx`
- `apps/web/hooks/use-moderation.ts`

**Modified Files:**

- `apps/api/prisma/schema.prisma` — Added ModerationReport model + relations
- `apps/api/src/modules/publication/publication.module.ts` — BullModule import, queues, new providers/controllers
- `apps/api/src/modules/publication/editorial.service.ts` — Changed event listener from `publication.article.submitted` to `publication.article.moderation.cleared`
- `apps/api/src/modules/publication/editorial.service.spec.ts` — Updated test to use `handleModerationCleared`
- `apps/api/src/modules/publication/public-article.controller.ts` — Added 410 Gone for ARCHIVED articles
- `packages/shared/src/types/article.types.ts` — Added moderation DTOs and event types
- `packages/shared/src/constants/error-codes.ts` — Added moderation error codes
- `packages/shared/src/index.ts` — Exported new types and constants
- `apps/web/app/(admin)/layout.tsx` — Added Moderation nav item
