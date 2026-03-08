# Story 5.5: Contributor Notifications

Status: done

## Story

As a contributor,
I want to receive notifications when my contributions are evaluated or when peer feedback is available,
so that I can stay informed about my work without checking constantly.

## Acceptance Criteria (BDD)

### AC1: In-Platform Notifications on Evaluation/Feedback

**Given** I am an authenticated contributor
**When** one of my contributions receives an AI evaluation (Epic 7) or peer feedback (Epic 6)
**Then** I receive an in-platform notification delivered via the notification BullMQ queue
**And** a subtle warm-toned dot appears on the sidebar navigation next to "Evaluations" or "Feedback" — not a badge count (UX spec: no notification overload)

### AC2: Notification Clearing on Navigation

**Given** I have unread notifications
**When** I navigate to the relevant section (evaluations or feedback)
**Then** the notification dot clears
**And** new items are visually distinguished with a subtle highlight that fades after viewing

### AC3: Notification Content & Storage

**Given** I receive a notification
**When** I view the notification
**Then** the notification shows: a brief description of the event (e.g., "Your contribution to [project] has been evaluated"), timestamp, and a link to the relevant detail page
**And** notifications are stored in the database with: contributor_id, event_type, entity_id, read status, created_at

### AC4: Working Group Lead Notifications

**Given** I am a Working Group Lead
**When** a new announcement is posted in my group or a contributor submits work for my domain
**Then** I receive a notification following the same subtle notification pattern

### AC5: Asynchronous Notification Delivery

**Given** the notification system is operational
**When** notifications are dispatched
**Then** the `notification` BullMQ queue processes delivery asynchronously
**And** notification delivery does not block the operation that triggered it (e.g., evaluation completion)

## Implementation Scope Note

Epic 6 (Peer Feedback) and Epic 7 (AI Evaluation) are not yet built. This story builds the **full notification infrastructure** and wires up the **events that currently exist**:

- `working-group.announcement.created` → notify WG members
- `contribution.*.ingested` → notify WG Lead when work is submitted to their domain

Future event listeners (`evaluation.score.completed`, `feedback.review.submitted`) are documented as extension points but NOT implemented until those epics are built.

The sidebar "Evaluations" and "Feedback" nav items do not exist yet. The warm dot indicator is built as a **reusable component** attached to sidebar nav items. For now, dots appear on "Working Groups" when relevant notifications exist. When future epics add nav items, dots will automatically work via the category-based notification system.

## Tasks / Subtasks

### Task 1: Database Schema & Shared Types (AC: #3, #5)

- [x] 1.1 Add `NotificationType` enum to Prisma schema in `core` schema
  - Values: `EVALUATION_COMPLETED`, `PEER_FEEDBACK_AVAILABLE`, `ANNOUNCEMENT_POSTED`, `CONTRIBUTION_TO_DOMAIN`, `TASK_ASSIGNED`, `ARTICLE_FEEDBACK`, `ARTICLE_PUBLISHED`
- [x] 1.2 Add `Notification` model to Prisma schema in `core` schema
  - Columns: `id` (UUID PK), `contributorId` (FK → Contributor), `type` (NotificationType), `title` (String), `description` (String?), `entityId` (String — UUID of source entity), `category` (String — maps to sidebar section: 'evaluations', 'feedback', 'working-groups', 'tasks', 'publications'), `read` (Boolean, default false), `createdAt` (DateTime), `readAt` (DateTime?)
  - Relations: contributor → Contributor
  - Indexes: `idx_notifications_contributor_unread` (contributorId, read, createdAt DESC), `idx_notifications_contributor_created` (contributorId, createdAt DESC), `idx_notifications_contributor_category` (contributorId, category, read)
  - @@map("notifications")
- [x]1.3 Create Prisma migration: `apps/api/prisma/migrations/20260308300000_add_notifications/migration.sql`
- [x]1.4 Create `packages/shared/src/schemas/notification.schema.ts`
  - Schemas: `notificationSchema`, `notificationQuerySchema` (cursor, limit 1-50 default 20, category filter optional), `unreadCountResponseSchema`
- [x]1.5 Create `packages/shared/src/types/notification.types.ts`
  - Types: `NotificationDto`, `NotificationListResponse`, `UnreadCountResponse`, `NotificationSseEvent`, `NotificationCategory`
- [x]1.6 Add error codes to `packages/shared/src/constants/error-codes.ts`: `NOTIFICATION_NOT_FOUND`, `NOTIFICATION_ACCESS_DENIED`
- [x]1.7 Export from `packages/shared/src/index.ts`

### Task 2: Notification Module — Backend Service (AC: #1, #3, #4, #5)

- [x]2.1 Create `apps/api/src/modules/notification/notification.module.ts`
  - Imports: PrismaModule, CaslModule, BullModule.registerQueue({ name: 'notification' }), RedisModule
  - Providers: NotificationService, NotificationProcessor, NotificationSseService
  - Controllers: NotificationController
  - Exports: NotificationService
- [x]2.2 Create `apps/api/src/modules/notification/notification.service.ts`
  - `getNotifications(contributorId, query: { cursor?, limit?, category? })` — cursor-based pagination, returns contributor's notifications
  - `markAsRead(notificationId, contributorId)` — mark single notification as read, set readAt
  - `markAllAsRead(contributorId, category?)` — mark all (or category) as read
  - `getUnreadCounts(contributorId)` — returns `{ [category]: count }` object
  - `enqueueNotification(data)` — adds job to BullMQ `notification` queue (non-blocking)
  - `@OnEvent('working-group.announcement.created')` → enqueue ANNOUNCEMENT_POSTED for all WG members
  - `@OnEvent('contribution.commit.ingested')` / `@OnEvent('contribution.pull_request.ingested')` / `@OnEvent('contribution.review.ingested')` → enqueue CONTRIBUTION_TO_DOMAIN for WG Lead of contributor's domain
- [x]2.3 Create `apps/api/src/modules/notification/notification.service.spec.ts`
  - Test: getNotifications with cursor pagination
  - Test: getNotifications filtered by category
  - Test: markAsRead updates read status and readAt
  - Test: markAllAsRead marks all notifications for contributor
  - Test: getUnreadCounts returns per-category counts
  - Test: enqueueNotification adds job to BullMQ queue
  - Test: announcement event listener enqueues notifications for WG members
  - Test: contribution event listener enqueues notification for WG Lead
  - Test: skips unattributed contributions (no contributorId)

### Task 3: Notification Module — BullMQ Processor (AC: #5)

- [x]3.1 Create `apps/api/src/modules/notification/notification.processor.ts`
  - `@Processor('notification')` extending `WorkerHost`
  - `process(job)` — persists notification to DB, publishes to Redis channel `notifications-{contributorId}` for SSE
  - Inject DLQ: `@InjectQueue('notification-dlq')`
  - On final failure: move to DLQ with error context
  - Log entry/exit at info level with jobId, correlationId
- [x]3.2 Register DLQ in notification.module.ts: `BullModule.registerQueue({ name: 'notification-dlq' })`
- [x]3.3 Configure queue defaults: attempts: 3, backoff: exponential delay 1000ms, removeOnComplete: true, removeOnFail: false
- [x]3.4 Create `apps/api/src/modules/notification/notification.processor.spec.ts`
  - Test: process persists notification to database
  - Test: process publishes to Redis channel for SSE delivery
  - Test: moves to DLQ after max retries
  - Test: logs entry/exit with job context

### Task 4: Notification Module — Backend Controller & SSE (AC: #1, #2, #3)

- [x]4.1 Create `apps/api/src/modules/notification/notification.controller.ts`
  - `GET /api/v1/notifications` — paginated notifications for current user (JwtAuthGuard + AbilityGuard)
    - Query: cursor (string?), limit (number, default 20, max 50), category (string?)
    - Response: `createSuccessResponse(items, correlationId, pagination)`
  - `PATCH /api/v1/notifications/:id/read` — mark single as read
    - Verify notification belongs to current user
    - Response: `createSuccessResponse({ read: true, readAt }, correlationId)`
  - `PATCH /api/v1/notifications/read-all` — mark all as read (optional category query param)
    - Response: `createSuccessResponse({ count: updatedCount }, correlationId)`
  - `GET /api/v1/notifications/unread-counts` — get unread counts per category
    - Response: `createSuccessResponse(counts, correlationId)`
  - `@Sse('stream')` — per-user SSE for real-time notification delivery
    - Returns Observable<MessageEvent> from NotificationSseService
- [x]4.2 Create `apps/api/src/modules/notification/notification-sse.service.ts`
  - **REUSE pattern from** `apps/api/src/modules/activity/activity-sse.service.ts`
  - Per-user Redis channel: `notifications-{contributorId}` (NOT global like activity feed)
  - `createStream(contributorId)` — returns Observable<MessageEvent>
  - Cleanup Redis connections on module destroy
- [x]4.3 Create `apps/api/src/modules/notification/dto/notification-query.dto.ts`
  - Zod-validated: cursor (string?), limit (number 1-50 default 20), category (string?)
- [x]4.4 Create `apps/api/src/modules/notification/notification.controller.spec.ts`
  - Test: GET /notifications returns paginated response for current user
  - Test: PATCH /:id/read marks notification as read
  - Test: PATCH /read-all marks all notifications as read
  - Test: GET /unread-counts returns per-category counts
  - Test: SSE endpoint returns Observable
  - Test: RBAC enforcement (401 unauthenticated, 403 for other user's notifications)
  - Test: query validation (400 for invalid params)
- [x]4.5 Update CASL ability factory: authenticated contributors can `Read` and `Update` own Notification
- [x]4.6 Register `NotificationModule` in `apps/api/src/app.module.ts`

### Task 5: Frontend — Hooks (AC: #1, #2, #3)

- [x]5.1 Create `apps/web/hooks/use-notifications.ts`
  - `useNotifications(filters?)` — TanStack `useInfiniteQuery`
    - queryKey: `['notifications', filters]`
    - queryFn: `apiClient.get('/api/v1/notifications', { params })`
    - `initialPageParam: undefined`
    - `getNextPageParam: (lastPage) => lastPage.meta.pagination?.cursor ?? undefined`
  - `useUnreadCounts()` — TanStack `useQuery`
    - queryKey: `['notifications', 'unread-counts']`
    - queryFn: `apiClient.get('/api/v1/notifications/unread-counts')`
    - `staleTime: 30_000` (30s — SSE updates will override)
    - `refetchInterval: 60_000` (1min fallback poll)
  - `useMarkNotificationRead()` — TanStack `useMutation`
    - Optimistic update: set read=true in cache
    - Decrement unread count in `['notifications', 'unread-counts']` cache
    - On error: rollback
    - On settled: invalidate queries
  - `useMarkAllNotificationsRead(category?)` — TanStack `useMutation`
    - Invalidate `['notifications']` and `['notifications', 'unread-counts']` on settled
- [x]5.2 Create `apps/web/hooks/use-notification-sse.ts`
  - `useNotificationSse()` — SSE subscription for real-time notifications
  - **REUSE pattern from** `apps/web/hooks/use-activity-feed.ts` (useActivitySse)
  - Connect to `/api/v1/notifications/stream?token={accessToken}`
  - On new notification: prepend to TanStack Query cache, increment unread count
  - Auto-reconnect with exponential backoff (initial 1s, max 30s)
  - Return: `{ isConnected, isReconnecting }`

### Task 6: Frontend — Sidebar Warm Dot & Notification Clearing (AC: #1, #2)

- [x]6.1 Modify `apps/web/app/(dashboard)/layout.tsx` — add warm dot indicator to nav items
  - Import `useUnreadCounts()` hook
  - Map notification categories to nav item hrefs: `{ 'working-groups': '/dashboard/working-groups' }` (extend as future nav items are added)
  - Render warm dot (8px circle, `bg-brand-accent` #C4956A, absolute positioned) next to nav label when unread count > 0
  - Warm dot: `aria-label="New notifications"` for accessibility
  - Animation: gentle pulse on first appearance (CSS `animate-pulse-once`), then static
  - Respect `prefers-reduced-motion`: no pulse animation
- [x]6.2 Add auto-clear logic: when pathname matches a category's href, call `markAllAsRead(category)` mutation
  - Use `useEffect` with pathname dependency
  - Debounce 500ms to avoid rapid-fire on navigation
  - Only call if unread count for that category > 0
- [x]6.3 Add `animate-pulse-once` keyframes to `apps/web/app/globals.css`
  - `@keyframes pulse-once { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }`
  - `.animate-pulse-once { animation: pulse-once 600ms ease-out 1; }`
  - `@media (prefers-reduced-motion: reduce) { .animate-pulse-once { animation: none; } }`

### Task 7: Frontend — Notification Inline Display (AC: #2, #3)

- [x]7.1 Create `apps/web/components/features/notification/notification-badge.tsx`
  - Warm dot component: 8px circle, `bg-brand-accent` (#C4956A), absolute positioned top-right of parent
  - Props: `visible: boolean`, `ariaLabel?: string`
  - Renders nothing when `visible=false`
- [x]7.2 Create `apps/web/components/features/notification/notification-toast.tsx`
  - Lightweight inline notification for sections that have new items
  - Shows: title, description (truncated 100 chars), relative timestamp, link to detail page
  - Subtle highlight background (#C4956A at 10% opacity) that fades after 3s
  - Click handler: navigate to detail page + mark as read
  - Respect `prefers-reduced-motion` for fade animation
- [x]7.3 Create `apps/web/components/features/notification/notification-inline-list.tsx`
  - Reusable component for displaying notifications inline within a section page
  - Props: `category: string` — filters notifications for this category
  - Shows up to 5 most recent unread notifications at top of section
  - "Dismiss all" button calls `markAllAsRead(category)`
  - Uses `useNotifications({ category })` hook
- [x]7.4 Create `apps/web/components/features/notification/notification.test.tsx`
  - Test: warm dot renders when unread count > 0
  - Test: warm dot hidden when unread count = 0
  - Test: notification toast displays title, description, timestamp
  - Test: toast highlight fades after viewing
  - Test: inline list shows unread notifications filtered by category
  - Test: dismiss all clears notifications for category
  - Test: reduced motion support (no animations)

### Task 8: Testing & Verification (AC: #1, #2, #3, #4, #5)

- [x]8.1 Run backend tests: `pnpm --filter api test` — verify 0 regressions + new tests pass
- [x]8.2 Run frontend tests: `pnpm --filter web test` — verify 0 regressions + new tests pass
- [x]8.3 Manual integration check: BullMQ queue processing, notification persistence, SSE delivery, warm dot, auto-clear on navigation

## Dev Notes

### Architecture Compliance

- **Module pattern**: NestJS module in `apps/api/src/modules/notification/` — registers service, processor, SSE service, controller
- **Schema boundary**: `notifications` table in `core` schema (same as contributions, tasks, working_groups, activity_events)
- **API versioning**: All endpoints under `/api/v1/notifications/`
- **Response envelope**: MANDATORY `{ data, meta: { timestamp, correlationId, pagination } }` via `createSuccessResponse()`
- **Error handling**: `DomainException(ERROR_CODES.X, message, HttpStatus.X)` — NEVER raw `HttpException`
- **Logging**: Pino via nestjs-pino with `correlationId` and `module: 'notification'` context
- **BullMQ jobs**: Log entry/exit at `info` level with jobId, correlationId — NEVER log PII
- **Events**: Listen via `@OnEvent()` decorator; enqueue to BullMQ, NOT process inline
- **Guards**: `@UseGuards(JwtAuthGuard, AbilityGuard)` + `@CheckAbility()` on all endpoints
- **User extraction**: `@CurrentUser()` decorator for JWT payload
- **Ownership**: Controller MUST verify notification belongs to current user before any operation

### Critical Code Reuse — DO NOT REINVENT

| What                                      | Where                                                            | Why                                                               |
| ----------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| BullMQ processor pattern                  | `apps/api/src/modules/ingestion/processors/webhook.processor.ts` | WorkerHost, @Processor, DLQ handling, retry/backoff               |
| BullMQ queue registration                 | `apps/api/src/modules/ingestion/ingestion.module.ts`             | BullModule.forRootAsync + registerQueue pattern                   |
| SSE service (Redis pub/sub → Observable)  | `apps/api/src/modules/activity/activity-sse.service.ts`          | Proven pattern — adapt for per-user channels                      |
| SSE controller (@Sse decorator)           | `apps/api/src/modules/activity/activity.controller.ts`           | Same decorator pattern for notification stream                    |
| Client SSE hook (EventSource + reconnect) | `apps/web/hooks/use-activity-feed.ts` (useActivitySse)           | Token via query param, exponential backoff, reconnect state       |
| @OnEvent listeners                        | `apps/api/src/modules/activity/activity.service.ts`              | Same domain event names and payload shapes                        |
| API response helper                       | `apps/api/src/common/types/api-response.type.ts`                 | `createSuccessResponse(data, correlationId, pagination?)`         |
| Domain exception                          | `apps/api/src/common/exceptions/domain.exception.ts`             | `DomainException` for all error responses                         |
| Current user decorator                    | `apps/api/src/common/decorators/current-user.decorator.ts`       | `@CurrentUser()`                                                  |
| Ability decorator                         | `apps/api/src/common/decorators/check-ability.decorator.ts`      | `@CheckAbility()`                                                 |
| API client                                | `apps/web/lib/api-client.ts`                                     | `apiClient<T>()` for all frontend API calls                       |
| TanStack infinite query                   | `apps/web/hooks/use-tasks.ts`                                    | `useInfiniteQuery` with `initialPageParam` and `getNextPageParam` |
| TanStack mutation with optimistic updates | `apps/web/hooks/use-working-groups.ts`                           | `useMutation` with `onMutate`, `onError`, `onSettled`             |
| Sidebar nav items                         | `apps/web/app/(dashboard)/layout.tsx`                            | `DASHBOARD_NAV_ITEMS` array and rendering loop                    |

### UX Requirements — CRITICAL

- **Warm dot, NOT badge count**: 8px circle using brand accent #C4956A — subtle, not demanding
- **NO notification center**: No `/dashboard/notifications` page — notifications are contextual per section
- **NO urgency signals**: No unread counts visible to user, no "X items need attention", no "catch up" pressure
- **NO push notifications**: In-platform only, discoverable not pushed
- **Notification clearing**: Dot clears automatically when user navigates to the relevant section
- **Subtle highlight**: New items in sections show warm highlight (#C4956A at 10% opacity) that fades after 3s
- **Calm aesthetic**: Matches the "calm confidence" emotional signature — notification system should feel helpful, not anxious
- **Animation**: 600ms ease-out single pulse on first dot appearance; respect `prefers-reduced-motion`
- **Accessibility**: `aria-label="New notifications"` on warm dot, `aria-live="polite"` for notification updates
- **Typography**: Sans-serif (Inter/Source Sans Pro) at body-interface 15px

### BullMQ Implementation Details

**Queue configuration** (replicate from ingestion module):

```
Queue name: 'notification'
DLQ name: 'notification-dlq'
Default job options:
  attempts: 3
  backoff: { type: 'exponential', delay: 1000 } // 1s, 4s, 16s
  removeOnComplete: true
  removeOnFail: false
Job name: 'send-notification'
```

**BullModule registration** — CRITICAL: The ingestion module already has `BullModule.forRootAsync()` which configures the global Redis connection. The notification module MUST use `BullModule.registerQueue()` only (NOT `forRootAsync` again — it's already global). Check if `BullModule.forRootAsync()` is imported at app.module level or within ingestion module:

- If in `ingestion.module.ts`: Move `BullModule.forRootAsync()` to `app.module.ts` so all modules share the connection
- If already in `app.module.ts`: Just add `BullModule.registerQueue({ name: 'notification' })` in notification module

**Processor pattern**:

```typescript
@Processor('notification')
export class NotificationProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @InjectQueue('notification-dlq') private readonly dlqQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    // 1. Persist to DB
    // 2. Publish to Redis channel notifications-{contributorId}
    // 3. On max retries failure: move to DLQ
  }
}
```

### SSE Implementation — Per-User Channels

**Key difference from ActivitySseService**: Activity feed uses a single global `activity-feed` channel. Notification SSE uses **per-user channels**: `notifications-{contributorId}`.

**Backend** (adapt from activity-sse.service.ts):

- `createStream(contributorId)` — subscribes to `notifications-{contributorId}` Redis channel
- Parse incoming JSON, emit as NestJS `MessageEvent`
- Clean up Redis subscriber on disconnect

**Frontend** (adapt from useActivitySse):

- Connect to `/api/v1/notifications/stream?token={accessToken}`
- On new notification: update `['notifications']` query cache AND `['notifications', 'unread-counts']` cache
- Auto-reconnect: exponential backoff 1s → 30s max

### Event Wiring — Current vs Future

**Wire NOW (events exist in codebase)**:

| Event                                | Listener Logic                                    | Notification Type        | Category         | Recipients                      |
| ------------------------------------ | ------------------------------------------------- | ------------------------ | ---------------- | ------------------------------- |
| `working-group.announcement.created` | Look up WG members, enqueue notification for each | `ANNOUNCEMENT_POSTED`    | `working-groups` | All members of the WG           |
| `contribution.commit.ingested`       | If contributor has domain, find WG Lead, enqueue  | `CONTRIBUTION_TO_DOMAIN` | `working-groups` | WG Lead of contributor's domain |
| `contribution.pull_request.ingested` | Same as commit                                    | `CONTRIBUTION_TO_DOMAIN` | `working-groups` | WG Lead of contributor's domain |
| `contribution.review.ingested`       | Same as commit                                    | `CONTRIBUTION_TO_DOMAIN` | `working-groups` | WG Lead of contributor's domain |

**Wire FUTURE (document as extension points, do NOT implement listeners)**:

| Event                        | Notification Type         | Category       | Epic   |
| ---------------------------- | ------------------------- | -------------- | ------ |
| `evaluation.score.completed` | `EVALUATION_COMPLETED`    | `evaluations`  | Epic 7 |
| `feedback.review.submitted`  | `PEER_FEEDBACK_AVAILABLE` | `feedback`     | Epic 6 |
| `article.published`          | `ARTICLE_PUBLISHED`       | `publications` | Epic 8 |
| `article.feedback.available` | `ARTICLE_FEEDBACK`        | `publications` | Epic 8 |

**Self-notification prevention**: Do NOT notify the contributor who triggered the event. For announcements: the author should not receive a notification for their own announcement. For contributions: the contributor should not be notified that their own work was submitted.

### Notification Recipients — Finding WG Members and Leads

To find WG members for announcement notifications:

```typescript
// Use existing WorkingGroupMembership model
const members = await this.prisma.workingGroupMembership.findMany({
  where: { workingGroupId },
  select: { contributorId: true },
});
```

To find WG Lead for contribution notifications:

```typescript
// Contributor has a domain field → find the WG for that domain → find its lead
const workingGroup = await this.prisma.workingGroup.findFirst({
  where: { domain: contributorDomain },
  select: { leadId: true },
});
```

### Category-to-NavItem Mapping

```typescript
const CATEGORY_NAV_MAP: Record<string, string> = {
  'working-groups': '/dashboard/working-groups',
  // Future mappings (add when nav items exist):
  // 'evaluations': '/dashboard/evaluations',
  // 'feedback': '/dashboard/feedback',
  // 'tasks': '/dashboard/tasks',
  // 'publications': '/dashboard/publications',
};
```

### Performance Requirements

| Metric                        | Target                                | Source       |
| ----------------------------- | ------------------------------------- | ------------ |
| Notification delivery latency | <5 seconds from event                 | NFR-P3       |
| API response time             | <1 second                             | NFR-P7       |
| Concurrent users Phase 1      | 50 with no degradation                | NFR-SC1      |
| Queue processing              | Non-blocking, async                   | Architecture |
| Retry strategy                | 3 attempts, exponential (1s, 4s, 16s) | Architecture |

### Database Design

- **Table**: `notifications` in `core` schema
- **Primary query**: `SELECT * FROM notifications WHERE contributor_id = ? AND category = ? ORDER BY created_at DESC LIMIT ? CURSOR ?`
- **Unread count query**: `SELECT category, COUNT(*) FROM notifications WHERE contributor_id = ? AND read = false GROUP BY category`
- **Cursor strategy**: Use composite `createdAt|id` cursor (same pattern as activity feed — proven in story 5-4)
- **Retention**: No retention policy needed at Phase 1 scale

### Testing Standards

- Tests co-located as `*.spec.ts` next to `*.ts` (backend) and `*.test.tsx` next to `*.tsx` (frontend) — NEVER separate `__tests__/`
- Mock PrismaService, BullMQ Queue, Redis, EventEmitter2 for service tests
- Controller tests: endpoint routing, RBAC (401/403), response envelope, query validation, ownership verification
- Processor tests: DB persistence, Redis publish, DLQ handling
- Frontend tests: hook return values, warm dot visibility, notification clearing, SSE state transitions
- Use `vi.fn()`, `mockResolvedValue()/mockRejectedValue()` for async mocks
- **Baselines**: Backend 540 tests, Frontend 301 tests — must not regress

### Version-Specific Notes

- **NestJS 11**: Express v5 default — named wildcards `*splat`
- **@nestjs/bullmq**: Uses `WorkerHost` base class with `process()` method, NOT old `@Process()` decorator
- **Prisma 7**: Run `prisma generate` explicitly after `prisma migrate dev`; if shadow DB fails, use manual SQL + `prisma migrate deploy`
- **TanStack Query 5**: `isPending` not `isLoading`; `useInfiniteQuery` requires `initialPageParam`; `onError`/`onSuccess` removed from `useQuery`
- **BullMQ 5.x**: `@Processor('queue-name')` + `extends WorkerHost` + `async process(job: Job<T>)` — check installed version in package.json

### Previous Story Learnings (5-4)

- Composite cursor `createdAt|id` for stable pagination — reuse the same pattern for notifications
- SSE with EventSource + exponential backoff works well — reuse from `use-activity-feed.ts`
- `animate-fade-in` keyframes already defined in `globals.css` — can reuse for notification highlight
- TanStack Query cache manipulation via `queryClient.setQueriesData` for real-time updates
- Code review found: always define CSS animations before referencing them, always add `relative` positioning for absolute children
- Pre-existing TypeScript errors in admission reviewer components are unrelated — do NOT fix
- Admin sidebar does NOT exist — do NOT create one
- `prisma.$transaction()` for atomic multi-step operations
- Event emission always AFTER successful DB write, using DomainEvent shape
- Shared package rebuild needed before controller tests can find new schemas

### Project Structure Notes

**New files to create:**

```
apps/api/prisma/migrations/20260308300000_add_notifications/migration.sql
apps/api/src/modules/notification/
  notification.module.ts
  notification.service.ts
  notification.service.spec.ts
  notification.controller.ts
  notification.controller.spec.ts
  notification-sse.service.ts
  notification.processor.ts
  notification.processor.spec.ts
  dto/
    notification-query.dto.ts
packages/shared/src/schemas/notification.schema.ts
packages/shared/src/types/notification.types.ts
apps/web/hooks/use-notifications.ts
apps/web/hooks/use-notification-sse.ts
apps/web/components/features/notification/
  notification-badge.tsx
  notification-toast.tsx
  notification-inline-list.tsx
  notification.test.tsx
```

**Files to modify:**

```
apps/api/prisma/schema.prisma — Add NotificationType enum + Notification model
apps/api/src/app.module.ts — Register NotificationModule (+ possibly move BullModule.forRootAsync here)
apps/api/src/modules/auth/casl/ability.factory.ts — Add Notification read/update permissions
apps/api/src/modules/auth/casl/subjects.ts — Add 'Notification' subject
packages/shared/src/constants/error-codes.ts — Add NOTIFICATION_* error codes
packages/shared/src/index.ts — Export notification schemas/types
apps/web/app/(dashboard)/layout.tsx — Add warm dot indicator to nav items
apps/web/app/globals.css — Add animate-pulse-once keyframes
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5, Story 5.5]
- [Source: _bmad-output/planning-artifacts/architecture.md — BullMQ Queues, Async Processing, Notification Delivery]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Warm Dot Pattern, Calm Notification, No Urgency]
- [Source: _bmad-output/planning-artifacts/prd.md — FR41 Contributor Notifications, Real-Time Requirements]
- [Source: apps/api/src/modules/ingestion/processors/webhook.processor.ts — BullMQ processor pattern]
- [Source: apps/api/src/modules/ingestion/ingestion.module.ts — BullModule.forRootAsync + registerQueue]
- [Source: apps/api/src/modules/activity/activity-sse.service.ts — SSE + Redis pub/sub pattern]
- [Source: apps/api/src/modules/activity/activity.service.ts — @OnEvent listeners, domain event payloads]
- [Source: apps/web/hooks/use-activity-feed.ts — Client SSE hook with EventSource + reconnect]
- [Source: apps/web/hooks/use-tasks.ts — TanStack useInfiniteQuery pattern]
- [Source: apps/web/hooks/use-working-groups.ts — TanStack useMutation with optimistic updates]
- [Source: apps/web/app/(dashboard)/layout.tsx — Dashboard sidebar nav items]
- [Source: _bmad-output/implementation-artifacts/5-4-activity-feed-with-real-time-updates.md — Previous story patterns and learnings]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
