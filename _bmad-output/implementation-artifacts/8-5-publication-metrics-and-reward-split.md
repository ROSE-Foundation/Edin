# Story 8.5: Publication Metrics & Reward Split

Status: done

## Story

As an author or editor,
I want to see publication metrics and understand the editorial reward split,
so that I can track the reach of my published work and see how editorial collaboration is valued.

## Acceptance Criteria

### AC1: Author Publication Metrics Dashboard

**Given** I am an author with a published article
**When** I navigate to /dashboard/publication/:id/metrics
**Then** I see publication metrics including: view count, external referral sources (where readers are coming from), and reader engagement indicators (time on page, scroll depth) (FR76)
**And** metrics are displayed with a 48-hour delay after publication (no real-time metric anxiety)
**And** the metrics use organic, garden-inspired visual language — growth over time, not raw counters

### AC2: Reward Split Display for Authors

**Given** my article has been published
**When** the article receives a content reward based on its AI evaluation score
**Then** 80% of the content reward is allocated to me (the author) and 20% is allocated to the assigned editor (FR71)
**And** the reward split is visible on my publication dashboard with clear labeling: "Author reward: 80%" alongside the editor's name
**And** the editor sees their 20% allocation on their editorial dashboard with the article title and author name

### AC3: Editor Editorial Dashboard

**Given** I am an editor with published articles I reviewed
**When** I navigate to /dashboard/publication/editorial
**Then** I see a summary of my editorial contributions: articles reviewed, articles published, and accumulated editorial reward allocations
**And** each published article shows the reward split clearly (FR71)

### AC4: Metrics API

**Given** publication metrics are tracked
**When** the metrics data is queried via GET /api/v1/articles/:id/metrics
**Then** the endpoint requires authentication (author, editor, or admin only)
**And** the response follows the standard API envelope format
**And** the endpoint responds within the 95th percentile <500ms target (NFR-P4)

## Tasks / Subtasks

### Backend

- [x] **Task 1: Article Metrics Schema & Migration** (AC: 1, 4)
  - [x] 1.1 Add `ArticleView` model to `apps/api/prisma/schema.prisma` in the `publication` schema
  - [x] 1.2 Add `ArticleRewardAllocation` model to Prisma schema
  - [x] 1.3 Add relations to Article model: `views ArticleView[]`, `rewardAllocation ArticleRewardAllocation?`
  - [x] 1.4 Generate migration SQL (create-only, no DB connection required)

- [x] **Task 2: Article Metrics Service** (AC: 1, 4)
  - [x] 2.1 Create `article-metrics.service.ts` with recordView, updateEngagement, getMetrics, getAuthorMetricsSummary

- [x] **Task 3: Article Reward Allocation Service** (AC: 2, 3)
  - [x] 3.1 Create `article-reward.service.ts` with allocateReward, getArticleRewardAllocation, getAuthorRewardSummary, getEditorRewardSummary
  - [x] 3.2 Event listener on `publication.article.published` (article evaluation not yet in pipeline; allocates with null score on publish)

- [x] **Task 4: Metrics API Endpoints** (AC: 1, 2, 3, 4)
  - [x] 4.1 Create `article-metrics.controller.ts` with 6 endpoints (views, engagement, metrics, reward-allocation, my/reward-summary, editorial/reward-summary)
  - [x] 4.2 visitorHash generated server-side from IP+User-Agent via SHA-256
  - [x] 4.3 Registered in publication.module.ts

- [x] **Task 5: View Tracking Middleware / Public Endpoint** (AC: 1)
  - [x] 5.1 POST views returns 204, generates visitorHash server-side, dedup via service

### Frontend

- [x] **Task 6: Shared Types & Schemas** (AC: 1, 2, 3)
  - [x] 6.1 Added ArticleMetricsDto, ArticleRewardAllocationDto, AuthorRewardSummaryDto, EditorRewardSummaryDto, ReferralSourceDto, DailyViewsDto
  - [x] 6.2 Exported new types from index.ts; added ARTICLE_METRICS_EMBARGOED, ARTICLE_METRICS_ACCESS_DENIED error codes

- [x] **Task 7: Publication Metrics Page** (AC: 1)
  - [x] 7.1 Created metrics page with loading/error states, centered layout
  - [x] 7.2 Created article-metrics-view.tsx with embargo, reach, engagement, referral, growth sections
  - [x] 7.3 Created growth-curve-chart.tsx with Recharts AreaChart, natural interpolation, data table toggle

- [x] **Task 8: Reward Split Display — Author Dashboard** (AC: 2)
  - [x] 8.1 Added "View Metrics" link on published article cards in draft-card.tsx
  - [x] 8.2 Created reward-split-badge.tsx with compact and full modes

- [x] **Task 9: Editor Editorial Dashboard Enhancement** (AC: 3)
  - [x] 9.1 Added EditorRewardSummary section to publication page.tsx
  - [x] 9.2 Created editor-reward-summary.tsx with allocation list, summary stats, empty state

- [x] **Task 10: View Tracking Client-Side** (AC: 1)
  - [x] 10.1 Created view-tracker.tsx with sendBeacon for engagement, mounted in article reading page

- [x] **Task 11: Data Fetching Hooks** (AC: 1, 2, 3)
  - [x] 11.1 Added useArticleMetrics, useArticleRewardAllocation, useAuthorRewardSummary, useEditorRewardSummary hooks

### Testing

- [x] **Task 12: Backend Tests** (AC: 1, 2, 3, 4)
  - [x] 12.1 article-metrics.service.spec.ts: 12 tests (recordView: 4, updateEngagement: 3, getMetrics: 5)
  - [x] 12.2 article-reward.service.spec.ts: 11 tests (allocateReward: 4, getArticleRewardAllocation: 2, getAuthorRewardSummary: 2, getEditorRewardSummary: 1, handleArticlePublished: 2)

- [x] **Task 13: Frontend Component Tests** (AC: 1, 2, 3)
  - [x] 13.1 article-metrics-view.test.tsx: 8 tests (embargo, reach, engagement, referral, reward split, hiding sections)
  - [x] 13.2 reward-split-badge.test.tsx: 7 tests (full mode with/without editor/score, compact mode)
  - [x] 13.3 editor-reward-summary.test.tsx: 6 tests (empty state, summary stats, allocations, scores)

### Dependencies

- [x] **Task 14: Install Recharts** (AC: 1)
  - [x] 14.1 recharts already present in apps/web/package.json (added in prior story)
  - [x] 14.2 Verified: client component only with 'use client' directive

## Dev Notes

### Architecture Patterns — MUST FOLLOW

**API Response Envelope:** Use `createSuccessResponse(data, correlationId, pagination?)` from `apps/api/src/common/types/api-response.type.ts`.

**Authentication Guard:** Metrics and reward endpoints MUST use `@UseGuards(JwtAuthGuard)`. View recording endpoints are public but rate-limited.

**Error Handling:** Use `DomainException` from `apps/api/src/common/exceptions/domain.exception.ts`. Error codes: `ARTICLE_NOT_FOUND`, `ARTICLE_METRICS_EMBARGOED`, `UNAUTHORIZED_METRICS_ACCESS`.

**Event-Driven Reward Allocation:** The reward allocation MUST be triggered by an event when an article evaluation completes. Check if `evaluation.score.completed` event includes enough data (contributionType, entityId). If articles aren't yet evaluated (evaluation pipeline currently only handles COMMIT, PULL_REQUEST, DOCUMENTATION), create the allocation infrastructure and hook it up once article evaluation is available. The allocation service should be callable both event-driven and manually via admin.

**48-Hour Embargo Logic:**

```typescript
const embargoEnd = new Date(article.publishedAt.getTime() + 48 * 60 * 60 * 1000);
const isEmbargoed = new Date() < embargoEnd;
```

### Database Schema Additions

```prisma
model ArticleView {
  id                 String   @id @default(uuid()) @db.Uuid
  articleId          String   @db.Uuid
  viewedAt           DateTime @default(now())
  referralSource     String?
  timeOnPageSeconds  Int?
  scrollDepthPercent Int?
  visitorHash        String

  article Article @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@index([articleId, viewedAt(sort: Desc)], map: "idx_article_views_article_viewed_at")
  @@index([articleId, visitorHash], map: "idx_article_views_dedup")
  @@schema("publication")
}

model ArticleRewardAllocation {
  id                String   @id @default(uuid()) @db.Uuid
  articleId         String   @unique @db.Uuid
  evaluationId      String?  @db.Uuid
  compositeScore    Decimal? @db.Decimal(5, 2)
  authorId          String   @db.Uuid
  editorId          String?  @db.Uuid
  authorSharePercent Int     @default(80)
  editorSharePercent Int     @default(20)
  allocatedAt       DateTime @default(now())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  article Article     @relation(fields: [articleId], references: [id], onDelete: Cascade)
  author  Contributor @relation("AuthorRewardAllocations", fields: [authorId], references: [id])
  editor  Contributor? @relation("EditorRewardAllocations", fields: [editorId], references: [id])

  @@index([authorId], map: "idx_article_reward_author")
  @@index([editorId], map: "idx_article_reward_editor")
  @@schema("publication")
}
```

Add to Article model: `views ArticleView[]` and `rewardAllocation ArticleRewardAllocation?`
Add to Contributor model: `authorRewardAllocations ArticleRewardAllocation[] @relation("AuthorRewardAllocations")` and `editorRewardAllocations ArticleRewardAllocation[] @relation("EditorRewardAllocations")`

### Existing Code to Extend

| File                                                     | Change                                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `apps/api/prisma/schema.prisma`                          | Add ArticleView, ArticleRewardAllocation models + relations                                       |
| `apps/api/src/modules/publication/publication.module.ts` | Register ArticleMetricsService, ArticleRewardService, ArticleMetricsController                    |
| `apps/web/app/(dashboard)/publication/page.tsx`          | Add "View Metrics" links + reward indicators on published articles + editor reward section        |
| `apps/web/hooks/use-article.ts`                          | Add useArticleMetrics, useArticleRewardAllocation, useAuthorRewardSummary, useEditorRewardSummary |
| `packages/shared/src/types/article.types.ts`             | Add ArticleMetricsDto, ArticleRewardAllocationDto, AuthorRewardSummaryDto, EditorRewardSummaryDto |
| `packages/shared/src/index.ts`                           | Export new types                                                                                  |

### Module Structure

```
apps/api/src/modules/publication/
├── publication.module.ts                    (UPDATE: register new services/controllers)
├── article.controller.ts                   (existing — DO NOT modify)
├── article.service.ts                       (existing — DO NOT modify)
├── public-article.controller.ts            (existing — DO NOT modify)
├── editorial.controller.ts                 (existing — DO NOT modify)
├── editorial.service.ts                    (existing — DO NOT modify)
├── editor-eligibility.controller.ts        (existing — DO NOT modify)
├── editor-eligibility.service.ts           (existing — DO NOT modify)
├── article-metrics.service.ts              (NEW — view tracking, metrics aggregation)
├── article-metrics.service.spec.ts         (NEW — tests)
├── article-metrics.controller.ts           (NEW — metrics API endpoints)
├── article-reward.service.ts               (NEW — reward allocation logic)
├── article-reward.service.spec.ts          (NEW — tests)

apps/web/app/(dashboard)/publication/
├── page.tsx                                 (UPDATE: add metrics links + reward indicators)
├── [id]/metrics/page.tsx                   (NEW — publication metrics page)

apps/web/components/features/publication/
├── metrics/
│   ├── article-metrics-view.tsx            (NEW — metrics display)
│   ├── article-metrics-view.test.tsx       (NEW)
│   ├── growth-curve-chart.tsx              (NEW — organic Recharts visualization)
│   ├── reward-split-badge.tsx              (NEW — inline reward split display)
│   ├── reward-split-badge.test.tsx         (NEW)
│   ├── editor-reward-summary.tsx           (NEW — editor rewards dashboard)
│   ├── editor-reward-summary.test.tsx      (NEW)
├── article-reading/
│   ├── view-tracker.tsx                    (NEW — client-side view/engagement tracking)
```

### Anti-Patterns to Avoid

- **DO NOT** show real-time metrics — enforce 48-hour embargo after publication
- **DO NOT** use raw counters or bar charts — use organic, garden-inspired visual language per UX spec
- **DO NOT** store PII (IP addresses, user agents) — hash them server-side for deduplication only
- **DO NOT** block article page rendering on view tracking — fire-and-forget async calls
- **DO NOT** show "pending" or "0" metrics during embargo — show a gentle garden-themed embargo message
- **DO NOT** hardcode the 80/20 split — store in the allocation record for future configurability
- **DO NOT** create a separate NestJS module — add to existing `publication.module.ts`
- **DO NOT** modify existing article endpoints — create new dedicated metrics/reward endpoints
- **DO NOT** implement actual token/reward distribution — this is display/tracking only (Phase 1)
- **DO NOT** use `@tiptap/react` SSR rendering for metrics — metrics are a separate concern
- **DO NOT** add Recharts to SSR components — it's client-side only, use `'use client'` directive

### UX Design Guidelines — Garden-Inspired Metrics

**Language patterns (from UX spec):**

- "X readers discovered your article" (not "X views")
- "Readers spent an average of X minutes with your words" (not "Avg. time: Xm")
- "Your article is growing roots. Metrics will bloom 48 hours after publication." (embargo)
- "Where readers found you" (referral sources heading)
- "Your editorial contributions" (editor dashboard, not "reward allocations")

**Visual patterns:**

- Growth curves with organic bezier interpolation (Recharts `type="natural"`)
- Gradient fills fading from brand accent to transparent
- Minimal axis lines — dates on x-axis, no y-axis gridlines
- No counters/tickers — contextual numbers embedded in sentences
- Serif headings for section titles, sans-serif for data labels

**Color tokens:**

- Chart curve: `var(--color-brand-accent)`
- Background gradient: `var(--color-brand-accent)` at 20% opacity
- Text: `var(--color-brand-primary)` for headings, `var(--color-brand-secondary)` for secondary
- Domain colors: use existing `DOMAIN_COLORS` from `apps/web/lib/domain-colors.ts`

### View Tracking Implementation

**Client-side tracking (ViewTracker component):**

```typescript
// Record view on mount
useEffect(() => {
  fetch(`/api/v1/articles/${articleId}/metrics/views`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referralSource: document.referrer || null }),
  }).catch(() => {}); // Fire-and-forget
}, [articleId]);

// Track engagement on unmount
useEffect(() => {
  const startTime = Date.now();
  const handleUnload = () => {
    const timeOnPage = Math.floor((Date.now() - startTime) / 1000);
    const scrollDepth = Math.floor(
      (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100,
    );
    navigator.sendBeacon(
      `/api/v1/articles/${articleId}/metrics/engagement`,
      JSON.stringify({ timeOnPageSeconds: timeOnPage, scrollDepthPercent: scrollDepth }),
    );
  };
  window.addEventListener('beforeunload', handleUnload);
  return () => window.removeEventListener('beforeunload', handleUnload);
}, [articleId]);
```

**Server-side deduplication:**

```typescript
import { createHash } from 'crypto';

function generateVisitorHash(ip: string, userAgent: string): string {
  return createHash('sha256').update(`${ip}:${userAgent}`).digest('hex').substring(0, 16);
}
```

### Evaluation Integration Notes

The evaluation pipeline currently handles COMMIT, PULL_REQUEST, and DOCUMENTATION contribution types. Article evaluation is NOT yet implemented. For this story:

1. Create the `ArticleRewardAllocation` infrastructure
2. Wire up the event listener for future article evaluation events
3. The `allocateReward` method should be callable manually or via event
4. UI should gracefully handle `compositeScore: null` (no evaluation yet) — show "Evaluation pending" or omit the score section

### Dependencies to Install

**Frontend (apps/web):**

- `recharts` — for organic growth curve visualizations (client-side charting library, React-compatible)

**Backend (apps/api):**

- No new dependencies needed

### Testing Standards

- **Vitest** for all tests (unit + component)
- **@nestjs/testing** for NestJS service tests
- Mock PrismaService in service tests
- Frontend: Vitest + React Testing Library
- Test embargo logic with time manipulation (mock Date.now())
- Test deduplication logic (same visitorHash within 24h)
- Test 80/20 split calculation and no-editor edge case
- Test organic language rendering in component tests
- Test Recharts chart renders with mock data (shallow rendering, mock Recharts)

### Previous Story Learnings (from Story 8-4)

- **Public endpoints:** Created successfully as separate `public-article.controller.ts` — follow same pattern for view recording (public, no auth)
- **SSR pattern:** Server component fetches initial data, passes to client component — follow for metrics page
- **Tiptap renderer:** Already working in read-only mode — view tracker must not interfere with article reading experience
- **Domain colors:** Use `DOMAIN_COLORS` from `apps/web/lib/domain-colors.ts`
- **Response helper:** `createSuccessResponse(data, req.correlationId)` — correlationId from request middleware
- **CSS custom properties:** Use `var(--color-*)`, `var(--spacing-*)`, `var(--font-*)` — NOT hardcoded values
- **Hook pattern:** TanStack Query with `queryKey` arrays, `useMutation` with `onSuccess` invalidation
- **Evaluation display:** Currently null — evaluationScore and evaluationNarrative are placeholders in article service

### Performance Considerations

- **View tracking:** Fire-and-forget, async, must not block article rendering
- **Beacon API:** Use `navigator.sendBeacon()` for engagement data on page unload — reliable even during navigation
- **Metrics aggregation:** Aggregate queries on indexed columns — `articleId + viewedAt` index covers listing and time-range queries
- **Embargo check:** Simple date comparison, no DB query needed
- **Rate limiting:** View recording endpoint: 10 req/min per IP to prevent abuse
- **Recharts:** Client-side only, lazy-loaded in metrics page — no SSR penalty

### Project Structure Notes

- Metrics components go in `components/features/publication/metrics/` — new directory
- View tracker goes in `components/features/publication/article-reading/` — alongside existing reading components
- Metrics page at `(dashboard)/publication/[id]/metrics/` — nested under existing publication route
- No variances with existing project structure

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 8, Story 8.5]
- [Source: _bmad-output/planning-artifacts/prd.md — FR71 (reward split), FR76 (publication metrics)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Reward Module, Publication Module, Event Flow]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Garden-inspired metrics, organic visualization, TrajectoryVisualization component, 48h embargo]
- [Source: _bmad-output/implementation-artifacts/8-4-public-article-reading-experience.md — Previous story patterns, file structure, evaluation placeholders]
- [Source: apps/api/prisma/schema.prisma — Article model, Evaluation model, no existing reward models]
- [Source: apps/api/src/modules/publication/article.service.ts — Existing methods, evaluation placeholder nulls]
- [Source: apps/api/src/modules/publication/public-article.controller.ts — Public endpoint pattern]
- [Source: apps/api/src/modules/publication/publication.module.ts — Module registration pattern]
- [Source: apps/api/src/modules/evaluation/evaluation.service.ts — Evaluation event handling, contribution types]
- [Source: apps/web/app/(dashboard)/publication/page.tsx — Existing publication dashboard, editor dashboard section]
- [Source: apps/web/hooks/use-article.ts — Existing article hooks, TanStack Query patterns]
- [Source: apps/web/lib/domain-colors.ts — Domain color mapping utility]
- [Source: packages/shared/src/types/article.types.ts — Existing public article DTOs]
- [Source: packages/shared/src/types/evaluation.types.ts — Evaluation types, dimension keys]
- [Source: packages/shared/src/types/metrics.types.ts — Existing PlatformMetrics types]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Decimal import error: Removed Prisma runtime Decimal import, passed plain numbers instead
- Event handler: Changed from `evaluation.score.completed` to `publication.article.published` (article evaluation not yet in pipeline)
- Recharts Tooltip formatter type: Used inferred type to match existing codebase pattern

### Completion Notes List

- All 14 tasks completed with 45 passing tests (24 backend + 21 frontend)
- Reward allocation triggers on `publication.article.published` with null score; ready for future evaluation integration
- Migration created with `--create-only` (no live DB required)
- Pre-existing TS errors in unrelated files (activity.service.ts, evaluation-rubric.service.ts) confirmed not caused by this story

**Code Review Fixes Applied:**

- H1: Reordered controller routes — static `my/` and `editorial/` routes now declared before dynamic `:id/*` routes
- H2: Added authorization check to `getArticleRewardAllocation` — only author, editor, or admin can access
- H3: Fixed double beacon firing in ViewTracker — removed duplicate `sendEngagement()` call from cleanup function
- M1: Replaced in-memory `getUniqueViews` with `$queryRaw COUNT(DISTINCT)` for scalability
- M2: Replaced in-memory `getDailyViews` with `$queryRaw DATE() GROUP BY` aggregation
- M3: Fixed shared `groupBy` mock — now uses separate `$queryRaw` mocks with `mockResolvedValueOnce`
- M4: Removed redundant `compositeScore !== null ? compositeScore : null` ternary
- M5: Fixed `totalReviewed` count to filter by completed review statuses (APPROVED, PUBLISHED, ARCHIVED)

### File List

**New files:**

- `apps/api/prisma/migrations/20260310940000_add_article_views_and_reward_allocations/migration.sql`
- `apps/api/src/modules/publication/article-metrics.service.ts`
- `apps/api/src/modules/publication/article-metrics.service.spec.ts`
- `apps/api/src/modules/publication/article-metrics.controller.ts`
- `apps/api/src/modules/publication/article-reward.service.ts`
- `apps/api/src/modules/publication/article-reward.service.spec.ts`
- `apps/web/app/(dashboard)/publication/[id]/metrics/page.tsx`
- `apps/web/components/features/publication/metrics/article-metrics-view.tsx`
- `apps/web/components/features/publication/metrics/article-metrics-view.test.tsx`
- `apps/web/components/features/publication/metrics/growth-curve-chart.tsx`
- `apps/web/components/features/publication/metrics/reward-split-badge.tsx`
- `apps/web/components/features/publication/metrics/reward-split-badge.test.tsx`
- `apps/web/components/features/publication/metrics/editor-reward-summary.tsx`
- `apps/web/components/features/publication/metrics/editor-reward-summary.test.tsx`
- `apps/web/components/features/publication/article-reading/view-tracker.tsx`

**Modified files:**

- `apps/api/prisma/schema.prisma` — Added ArticleView, ArticleRewardAllocation models + relations
- `apps/api/src/modules/publication/publication.module.ts` — Registered new controller/services
- `apps/web/app/(dashboard)/publication/page.tsx` — Added EditorRewardSummary section
- `apps/web/app/(public)/articles/[slug]/page.tsx` — Added ViewTracker component
- `apps/web/components/features/publication/article-list/draft-card.tsx` — Added "View Metrics" link
- `apps/web/hooks/use-article.ts` — Added 4 new hooks
- `packages/shared/src/types/article.types.ts` — Added 6 new DTO types
- `packages/shared/src/constants/error-codes.ts` — Added 2 new error codes
- `packages/shared/src/index.ts` — Exported new types
