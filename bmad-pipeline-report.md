# BMAD Pipeline Report: Story 8-5

**Story:** 8-5-publication-metrics-and-reward-split
**Epic:** 8 - Publication Platform
**Pipeline:** bmad-cycle (create-story -> dev-story -> code-review)
**Date:** 2026-03-10
**Model:** Claude Opus 4.6

## Pipeline Steps

### Step 1: Create Story

- **Status:** Completed
- **Output:** `_bmad-output/implementation-artifacts/8-5-publication-metrics-and-reward-split.md`
- 14 task groups (5 backend, 6 frontend, 2 testing, 1 dependency), 4 acceptance criteria
- Full dev notes with 48h embargo logic, 80/20 reward split, garden-inspired UX language, sendBeacon tracking

### Step 2: Dev Story (Implementation)

- **Status:** Completed
- **Files created:** 15 new files, 9 modified files
- **Backend:** ArticleMetricsService (view recording with 24h dedup, engagement updates with clamping, 48h embargo, aggregated metrics), ArticleRewardService (80/20 split, event-driven allocation on publish, author/editor summaries), ArticleMetricsController (6 endpoints: views, engagement, metrics, reward-allocation, my/reward-summary, editorial/reward-summary), Prisma schema (ArticleView + ArticleRewardAllocation models), migration SQL
- **Frontend:** Metrics dashboard page, ArticleMetricsView (embargo state, reach, engagement, referral sources, growth chart), GrowthCurveChart (Recharts AreaChart with natural interpolation, data table toggle), RewardSplitBadge (compact/full modes), EditorRewardSummary (allocation list, summary stats), ViewTracker (sendBeacon engagement on unload)
- **Shared:** 6 new DTO types (ArticleMetricsDto, ArticleRewardAllocationDto, AuthorRewardSummaryDto, EditorRewardSummaryDto, ReferralSourceDto, DailyViewsDto), 2 new error codes
- **Hooks:** useArticleMetrics, useArticleRewardAllocation, useAuthorRewardSummary, useEditorRewardSummary
- **Tests:** 24 backend tests + 21 frontend tests, all passing
- **Regressions:** 0

### Step 3: Code Review

- **Status:** Completed (Approved after fixes)
- **Issues found:** 3 HIGH, 5 MEDIUM, 3 LOW
- **Issues fixed:** 3 HIGH + 5 MEDIUM = 8 fixes applied

#### Fixes Applied

| #   | Severity | Issue                                                            | Fix                                                  |
| --- | -------- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| H1  | HIGH     | Static routes (`my/`, `editorial/`) after dynamic `:id/*` routes | Reordered — static routes now declared first         |
| H2  | HIGH     | `getRewardAllocation` lacked authorization check                 | Added author/editor/admin access control             |
| H3  | HIGH     | Double beacon firing in ViewTracker (cleanup + beforeunload)     | Removed duplicate `sendEngagement()` from cleanup    |
| M1  | MEDIUM   | `getUniqueViews` loaded all hashes into memory                   | Replaced with `$queryRaw COUNT(DISTINCT)`            |
| M2  | MEDIUM   | `getDailyViews` loaded all timestamps into memory                | Replaced with `$queryRaw DATE() GROUP BY`            |
| M3  | MEDIUM   | Shared `groupBy` mock incorrect — `uniqueViews` untested         | Fixed with separate `$queryRaw` mocks and assertions |
| M4  | MEDIUM   | Redundant `compositeScore !== null ? compositeScore : null`      | Simplified to direct value                           |
| M5  | MEDIUM   | `totalReviewed` counted non-reviewed article statuses            | Added status filter (APPROVED, PUBLISHED, ARCHIVED)  |

#### LOW Items (not fixed, acceptable risk)

- L1: `pnpm-lock.yaml` not in story File List (documentation gap)
- L2: `referralSource` has no length validation (public endpoint, low risk)
- L3: Migration timestamp `940000` technically invalid (works, no ordering impact)

#### Tests After Fixes

- Backend: 858/858 passed (0 regressions)
- Frontend: 518/518 passed (0 regressions)

## Final Status

- **Story status:** done
- **Sprint status:** 8-5-publication-metrics-and-reward-split -> done
- **Epic status:** epic-8 -> in-progress (1 story remaining: 8-6)

## Auto-Approve Criteria

- [x] Green tests (all 1,376 tests passing)
- [x] Consistent with existing architecture (NestJS module pattern, TanStack Query hooks, Recharts client-side, Prisma models, event-driven allocation)
- [x] No retries needed (all fixes applied successfully on first attempt)
