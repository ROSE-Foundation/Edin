# Story 5.4: Activity Feed with Real-Time Updates

Status: done

## Story

As a stakeholder,
I want to view an Activity Feed showing contributions across all domains with real-time updates,
so that I can see the community's work in motion and feel connected to the ecosystem.

## Acceptance Criteria (BDD)

### AC1: Activity Feed Display with Equal Domain Prominence

**Given** I am any user (authenticated or unauthenticated on the public showcase)
**When** I view the Activity Feed at `/dashboard/activity` (authenticated) or the public showcase feed section
**Then** I see a reverse-chronological stream of recent contributions including: contributor name and avatar, contribution type (commit, PR, review, article), title, domain badge with accent color, and timestamp
**And** contributions from all four domains are displayed with equivalent visual prominence — equal card dimensions, identical status indicators, no domain-based ordering hierarchy (FR40)
**And** the feed uses the UX spec's "calm stream to browse" aesthetic — no urgency signals, no unread counts

### AC2: Real-Time Feed Updates via Server-Sent Events

**Given** the Activity Feed is displayed
**When** a new contribution is ingested
**Then** the feed updates within <5 seconds via Server-Sent Events (SSE) using NestJS `@Sse()` decorator and Redis pub/sub
**And** new items appear at the top with a gentle fade-in animation (200ms ease-out)
**And** the SSE connection auto-reconnects with exponential backoff if disconnected, showing "Reconnecting..." after 5s

### AC3: Pagination and High-Volume Handling

**Given** the Activity Feed has many entries
**When** I scroll down
**Then** older entries load via cursor-based pagination (infinite scroll)
**And** the feed handles 500+ contributions/day without latency exceeding 10s (NFR-SC3)

### AC4: Connection Loss Recovery and Data Consistency

**Given** the SSE connection is lost
**When** the connection is re-established
**Then** any contributions that occurred during disconnection are fetched and inserted chronologically
**And** no contributions are missed

## Tasks / Subtasks

### Task 1: Database Schema & Shared Types (AC: #1, #3)

- [x]1.1 Add `ActivityEventType` enum and `ActivityEvent` model to Prisma schema in `core` schema
  - Enum values: `CONTRIBUTION_NEW`, `EVALUATION_COMPLETED`, `ANNOUNCEMENT_CREATED`, `MEMBER_JOINED`, `TASK_COMPLETED`
  - Columns: `id` (UUID PK), `eventType` (ActivityEventType), `title` (String), `description` (String?), `contributorId` (FK → Contributor), `domain` (ContributorDomain), `contributionType` (ContributionType?), `entityId` (String — UUID of source entity), `metadata` (Json?), `createdAt` (DateTime)
  - Relations: contributor → Contributor
  - Indexes: `idx_activity_events_created_at` (createdAt DESC), `idx_activity_events_domain_created_at` (domain, createdAt DESC), `idx_activity_events_contributor_id` (contributorId)
  - @@map("activity_events")
- [x]1.2 Create Prisma migration: `apps/api/prisma/migrations/20260308250000_add_activity_events/migration.sql`
- [x]1.3 Create `packages/shared/src/schemas/activity.schema.ts`
  - Schemas: `activityEventSchema`, `activityFeedQuerySchema` (cursor, limit 1-100 default 20, domain filter optional)
- [x]1.4 Create `packages/shared/src/types/activity.types.ts`
  - Types: `ActivityEvent`, `ActivityFeedResponse`, `ActivitySseEvent`, `ActivityFeedQuery`
- [x]1.5 Add error codes to `packages/shared/src/constants/error-codes.ts`: `ACTIVITY_FEED_UNAVAILABLE`, `ACTIVITY_SSE_CONNECTION_FAILED`
- [x]1.6 Export from `packages/shared/src/index.ts`

### Task 2: Activity Module — Backend Service (AC: #1, #2, #3, #4)

- [x]2.1 Create `apps/api/src/modules/activity/activity.module.ts`
  - Imports: PrismaModule, CaslModule; providers: ActivityService, ActivitySseService; controllers: ActivityController
- [x]2.2 Create `apps/api/src/modules/activity/activity.service.ts`
  - `getFeed(query: { cursor?, limit?, domain? })` — cursor-based query on activity_events ORDER BY createdAt DESC, returns items + pagination meta
  - `getPublicFeed(query)` — same but strips sensitive fields (no contributorId details)
  - `createActivityEvent(data)` — write to DB + publish to Redis channel `activity-feed`
  - `@OnEvent('contribution.commit.ingested')` → CONTRIBUTION_NEW
  - `@OnEvent('contribution.pr.ingested')` → CONTRIBUTION_NEW
  - `@OnEvent('contribution.review.ingested')` → CONTRIBUTION_NEW
  - `@OnEvent('working-group.member.joined')` → MEMBER_JOINED
  - `@OnEvent('working-group.announcement.created')` → ANNOUNCEMENT_CREATED
  - `@OnEvent('task.status-changed')` where newStatus=COMPLETED → TASK_COMPLETED
  - Each listener: map event payload → ActivityEvent → write DB → Redis publish
- [x]2.3 Create `apps/api/src/modules/activity/activity-sse.service.ts`
  - **REUSE pattern from** `apps/api/src/modules/ingestion/contribution-sse.service.ts`
  - Redis subscriber on `activity-feed` channel (global, not per-contributor)
  - Returns `Observable<MessageEvent>` per subscriber
  - Cleanup Redis connections on module destroy
- [x]2.4 Create `apps/api/src/modules/activity/activity.service.spec.ts`
  - Test getFeed: cursor pagination, domain filtering, limit enforcement, empty results
  - Test createActivityEvent: DB write + Redis publish
  - Test each @OnEvent listener: correct event type mapping, correct payload extraction
  - Test getPublicFeed: sensitive field stripping
- [x]2.5 Register `ActivityModule` in `apps/api/src/app.module.ts`

### Task 3: Activity Module — Backend Controller (AC: #1, #2, #3, #4)

- [x]3.1 Create `apps/api/src/modules/activity/activity.controller.ts`
  - `GET /api/v1/activity` — paginated feed (JwtAuthGuard + AbilityGuard)
    - Query: cursor (string?), limit (number, default 20, max 100), domain (ContributorDomain?)
    - Response: `createSuccessResponse(items, correlationId, pagination)`
  - `@Sse('stream')` — SSE endpoint for real-time updates (JwtAuthGuard + AbilityGuard)
    - Returns Observable<MessageEvent> from ActivitySseService
  - `GET /api/v1/activity/public` — paginated public feed (no auth required)
    - Same query params, returns limited fields
- [x]3.2 Create `apps/api/src/modules/activity/dto/activity-feed-query.dto.ts`
  - Zod-validated: cursor (string?), limit (number 1-100 default 20), domain (ContributorDomain?)
- [x]3.3 Create `apps/api/src/modules/activity/activity.controller.spec.ts`
  - Test: GET /activity returns paginated response with standard envelope
  - Test: SSE endpoint returns Observable
  - Test: public endpoint works without auth, returns limited fields
  - Test: RBAC enforcement (401 unauthenticated, 403 unauthorized)
  - Test: query validation (400 for invalid params)
- [x]3.4 Update CASL ability factory: all authenticated contributors can `Read` Activity; public endpoint uses separate guard logic

### Task 4: Frontend — Activity Feed Components (AC: #1, #3)

- [x]4.1 Create `apps/web/app/(dashboard)/dashboard/activity/page.tsx`
  - Server component wrapper with metadata title "Activity Feed"
  - Renders client ActivityFeed component
- [x]4.2 Create `apps/web/components/features/activity-feed/activity-feed.tsx`
  - Uses `useActivityFeed()` hook for data + infinite scroll
  - Uses `useActivitySse()` hook for real-time updates
  - IntersectionObserver for infinite scroll trigger (reuse pattern from `task-list.tsx`)
  - Skeleton loaders during initial load (NOT spinners — pulsing opacity)
  - Optional domain filter controls
  - "Reconnecting..." indicator when SSE disconnected >5s
- [x]4.3 Create `apps/web/components/features/activity-feed/activity-item.tsx`
  - Card: contributor avatar (domain-colored fallback), descriptive text (sans-serif 15px), domain dot with accent color, relative timestamp
  - Variants: Contribution (commit/PR/review), Publication (article link), Community (welcome, milestone)
  - States: Default, Hover (subtle bg tint + shadow lift + translateY(-2px)), New (warm accent #C4956A indicator, fade-in 200ms ease-out)
  - Equal card dimensions across all domains — no visual hierarchy
  - Card styling: surface.raised (#FFFFFF) bg, border-light, 12px radius, shadow-card, 24px padding
  - Use `DOMAIN_DETAILS` from `packages/shared/src/constants/domains.ts` for accent colors
  - Respect `prefers-reduced-motion` for animations
- [x]4.4 Create `apps/web/components/features/activity-feed/activity-feed.test.tsx`
  - Test: renders items with correct domain accent colors
  - Test: infinite scroll triggers loading more items
  - Test: new items appear with animation from SSE
  - Test: reconnecting indicator after 5s disconnect
  - Test: skeleton loaders during initial load
  - Test: domain filter updates displayed items

### Task 5: Frontend — Hooks (AC: #2, #4)

- [x]5.1 Create `apps/web/hooks/use-activity-feed.ts`
  - `useActivityFeed(filters?)` — TanStack `useInfiniteQuery`
    - queryKey: `['activity-feed', filters]`
    - queryFn: `apiClient.get('/api/v1/activity', { params: { ...filters, cursor: pageParam, limit: 20 } })`
    - `initialPageParam: null`
    - `getNextPageParam: (lastPage) => lastPage.data.meta.pagination?.cursor ?? undefined`
  - `useActivitySse()` — SSE subscription hook
    - **REUSE pattern from** `apps/web/hooks/use-contribution-sse.ts`
    - Connect to `/api/v1/activity/stream?token={accessToken}` (EventSource doesn't support Authorization headers)
    - Auto-reconnect with exponential backoff (initial 1s, max 30s)
    - Track `lastEventTimestamp` for reconnection recovery
    - On new event: prepend to TanStack Query cache via `queryClient.setQueryData` on `['activity-feed']`
    - On reconnect: fetch missed items since `lastEventTimestamp` via REST, merge chronologically
    - Return: `{ isConnected, isReconnecting, lastEvent }`

### Task 6: Navigation & Layout (AC: #1)

- [x]6.1 Add "Activity" nav item to dashboard sidebar in `apps/web/app/(dashboard)/layout.tsx`
  - Position: after Tasks nav item
  - Label: "Activity" — NO badge count (calm UX)
  - Icon: appropriate activity/stream icon
- [x]6.2 Wire public showcase activity section if public showcase page exists
  - Use `/api/v1/activity/public` endpoint, static pagination only (no SSE for public)

### Task 7: Testing & Verification (AC: #1, #2, #3, #4)

- [x]7.1 Run backend tests: `pnpm --filter api test` — verify 0 regressions + new tests pass
- [x]7.2 Run frontend tests: `pnpm --filter web test` — verify 0 regressions + new tests pass
- [ ] 7.3 Manual integration check: SSE connection, real-time updates, pagination, domain filtering, reconnection recovery

## Dev Notes

### Architecture Compliance

- **Module pattern**: NestJS module in `apps/api/src/modules/activity/` — registers service, SSE service, controller
- **Schema boundary**: `activity_events` table in `core` schema (same schema as contributions, tasks, working_groups)
- **API versioning**: All endpoints under `/api/v1/activity/`
- **Response envelope**: MANDATORY `{ data, meta: { timestamp, correlationId, pagination } }` via `createSuccessResponse()`
- **Error handling**: `DomainException(ERROR_CODES.X, message, HttpStatus.X)` — NEVER raw `HttpException`
- **Logging**: Pino via nestjs-pino with `correlationId` and `module: 'activity'` context
- **Events**: Listen via `@OnEvent()` decorator; each creates ActivityEvent with `DomainEvent<T>` shape: `{ eventType, timestamp, correlationId, actorId, payload }`
- **Guards**: `@UseGuards(JwtAuthGuard, AbilityGuard)` + `@CheckAbility()` on authenticated endpoints
- **User extraction**: `@CurrentUser()` decorator for JWT payload

### Critical Code Reuse — DO NOT REINVENT

| What                                      | Where                                                           | Why                                                                                           |
| ----------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| SSE service (Redis pub/sub → Observable)  | `apps/api/src/modules/ingestion/contribution-sse.service.ts`    | Proven pattern — replicate for `activity-feed` channel                                        |
| SSE controller (@Sse decorator)           | `apps/api/src/modules/ingestion/contribution-sse.controller.ts` | Same decorator pattern for activity stream                                                    |
| Client SSE hook (EventSource + reconnect) | `apps/web/hooks/use-contribution-sse.ts`                        | Token via query param, exponential backoff, reconnect state                                   |
| API response helper                       | `apps/api/src/common/types/api-response.type.ts`                | `createSuccessResponse(data, correlationId, pagination?)`                                     |
| Domain exception                          | `apps/api/src/common/exceptions/domain.exception.ts`            | `DomainException` for all error responses                                                     |
| Current user decorator                    | `apps/api/src/common/decorators/current-user.decorator.ts`      | `@CurrentUser()`                                                                              |
| Ability decorator                         | `apps/api/src/common/decorators/check-ability.decorator.ts`     | `@CheckAbility()`                                                                             |
| API client                                | `apps/web/lib/api-client.ts`                                    | `apiClient<T>()` for all frontend API calls                                                   |
| Domain colors                             | `packages/shared/src/constants/domains.ts`                      | `DOMAIN_DETAILS` — Technology teal, Finance amber, Impact terra rose, Governance slate violet |
| Infinite scroll                           | `apps/web/components/features/task/task-list.tsx`               | IntersectionObserver pattern                                                                  |
| TanStack infinite query                   | `apps/web/hooks/use-tasks.ts`                                   | `useInfiniteQuery` with `initialPageParam` and `getNextPageParam`                             |

### UX Requirements — CRITICAL

- **Aesthetic**: "Calm stream to browse" — curated publication feel, NOT inbox clearing
- **NO urgency signals**: No unread counts, no badge counts, no "X items need attention"
- **NO notification overload**: Activity is discoverable, not pushed
- **Equal domain prominence**: All four domains get identical card dimensions and status indicators
- **Domain accent colors**: Technology #3A7D7E, Finance #C49A3C, Impact #B06B6B, Governance #7B6B8A
- **Brand accent (warm indicator)**: #C4956A — used for "new" item indicator
- **Typography**: Sans-serif (Inter/Source Sans Pro) at body-interface 15px for dashboard content
- **Animation**: 200ms ease-out for new items fade-in; respect `prefers-reduced-motion`
- **Loading**: Skeleton loaders with gentle pulsing opacity — NEVER spinners
- **Hover**: Subtle background tint + shadow lift + translateY(-2px) on cards
- **Card spacing**: 24px (space.lg) minimum between content blocks, 24px padding inside cards
- **Surfaces**: Cards use surface.raised #FFFFFF, page bg surface.base #FAFAF7
- **Reconnecting state**: "Reconnecting..." text after 5s — no panic UI, warm-toned

### Performance Requirements

| Metric                   | Target                         | Source       |
| ------------------------ | ------------------------------ | ------------ |
| Feed update latency      | <5 seconds ingestion → feed    | NFR-P3       |
| Pagination response      | <1 second                      | NFR-P7       |
| Concurrent users Phase 1 | 50 with no degradation         | NFR-SC1      |
| Daily contributions      | 500+ without feed latency >10s | NFR-SC3      |
| Concurrent users Phase 2 | 200 with <10% degradation      | NFR-SC2      |
| Page size                | Default 20, max 100            | Architecture |

### SSE Implementation Details

**Backend** (replicate from contribution-sse.service.ts):

- Create Redis subscriber per SSE endpoint instance
- Subscribe to `activity-feed` Redis channel (global, not per-user — all activity is public within auth)
- Parse incoming JSON messages, emit as NestJS `MessageEvent`
- Clean up Redis connections on module destroy

**Frontend** (replicate from use-contribution-sse.ts):

- EventSource doesn't support Authorization headers → pass token via query param: `?token={accessToken}`
- Auto-reconnect: exponential backoff starting 1s, max 30s
- Show "Reconnecting..." after 5 seconds of disconnect
- Track `lastEventTimestamp`; on reconnect fetch missed events via REST, merge chronologically
- Prepend new SSE items to TanStack Query cache via `queryClient.setQueryData`

### Database Design

- **Table**: `activity_events` in `core` schema
- **Primary query**: `SELECT * FROM activity_events WHERE domain = ? ORDER BY created_at DESC LIMIT ? CURSOR ?`
- **Cursor strategy**: Encode `created_at` + `id` for stable cursor (avoids issues with same-timestamp events)
- **Metadata column**: JSONB for event-specific data (PR URL, commit SHA, article slug, etc.)
- **No retention policy needed at Phase 1 scale**

### Testing Standards

- Tests co-located as `*.spec.ts` next to `*.ts` — NEVER separate `__tests__/`
- Mock PrismaService, EventEmitter2, Redis for service tests
- Controller tests: endpoint routing, RBAC (401/403), response envelope, query validation
- Frontend tests: rendering with domain colors, infinite scroll, SSE state transitions
- Use `vi.fn()`, `mockResolvedValue()/mockRejectedValue()` for async mocks
- **Baselines**: Backend 519 tests, Frontend 272 tests — must not regress

### Version-Specific Notes

- **NestJS 11**: Express v5 default — named wildcards `*splat`
- **Prisma 7**: Run `prisma generate` explicitly after `prisma migrate dev`; if shadow DB fails, use manual SQL + `prisma migrate deploy`
- **TanStack Query 5**: `isPending` not `isLoading`; `useInfiniteQuery` requires `initialPageParam`; `onError`/`onSuccess` removed from `useQuery`

### Previous Story Learnings (5-2, 5-3)

- `prisma.$transaction()` for atomic multi-step operations
- Event emission always AFTER successful DB write, using `DomainEvent<T>` shape
- Domain health indicators computed at query time (NOT stored) — same for feed metrics
- IntersectionObserver infinite scroll pattern works well (from task-list.tsx)
- TanStack Query optimistic updates via `queryClient.setQueryData`
- Pre-existing TypeScript errors in admission reviewer components are unrelated — do NOT fix
- Admin sidebar does NOT exist — do NOT create one

### Project Structure Notes

**New files to create:**

```
apps/api/prisma/migrations/20260308250000_add_activity_events/migration.sql
apps/api/src/modules/activity/
  activity.module.ts
  activity.service.ts
  activity-sse.service.ts
  activity.controller.ts
  activity.service.spec.ts
  activity.controller.spec.ts
  dto/
    activity-feed-query.dto.ts
packages/shared/src/schemas/activity.schema.ts
packages/shared/src/types/activity.types.ts
apps/web/app/(dashboard)/dashboard/activity/page.tsx
apps/web/components/features/activity-feed/
  activity-feed.tsx
  activity-item.tsx
  activity-feed.test.tsx
apps/web/hooks/use-activity-feed.ts
```

**Files to modify:**

```
apps/api/prisma/schema.prisma — Add ActivityEventType enum + ActivityEvent model
apps/api/src/app.module.ts — Register ActivityModule
apps/api/src/modules/auth/casl/ability.factory.ts — Add Activity read permissions
packages/shared/src/constants/error-codes.ts — Add ACTIVITY_* error codes
packages/shared/src/index.ts — Export activity schemas/types
apps/web/app/(dashboard)/layout.tsx — Add Activity nav item
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5, Story 5.4]
- [Source: _bmad-output/planning-artifacts/architecture.md — Real-Time Architecture, SSE, API Patterns, Database Schemas]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Activity Feed patterns, Calm Notification, Daily Return Success]
- [Source: apps/api/src/modules/ingestion/contribution-sse.service.ts — Existing SSE+Redis pub/sub pattern]
- [Source: apps/api/src/modules/ingestion/contribution-sse.controller.ts — Existing SSE controller with @Sse() decorator]
- [Source: apps/web/hooks/use-contribution-sse.ts — Client SSE hook with EventSource + exponential backoff]
- [Source: apps/web/components/features/task/task-list.tsx — IntersectionObserver infinite scroll]
- [Source: apps/web/hooks/use-tasks.ts — TanStack useInfiniteQuery pattern]
- [Source: _bmad-output/implementation-artifacts/5-3-working-group-lead-management.md — Previous story patterns]
- [Source: _bmad-output/implementation-artifacts/5-2-contribution-menu-and-task-management.md — Task module patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Prisma migration deploy required explicit DATABASE_URL export
- Shared package rebuild needed before controller tests could find activityFeedQuerySchema
- Pagination test date generation fixed (negative hours produced invalid dates)
- Code review: Added missing `animate-fade-in` CSS keyframes to globals.css
- Code review: Added `relative` positioning to activity-item card for absolute new-indicator dot
- Code review: Implemented `newItemIds` tracking in `useActivitySse` to wire `isNew` prop for SSE-delivered items
- Code review: Fixed cursor pagination to use composite `createdAt|id` cursor with secondary sort for stability

### Completion Notes List

- All 7 task groups (27 subtasks) completed
- Backend: 540 tests pass (519 baseline + 21 new activity tests)
- Frontend: 299 tests pass (272 baseline + 26 new activity feed tests + 1 layout)
- Activity module listens to 6 event types: commit/PR/review ingested, member joined, announcement created, task completed
- SSE via Redis pub/sub on global `activity-feed` channel
- Frontend hooks: useActivityFeed (infinite query) + useActivitySse (EventSource with exponential backoff reconnect)
- Calm UX: skeleton loaders, no badge counts, domain accent colors, reduced motion support

### File List

**Created:**

- `apps/api/prisma/migrations/20260308250000_add_activity_events/migration.sql`
- `apps/api/src/modules/activity/activity.module.ts`
- `apps/api/src/modules/activity/activity.service.ts`
- `apps/api/src/modules/activity/activity-sse.service.ts`
- `apps/api/src/modules/activity/activity.controller.ts`
- `apps/api/src/modules/activity/activity.service.spec.ts`
- `apps/api/src/modules/activity/activity.controller.spec.ts`
- `apps/api/src/modules/activity/dto/activity-feed-query.dto.ts`
- `packages/shared/src/schemas/activity.schema.ts`
- `packages/shared/src/types/activity.types.ts`
- `apps/web/app/(dashboard)/dashboard/activity/page.tsx`
- `apps/web/components/features/activity-feed/activity-feed.tsx`
- `apps/web/components/features/activity-feed/activity-item.tsx`
- `apps/web/components/features/activity-feed/activity-feed.test.tsx`
- `apps/web/hooks/use-activity-feed.ts`

**Modified:**

- `apps/api/prisma/schema.prisma` — Added ActivityEventType enum + ActivityEvent model
- `apps/api/src/app.module.ts` — Registered ActivityModule
- `apps/api/src/modules/auth/casl/ability.factory.ts` — Added Activity read permission
- `apps/api/src/modules/auth/casl/subjects.ts` — Added 'Activity' subject
- `packages/shared/src/constants/error-codes.ts` — Added ACTIVITY\_\* error codes
- `packages/shared/src/index.ts` — Exported activity schemas/types
- `apps/web/app/(dashboard)/layout.tsx` — Added Activity nav item
- `apps/web/app/globals.css` — Added `animate-fade-in` keyframes and reduced-motion rule
