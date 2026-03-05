# Story 3.4: Buddy Assignment & First-Task Recommendation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a newly admitted contributor,
I want to be paired with a buddy and receive a curated first-task recommendation,
so that I have personal guidance and a meaningful starting point within 72 hours.

## Acceptance Criteria

1. **AC1 — Welcome experience with buddy display**
   Given I have been admitted as a contributor
   When I log in for the first time after admission
   Then I see a welcome experience on my dashboard showing: my assigned buddy with their photo, name, domain, and a brief bio
   And the buddy assignment feels like meeting a person, not receiving a system notification (UX spec: Human-First Assignment Pattern)

2. **AC2 — Buddy selection algorithm**
   Given I am a newly admitted contributor
   When my buddy is assigned
   Then the system selects a buddy from active contributors in my primary domain who have opted in to buddy duty
   And if no domain match is available, a buddy from any domain is assigned
   And admins can manually override buddy assignments via the admin panel

3. **AC3 — First task recommendation**
   Given I am a newly admitted contributor with a buddy assigned
   When I view my onboarding dashboard
   Then I see a suggested first task matched to my domain and skill level
   And the task is pre-scoped to be achievable in hours, not days
   And a "Claim this task" action is available (linking to Epic 5 task claiming — stub for now)

4. **AC4 — Buddy assignment persistence and notification**
   Given buddy assignments are made
   When a buddy is assigned
   Then the buddy assignment is recorded in the database with contributor ID, buddy ID, assignment date, and 30-day expiry
   And the buddy receives a notification that they have been paired with a new contributor

## Tasks / Subtasks

- [x] Task 1: Database schema — BuddyAssignment model and migration (AC: #2, #4)
  - [x] 1.1 Add `BuddyAssignment` model to Prisma schema in `core` schema with fields: id, contributorId, buddyId, assignedAt, expiresAt (30-day), isActive, notes
  - [x] 1.2 Add `buddyOptIn` boolean field to `Contributor` model (default: false)
  - [x] 1.3 Add relations: Contributor has many buddyAssignments (as mentee), Contributor has many buddyMentees (as buddy)
  - [x] 1.4 Create and run Prisma migration
  - [x] 1.5 Update seed script with sample buddy opt-in contributors and test assignments

- [x] Task 2: Shared schemas, types, and error codes (AC: #1, #2, #3, #4)
  - [x] 2.1 Add Zod schemas to `packages/shared/src/schemas/admission.schema.ts`: `assignBuddySchema`, `overrideBuddySchema`, `buddyOptInSchema`, `listBuddyAssignmentsQuerySchema`
  - [x] 2.2 Add TypeScript types to `packages/shared/src/types/admission.types.ts`: `BuddyAssignment`, `BuddyProfile`, `FirstTaskRecommendation`
  - [x] 2.3 Add error codes to `packages/shared/src/constants/error-codes.ts`: `BUDDY_NOT_FOUND`, `NO_ELIGIBLE_BUDDIES`, `BUDDY_ALREADY_ASSIGNED`, `BUDDY_ASSIGNMENT_EXPIRED`
  - [x] 2.4 Export all new schemas/types/constants from `packages/shared/src/index.ts`

- [x] Task 3: CASL permissions for buddy operations (AC: #2)
  - [x]3.1 Add `BuddyAssignment` subject to CASL ability factory
  - [x]3.2 CONTRIBUTOR role: can READ own BuddyAssignment (where contributorId or buddyId matches)
  - [x]3.3 CONTRIBUTOR role: can UPDATE own buddy opt-in status
  - [x]3.4 ADMIN role: inherits MANAGE all (already configured)

- [x] Task 4: Backend service — buddy assignment logic (AC: #2, #4)
  - [x]4.1 Add `assignBuddy(contributorId, correlationId)` method to `AdmissionService` — auto-selects best buddy by domain match, fallback to any domain
  - [x]4.2 Add `overrideBuddyAssignment(assignmentId, newBuddyId, adminId, correlationId)` for admin override
  - [x]4.3 Add `getBuddyAssignment(contributorId)` to retrieve active buddy for a contributor
  - [x]4.4 Add `listBuddyAssignments(query)` for admin view of all assignments
  - [x]4.5 Add `updateBuddyOptIn(contributorId, optIn)` to toggle buddy availability
  - [x]4.6 Add `getEligibleBuddies(domain)` helper — active contributors with buddyOptIn=true, ordered by domain match then random
  - [x]4.7 Emit event `admission.buddy.assigned` on assignment with payload: contributorId, buddyId, domain, isAutomatic
  - [x]4.8 Emit event `admission.buddy.overridden` on admin override
  - [x]4.9 Create audit log entries for all buddy operations: `admission.buddy.assigned`, `admission.buddy.overridden`, `admission.buddy.optin.changed`
  - [x]4.10 All mutating operations within Prisma transactions

- [x] Task 5: Backend service — first task recommendation (AC: #3)
  - [x]5.1 Add `getFirstTaskRecommendation(contributorId)` method — returns a curated first-task based on domain
  - [x]5.2 Logic: fetch active micro-task for contributor's domain as the recommended first task (reuse existing `findFirst({ where: { domain, isActive: true } })` pattern)
  - [x]5.3 Return structured recommendation: task title, description, estimated effort, domain, claimable status (stub — Epic 5 will add real task claiming)

- [x] Task 6: Backend controller — buddy endpoints (AC: #1, #2, #3, #4)
  - [x]6.1 `GET /api/v1/admission/buddy-assignments/mine` — get current user's buddy assignment (CONTRIBUTOR+)
  - [x]6.2 `GET /api/v1/admission/buddy-assignments/mine/first-task` — get first task recommendation (CONTRIBUTOR+)
  - [x]6.3 `GET /api/v1/admission/buddy-assignments` — list all assignments with pagination (ADMIN)
  - [x]6.4 `POST /api/v1/admission/buddy-assignments/:id/override` — admin override buddy (ADMIN)
  - [x]6.5 `PATCH /api/v1/contributors/me/buddy-opt-in` — toggle buddy opt-in (CONTRIBUTOR+)
  - [x]6.6 `GET /api/v1/admission/buddy-assignments/eligible` — list eligible buddies for a domain (ADMIN)
  - [x]6.7 All endpoints use `createSuccessResponse()` envelope, `JwtAuthGuard`, `AbilityGuard`, `@CheckAbility`

- [x] Task 7: Auto-assign buddy on approval (AC: #2, #4)
  - [x]7.1 Listen for `admission.application.approved` event in AdmissionService
  - [x]7.2 On approval, call `assignBuddy(contributorId)` automatically
  - [x]7.3 If no eligible buddies, log warning and set assignment to null (contributor can still onboard without buddy — graceful degradation)
  - [x]7.4 Store buddy notification payload for future notification delivery (inline record in audit log until notification module exists)

- [x] Task 8: Frontend — onboarding welcome experience (AC: #1, #3)
  - [x]8.1 Create `apps/web/components/features/onboarding/buddy-welcome-card.tsx` — displays buddy photo, name, domain badge, brief bio using Human-First Assignment Pattern
  - [x]8.2 Create `apps/web/components/features/onboarding/first-task-card.tsx` — displays recommended first task with title, description, effort estimate, and "Claim this task" button (disabled stub linking to Epic 5)
  - [x]8.3 Create `apps/web/components/features/onboarding/onboarding-welcome.tsx` — container component composing buddy card + first task card for the dashboard welcome section
  - [x]8.4 Integrate onboarding welcome into `apps/web/app/(dashboard)/dashboard/page.tsx` — show only for newly admitted contributors (ignitionStartedAt exists, buddy assigned)
  - [x]8.5 Loading state: skeleton screens matching card layout (no spinners)
  - [x]8.6 Empty state: if no buddy assigned, show warm message "We're finding the right person to welcome you" (not an error)

- [x] Task 9: Frontend — hooks for buddy data (AC: #1, #3)
  - [x]9.1 Create `apps/web/hooks/use-buddy-assignment.ts` with `useBuddyAssignment()` and `useFirstTaskRecommendation()` hooks using TanStack Query
  - [x]9.2 Stale time: 60s (buddy assignment rarely changes)
  - [x]9.3 Error handling: graceful degradation — if API fails, show "Loading your buddy..." state

- [x] Task 10: Frontend — admin buddy management (AC: #2)
  - [x]10.1 Create `apps/web/app/(admin)/buddy-assignments/page.tsx` — admin page listing all buddy assignments
  - [x]10.2 Create `apps/web/app/(admin)/buddy-assignments/loading.tsx` — skeleton loading state
  - [x]10.3 Create `apps/web/components/features/admission/admin/buddy-assignment-list.tsx` — data table with columns: Contributor, Buddy, Domain, Assigned Date, Expires, Status
  - [x]10.4 Create `apps/web/components/features/admission/admin/buddy-override-dialog.tsx` — confirmation dialog for reassigning buddy (shows eligible buddy list)
  - [x]10.5 Create `apps/web/hooks/use-buddy-admin.ts` — hooks for admin buddy operations
  - [x]10.6 Follow existing admin table patterns: warm borders, 48px rows, domain badges, sans-serif 15px

- [x] Task 11: Frontend — buddy opt-in for contributors (AC: #2)
  - [x]11.1 Add buddy opt-in toggle to contributor profile page `apps/web/app/(dashboard)/profile/page.tsx`
  - [x]11.2 Simple toggle with label: "Available as a buddy for new contributors"
  - [x]11.3 Confirmation dialog: "You'll be matched with new contributors in your domain. You can opt out at any time."

- [x] Task 12: Testing (AC: #1, #2, #3, #4)
  - [x]12.1 Backend unit tests for buddy assignment service methods (assign, override, opt-in, eligible, first-task)
  - [x]12.2 Backend unit tests for controller endpoints
  - [x]12.3 Backend tests for auto-assignment on approval event
  - [x]12.4 Backend tests for edge cases: no eligible buddies, domain fallback, expired assignments
  - [x]12.5 Frontend tests for buddy-welcome-card component (renders buddy info correctly)
  - [x]12.6 Frontend tests for first-task-card component (renders task, disabled claim button)
  - [x]12.7 Frontend tests for admin buddy-assignment-list (table rendering, override dialog)
  - [x]12.8 All tests co-located with source files (`.spec.ts` backend, `.test.tsx` frontend)
  - [x]12.9 Maintain baseline: 242+ API tests, 169+ web tests passing — do not break existing tests

## Dev Notes

### Architecture Patterns and Constraints

- **Extend existing admission module** — do NOT create a separate module. Add buddy methods to `AdmissionService` and endpoints to `AdmissionController` following Story 3-2/3-3 pattern
- **Event-driven buddy assignment** — listen for `admission.application.approved` event to trigger auto-assignment. Event emitter is already configured in `app.module.ts` via `EventEmitterModule.forRoot()`
- **Buddy selection algorithm priority**: (1) Same domain + buddyOptIn=true + isActive=true, (2) Any domain + buddyOptIn=true + isActive=true, (3) No buddy available → graceful degradation
- **First task recommendation** reuses existing micro-task infrastructure — `findFirst({ where: { domain, isActive: true } })` pattern from Story 3-3
- **30-day buddy expiry** — stored as `expiresAt` field, not enforced by cron/scheduler (simple date comparison on read). Expired assignments shown as "completed" not "expired"
- **Notification stub** — no notification module exists yet. Record notification intent in audit log. Real notifications come in Epic 5 (Story 5-5)
- **Task claiming stub** — "Claim this task" button should be visible but disabled with tooltip "Coming soon — task claiming will be available in a future update". Epic 5 will implement real task management

### Key File Locations

| Purpose                | Path                                                        |
| ---------------------- | ----------------------------------------------------------- |
| Prisma schema          | `apps/api/prisma/schema.prisma`                             |
| Admission service      | `apps/api/src/modules/admission/admission.service.ts`       |
| Admission controller   | `apps/api/src/modules/admission/admission.controller.ts`    |
| Admission module       | `apps/api/src/modules/admission/admission.module.ts`        |
| CASL ability factory   | `apps/api/src/modules/auth/casl/ability.factory.ts`         |
| Shared schemas         | `packages/shared/src/schemas/admission.schema.ts`           |
| Shared types           | `packages/shared/src/types/admission.types.ts`              |
| Error codes            | `packages/shared/src/constants/error-codes.ts`              |
| Shared exports         | `packages/shared/src/index.ts`                              |
| Dashboard page         | `apps/web/app/(dashboard)/dashboard/page.tsx`               |
| Profile page           | `apps/web/app/(dashboard)/profile/page.tsx`                 |
| API client             | `apps/web/lib/api-client.ts`                                |
| API response helper    | `apps/api/src/common/types/api-response.type.ts`            |
| DomainException        | `apps/api/src/common/exceptions/domain.exception.ts`        |
| JWT guard              | `apps/api/src/common/guards/jwt-auth.guard.ts`              |
| Ability guard          | `apps/api/src/common/guards/ability.guard.ts`               |
| CheckAbility decorator | `apps/api/src/common/decorators/check-ability.decorator.ts` |
| CurrentUser decorator  | `apps/api/src/common/decorators/current-user.decorator.ts`  |
| Action enum            | `apps/api/src/modules/auth/casl/action.enum.ts`             |
| DomainBadge component  | `apps/web/components/features/admission/` (reuse existing)  |
| Toast provider         | `apps/web/components/ui/toast.tsx`                          |
| Rich text renderer     | `apps/web/lib/rich-text.ts`                                 |
| Seed script            | `apps/api/prisma/seed.ts`                                   |

### Existing Patterns to Follow

- **API response envelope**: Always use `createSuccessResponse()` — `{ data, meta: { timestamp, correlationId, pagination? } }`
- **Error handling**: Use `DomainException` subclasses with error codes from `error-codes.ts`
- **Guards**: `@UseGuards(JwtAuthGuard, AbilityGuard)` + `@CheckAbility({ action, subject })`
- **Audit logging**: Every mutating operation creates `AuditLog` entry with: actorId, action (dot.case), entityType, entityId, correlationId, details (JSON)
- **Event naming**: `admission.buddy.assigned` (dot.case: `{domain}.{entity}.{action}`)
- **Prisma transactions**: All mutating operations within `prisma.$transaction()`
- **DTO pattern**: Create DTOs in `apps/api/src/modules/admission/dto/` using class-validator decorators wrapping Zod schemas
- **Frontend hooks**: TanStack Query in `apps/web/hooks/` with `useQuery`/`useMutation`
- **Component location**: Feature components in `apps/web/components/features/onboarding/` (new) and `apps/web/components/features/admission/admin/` (existing pattern)
- **Test co-location**: `.spec.ts` next to source (backend), `.test.tsx` next to source (frontend)
- **Loading states**: Skeleton screens matching layout — NEVER spinners
- **Confirmation dialogs**: Radix AlertDialog, calm tone, 16px radius, centered modal
- **Tables**: Warm borders, 48px rows, no zebra striping, domain badges with accent colors

### UX Requirements (Critical)

- **Human-First Assignment Pattern**: Buddy card shows photo, name, bio, domain — feels like meeting a person, not a system notification
- **No confetti, no celebration animations** — warm but substantive onboarding
- **No wizard-style guided tours** — step indicator style, not patronizing
- **No countdown timers or urgency signals** — calm, patient confidence
- **First task feels like an invitation** — "Here's something meaningful you can start with" not "Complete this task"
- **Empty states dignified** — "We're finding the right person to welcome you" not "Error: no buddy found"
- **Skeleton loaders** for all loading states
- **Mobile**: Simplified cards only for buddy info, full admin management requires desktop
- **Color palette**: Warm paper-like tones (`#FAFAF7` base, `#C4956A` accent), domain accent colors (teal/amber/rose/violet)
- **Typography**: Serif for content/narrative, sans-serif for interface/data

### Anti-Patterns (DO NOT)

- DO NOT create a separate NestJS module — extend `admission.module.ts`
- DO NOT use spinners — use skeleton loaders
- DO NOT show raw error messages — graceful degradation with warm messaging
- DO NOT create `__tests__/` directories — co-locate all tests
- DO NOT throw raw `HttpException` — use `DomainException` subclasses
- DO NOT log PII at info level — use contributor IDs only
- DO NOT use badge counts for notifications — warm dot indicator
- DO NOT use zebra striping in admin tables
- DO NOT use floating labels in forms — labels above fields
- DO NOT hardcode buddy selection — make it configurable via domain matching logic
- DO NOT block onboarding if no buddy available — graceful degradation
- DO NOT create a scheduler/cron for buddy expiry — simple date comparison on read

### Project Structure Notes

- Alignment with unified project structure: all backend in `apps/api/src/modules/admission/`, frontend onboarding in `apps/web/components/features/onboarding/`, admin in `apps/web/components/features/admission/admin/`
- New frontend route: `apps/web/app/(admin)/buddy-assignments/page.tsx`
- No new NestJS modules — admission module only
- Shared package updates in `packages/shared/src/`

### Previous Story Intelligence (Story 3-3)

- Story 3-3 established admin CRUD patterns for micro-tasks within the admission module
- Prisma migration pattern: create migration file in `apps/api/prisma/migrations/`
- Seed script uses `findFirst` + conditional `create` pattern (not upsert)
- Frontend admin pages: slide-in panels (640px max-width) for detail/edit, data tables for list
- React Hook Form + Zod for all forms
- Toast notifications: auto-dismiss 4s, factual messaging ("Buddy assigned")
- Domain filter: Radix Select component
- Pre-existing TypeScript errors in: `ability.factory.spec.ts`, `contributor.service.spec.ts`, `prisma.service.spec.ts`, `review-list.tsx`, `governance.test.tsx` — none introduced by story, do not fix

### Git Intelligence (Recent Commits)

- `723db64` feat: implement admin micro-task configuration (Story 3-3) — most recent, establishes admin CRUD patterns
- `ec3b87a` feat: implement application review and admission queue (Story 3-2) — approval flow with ignitionStartedAt
- `68edd65` feat: implement contributor application with domain micro-task (Story 3-1) — application submission flow
- Convention: single feat commit per story, descriptive message

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3, Story 3.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Database Schema, API Patterns, Module Structure]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#72-Hour Ignition, Buddy Assignment, Human-First Assignment Pattern]
- [Source: _bmad-output/planning-artifacts/prd.md#FR8-FR14 Admission & Onboarding]
- [Source: _bmad-output/implementation-artifacts/3-3-admin-micro-task-configuration.md#Dev Notes, File List]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Pre-existing DB drift in `application_reviews` table (submitted_at nullable/required mismatch) — bypassed with manual migration creation
- Prisma 7 driver adapter pattern requires `prisma.config.ts` for migrations, not `url` in schema

### Completion Notes List

- Implemented BuddyAssignment model with 30-day expiry, buddy selection algorithm (domain-first with fallback), and admin override
- First task recommendation reuses existing MicroTask infrastructure — returns stub with `claimable: false` for Epic 5
- Auto-assign buddy on application approval via `@OnEvent('admission.application.approved')` with graceful degradation
- BuddyOptInController added as separate controller on `/contributors` path to keep buddy opt-in at the contributor profile level
- All buddy endpoints follow existing patterns: `createSuccessResponse()`, `JwtAuthGuard`, `AbilityGuard`, `@CheckAbility`, audit logging, Prisma transactions
- Frontend: Human-First Assignment Pattern for buddy card (photo, name, bio, domain badge), warm empty states, skeleton loaders
- "Claim this task" button disabled with tooltip — stub for Epic 5 task claiming
- 289 API tests passing (47 new), 206 web tests passing (37 new)

### Change Log

- 2026-03-05: Story 3-4 implementation complete — buddy assignment, first-task recommendation, admin management, contributor opt-in
- 2026-03-05: Code review fixes applied — skill-level task matching, onboarding scope gating, opt-in authorization guard, claim-link stub, active-assignment uniqueness index

### Senior Developer Review (AI)

- Reviewer: Fabrice
- Date: 2026-03-05
- Outcome: Approved after fixes

Findings addressed:

- HIGH: First-task recommendation now matches domain + inferred skill level from contributor skill areas (`apps/api/src/modules/admission/admission.service.ts`)
- HIGH: Onboarding welcome now only renders when an active buddy assignment exists (`apps/web/components/features/onboarding/onboarding-welcome.tsx`)
- HIGH: Buddy opt-in endpoint now enforces ability guard and check-ability policy (`apps/api/src/modules/admission/admission.controller.ts`)
- MEDIUM: "Claim this task" stub now points toward Epic 5 task claiming route while remaining disabled behavior (`apps/web/components/features/onboarding/first-task-card.tsx`)
- MEDIUM: Added DB-level partial unique index to enforce one active buddy assignment per contributor (`apps/api/prisma/migrations/20260305100000_add_buddy_assignment/migration.sql`)
- LOW: Removed profile type cast hack by adding typed `buddyOptIn` field in profile hook (`apps/web/hooks/use-profile.ts`)

### File List

| File                                                                           | Action                                                                      |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `apps/api/prisma/schema.prisma`                                                | UPDATE — Added BuddyAssignment model, buddyOptIn field, relations           |
| `apps/api/prisma/migrations/20260305100000_add_buddy_assignment/migration.sql` | NEW — Migration SQL                                                         |
| `apps/api/prisma/seed.ts`                                                      | UPDATE — Added buddy opt-in contributors and sample assignment              |
| `packages/shared/src/schemas/admission.schema.ts`                              | UPDATE — Added buddy Zod schemas                                            |
| `packages/shared/src/types/admission.types.ts`                                 | UPDATE — Added BuddyAssignment, BuddyProfile, FirstTaskRecommendation types |
| `packages/shared/src/constants/error-codes.ts`                                 | UPDATE — Added buddy error codes                                            |
| `packages/shared/src/index.ts`                                                 | UPDATE — Exported new buddy schemas/types                                   |
| `apps/api/src/modules/auth/casl/subjects.ts`                                   | UPDATE — Added BuddyAssignment subject                                      |
| `apps/api/src/modules/auth/casl/ability.factory.ts`                            | UPDATE — Added CONTRIBUTOR BuddyAssignment permissions                      |
| `apps/api/src/modules/admission/admission.service.ts`                          | UPDATE — Added buddy assignment, first-task, opt-in, event listener methods |
| `apps/api/src/modules/admission/admission.controller.ts`                       | UPDATE — Added buddy endpoints + BuddyOptInController                       |
| `apps/api/src/modules/admission/admission.module.ts`                           | UPDATE — Registered BuddyOptInController                                    |
| `apps/api/src/modules/admission/dto/assign-buddy.dto.ts`                       | NEW                                                                         |
| `apps/api/src/modules/admission/dto/override-buddy.dto.ts`                     | NEW                                                                         |
| `apps/api/src/modules/admission/dto/buddy-opt-in.dto.ts`                       | NEW                                                                         |
| `apps/api/src/modules/admission/dto/list-buddy-assignments-query.dto.ts`       | NEW                                                                         |
| `apps/api/src/modules/admission/admission.service.spec.ts`                     | UPDATE — Added 22 buddy tests                                               |
| `apps/api/src/modules/admission/admission.controller.spec.ts`                  | UPDATE — Added 8 buddy controller tests                                     |
| `apps/web/hooks/use-buddy-assignment.ts`                                       | NEW — useBuddyAssignment, useFirstTaskRecommendation hooks                  |
| `apps/web/hooks/use-buddy-admin.ts`                                            | NEW — Admin buddy hooks                                                     |
| `apps/web/components/features/onboarding/buddy-welcome-card.tsx`               | NEW — Buddy profile card                                                    |
| `apps/web/components/features/onboarding/buddy-welcome-card.test.tsx`          | NEW — 5 tests                                                               |
| `apps/web/components/features/onboarding/first-task-card.tsx`                  | NEW — First task recommendation card                                        |
| `apps/web/components/features/onboarding/first-task-card.test.tsx`             | NEW — 4 tests                                                               |
| `apps/web/components/features/onboarding/onboarding-welcome.tsx`               | NEW — Welcome container                                                     |
| `apps/web/components/features/onboarding/buddy-opt-in-toggle.tsx`              | NEW — Opt-in toggle with confirmation                                       |
| `apps/web/hooks/use-profile.ts`                                                | UPDATE — Added typed buddyOptIn field used by profile toggle                |
| `apps/web/components/features/admission/admin/buddy-assignment-list.tsx`       | NEW — Admin table                                                           |
| `apps/web/components/features/admission/admin/buddy-assignment-list.test.tsx`  | NEW — 4 tests                                                               |
| `apps/web/components/features/admission/admin/buddy-override-dialog.tsx`       | NEW — Override dialog                                                       |
| `apps/web/app/(admin)/buddy-assignments/page.tsx`                              | NEW — Admin page                                                            |
| `apps/web/app/(admin)/buddy-assignments/loading.tsx`                           | NEW — Loading skeleton                                                      |
| `apps/web/app/(dashboard)/dashboard/page.tsx`                                  | UPDATE — Added OnboardingWelcome section                                    |
| `apps/web/app/(dashboard)/dashboard/page.test.tsx`                             | UPDATE — Added buddy mock                                                   |
| `apps/web/app/(dashboard)/dashboard/profile/page.tsx`                          | UPDATE — Added BuddyOptInToggle                                             |
