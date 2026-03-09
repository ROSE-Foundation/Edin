# Story 6.3: Feedback Monitoring & Tracking

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to monitor peer feedback turnaround times and completion rates,
so that I can ensure contributors receive timely feedback and identify bottlenecks.

## Acceptance Criteria (BDD)

### AC1: Admin Sees Feedback Monitoring Dashboard

**Given** I am an authenticated admin
**When** I navigate to `/admin/feedback`
**Then** I see a feedback monitoring dashboard showing:

- Total pending reviews (ASSIGNED status count)
- Average turnaround time (assignment to submission, for COMPLETED reviews)
- Completion rate (percentage of assigned reviews that reached COMPLETED)
- Overdue reviews count (ASSIGNED reviews exceeding the configurable SLA threshold, default 48 hours)

**And** overdue reviews are listed below the metrics with: reviewer name, contribution title, domain, and time elapsed since assignment

### AC2: Admin Reassigns Overdue Review

**Given** I see an overdue review on the monitoring dashboard
**When** I select it and choose to reassign
**Then** I can select a different reviewer from eligible contributors (same domain preference, excludes contribution author and current reviewer)
**And** I must provide a reason for reassignment
**And** the original reviewer's assignment is marked as `REASSIGNED` with the reason and timestamp
**And** a new `PeerFeedback` record is created for the new reviewer with status `ASSIGNED`
**And** the new reviewer receives a notification that a review is waiting
**And** the reassignment is recorded in the audit log with: admin ID, old reviewer, new reviewer, reason, feedback ID

### AC3: System Tracks Feedback Metrics (FR32)

**Given** the feedback tracking system is operational
**When** feedback data accumulates
**Then** the system tracks and exposes:

- **Completion rate**: percentage of assigned reviews that reached COMPLETED status
- **Timeliness**: average time from `assignedAt` to `submittedAt` (COMPLETED reviews only)
- **Rubric coverage**: percentage of rubric questions answered with substantive content (comment length >= `MIN_COMMENT_LENGTH`)

**And** these metrics are available via `GET /api/v1/admin/feedback/metrics` for the health metrics dashboard (Epic 10)

### AC4: Admin Configures SLA Threshold

**Given** feedback turnaround SLA is configurable
**When** an admin updates the SLA threshold on the feedback monitoring page
**Then** the overdue calculation uses the new threshold immediately
**And** the overdue reviews list refreshes to reflect the updated SLA
**And** the change is persisted in `PlatformSetting` for all admins

## Tasks / Subtasks

### Task 1: Shared Types, Schemas & Constants (AC: #1, #2, #3, #4)

- [x]1.1 Add feedback monitoring types to `packages/shared/src/types/feedback.types.ts`:
  - `FeedbackMetricsDto`: `{ pendingCount: number; avgTurnaroundHours: number; completionRate: number; overdueCount: number; rubricCoverageRate: number; totalAssigned: number; totalCompleted: number }`
  - `OverdueReviewDto`: `{ id: string; reviewerId: string; reviewerName: string; reviewerAvatarUrl: string | null; contributionId: string; contributionTitle: string; contributionType: string; domain: string; assignedAt: string; hoursElapsed: number }`
  - `ReassignFeedbackDto`: `{ newReviewerId: string; reason: string }`
  - `FeedbackReassignedEvent`: `{ eventType: 'feedback.review.reassigned'; timestamp: string; correlationId: string; actorId: string; payload: { peerFeedbackId: string; oldReviewerId: string; newReviewerId: string; newPeerFeedbackId: string; contributionId: string; contributionTitle: string; contributionType: string; domain: string; reason: string } }`
  - `EligibleReviewerDto`: `{ id: string; name: string; avatarUrl: string | null; domain: string; pendingReviewCount: number }`
  - `PlatformSettingDto`: `{ key: string; value: unknown; updatedAt: string }`
- [x]1.2 Add monitoring schemas to `packages/shared/src/schemas/feedback.schema.ts`:
  - `reassignFeedbackSchema`: `z.object({ newReviewerId: z.string().uuid(), reason: z.string().min(10).max(500) })`
  - `feedbackMonitoringQuerySchema`: `z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(50).default(20) })`
  - `slaUpdateSchema`: `z.object({ hours: z.coerce.number().int().min(1).max(720) })`
- [x]1.3 Add `FEEDBACK_REASSIGNED` to `ActivityEventType` in `packages/shared/src/types/activity.types.ts`
- [x]1.4 Add `FEEDBACK_REASSIGNED` to `packages/shared/src/schemas/activity.schema.ts`
- [x]1.5 Add error code to `packages/shared/src/constants/error-codes.ts`:
  - `FEEDBACK_REASSIGN_SAME_REVIEWER: 'FEEDBACK_REASSIGN_SAME_REVIEWER'`
- [x]1.6 Export all new types, schemas, and constants from `packages/shared/src/index.ts`

### Task 2: Database Schema Updates (AC: #2, #4)

- [x]2.1 Add `PlatformSetting` model to `apps/api/prisma/schema.prisma`:

  ```prisma
  model PlatformSetting {
    key       String   @id
    value     Json
    updatedBy String?  @map("updated_by") @db.Uuid
    updatedAt DateTime @updatedAt @map("updated_at")
    createdAt DateTime @default(now()) @map("created_at")

    updater   Contributor? @relation(fields: [updatedBy], references: [id])

    @@map("platform_settings")
    @@schema("core")
  }
  ```

- [x]2.2 Add `platformSettings` relation to `Contributor` model: `platformSettings PlatformSetting[]`
- [x]2.3 Add `FEEDBACK_REASSIGNED` to `ActivityEventType` enum in `apps/api/prisma/schema.prisma`
- [x]2.4 Create Prisma migration: `apps/api/prisma/migrations/20260309600000_add_feedback_monitoring/migration.sql`
  - CREATE TABLE `platform_settings` with columns: `key` (PK), `value` (jsonb), `updated_by` (uuid nullable FK), `updated_at`, `created_at`
  - ALTER TYPE `ActivityEventType` ADD VALUE `'FEEDBACK_REASSIGNED'`
  - INSERT default setting: `key = 'feedback.sla.hours'`, `value = 48`
- [x]2.5 Run `npx prisma generate` to regenerate client

### Task 3: Backend — Settings Service (AC: #4)

- [x]3.1 Create `apps/api/src/modules/settings/settings.service.ts`:
  - `getSetting(key: string): Promise<{ key: string; value: unknown; updatedAt: Date } | null>` — fetches from `prisma.platformSetting.findUnique`
  - `getSettingValue<T>(key: string, defaultValue: T): Promise<T>` — returns typed value or default
  - `updateSetting(key: string, value: unknown, adminId: string, correlationId?: string): Promise<PlatformSetting>` — upserts setting, creates audit log entry (action: `'SETTING_UPDATED'`, entityType: `'PlatformSetting'`, details: `{ key, oldValue, newValue }`)
  - Logger: `private readonly logger = new Logger(SettingsService.name)`
- [x]3.2 Create `apps/api/src/modules/settings/settings.module.ts`:
  - Providers: `SettingsService`
  - Imports: `PrismaModule`
  - Exports: `SettingsService`
- [x]3.3 Add tests to `apps/api/src/modules/settings/settings.service.spec.ts`:
  - Test: getSetting returns setting value when exists
  - Test: getSetting returns null when not found
  - Test: getSettingValue returns default when key not found
  - Test: updateSetting upserts value and creates audit log
  - Test: updateSetting stores oldValue in audit details

### Task 4: Backend — Feedback Monitoring Service Methods (AC: #1, #2, #3)

- [x]4.1 Add `getFeedbackMetrics(slaHours: number)` to `feedback.service.ts`:
  - Query `peerFeedback` table for aggregate metrics:
    - `pendingCount`: COUNT where `status = ASSIGNED`
    - `totalAssigned`: COUNT where `status IN (ASSIGNED, COMPLETED, REASSIGNED)`
    - `totalCompleted`: COUNT where `status = COMPLETED`
    - `completionRate`: `totalCompleted / totalAssigned * 100` (0 if no assignments)
    - `avgTurnaroundHours`: AVG of `(submittedAt - assignedAt)` in hours for COMPLETED records — use Prisma raw query: `SELECT EXTRACT(EPOCH FROM AVG(submitted_at - assigned_at)) / 3600 ...`
    - `overdueCount`: COUNT where `status = ASSIGNED AND NOW() - assigned_at > interval '${slaHours} hours'`
    - `rubricCoverageRate`: compute in service layer — load COMPLETED records, parse `ratings` JSON, check each response comment length >= `MIN_COMMENT_LENGTH`, return `(substantive / total) * 100`
  - Return `FeedbackMetricsDto`
  - Log: `this.logger.log('Feedback metrics computed', { module: 'feedback', ...metrics })`
- [x]4.2 Add `getOverdueReviews(slaHours: number, query?: FeedbackQuery)` to `feedback.service.ts`:
  - Query: `status = ASSIGNED AND NOW() - assigned_at > interval '${slaHours} hours'`
  - Include: `reviewer` (id, name, avatarUrl), `contribution` (id, title, contributionType, contributor.domain)
  - Order by: `assignedAt ASC` (oldest first — most urgent)
  - Cursor-based pagination (same pattern as `getAssignmentsForReviewer`)
  - Map results to `OverdueReviewDto` including computed `hoursElapsed`
- [x]4.3 Add `reassignFeedback(feedbackId: string, newReviewerId: string, reason: string, adminId: string, correlationId?: string)` to `feedback.service.ts`:
  - Validate: feedback exists and `status = ASSIGNED` (else throw `FEEDBACK_INVALID_STATUS`)
  - Validate: `newReviewerId !== feedback.reviewerId` (else throw `FEEDBACK_REASSIGN_SAME_REVIEWER`)
  - Validate: `newReviewerId !== contribution.contributorId` (reviewer cannot be contribution author)
  - Validate: new reviewer exists and `isActive = true`
  - Within `$transaction`:
    - Update original PeerFeedback: `status → REASSIGNED`, `reassignedAt → now()`, `reassignReason → reason`
    - Create new PeerFeedback: `contributionId`, `reviewerId → newReviewerId`, `status → ASSIGNED`, `assignedBy → adminId`
    - Create audit log: action `'FEEDBACK_REASSIGNED'`, entityType `'PeerFeedback'`, entityId `feedbackId`, details `{ oldReviewerId, newReviewerId, newPeerFeedbackId, reason, contributionId }`
  - Emit event: `feedback.review.reassigned` with full payload
  - Return `{ oldFeedbackId, newPeerFeedbackId, newReviewerId }`
- [x]4.4 Add `getEligibleReviewers(feedbackId: string)` to `feedback.service.ts`:
  - Load feedback with contribution (to get `contributorId` and `contributor.domain`)
  - Query active contributors where:
    - `id !== contribution.contributorId` (not the author)
    - `id !== feedback.reviewerId` (not the current reviewer)
    - `isActive = true`
  - For each candidate, count pending ASSIGNED reviews: `peerFeedback.count({ where: { reviewerId, status: ASSIGNED } })`
  - Sort by: same domain first, then lowest pending count
  - Return `EligibleReviewerDto[]` (limit 20)
- [x]4.5 Add tests to `feedback.service.spec.ts`:
  - Test: getFeedbackMetrics returns correct aggregate counts
  - Test: getFeedbackMetrics computes average turnaround correctly
  - Test: getFeedbackMetrics returns 0 rates when no data
  - Test: getOverdueReviews returns only reviews exceeding SLA
  - Test: getOverdueReviews returns empty when all within SLA
  - Test: getOverdueReviews paginates correctly
  - Test: reassignFeedback marks original as REASSIGNED with reason and timestamp
  - Test: reassignFeedback creates new PeerFeedback for new reviewer
  - Test: reassignFeedback creates audit log with full details
  - Test: reassignFeedback emits feedback.review.reassigned event
  - Test: reassignFeedback rejects when feedback not found (404)
  - Test: reassignFeedback rejects when status is not ASSIGNED (400)
  - Test: reassignFeedback rejects when same reviewer (400)
  - Test: reassignFeedback rejects when new reviewer is contribution author (400)
  - Test: getEligibleReviewers excludes author and current reviewer
  - Test: getEligibleReviewers prioritizes same-domain reviewers

### Task 5: Backend — Admin Feedback Controller Updates (AC: #1, #2, #3, #4)

- [x]5.1 Add `GET /api/v1/admin/feedback/metrics` to `feedback-admin.controller.ts`:
  - `@Get('metrics')`
  - `@CheckAbility((ability) => ability.can(Action.Manage, 'PeerFeedback'))`
  - Load SLA from `settingsService.getSettingValue('feedback.sla.hours', 48)`
  - Call `feedbackService.getFeedbackMetrics(slaHours)`
  - Return `createSuccessResponse({ metrics, slaHours }, correlationId)`
- [x]5.2 Add `GET /api/v1/admin/feedback/overdue` to `feedback-admin.controller.ts`:
  - `@Get('overdue')`
  - `@CheckAbility((ability) => ability.can(Action.Manage, 'PeerFeedback'))`
  - Parse query with `feedbackMonitoringQuerySchema`
  - Load SLA from settings service
  - Call `feedbackService.getOverdueReviews(slaHours, query)`
  - Return `createSuccessResponse(result.items, correlationId, result.pagination)`
- [x]5.3 Add `POST /api/v1/admin/feedback/:id/reassign` to `feedback-admin.controller.ts`:
  - `@Post(':id/reassign')`
  - `@CheckAbility((ability) => ability.can(Action.Manage, 'PeerFeedback'))`
  - Validate body with `reassignFeedbackSchema`
  - Call `feedbackService.reassignFeedback(id, body.newReviewerId, body.reason, user.id, correlationId)`
  - Log: reassignment with module, feedbackId, newReviewerId, adminId, correlationId
  - Return `createSuccessResponse(result, correlationId)`
- [x]5.4 Add `GET /api/v1/admin/feedback/settings/sla` to `feedback-admin.controller.ts`:
  - `@Get('settings/sla')`
  - `@CheckAbility((ability) => ability.can(Action.Manage, 'PeerFeedback'))`
  - Return `createSuccessResponse({ hours: await settingsService.getSettingValue('feedback.sla.hours', 48) }, correlationId)`
- [x]5.5 Add `PUT /api/v1/admin/feedback/settings/sla` to `feedback-admin.controller.ts`:
  - `@Put('settings/sla')`
  - `@CheckAbility((ability) => ability.can(Action.Manage, 'PeerFeedback'))`
  - Validate body with `slaUpdateSchema`
  - Call `settingsService.updateSetting('feedback.sla.hours', body.hours, user.id, correlationId)`
  - Log: SLA updated with old and new value
  - Return `createSuccessResponse({ hours: body.hours }, correlationId)`
- [x]5.6 Add `GET /api/v1/admin/feedback/:id/eligible-reviewers` to `feedback-admin.controller.ts`:
  - `@Get(':id/eligible-reviewers')`
  - `@CheckAbility((ability) => ability.can(Action.Manage, 'PeerFeedback'))`
  - Call `feedbackService.getEligibleReviewers(id)`
  - Return `createSuccessResponse(result, correlationId)`
- [x]5.7 Inject `SettingsService` into `FeedbackAdminController` constructor
- [x]5.8 Import `SettingsModule` in `FeedbackModule`
- [x]5.9 Add controller tests to `feedback-admin.controller.spec.ts`:
  - Test: GET /metrics returns metrics with SLA from settings
  - Test: GET /overdue returns paginated overdue reviews
  - Test: POST /:id/reassign validates body and calls service
  - Test: POST /:id/reassign rejects invalid body
  - Test: GET /settings/sla returns current SLA
  - Test: PUT /settings/sla updates SLA and returns new value
  - Test: GET /:id/eligible-reviewers returns candidates
  - Test: all endpoints require JwtAuthGuard + AbilityGuard with Manage PeerFeedback

### Task 6: Notification Integration (AC: #2)

- [x]6.1 Add `@OnEvent('feedback.review.reassigned')` listener to `notification.service.ts`:
  - Notify the **new reviewer** with type `PEER_FEEDBACK_AVAILABLE`
  - Category: `'feedback'`
  - Title: `"You've been assigned to review a contribution"`
  - Description: `"Review ${contributionType}: ${contributionTitle}"`
  - EntityId: `newPeerFeedbackId` (the new assignment, not the old one)
  - Follow existing `handleFeedbackReviewAssigned` pattern with try/catch error logging
- [x]6.2 Add tests to `notification.service.spec.ts`:
  - Test: enqueues PEER_FEEDBACK_AVAILABLE notification for new reviewer on reassignment
  - Test: notification targets new reviewer, not old reviewer
  - Test: notification entityId is the new PeerFeedback ID

### Task 7: Activity Feed Integration (AC: #2)

- [x]7.1 Add `@OnEvent('feedback.review.reassigned')` listener to `activity.service.ts`:
  - Create activity event: `FEEDBACK_REASSIGNED` type
  - Title: `"Peer review reassigned for ${contributionTitle}"`
  - Metadata: `{ peerFeedbackId, contributionId, contributionType, oldReviewerId, newReviewerId, reason }`
  - Follow existing `handleFeedbackReviewSubmitted` pattern
- [x]7.2 Add tests to `activity.service.spec.ts`:
  - Test: creates FEEDBACK_REASSIGNED activity event on feedback.review.reassigned
  - Test: activity event has correct title and metadata

### Task 8: Frontend — Admin Feedback Monitoring Hooks (AC: #1, #2, #3, #4)

- [x]8.1 Create `apps/web/hooks/use-feedback-monitoring.ts`:
  - `useFeedbackMetrics()`: `useQuery` for `GET /api/v1/admin/feedback/metrics`
    - Query key: `['admin', 'feedback', 'metrics']`
    - staleTime: 30_000
  - `useOverdueReviews()`: `useInfiniteQuery` for `GET /api/v1/admin/feedback/overdue`
    - Query key: `['admin', 'feedback', 'overdue']`
    - Cursor-based pagination (same pattern as `use-admission-admin.ts`)
  - `useReassignFeedback()`: `useMutation` for `POST /api/v1/admin/feedback/:id/reassign`
    - On success: invalidate `['admin', 'feedback', 'metrics']` and `['admin', 'feedback', 'overdue']`
    - On success: toast "Review reassigned."
    - On error: toast with error message
  - `useFeedbackSla()`: `useQuery` for `GET /api/v1/admin/feedback/settings/sla`
    - Query key: `['admin', 'feedback', 'sla']`
  - `useUpdateFeedbackSla()`: `useMutation` for `PUT /api/v1/admin/feedback/settings/sla`
    - On success: invalidate `['admin', 'feedback', 'sla']`, `['admin', 'feedback', 'metrics']`, `['admin', 'feedback', 'overdue']`
    - On success: toast "SLA updated."
  - `useEligibleReviewers(feedbackId: string | null)`: `useQuery` for `GET /api/v1/admin/feedback/:id/eligible-reviewers`
    - Enabled only when `feedbackId` is non-null
    - Query key: `['admin', 'feedback', feedbackId, 'eligible-reviewers']`

### Task 9: Frontend — Admin Feedback Monitoring Page (AC: #1, #2, #3, #4)

- [x]9.1 Create `apps/web/app/(admin)/feedback/page.tsx`:
  - `generateMetadata()` returning `{ title: 'Feedback Monitoring — Edin Admin' }`
  - Wrap content in `ToastProvider`
  - Container: `max-w-[1200px] mx-auto p-[var(--spacing-lg)]`
  - Heading: "Feedback Monitoring" (sans-serif)
  - Subheading: "Track peer review completion and turnaround times"
  - Three sections:
    1. **Metrics grid** — `FeedbackMetricsGrid` component
    2. **SLA configuration** — inline editable setting
    3. **Overdue reviews** — `OverdueReviewsTable` component
- [x]9.2 Create `apps/web/components/features/feedback/admin/feedback-metrics-grid.tsx`:
  - Reuse `StatCard` from `apps/web/components/features/metrics/stat-card.tsx`
  - 4-column responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
  - Cards:
    1. **Pending Reviews**: `value = pendingCount`, context = "Awaiting reviewer submission"
    2. **Avg Turnaround**: `value = "${avgTurnaroundHours.toFixed(1)}h"`, context = "Assignment to submission"
    3. **Completion Rate**: `value = "${completionRate.toFixed(1)}%"`, context = `${totalCompleted} of ${totalAssigned} completed`
    4. **Overdue**: `value = overdueCount`, context = `Exceeding ${slaHours}h SLA`
  - Loading state: 4x `StatCardSkeleton`
  - Skeleton: `role="status"`, `aria-label="Loading feedback metrics"`
- [x]9.3 Create `apps/web/components/features/feedback/admin/sla-setting.tsx`:
  - Display current SLA value with inline edit capability
  - Layout: label "Turnaround SLA" + current value + "Edit" button
  - Edit mode: number input (1-720 hours) + "Save" + "Cancel" buttons
  - On save: call `useUpdateFeedbackSla` mutation
  - Styling: `surface-raised` card, `border-light`, 12px radius
  - Input: `min-h-[40px]`, `rounded-[var(--radius-md)]`, `border-surface-border-input`
- [x]9.4 Create `apps/web/components/features/feedback/admin/overdue-reviews-table.tsx`:
  - **Desktop table** (hidden on mobile): grid layout with columns — Reviewer, Contribution, Domain, Assigned, Time Elapsed, Action
  - **Mobile cards** (hidden on desktop): card per review with stacked info
  - Column widths: `grid-cols-[200px_1fr_120px_140px_120px_100px]`
  - Row styling: `hover:bg-surface-sunken/50`, clickable rows
  - Reviewer column: name (truncated if long)
  - Contribution column: title + type badge
  - Domain column: domain badge with domain color
  - Assigned column: relative date ("2 days ago")
  - Time elapsed: hours since assignment, styled with `semantic.warning` when > 1.5x SLA, `semantic.error` when > 2x SLA
  - Action column: "Reassign" button (text button, brand accent)
  - Empty state: "No overdue reviews. All feedback is within SLA."
  - Loading: skeleton rows matching grid structure
  - Pagination: "Load more" button (not infinite scroll)
- [x]9.5 Create `apps/web/components/features/feedback/admin/reassign-dialog.tsx`:
  - Radix UI `Dialog.Root` sliding panel (follow `application-detail-panel.tsx` pattern)
  - Header: "Reassign Review"
  - Content:
    - Current assignment info (reviewer name, contribution title, time elapsed)
    - Reviewer select: dropdown of eligible reviewers from `useEligibleReviewers`
      - Each option shows: name, domain badge, pending review count
      - Sort: same domain first, lowest load first
    - Reason textarea: required, min 10 chars, placeholder "Explain why this review is being reassigned..."
  - Actions: "Reassign" (brand accent, solid) + "Cancel" (ghost)
  - On submit: call `useReassignFeedback`, close dialog on success
  - Validation: reason min 10 chars, reviewer selected
  - Overlay: `bg-black/20`
  - Panel: `max-w-[480px]`, slides from right
- [x]9.6 Add loading.tsx at `apps/web/app/(admin)/feedback/loading.tsx`:
  - Skeleton layout matching page structure (4 stat card skeletons + table skeleton)

### Task 10: Frontend — Admin Navigation Update (AC: #1)

- [x]10.1 Add "Feedback" link to admin navigation in `apps/web/app/(admin)/layout.tsx`:
  - Verify if admin layout has a nav items array (similar to `DASHBOARD_NAV_ITEMS`)
  - If yes: add `{ href: '/admin/feedback', label: 'Feedback' }` positioned after existing entries
  - If no structured nav: add a link in the appropriate location following existing pattern
  - Icon: use existing icon pattern or simple text link consistent with other admin nav items

### Task 11: Testing (AC: #1-#4)

- [x]11.1 Build shared package: `pnpm --filter @edin/shared build` — verify new types/schemas compile
- [x]11.2 Run full API test suite — verify 0 regressions
- [x]11.3 Run full web test suite — verify 0 regressions (TypeScript check: `pnpm --filter web exec tsc --noEmit`)
- [x]11.4 Verify all new tests pass
- [x]11.5 Manual smoke test: navigate to `/admin/feedback`, verify metrics display, overdue list, SLA edit, reassignment flow

## Dev Notes

### Architecture Patterns — MUST FOLLOW

- **Module pattern**: Extend existing `apps/api/src/modules/feedback/` module for monitoring methods. Create NEW `apps/api/src/modules/settings/` module for platform settings (reusable by Epic 10)
- **Admin controller**: Extend existing `feedback-admin.controller.ts` at `/api/v1/admin/feedback/*` — do NOT create a new controller
- **BullMQ**: NOT needed for monitoring or reassignment. These are synchronous admin operations
- **Event emission**: Use `EventEmitter2` for `feedback.review.reassigned`. Payload: `{ eventType, timestamp, correlationId, actorId, payload: { ... } }`
- **Prisma imports**: Import from `../../../generated/prisma/client/client.js` — NOT from `@prisma/client` (Prisma 7 local generation)
- **API response**: Always use `createSuccessResponse(data, correlationId, pagination?)` from `apps/api/src/common/types/api-response.type.ts`
- **Error handling**: Use `DomainException` from `apps/api/src/common/exceptions/domain.exception.ts` with error codes from `@edin/shared`
- **Controller version**: Routes at `/api/v1/admin/feedback/*` — existing controller already uses `@Controller({ path: 'admin/feedback', version: '1' })`
- **DTO validation**: Zod `safeParse()` with error mapping to `DomainException` (follow existing `adminAssign` pattern in `feedback-admin.controller.ts`)
- **Testing**: Vitest with `describe/it/expect/vi/beforeEach`. Mock Prisma, services. Co-locate spec files with source
- **Logging**: `private readonly logger = new Logger(ClassName.name)` with structured context `{ module: 'feedback', ... }`
- **Audit logging**: All admin mutations must create `prisma.auditLog.create` entries inside `$transaction`. Follow pattern in `feedback.service.ts`
- **Frontend data fetching**: TanStack Query (`useQuery`, `useMutation`, `useInfiniteQuery`). Admin queries use staleTime: 30_000
- **Frontend API client**: Use `apiClient<T>()` from `apps/web/lib/api-client.ts`
- **Frontend styling**: Tailwind CSS with Edin design tokens (CSS variables). Radix UI for dialogs/selects
- **Frontend components**: Co-locate admin feedback components in `apps/web/components/features/feedback/admin/`
- **Route groups**: Admin pages at `apps/web/app/(admin)/feedback/` — NOT under `(dashboard)`

### Critical Code Reuse — DO NOT REINVENT

| What                         | Where                                                                           | Why                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Admin controller pattern     | `apps/api/src/modules/feedback/feedback-admin.controller.ts`                    | @UseGuards, @CheckAbility(Manage), correlationId, Zod validation, createSuccessResponse   |
| Reviewer selection algorithm | `apps/api/src/modules/feedback/feedback.service.ts` (assignReviewer)            | Domain preference, load balancing, exclusion logic — adapt for getEligibleReviewers       |
| Audit logging in transaction | `apps/api/src/modules/feedback/feedback.service.ts`                             | `tx.auditLog.create` inside `$transaction` with action, entityType, details               |
| Event emission payload       | `apps/api/src/modules/feedback/feedback.service.ts`                             | `eventEmitter.emit` with `{ eventType, timestamp, correlationId, actorId, payload }`      |
| Notification listener        | `apps/api/src/modules/notification/notification.service.ts`                     | `@OnEvent` with `enqueueNotification()`, try/catch, structured error logging              |
| Activity event listener      | `apps/api/src/modules/activity/activity.service.ts`                             | `@OnEvent` with activity creation, metadata payload                                       |
| Cursor-based pagination      | `apps/api/src/modules/feedback/feedback.service.ts` (getAssignmentsForReviewer) | Keyset pagination using `assignedAt\|id` cursor pattern                                   |
| Test mock patterns           | `apps/api/src/modules/feedback/feedback.service.spec.ts`                        | mockPrisma, `$transaction` mock, vi.fn() patterns                                         |
| StatCard component           | `apps/web/components/features/metrics/stat-card.tsx`                            | Reuse directly for metrics display — props: label, value, context                         |
| StatCardSkeleton             | `apps/web/components/features/metrics/stat-card.tsx`                            | Loading state for metric cards                                                            |
| Desktop table + mobile card  | `apps/web/components/features/admission/admin/buddy-assignment-list.tsx`        | Dual view pattern: `hidden md:block` / `md:hidden` with grid columns                      |
| Radix Dialog panel           | `apps/web/components/features/admission/admin/application-detail-panel.tsx`     | Side panel pattern: Dialog.Root, Portal, Overlay, Content sliding from right              |
| Radix Select component       | `apps/web/components/features/admission/admin/admission-filters.tsx`            | Select.Root with trigger styling, portal, scrollable content                              |
| Toast notifications          | `apps/web/components/ui/toast.tsx`                                              | `useToast()` → `toast({ title, variant })`                                                |
| Domain badge colors          | `apps/web/lib/domain-colors.ts`                                                 | `DOMAIN_COLORS[domain]` for bg/text/border classes                                        |
| Status badge pattern         | `apps/web/components/features/admission/admin/buddy-assignment-list.tsx`        | `inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px]` + semantic colors |
| Admin page structure         | `apps/web/app/(admin)/admission/page.tsx`                                       | generateMetadata, ToastProvider wrapper, max-w-[1200px] centered container                |
| Admin infinite query         | `apps/web/hooks/use-admission-admin.ts`                                         | useInfiniteQuery with cursor pagination, getNextPageParam                                 |
| API client wrapper           | `apps/web/lib/api-client.ts`                                                    | `apiClient<T>('/api/v1/path', options)`                                                   |
| Relative date formatting     | `apps/web/components/features/feedback/pending-review-list.tsx`                 | formatRelativeDate utility for "2 days ago" style                                         |

### UX Requirements — Admin Dashboard Design (CRITICAL)

**Admin Design Register:**

- Sans-serif dominant, data-readable typography
- Compact but not cramped spacing
- Functional layout — tables, filters, but editorially designed
- Neutral palette with semantic accents for status indicators

**Data Display Rules:**

- A number alone is NEVER displayed — always has a label AND a context description
- Tables: warm borders, 48px minimum row height, no zebra striping
- Sans-serif 15px for table content
- Desktop table with mobile card fallback (`hidden md:block` / `md:hidden`)

**Metrics Display:**

- Use `StatCard` component (serif for values, sans for labels)
- 4-column grid on desktop, 2-column on tablet, 1-column on mobile
- No red/green for metric values — use semantic colors only for status indicators

**Overdue Indicators:**

- Time elapsed uses `semantic.warning` color when > 1.5x SLA
- Time elapsed uses `semantic.error` color when > 2x SLA
- "Overdue" is conveyed by elapsed time, not by alarming colors on the entire row

**Reassignment Dialog:**

- Radix Dialog sliding from right (max-w-[480px])
- Overlay: `bg-black/20`
- Generous padding, clear labels
- Reviewer dropdown shows: name + domain badge + "X pending reviews"
- Reason textarea: auto-grow, min 10 chars

**Accessibility (WCAG 2.1 AA):**

- 4.5:1 color contrast for body text
- Full keyboard navigation through metrics, table, dialog
- `aria-label` on action buttons ("Reassign review for [contribution title]")
- Dialog traps focus, returns on close
- Table rows accessible via keyboard with `role="button"`, `tabIndex={0}`
- Loading states: `role="status"`, `aria-label="Loading..."`

### PeerFeedback Model Reference

```prisma
model PeerFeedback {
  id              String         @id @db.Uuid
  contributionId  String         @map("contribution_id") @db.Uuid
  reviewerId      String         @map("reviewer_id") @db.Uuid
  status          FeedbackStatus @default(ASSIGNED)
  ratings         Json?
  comments        String?        @db.Text
  assignedBy      String?        @map("assigned_by") @db.Uuid
  assignedAt      DateTime       @default(now())
  submittedAt     DateTime?
  reassignedAt    DateTime?      // USE THIS for reassignment tracking
  reassignReason  String?        // USE THIS for reassignment reason
  createdAt       DateTime
  updatedAt       DateTime

  // Relations
  contribution    Contribution   @relation(...)
  reviewer        Contributor    @relation(...)

  // Indexes — idx_peer_feedback_status_assigned supports overdue queries
  @@index([status, assignedAt], map: "idx_peer_feedback_status_assigned")
}

enum FeedbackStatus {
  ASSIGNED     // Active review assignment
  COMPLETED    // Feedback submitted
  REASSIGNED   // Admin reassigned to another reviewer
  UNASSIGNED   // No reviewer found (fallback)
}
```

### Reassignment Flow — Detailed Specification

```
1. Admin navigates to /admin/feedback
2. Dashboard loads metrics via GET /api/v1/admin/feedback/metrics
3. Overdue reviews load via GET /api/v1/admin/feedback/overdue
4. Admin clicks "Reassign" on an overdue review
5. Dialog opens, eligible reviewers load via GET /api/v1/admin/feedback/:id/eligible-reviewers
6. Admin selects new reviewer + enters reason
7. Frontend calls POST /api/v1/admin/feedback/:id/reassign
8. API validates: status is ASSIGNED, new reviewer eligible, reason valid
9. API executes in $transaction:
   a. Update old PeerFeedback: status → REASSIGNED, reassignedAt → now(), reassignReason → reason
   b. Create new PeerFeedback: same contributionId, new reviewerId, status → ASSIGNED, assignedBy → adminId
   c. Create audit log: FEEDBACK_REASSIGNED with full details
10. API emits 'feedback.review.reassigned' event
11. NotificationService listener → enqueue PEER_FEEDBACK_AVAILABLE for new reviewer
12. ActivityService listener → create FEEDBACK_REASSIGNED activity event
13. API returns { oldFeedbackId, newPeerFeedbackId, newReviewerId }
14. Frontend shows toast "Review reassigned.", refreshes metrics and overdue list
```

### Metrics Computation — Implementation Notes

**Average Turnaround (Prisma raw query):**

```sql
SELECT EXTRACT(EPOCH FROM AVG(submitted_at - assigned_at)) / 3600
FROM peer_feedbacks
WHERE status = 'COMPLETED'
  AND submitted_at IS NOT NULL
```

**Rubric Coverage (service layer computation):**

```typescript
// Load COMPLETED records with ratings JSON
// For each record: parse ratings.responses
// Count responses where comment.length >= MIN_COMMENT_LENGTH
// rubricCoverage = substantiveResponses / totalResponses * 100
// Return average across all COMPLETED records
```

**Overdue Query (efficient index scan):**

```sql
SELECT * FROM peer_feedbacks
WHERE status = 'ASSIGNED'
  AND assigned_at < NOW() - INTERVAL '${slaHours} hours'
ORDER BY assigned_at ASC
```

Uses `idx_peer_feedback_status_assigned` index for efficient scanning.

### SLA Configuration Notes

- Default: 48 hours (seeded in migration)
- Stored as `PlatformSetting` with key `'feedback.sla.hours'`
- Value is integer (hours), range 1-720
- When admin changes SLA, all endpoints immediately use new value (no cache)
- The `PlatformSetting` model is designed for reuse in Epic 10 (Story 10-2: Role Management and Platform Settings)

### Performance Requirements

| Metric                                   | Target                   | Source |
| ---------------------------------------- | ------------------------ | ------ |
| Metrics endpoint response                | <500ms 95th percentile   | NFR-P4 |
| Overdue list page FCP                    | <1.2s                    | NFR-P1 |
| Dashboard page LCP                       | <2.5s                    | NFR-P2 |
| Notification delivery after reassignment | <5 seconds               | NFR-P3 |
| Metrics data freshness                   | <5 minute lag acceptable | NFR-O3 |

### Database Notes

- **No changes to PeerFeedback table** — `reassignedAt` and `reassignReason` fields already exist from Story 6-1
- **FeedbackStatus enum already has REASSIGNED** — no enum addition needed for PeerFeedback
- **New table**: `platform_settings` (key-value, lightweight)
- **New enum value**: `FEEDBACK_REASSIGNED` in ActivityEventType only
- **Existing index** `idx_peer_feedback_status_assigned` (status, assignedAt) supports overdue queries efficiently
- **Unique constraint** (contributionId, reviewerId) means a new PeerFeedback for the new reviewer is valid since the reviewer is different

### Project Structure Notes

**New Files:**

- `apps/api/src/modules/settings/settings.module.ts` — Platform settings module
- `apps/api/src/modules/settings/settings.service.ts` — Settings get/set service
- `apps/api/src/modules/settings/settings.service.spec.ts` — Settings tests
- `apps/api/prisma/migrations/20260309600000_add_feedback_monitoring/migration.sql` — Migration
- `apps/web/hooks/use-feedback-monitoring.ts` — All admin feedback monitoring hooks
- `apps/web/components/features/feedback/admin/feedback-metrics-grid.tsx` — Metrics display
- `apps/web/components/features/feedback/admin/sla-setting.tsx` — SLA configuration widget
- `apps/web/components/features/feedback/admin/overdue-reviews-table.tsx` — Overdue reviews table
- `apps/web/components/features/feedback/admin/reassign-dialog.tsx` — Reassignment dialog
- `apps/web/app/(admin)/feedback/page.tsx` — Admin feedback monitoring page
- `apps/web/app/(admin)/feedback/loading.tsx` — Loading skeleton

**Modified Files:**

- `packages/shared/src/types/feedback.types.ts` — Add monitoring DTOs
- `packages/shared/src/schemas/feedback.schema.ts` — Add monitoring/reassignment schemas
- `packages/shared/src/types/activity.types.ts` — Add FEEDBACK_REASSIGNED
- `packages/shared/src/schemas/activity.schema.ts` — Add FEEDBACK_REASSIGNED
- `packages/shared/src/constants/error-codes.ts` — Add FEEDBACK_REASSIGN_SAME_REVIEWER
- `packages/shared/src/index.ts` — Export new types/schemas
- `apps/api/prisma/schema.prisma` — Add PlatformSetting model, FEEDBACK_REASSIGNED enum
- `apps/api/src/modules/feedback/feedback.module.ts` — Import SettingsModule
- `apps/api/src/modules/feedback/feedback.service.ts` — Add monitoring + reassignment methods
- `apps/api/src/modules/feedback/feedback.service.spec.ts` — Add monitoring + reassignment tests
- `apps/api/src/modules/feedback/feedback-admin.controller.ts` — Add monitoring + reassignment endpoints
- `apps/api/src/modules/feedback/feedback-admin.controller.spec.ts` — Add controller tests (create if needed)
- `apps/api/src/modules/notification/notification.service.ts` — Add reassignment notification listener
- `apps/api/src/modules/notification/notification.service.spec.ts` — Add notification tests
- `apps/api/src/modules/activity/activity.service.ts` — Add reassignment activity listener
- `apps/api/src/modules/activity/activity.service.spec.ts` — Add activity tests
- `apps/web/app/(admin)/layout.tsx` — Add Feedback nav item

### Previous Story Intelligence (6-2: Structured Feedback Rubric & Submission)

**Key Learnings from Story 6-2:**

- Shared package must be built before API tests: `pnpm --filter @edin/shared build` — constants resolve to `undefined` until compiled
- Pre-existing TypeScript errors in `activity.service.ts` (lines 189, 198, 277) — null vs undefined type mismatches with Prisma 7, not introduced by Story 6-2. Do not try to fix these
- All feedback DB operations use `$transaction` with audit log entries — maintain this pattern for reassignment
- The `eventEmitter.emit` pattern uses standardized payload structure: `{ eventType, timestamp, correlationId, actorId, payload }`
- CASL admin permission uses `Action.Manage, 'PeerFeedback'` — already exists, no changes needed
- Controller validates with `safeParse()` and maps errors to `DomainException` — follow same pattern
- Admin controller is separate file (`feedback-admin.controller.ts`) at `/api/v1/admin/feedback/` — extend this file
- Story 6-2 code review found issues with: using shared types instead of duplicating, proper DomainException usage, CASL filtering — be careful about these
- Frontend uses `apiClient<T>()` wrapper, TanStack Query hooks, Radix UI primitives, Tailwind with CSS variables

**Files from Story 6-2 to be aware of (avoid conflicts):**

- `feedback.service.ts` — Will be extended with monitoring methods (add below existing methods)
- `feedback-admin.controller.ts` — Will be extended with new endpoints (add below existing `adminAssign`)
- `notification.service.ts` — Will add new @OnEvent listener (add below existing feedback listeners)
- `activity.service.ts` — Will add new @OnEvent listener (add below existing feedback listeners)
- Shared types/schemas — Will be extended (add below existing feedback types)

### Git Intelligence

Recent commits follow pattern: `feat: implement [feature description] (Story X-Y)`. Most recent commit: `9acd8e6 feat: implement peer feedback system — assignment and structured rubric (Stories 6-1, 6-2)`. Stories 6-1 and 6-2 are committed and clean. Working tree is clean per git status.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.3, lines 1241-1270]
- [Source: _bmad-output/planning-artifacts/prd.md — FR31 (monitoring), FR32 (tracking), FR48 (health dashboard), FR50 (config)]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR-R5 (>95% assignment success, admin fallback), NFR-O1-O4 (observability)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Feedback module, Admin API patterns, Database schema, File structure]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Admin dashboard design register, Data display rules, Calm Clarity]
- [Source: _bmad-output/implementation-artifacts/6-2-structured-feedback-rubric-and-submission.md — Previous story patterns, Dev notes, File list]
- [Source: apps/api/src/modules/feedback/feedback-admin.controller.ts — Admin controller pattern, guards, validation]
- [Source: apps/api/src/modules/feedback/feedback.service.ts — Service methods, transaction patterns, event emission]
- [Source: apps/api/src/modules/feedback/feedback.service.spec.ts — Test mock patterns]
- [Source: apps/api/prisma/schema.prisma — PeerFeedback model, FeedbackStatus enum, indexes]
- [Source: apps/api/src/modules/notification/notification.service.ts — @OnEvent listener, enqueueNotification pattern]
- [Source: apps/api/src/modules/activity/activity.service.ts — Activity event creation pattern]
- [Source: apps/web/components/features/metrics/stat-card.tsx — StatCard, StatCardSkeleton]
- [Source: apps/web/components/features/admission/admin/ — Admin page patterns, tables, dialogs, filters]
- [Source: apps/web/app/(admin)/layout.tsx — Admin auth guard, layout structure]
- [Source: packages/shared/src/constants/error-codes.ts — Error code patterns]

## Change Log

| Change                                 | Date       | Version |
| -------------------------------------- | ---------- | ------- |
| Story created with full task breakdown | 2026-03-09 | 1.0     |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

None

### Completion Notes List

- All 11 tasks implemented across shared, API, and web packages
- Code review completed: 3 CRITICAL, 4 HIGH, 2 MEDIUM issues found and fixed
- All 649 API tests pass after fixes
- Web TypeScript check passes (pre-existing stale cache warning only)

### File List

**New Files:**

- `apps/api/prisma/migrations/20260309060000_add_feedback_monitoring/migration.sql`
- `apps/api/src/modules/settings/settings.module.ts`
- `apps/api/src/modules/settings/settings.service.ts`
- `apps/api/src/modules/settings/settings.service.spec.ts`
- `apps/web/hooks/use-feedback-monitoring.ts`
- `apps/web/app/(admin)/feedback/page.tsx`
- `apps/web/app/(admin)/feedback/loading.tsx`
- `apps/web/components/features/feedback/admin/feedback-monitoring-dashboard.tsx`
- `apps/web/components/features/feedback/admin/feedback-metrics-grid.tsx`
- `apps/web/components/features/feedback/admin/sla-setting.tsx`
- `apps/web/components/features/feedback/admin/overdue-reviews-table.tsx`
- `apps/web/components/features/feedback/admin/reassign-dialog.tsx`

**Modified Files:**

- `packages/shared/src/types/feedback.types.ts` — Added monitoring DTOs
- `packages/shared/src/schemas/feedback.schema.ts` — Added monitoring/reassignment schemas
- `packages/shared/src/types/activity.types.ts` — Added FEEDBACK_REASSIGNED
- `packages/shared/src/schemas/activity.schema.ts` — Added FEEDBACK_REASSIGNED
- `packages/shared/src/constants/error-codes.ts` — Added FEEDBACK_REASSIGN_SAME_REVIEWER
- `packages/shared/src/index.ts` — Exported new types/schemas
- `apps/api/prisma/schema.prisma` — Added PlatformSetting model, FEEDBACK_REASSIGNED enum
- `apps/api/src/modules/feedback/feedback.module.ts` — Imported SettingsModule
- `apps/api/src/modules/feedback/feedback.service.ts` — Added monitoring + reassignment methods
- `apps/api/src/modules/feedback/feedback.service.spec.ts` — Added monitoring + reassignment tests
- `apps/api/src/modules/feedback/feedback-admin.controller.ts` — Added monitoring + reassignment endpoints
- `apps/api/src/modules/feedback/feedback-admin.controller.spec.ts` — Added controller tests
- `apps/api/src/modules/notification/notification.service.ts` — Added reassignment notification listener
- `apps/api/src/modules/activity/activity.service.ts` — Added reassignment activity listener
- `apps/web/app/(admin)/layout.tsx` — Added Feedback nav item
