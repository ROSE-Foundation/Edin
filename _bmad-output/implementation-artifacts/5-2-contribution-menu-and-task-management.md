# Story 5.2: Contribution Menu & Task Management

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a contributor,
I want to browse a curated contribution menu and claim tasks,
So that I can find meaningful work matched to my skills and contribute to the ecosystem.

## Acceptance Criteria

1. **Given** I am an authenticated contributor **When** I navigate to `/dashboard/tasks` **Then** I see the contribution menu showing available tasks with: title, domain tag (with accent color), difficulty level (beginner, intermediate, advanced), estimated effort, and status (available, claimed, in progress, completed, evaluated) **And** only tasks with status AVAILABLE are claimable **And** the list supports filtering by domain, difficulty, and status **And** filtering returns results within <1s (NFR-P7) **And** the list uses cursor-based pagination

2. **Given** I find a task I want to work on **When** I click "Claim" **Then** the task status updates to CLAIMED with my contributor ID via `PATCH /api/v1/tasks/:id/claim` **And** the task is no longer available for other contributors to claim **And** the task appears in my "My Tasks" view with status CLAIMED **And** the action uses an optimistic update via TanStack Query

3. **Given** I have claimed a task **When** I begin working on it **Then** I can update the status to IN_PROGRESS via the dashboard **And** when my contribution is ingested from GitHub and linked to this task, the status can transition to COMPLETED

4. **Given** I am an admin or Working Group Lead **When** I navigate to `/admin/tasks` (admin) or the WG management view **Then** I can create new tasks with fields: title, description (rich text), domain, difficulty, estimated effort, and initial status (AVAILABLE) **And** I can edit existing tasks' details **And** I can retire tasks by setting status to RETIRED (they disappear from the menu but remain in the database)

5. **Given** the task status transitions **When** a status change occurs **Then** the system enforces valid transitions: AVAILABLE → CLAIMED → IN_PROGRESS → COMPLETED → EVALUATED **And** invalid transitions return 422 with error code `INVALID_TASK_TRANSITION` **And** each transition emits a domain event via EventEmitter2

## Tasks / Subtasks

- [x] Task 1: Database schema & migration (AC: #1, #4, #5)
  - [x]1.1 Add `TaskStatus` enum to Prisma schema: AVAILABLE, CLAIMED, IN_PROGRESS, COMPLETED, EVALUATED, RETIRED
  - [x]1.2 Add `TaskDifficulty` enum to Prisma schema: BEGINNER, INTERMEDIATE, ADVANCED
  - [x]1.3 Add `Task` model to Prisma schema in `core` schema: id (UUID), title (String), description (String), domain (ContributorDomain), difficulty (TaskDifficulty), estimatedEffort (String), status (TaskStatus, default AVAILABLE), claimedById (UUID nullable FK → Contributor), claimedAt (DateTime nullable), completedAt (DateTime nullable), createdById (UUID FK → Contributor), createdAt, updatedAt
  - [x]1.4 Add relations to Contributor model: `claimedTasks Task[]` (relation "TaskClaimer"), `createdTasks Task[]` (relation "TaskCreator")
  - [x]1.5 Add indexes: `idx_tasks_domain_status` (domain + status composite), `idx_tasks_claimed_by_id`, `idx_tasks_status`, `idx_tasks_created_by_id`
  - [x]1.6 Generate and run Prisma migration
  - [x]1.7 Run `prisma generate` explicitly (Prisma 7 no longer auto-generates after migrate)

- [x] Task 2: Shared package schemas & types (AC: #1, #2, #3, #4, #5)
  - [x]2.1 Create `packages/shared/src/schemas/task.schema.ts` with Zod schemas:
    - `taskSchema` — full task response shape
    - `createTaskSchema` — admin/WG lead task creation (title, description, domain, difficulty, estimatedEffort)
    - `updateTaskSchema` — partial update for task fields
    - `claimTaskSchema` — empty body (contributor ID from JWT)
    - `updateTaskStatusSchema` — status transition validation
    - `listTasksQuerySchema` — cursor, limit (default 20, max 100), domain filter, difficulty filter, status filter
  - [x]2.2 Create `packages/shared/src/types/task.types.ts` with TypeScript types: `TaskDto`, `CreateTaskDto`, `UpdateTaskDto`, `TaskListResponse`, `TaskDetailResponse`, and domain event interfaces (`TaskClaimedEvent`, `TaskStatusChangedEvent`, `TaskCreatedEvent`, `TaskRetiredEvent`)
  - [x]2.3 Add error codes to `packages/shared/src/constants/error-codes.ts`: `TASK_NOT_FOUND`, `TASK_ALREADY_CLAIMED`, `INVALID_TASK_TRANSITION`, `TASK_NOT_CLAIMABLE`, `TASK_NOT_OWNED`, `TASK_CREATION_FORBIDDEN`
  - [x]2.4 Export all new schemas/types from `packages/shared/src/index.ts`

- [x] Task 3: Backend task module (AC: #1, #2, #3, #4, #5)
  - [x]3.1 Create `apps/api/src/modules/task/task.module.ts` — imports PrismaModule, CaslModule; exports TaskService
  - [x]3.2 Create `task.service.ts` with methods:
    - `findAll(filters, pagination)` — list tasks with domain/difficulty/status filters, cursor-based pagination, exclude RETIRED from default listing
    - `findById(id)` — single task detail
    - `findMyTasks(contributorId, pagination)` — tasks claimed by the current contributor
    - `create(dto, creatorId, correlationId)` — create new task (admin/WG lead only)
    - `update(id, dto, correlationId)` — update task details (admin/WG lead only)
    - `claimTask(taskId, contributorId, correlationId)` — atomically claim an AVAILABLE task using `prisma.$transaction()`; return 409 if already claimed, 422 if not AVAILABLE
    - `updateStatus(taskId, newStatus, contributorId, correlationId)` — validate state transition, update status; return 422 for invalid transition
    - `retireTask(id, correlationId)` — set status to RETIRED (admin/WG lead only)
  - [x]3.3 Create `task.controller.ts` with endpoints:
    - `GET /api/v1/tasks` — List tasks with filters and cursor-based pagination (authenticated contributor+)
    - `GET /api/v1/tasks/me` — List "My Tasks" (authenticated contributor)
    - `GET /api/v1/tasks/:id` — Task detail (authenticated contributor+)
    - `POST /api/v1/tasks` — Create task (admin/WG lead only)
    - `PATCH /api/v1/tasks/:id` — Update task details (admin/WG lead only)
    - `PATCH /api/v1/tasks/:id/claim` — Claim task (authenticated contributor)
    - `PATCH /api/v1/tasks/:id/status` — Update task status (task owner or admin)
    - `PATCH /api/v1/tasks/:id/retire` — Retire task (admin/WG lead only)
  - [x]3.4 Apply CASL guards: listing/detail require `CONTRIBUTOR` role or above; create/edit/retire require `WORKING_GROUP_LEAD` or `ADMIN`; claim requires `CONTRIBUTOR`; status update requires ownership check or `ADMIN`
  - [x]3.5 Emit domain events: `task.created`, `task.claimed`, `task.status-changed`, `task.retired` via EventEmitter2 with standard `DomainEvent<T>` payload shape
  - [x]3.6 Use `prisma.$transaction()` for claim operation to atomically verify AVAILABLE status and set CLAIMED with contributor ID
  - [x]3.7 Wrap all responses in standard API envelope (`{ data, meta: { timestamp, correlationId, pagination } }`)
  - [x]3.8 Create DTOs in `dto/` subdirectory: `create-task.dto.ts`, `update-task.dto.ts`, `list-tasks-query.dto.ts`
  - [x]3.9 Implement state transition validation — define valid transitions map: `{ AVAILABLE: [CLAIMED], CLAIMED: [IN_PROGRESS, AVAILABLE], IN_PROGRESS: [COMPLETED], COMPLETED: [EVALUATED], EVALUATED: [] }` — RETIRED is a separate admin action, not part of the normal flow
  - [x]3.10 Register `TaskModule` in `app.module.ts`

- [x] Task 4: CASL ability updates (AC: #2, #4)
  - [x]4.1 Add Task subject to CASL ability factory with permissions:
    - `CONTRIBUTOR`: can Read Task, can Update Task (where claimedById === user.id — ownership check for status changes)
    - `WORKING_GROUP_LEAD`: can Create Task, can Update Task, can Delete Task (retire)
    - `ADMIN`: can Manage Task (full CRUD)
  - [x]4.2 Add claim-specific ability: Contributors can "claim" (mapped to Update action with condition `{ status: 'AVAILABLE' }`)

- [x] Task 5: Backend unit & integration tests (AC: #1, #2, #3, #4, #5)
  - [x]5.1 Create `task.service.spec.ts` co-located — test all service methods:
    - `findAll` with filters and pagination
    - `findById` for existing and non-existing tasks
    - `findMyTasks` for current contributor
    - `create` task with valid/invalid data
    - `claimTask` — success, already claimed (409), not AVAILABLE (422)
    - `updateStatus` — valid transitions, invalid transitions (422)
    - `retireTask` — success, not found (404)
  - [x]5.2 Create `task.controller.spec.ts` co-located — test:
    - Endpoint routing and HTTP methods
    - RBAC enforcement (401 unauthenticated, 403 unauthorized roles)
    - Response envelope format with pagination meta
    - Validation error responses (400)
    - Business rule violations (422)
  - [x]5.3 Test domain event emission on claim, status change, create, retire
  - [x]5.4 Test state transition validation exhaustively (all valid + invalid combinations)
  - [x]5.5 Test cursor-based pagination (first page, next page, empty results)

- [x] Task 6: Frontend contribution menu page (AC: #1)
  - [x]6.1 Create `apps/web/app/(dashboard)/dashboard/tasks/page.tsx` with `'use client'` directive
  - [x]6.2 Display task list with: title, domain tag (colored badge using DOMAIN_DETAILS accent colors), difficulty level badge, estimated effort, status indicator
  - [x]6.3 Implement filter bar: domain dropdown (Technology, Finance, Impact, Governance, All), difficulty dropdown (Beginner, Intermediate, Advanced, All), status dropdown (Available, Claimed, In Progress, Completed, All)
  - [x]6.4 Implement cursor-based infinite scroll pagination using TanStack Query `useInfiniteQuery`
  - [x]6.5 "Claim" button on AVAILABLE tasks — disabled for other statuses; show "Claimed" / "In Progress" / "Completed" state text for non-claimable tasks
  - [x]6.6 Use skeleton loaders for initial loading state (NOT spinners) — mirror task card layout
  - [x]6.7 Empty state: "Available tasks will appear here as they are created by Working Group Leads" — centered, muted, dignified (never cheerful)

- [x] Task 7: Frontend "My Tasks" view (AC: #2, #3)
  - [x]7.1 Create `apps/web/app/(dashboard)/dashboard/tasks/me/page.tsx` with `'use client'` directive
  - [x]7.2 Display tasks claimed by the current contributor with status indicator and action buttons
  - [x]7.3 "Start Working" button on CLAIMED tasks → transitions to IN_PROGRESS
  - [x]7.4 Status progression visual: CLAIMED → IN_PROGRESS → COMPLETED → EVALUATED (use warm-toned descriptive text, never percentage progress bars)
  - [x]7.5 Use skeleton loaders for loading state

- [x] Task 8: Frontend admin task management (AC: #4)
  - [x]8.1 Create `apps/web/app/(admin)/admin/tasks/page.tsx` with `'use client'` directive — list all tasks (including RETIRED) for admin management
  - [x]8.2 Create task creation form: title, description (rich text area), domain select, difficulty select, estimated effort input — single column layout, generous spacing
  - [x]8.3 Edit task inline or via modal — same fields as creation
  - [x]8.4 "Retire" action button with confirmation — calm secondary styling
  - [x]8.5 Use TanStack Query mutations with optimistic updates for create/edit/retire

- [x] Task 9: Frontend hooks (AC: #1, #2, #3, #4)
  - [x]9.1 Create `apps/web/hooks/use-tasks.ts` with:
    - `useTasks(filters)` — `useInfiniteQuery` with cursor-based pagination, query key `['tasks', filters]`
    - `useMyTasks()` — `useInfiniteQuery` for current contributor's tasks, query key `['tasks', 'me']`
    - `useTask(id)` — `useQuery` for single task detail, query key `['tasks', id]`
    - `useClaimTask()` — `useMutation` with optimistic update: immediately mark task as CLAIMED in cache, rollback on error, invalidate `['tasks']` on settle
    - `useUpdateTaskStatus()` — `useMutation` with optimistic update for status transitions
    - `useCreateTask()` — `useMutation` for admin task creation, invalidate `['tasks']` on settle
    - `useUpdateTask()` — `useMutation` for admin task edit
    - `useRetireTask()` — `useMutation` for admin retire action

- [x] Task 10: Frontend feature components (AC: #1, #2, #3, #4)
  - [x]10.1 Create `apps/web/components/features/task/task-card.tsx` — domain-colored badge, difficulty indicator, estimated effort, status, claim button
  - [x]10.2 Create `apps/web/components/features/task/task-list.tsx` — renders task cards with infinite scroll trigger
  - [x]10.3 Create `apps/web/components/features/task/task-filters.tsx` — domain/difficulty/status filter dropdowns using Radix Select
  - [x]10.4 Create `apps/web/components/features/task/task-status-badge.tsx` — warm-toned status indicator matching UX spec
  - [x]10.5 Create `apps/web/components/features/task/my-task-card.tsx` — task card variant for "My Tasks" with action buttons
  - [x]10.6 Create `apps/web/components/features/task/create-task-form.tsx` — admin task creation form (single column, labels above fields)

- [x] Task 11: Navigation & integration (AC: #1, #2, #4)
  - [x]11.1 Add "Tasks" / "Contribution Menu" link to dashboard sidebar navigation
  - [x]11.2 Add "My Tasks" sub-link in sidebar under Tasks section
  - [x]11.3 Add "Tasks" link to admin sidebar navigation
  - [x]11.4 Update working group detail page (`/dashboard/working-groups/[id]`) to replace the placeholder task list with real task data filtered by domain — use `useTasks({ domain: group.domain })` hook
  - [x]11.5 Ensure proper route protection: dashboard routes require `CONTRIBUTOR` role, admin routes require `ADMIN` or `WORKING_GROUP_LEAD` role

## Dev Notes

### Architecture Compliance

- **Schema:** `core` schema owns `tasks` table (alongside contributors, working_groups, contributions)
- **Module pattern:** One NestJS module `TaskModule` with service, controller, DTOs — follows same pattern as `WorkingGroupModule`
- **API versioning:** All endpoints under `/api/v1/tasks`
- **Response envelope:** Mandatory `{ data, meta: { timestamp, correlationId, pagination } }` on all responses
- **Error handling:** Use `DomainException` base class with UPPER_SNAKE_CASE error codes; never throw raw `HttpException`
- **Logging:** Use Pino via nestjs-pino with `correlationId` and `module: 'task'` in all log context; never log PII at info level
- **Events:** Emit `task.created`, `task.claimed`, `task.status-changed`, `task.retired` domain events via EventEmitter2 with standard `DomainEvent<T>` payload shape: `{ eventType, timestamp, correlationId, actorId, payload }`
- **State transitions:** Enforce valid status transitions server-side; return 422 with `INVALID_TASK_TRANSITION` for violations
- **Pagination:** Cursor-based (not offset) — `?cursor=<uuid>&limit=20`, default limit 20, max 100

### Technical Requirements

- **Task model is separate from MicroTask** — MicroTask (in `micro_tasks` table) is for admission micro-tasks (Story 3.x). The new `tasks` table is for the contribution menu system. Do NOT reuse or modify the MicroTask model.
- **Status machine:** AVAILABLE → CLAIMED → IN_PROGRESS → COMPLETED → EVALUATED. RETIRED is a separate admin-only side transition (not part of the normal flow). CLAIMED can revert to AVAILABLE (unclaim).
- **Atomic claiming:** Use `prisma.$transaction()` to verify task is AVAILABLE and set CLAIMED in one atomic operation. This prevents race conditions with concurrent claims.
- **Domain filtering:** Tasks are tagged with a `ContributorDomain` (Technology, Finance, Impact, Governance) — reuse the existing enum from Prisma schema.
- **Difficulty levels:** BEGINNER, INTERMEDIATE, ADVANCED — stored as enum in database.
- **RETIRED tasks:** Do NOT appear in the contributor-facing task list (`GET /api/v1/tasks`). They DO appear in the admin task management view. RETIRED is a soft-delete — tasks remain in the database for audit purposes.
- **Working group integration:** The working group detail page (Story 5.1) has a placeholder for "active tasks tagged for this domain" — replace this with actual task data filtered by domain using the new task API.
- **Rich text description:** Store as plain String for MVP. The description field supports markdown-formatted text. Admin creates tasks with a textarea input. Rendering can use markdown parsing on the frontend.

### Library & Framework Requirements

| Component     | Library               | Version         |
| ------------- | --------------------- | --------------- |
| Runtime       | Node.js               | 22+             |
| Backend       | NestJS                | ^11.1.16        |
| ORM           | Prisma                | ^7.4.2          |
| Database      | PostgreSQL            | 16+             |
| RBAC          | CASL (@casl/ability)  | ^6.8.0          |
| Frontend      | Next.js               | 16.1.6          |
| React         | React                 | 19.2.3          |
| Server state  | TanStack Query        | ^5.90.21        |
| Validation    | Zod                   | ^3.25.23        |
| Styling       | Tailwind CSS          | ^4              |
| UI primitives | Radix UI              | via packages/ui |
| Logging       | Pino (nestjs-pino)    | ^4.5.0          |
| Events        | @nestjs/event-emitter | ^3.0.1          |

**Critical version notes:**

- **Prisma 7:** `prisma generate` must be run explicitly after `prisma migrate dev` (no longer auto-generates). Seed scripts are NOT auto-run by `prisma migrate dev` either. If shadow database issues occur (as in Story 5-1), create manual migration SQL and use `prisma migrate deploy`.
- **TanStack Query 5:** `isPending` replaces `isLoading`; `useInfiniteQuery` requires explicit `initialPageParam`; `onError`/`onSuccess`/`onSettled` removed from `useQuery` (still available on `useMutation`).
- **NestJS 11:** Express v5 is default — wildcards must be named (`*splat`). Dynamic module opaque key generation changed. No impact on this story's patterns.

### File Structure Requirements

**Backend — create these files:**

```
apps/api/src/modules/task/
  task.module.ts
  task.controller.ts
  task.service.ts
  task.controller.spec.ts
  task.service.spec.ts
  dto/
    create-task.dto.ts
    update-task.dto.ts
    list-tasks-query.dto.ts
```

**Frontend — create these files:**

```
apps/web/
  app/(dashboard)/dashboard/tasks/
    page.tsx                          # Contribution menu
    me/page.tsx                       # My Tasks view
  app/(admin)/admin/tasks/
    page.tsx                          # Admin task management
  hooks/
    use-tasks.ts                      # All task-related TanStack Query hooks
  components/features/task/
    task-card.tsx                     # Task card for contribution menu
    task-list.tsx                     # Task list with infinite scroll
    task-filters.tsx                  # Domain/difficulty/status filter bar
    task-status-badge.tsx            # Status indicator component
    my-task-card.tsx                 # Task card for "My Tasks" with actions
    create-task-form.tsx             # Admin task creation form
```

**Shared — create/modify these files:**

```
packages/shared/src/
  schemas/task.schema.ts              (new)
  types/task.types.ts                 (new)
  constants/error-codes.ts            (add new error codes)
  index.ts                            (add task exports)
```

**Prisma schema — modify:**

```
apps/api/prisma/schema.prisma         (add Task model, TaskStatus + TaskDifficulty enums, Contributor relations)
```

**Modify existing files:**

```
apps/api/src/app.module.ts                              (register TaskModule)
apps/api/src/modules/auth/casl/ability.factory.ts       (add Task subject permissions)
apps/web/app/(dashboard)/dashboard/working-groups/[id]/page.tsx  (replace task placeholder with real data)
```

### Testing Requirements

- Co-locate all tests as `*.spec.ts` next to source files — NEVER create `__tests__/` directories
- **Service tests (task.service.spec.ts):**
  - All CRUD operations (findAll, findById, create, update, retire)
  - Claim task: success, already claimed (409), not AVAILABLE (422), task not found (404)
  - Status transitions: all valid transitions, all invalid transitions (422)
  - Cursor-based pagination: first page, subsequent pages, empty results, limit boundaries
  - Filter combinations: domain only, difficulty only, status only, combined filters
  - Domain event emission verification for every state-changing operation
- **Controller tests (task.controller.spec.ts):**
  - Endpoint routing and HTTP methods
  - RBAC enforcement: 401 for unauthenticated, 403 for unauthorized roles (contributor can't create, public can't list)
  - Response envelope format with pagination meta
  - Validation error responses (400) for invalid input
  - Business rule violation responses (422)
- Use `vi.fn()` for mocks, `mockResolvedValue()` / `mockRejectedValue()` for async
- Mock PrismaService with typed mock methods matching Prisma client API
- Mock EventEmitter2 to verify domain event emission
- Test data: create reusable mock factories for Task, Contributor

### Naming Conventions (STRICT)

| Type           | Convention                  | Example                                                  |
| -------------- | --------------------------- | -------------------------------------------------------- |
| DB table       | snake_case plural           | `tasks`                                                  |
| DB column      | snake_case                  | `estimated_effort`, `claimed_by_id`, `claimed_at`        |
| DB index       | idx*{table}*{columns}       | `idx_tasks_domain_status`, `idx_tasks_claimed_by_id`     |
| DB enum        | PascalCase                  | `TaskStatus`, `TaskDifficulty`                           |
| Prisma model   | PascalCase singular + @@map | `Task @@map("tasks")`                                    |
| API endpoint   | kebab-case plural           | `/api/v1/tasks`, `/api/v1/tasks/:id/claim`               |
| Route param    | camelCase                   | `:id` (simple case)                                      |
| Query param    | camelCase                   | `?domain=Technology&difficulty=BEGINNER&cursor=...`      |
| NestJS class   | PascalCase + suffix         | `TaskService`, `TaskController`, `TaskModule`            |
| File           | kebab-case + suffix         | `task.service.ts`, `create-task.dto.ts`                  |
| Zod schema     | camelCase + Schema          | `taskSchema`, `createTaskSchema`, `listTasksQuerySchema` |
| Error code     | UPPER_SNAKE_CASE            | `TASK_NOT_FOUND`, `INVALID_TASK_TRANSITION`              |
| Domain event   | dot.case                    | `task.claimed`, `task.status-changed`                    |
| React hook     | use + PascalCase            | `useTasks`, `useClaimTask`, `useMyTasks`                 |
| Component      | PascalCase                  | `TaskCard`, `TaskList`, `TaskFilters`                    |
| Component file | kebab-case                  | `task-card.tsx`, `task-list.tsx`                         |

### UX Design Requirements

- **Calm clarity aesthetic** — Beautiful, calming visuals; not metrics-dashboard nervousness
- **Task cards:** `surface.raised` background, `border-light`, 12px radius, `shadow-card`. Hover: subtle shadow lift + `translateY(-2px)`. Content with `space.lg` (24px) padding
- **Domain badges:** Pill-shaped with domain accent color background. Technology (#3A7D7E teal), Finance (#C49A3C amber), Impact (#B06B6B terra rose), Governance (#7B6B8A slate violet). Color NEVER sole indicator — always paired with domain text
- **Difficulty badges:** Subtle outline style. Beginner (green-tinted), Intermediate (amber-tinted), Advanced (red-tinted) — subtle, not aggressive
- **Status indicators:** Warm-toned descriptive text — "Available", "Claimed", "In Progress", "Completed", "Evaluated". Never use percentage progress bars or countdown timers
- **Claim button:** Primary action (`btn-primary`) — solid `brand.accent` (#C4956A) background, white text, 8px radius. Only one primary button per card. Disabled state for non-claimable tasks
- **Retire button:** Calm secondary styling — not destructive red
- **Skeleton loaders** for loading states — match task card layout shape. Gentle pulsing opacity (0.4 → 0.7 → 0.4, 2s cycle). NEVER use spinning loaders or "Loading..." text
- **Optimistic updates** for claim action — immediately update UI, rollback on error
- **Empty state:** Centered, muted text. "Available tasks will appear here as they are created by Working Group Leads" — dignified, never cheerful
- **Filters:** Radix Select dropdowns. Warm card style, 12px radius. Include "All" default option
- **Infinite scroll:** Content loads on scroll — no loading spinners for pagination
- **Touch targets:** Minimum 44x44px, contrast ratio 4.5:1 (WCAG 2.1 AA)
- **Semantic HTML:** Proper `aria-labels`, `role="list"` / `role="listitem"` for task lists
- **Single column layout** for admin task creation form — labels above fields, 24px between field groups
- **Toast feedback:** Bottom-right, auto-dismiss 4s. "Task claimed." / "Task created." / "Task retired." — factual and brief
- **Typography:** Interface sans (Inter) for all UI elements. No serif in task management views
- **Spacing:** 24px minimum between content blocks. 8px base unit spacing scale
- **Animations:** 200ms ease-out for state changes. No spring, bounce, or overshoot animations
- **Reduced motion:** Respect `prefers-reduced-motion` — disable all transitions

### Previous Story Intelligence

**From Story 5-1 (Working Groups & Domain Membership):**

- **Module pattern established:** `WorkingGroupModule` with service (6 methods), controller (4 endpoints), DTOs, specs — follow exactly the same structure for `TaskModule`
- **Controller pattern:** `@UseGuards(JwtAuthGuard, AbilityGuard)` + `@CheckAbility()` for RBAC. Use `@CurrentUser()` decorator to extract JWT payload
- **Success response:** Use `createSuccessResponse(data, correlationId, pagination?)` helper
- **Error handling:** Throw `DomainException(ERROR_CODES.X, message, HttpStatus.X)` — never raw `HttpException`
- **Transaction pattern:** `prisma.$transaction()` for multi-step operations (used for join/leave with atomic member count update — same pattern for atomic task claiming)
- **Event emission:** `this.eventEmitter.emit('domain.entity.action', payload)` after successful operations — e.g., `this.eventEmitter.emit('task.claimed', { eventType: 'task.claimed', ... })`
- **Frontend hooks:** TanStack Query `useMutation` with `queryClient.invalidateQueries()` on success. Optimistic updates with `onMutate` / `onError` / `onSettled`
- **Component pattern:** `'use client'` directive, import types with `type` keyword from `@edin/shared`, Tailwind utilities, skeleton loaders for loading state
- **Migration workaround:** If `prisma migrate dev` fails with shadow database issue, create manual migration SQL file and use `prisma migrate deploy`
- **Pre-existing issues:** TypeScript errors in `review-feedback-list.tsx`, `review-list.tsx`, `governance.test.tsx` are unrelated — do not attempt to fix them
- **Working group detail page** at `/dashboard/working-groups/[id]/page.tsx` has a placeholder for "active tasks tagged for this domain" — replace with actual `useTasks({ domain: group.domain })` data
- **CASL factory:** `Action.Delete` was added for WorkingGroup — follow same pattern for Task subject. Ability factory location: `apps/api/src/modules/auth/casl/ability.factory.ts`

### Git Intelligence

**Recent commit pattern:** `feat: implement <description> (Story X-Y)`

**Most recent commit (Story 5-1):** `87d4ffd feat: implement working groups and domain membership (Story 5-1)` — established all patterns for the current epic. Files created/modified in Story 5-1 provide direct templates for Task module implementation.

**Established codebase patterns:**

- Service + controller + spec co-location in module directory
- Shared schema + types + error codes in `packages/shared`
- Frontend hooks in `apps/web/hooks/`
- Feature components in `apps/web/components/features/`
- Prisma migration for new models
- Registration in `app.module.ts`

**Existing code to reuse (do NOT recreate):**

- `createSuccessResponse()` utility in `apps/api/src/common/types/api-response.type.ts`
- `DomainException` class in `apps/api/src/common/exceptions/domain.exception.ts`
- `@CurrentUser()` decorator in `apps/api/src/common/decorators/current-user.decorator.ts`
- `@CheckAbility()` decorator in `apps/api/src/common/decorators/check-ability.decorator.ts`
- `JwtAuthGuard` and `AbilityGuard` for endpoint protection
- `ContributorDomain` enum already in Prisma schema — reuse for Task.domain
- `apiClient<T>()` frontend utility in `apps/web/lib/api-client.ts`
- `DOMAIN_DETAILS` constant in `packages/shared/src/constants/domains.ts` — accent colors for badges
- `ERROR_CODES` constant pattern in `packages/shared/src/constants/error-codes.ts`

### Project Structure Notes

- Monorepo: Turborepo + pnpm workspaces
- Apps: `apps/api` (NestJS 11), `apps/web` (Next.js 16)
- Packages: `packages/shared` (types/schemas/constants), `packages/ui` (Radix primitives)
- Database: PostgreSQL 16 with domain-separated schemas (core, evaluation, publication, audit)
- The `core` schema currently contains: contributors, applications, application_reviews, buddy_assignments, onboarding_milestones, monitored_repositories, contributions, contribution_collaborations, working_groups, working_group_members, micro_tasks, audit_logs
- The new `tasks` table will be added to the `core` schema

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 5, Story 5.2 (lines 1039-1077)]
- [Source: _bmad-output/planning-artifacts/architecture.md - Sections: Tech Stack, NestJS Module Architecture, Database Schema, RBAC, API Patterns, Testing Standards, Naming Conventions, Pagination, Error Handling, Domain Events]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Calm clarity aesthetic, domain color system, card patterns, loading states, empty states, accessibility, filters, admin tables]
- [Source: _bmad-output/implementation-artifacts/5-1-working-groups-and-domain-membership.md - Previous story patterns, working group module, CASL updates, frontend hooks]
- [Source: apps/api/prisma/schema.prisma - Existing ContributorDomain enum, Contributor model, MicroTask model (separate)]
- [Source: apps/api/src/modules/working-group/ - Module, service, controller, DTO patterns]
- [Source: apps/api/src/modules/auth/casl/ability.factory.ts - RBAC permission setup]
- [Source: packages/shared/src/ - Zod schemas, types, error codes, domain constants]
- [Source: apps/web/hooks/use-working-groups.ts - TanStack Query hook patterns with optimistic updates]
- [Source: apps/web/hooks/use-contributions.ts - Cursor-based pagination with useInfiniteQuery]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Prisma shadow database issue encountered (as in Story 5-1) — resolved by creating manual migration SQL and using `prisma migrate deploy`
- Pre-existing TypeScript errors in unrelated files were not addressed as part of Story 5-2; the web production build is still blocked by `apps/web/components/features/admission/admin/review-feedback-list.tsx`

### Completion Notes List

- **Task 1:** Added `TaskStatus` and `TaskDifficulty` enums, `Task` model with all required fields/indexes/relations to Prisma schema. Manual migration applied successfully.
- **Task 2:** Created Zod schemas (`taskSchema`, `createTaskSchema`, `updateTaskSchema`, `claimTaskSchema`, `updateTaskStatusSchema`, `listTasksQuerySchema`) and TypeScript types (`TaskDto`, domain event interfaces). Added 6 task-related error codes.
- **Task 3:** Completed `TaskModule` with race-safe task claiming, ownership checks for status changes, task-to-contribution linkage, and automatic completion when linked GitHub contributions are ingested.
- **Task 4:** Aligned task authorization behavior with story requirements: contributors can claim tasks and update their own claimed tasks; Working Group Leads and Admins can manage task lifecycle.
- **Task 5:** Created comprehensive test suites — `task.service.spec.ts` (30 tests) covering all service methods, state transitions, error cases, pagination, filtering, and event emission. `task.controller.spec.ts` (21 tests) covering endpoint routing, response format, validation, error propagation, and RBAC.
- **Task 6:** Created contribution menu page at `/dashboard/tasks` with filter bar (domain/difficulty/status), task cards with claim button, skeleton loaders, and cursor-based infinite scroll.
- **Task 7:** Created "My Tasks" page at `/dashboard/tasks/me` with claimed task cards, status progression visual (Claimed → In Progress → Completed → Evaluated), "Start Working" button for CLAIMED tasks.
- **Task 8:** Completed admin task management at `/admin/tasks` with create, edit, and retire flows, plus WG management task controls inside the working group detail experience.
- **Task 9:** Fixed TanStack Query optimistic updates to work with infinite-query cache shapes and to reflect claimed tasks in both the contribution menu and My Tasks views.
- **Task 10:** Created 6 feature components: `TaskCard`, `TaskList` (with IntersectionObserver for infinite scroll), `TaskFilters`, `TaskStatusBadge`, `MyTaskCard`, `CreateTaskForm`.
- **Task 11:** Added "Tasks" nav item to dashboard sidebar. Updated working group detail page to use `useTasks({ domain })` hook with TaskCard components instead of MicroTask placeholder data. Updated working-group-detail test. Admin tasks page accessible at `/admin/tasks`. Note: No admin sidebar navigation exists in the current codebase (admin pages are standalone), so no sidebar link was added.

### Change Log

- 2026-03-08: Implemented Story 5-2 — Contribution Menu & Task Management. Full-stack implementation including database schema, API module, shared schemas/types, frontend pages (contribution menu, My Tasks, admin management), reusable components, TanStack Query hooks with optimistic updates, and navigation integration.
- 2026-03-08: Completed review fixes for Story 5-2: race-safe claiming, ownership enforcement, task-to-contribution linkage with ingestion-driven completion, admin edit flow, WG lead task management, and BMAD status sync.

### File List

**New files:**

- apps/api/prisma/migrations/20260308100000_add_tasks/migration.sql
- apps/api/prisma/migrations/20260308153000_link_contributions_to_tasks/migration.sql
- apps/api/src/modules/task/task.module.ts
- apps/api/src/modules/task/task.service.ts
- apps/api/src/modules/task/task.controller.ts
- apps/api/src/modules/task/task.service.spec.ts
- apps/api/src/modules/task/task.controller.spec.ts
- apps/api/src/modules/task/dto/create-task.dto.ts
- apps/api/src/modules/task/dto/update-task.dto.ts
- apps/api/src/modules/task/dto/list-tasks-query.dto.ts
- packages/shared/src/schemas/task.schema.ts
- packages/shared/src/types/task.types.ts
- apps/web/hooks/use-tasks.ts
- apps/web/components/features/task/task-card.tsx
- apps/web/components/features/task/task-list.tsx
- apps/web/components/features/task/task-filters.tsx
- apps/web/components/features/task/task-status-badge.tsx
- apps/web/components/features/task/my-task-card.tsx
- apps/web/components/features/task/create-task-form.tsx
- apps/web/app/(dashboard)/dashboard/tasks/page.tsx
- apps/web/app/(dashboard)/dashboard/tasks/me/page.tsx
- apps/web/app/(admin)/admin/tasks/page.tsx

**Modified files:**

- apps/api/prisma/schema.prisma (added TaskStatus, TaskDifficulty, Task model, Contributor relations, and Contribution.taskId linkage)
- apps/api/src/app.module.ts (registered TaskModule)
- packages/shared/src/constants/error-codes.ts (added task error codes)
- packages/shared/src/index.ts (added task schema/type exports)
- packages/shared/src/types/ingestion.types.ts (added optional taskId on contributions)
- apps/web/app/(dashboard)/layout.tsx (added Tasks nav item)
- apps/web/components/features/working-group/working-group-detail.tsx (replaced MicroTask placeholder with useTasks hook + TaskCard)
- apps/web/components/features/working-group/working-group-detail.test.tsx (updated test for new task integration)
- \_bmad-output/implementation-artifacts/sprint-status.yaml (status updates)
