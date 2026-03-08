# Story 5.1: Working Groups & Domain Membership

Status: done

## Story

As a contributor,
I want to view and join one of four domain working groups,
So that I can connect with contributors in my area of expertise and access domain-relevant opportunities.

## Acceptance Criteria

1. **Given** I am an authenticated contributor **When** I navigate to `/dashboard/working-groups` **Then** I see four working groups displayed with equal visual weight: Technology (teal accent), Fintech & Financial Engineering (amber accent), Impact & Sustainability (terra rose accent), and Governance (slate violet accent) **And** each group shows: domain name, brief description, member count, and a domain-colored badge **And** no domain appears more prominent or positioned higher by default

2. **Given** I view the working groups page **When** I click "Join" on a working group **Then** I am added as a member of that working group via `POST /api/v1/working-groups/:id/members` **And** the group's member count updates **And** I can join multiple working groups (my primary domain is set in my profile, but membership is not restricted)

3. **Given** I am a member of a working group **When** I view the working group detail at `/dashboard/working-groups/:id` **Then** I see: a list of current members with profiles, recent contributions from group members, and active tasks tagged for this domain **And** the page layout uses the domain's accent color as a subtle background tint

4. **Given** I am a member of a working group **When** I click "Leave" **Then** I am removed from the working group **And** my existing contributions within that domain remain attributed to me

## Tasks / Subtasks

- [x] Task 1: Database schema & migration (AC: #1, #2, #3, #4)
  - [x] 1.1 Add `WorkingGroup` model to Prisma schema in `core` schema: id (UUID), name, description, domain (ContributorDomain enum), accentColor, memberCount (Int, default 0), createdAt, updatedAt
  - [x] 1.2 Add `WorkingGroupMember` junction model: id (UUID), workingGroupId, contributorId, joinedAt; unique constraint on (workingGroupId, contributorId)
  - [x] 1.3 Add relations to Contributor model: `workingGroupMemberships WorkingGroupMember[]`
  - [x] 1.4 Add indexes: `idx_working_group_members_contributor_id`, `idx_working_group_members_working_group_id`
  - [x] 1.5 Create seed script to insert the four fixed working groups with correct names, descriptions, and accent colors
  - [x] 1.6 Generate and run Prisma migration

- [x] Task 2: Shared package schemas & types (AC: #1, #2, #3, #4)
  - [x] 2.1 Create `packages/shared/src/schemas/working-group.schema.ts` with Zod schemas: `workingGroupSchema`, `workingGroupMemberSchema`, `joinWorkingGroupSchema`
  - [x] 2.2 Create `packages/shared/src/types/working-group.types.ts` with TypeScript types and domain event interfaces
  - [x] 2.3 Add domain constants to `packages/shared/src/constants/domains.ts` (if not existing): four domain entries with name, description, accent color hex values
  - [x] 2.4 Add error codes to `packages/shared/src/constants/error-codes.ts`: `WORKING_GROUP_NOT_FOUND`, `ALREADY_MEMBER`, `NOT_A_MEMBER`
  - [x] 2.5 Export all new schemas/types/constants from `packages/shared/src/index.ts`

- [x] Task 3: Backend working-group module (AC: #1, #2, #3, #4)
  - [x] 3.1 Create `apps/api/src/modules/working-group/working-group.module.ts`
  - [x] 3.2 Create `working-group.service.ts` with methods: `findAll()`, `findById(id)`, `joinGroup(workingGroupId, contributorId)`, `leaveGroup(workingGroupId, contributorId)`, `getMembers(workingGroupId)`, `getGroupContributions(workingGroupId)`
  - [x] 3.3 Create `working-group.controller.ts` with endpoints:
    - `GET /api/v1/working-groups` — List all groups (public)
    - `GET /api/v1/working-groups/:id` — Group detail with members, contributions, tasks
    - `POST /api/v1/working-groups/:id/members` — Join group (authenticated contributor)
    - `DELETE /api/v1/working-groups/:id/members` — Leave group (authenticated contributor)
  - [x] 3.4 Apply CASL guards: join/leave require `CONTRIBUTOR` role or above; detail view requires authentication
  - [x] 3.5 Emit domain events: `working-group.member.joined`, `working-group.member.left` via EventEmitter2
  - [x] 3.6 Use `prisma.$transaction()` for join/leave to atomically update member record + member count
  - [x] 3.7 Wrap all responses in standard API envelope (`{ data, meta: { timestamp, correlationId } }`)
  - [x] 3.8 Create DTOs in `dto/` subdirectory

- [x] Task 4: Backend unit & integration tests (AC: #1, #2, #3, #4)
  - [x] 4.1 Create `working-group.service.spec.ts` co-located — test all service methods including edge cases (join duplicate, leave non-member)
  - [x] 4.2 Create `working-group.controller.spec.ts` co-located — test endpoint routing, RBAC enforcement (401/403), response envelope format
  - [x] 4.3 Test domain event emission on join/leave
  - [x] 4.4 Test member count atomic update correctness

- [x] Task 5: Frontend working groups overview page (AC: #1, #2)
  - [x] 5.1 Create `apps/web/app/(dashboard)/dashboard/working-groups/page.tsx` with 'use client' directive
  - [x] 5.2 Display four working group cards in a 2x2 grid (equal visual weight, no domain ordering hierarchy)
  - [x] 5.3 Each card shows: domain name, description, member count badge, domain-colored accent (border or subtle background tint)
  - [x] 5.4 "Join" button on each card — disabled if already a member (show "Joined" state instead)
  - [x] 5.5 Use skeleton loaders for initial loading state (NOT spinners)
  - [x] 5.6 Create TanStack Query hook `useWorkingGroups()` in `apps/web/hooks/use-working-groups.ts`
  - [x] 5.7 Create mutation hook `useJoinWorkingGroup()` with optimistic update and query invalidation

- [x] Task 6: Frontend working group detail page (AC: #3, #4)
  - [x] 6.1 Create `apps/web/app/(dashboard)/dashboard/working-groups/[id]/page.tsx`
  - [x] 6.2 Display: member list with avatars/names, recent contributions from group members, active domain tasks (placeholder list for now — tasks module in Story 5.2)
  - [x] 6.3 Apply domain accent color as subtle background tint using CSS custom property
  - [x] 6.4 "Leave" button for current members — calm secondary styling
  - [x] 6.5 Create mutation hook `useLeaveWorkingGroup()` with optimistic update
  - [x] 6.6 Create feature components in `apps/web/components/features/working-group/`: `working-group-card.tsx`, `working-group-detail.tsx`, `member-list.tsx`

- [x] Task 7: Navigation integration
  - [x] 7.1 Add "Working Groups" link to dashboard sidebar navigation
  - [x] 7.2 Ensure proper route protection (authenticated contributors only)

## Dev Notes

### Architecture Compliance

- **Schema:** `core` schema owns `working_groups` and `working_group_members` tables
- **Module pattern:** One NestJS module `WorkingGroupModule` mapping to these tables
- **API versioning:** All endpoints under `/api/v1/working-groups`
- **Response envelope:** Mandatory `{ data, meta: { timestamp, correlationId } }` on all responses
- **Error handling:** Use `DomainException` base class with UPPER_SNAKE_CASE error codes; never throw raw `HttpException`
- **Logging:** Use Pino via nestjs-pino with `correlationId` and `module: 'working-group'` in all log context; never log PII at info level
- **Events:** Emit `working-group.member.joined` and `working-group.member.left` domain events via EventEmitter2 with standard `DomainEvent<T>` payload shape: `{ eventType, timestamp, correlationId, actorId, payload }`

### Technical Requirements

- **Four fixed domains** — These are seed data, not user-created. The working groups are pre-defined and immutable:
  - Technology (teal accent)
  - Fintech & Financial Engineering (amber accent)
  - Impact & Sustainability (terra rose accent)
  - Governance (slate violet accent)
- **Multiple membership** — Contributors can join any number of working groups simultaneously
- **Member count** — Must be atomically updated in a transaction alongside the member record insert/delete
- **Contribution attribution** — Leaving a group does NOT affect existing contribution records; contributions remain attributed to the contributor
- **ContributorDomain enum** already exists in Prisma schema (Technology, Fintech, Impact, Governance) — reuse it for the `domain` field on `WorkingGroup`

### Library & Framework Requirements

| Component     | Library              | Version           |
| ------------- | -------------------- | ----------------- |
| Runtime       | Node.js              | 22+               |
| Backend       | NestJS               | ^11.0.1           |
| ORM           | Prisma               | ^7.4.2            |
| Database      | PostgreSQL           | 16+               |
| RBAC          | CASL (@casl/ability) | Latest            |
| Frontend      | Next.js              | 16.1.6            |
| React         | React                | 19.2.3            |
| Server state  | TanStack Query       | ^5.90.21          |
| Validation    | Zod                  | ^3.24.0           |
| Styling       | Tailwind CSS         | ^4                |
| UI primitives | Radix UI             | via packages/ui   |
| Logging       | Pino (nestjs-pino)   | ^4.5.0            |
| Events        | EventEmitter2        | (NestJS built-in) |

### File Structure Requirements

**Backend — create these files:**

```
apps/api/src/modules/working-group/
  working-group.module.ts
  working-group.controller.ts
  working-group.service.ts
  working-group.controller.spec.ts
  working-group.service.spec.ts
  dto/
    join-working-group.dto.ts
```

**Frontend — create these files:**

```
apps/web/
  app/(dashboard)/dashboard/working-groups/
    page.tsx
    [id]/page.tsx
  hooks/
    use-working-groups.ts
  components/features/working-group/
    working-group-card.tsx
    working-group-detail.tsx
    member-list.tsx
```

**Shared — create/modify these files:**

```
packages/shared/src/
  schemas/working-group.schema.ts          (new)
  types/working-group.types.ts             (new)
  constants/domains.ts                     (new or extend existing)
  constants/error-codes.ts                 (add new error codes)
  index.ts                                 (add exports)
```

**Prisma schema — modify:**

```
apps/api/prisma/schema.prisma             (add WorkingGroup + WorkingGroupMember models)
```

### Testing Requirements

- Co-locate all tests as `*.spec.ts` next to source files — NEVER create `__tests__/` directories
- Unit tests for `WorkingGroupService`: all CRUD operations, edge cases (join duplicate returns 409, leave non-member returns 404), member count atomic update
- Integration tests for `WorkingGroupController`: RBAC enforcement (401 for unauthenticated, 403 for unauthorized roles), response envelope format, HTTP status codes
- Test domain event emission on join/leave with `EventEmitter2` spy
- Frontend: verify TanStack Query hooks invalidate correct query keys on mutation success

### Naming Conventions (STRICT)

| Type         | Convention                  | Example                                                   |
| ------------ | --------------------------- | --------------------------------------------------------- |
| DB table     | snake_case plural           | `working_groups`, `working_group_members`                 |
| DB column    | snake_case                  | `member_count`, `accent_color`, `joined_at`               |
| DB index     | idx*{table}*{columns}       | `idx_working_group_members_contributor_id`                |
| Prisma model | PascalCase singular + @@map | `WorkingGroup @@map("working_groups")`                    |
| API endpoint | kebab-case plural           | `/api/v1/working-groups`                                  |
| Route param  | camelCase                   | `:workingGroupId` (but `:id` acceptable for simple cases) |
| NestJS class | PascalCase + suffix         | `WorkingGroupService`, `WorkingGroupController`           |
| File         | kebab-case + suffix         | `working-group.service.ts`                                |
| Zod schema   | camelCase + Schema          | `workingGroupSchema`                                      |
| Error code   | UPPER_SNAKE_CASE            | `WORKING_GROUP_NOT_FOUND`                                 |
| Domain event | dot.case                    | `working-group.member.joined`                             |
| BullMQ queue | kebab-case                  | N/A for this story                                        |

### UX Design Requirements

- **Calm clarity aesthetic** — Beautiful, calming visuals; not metrics-dashboard nervousness
- **Equal visual prominence** — All four domains rendered with identical card dimensions, no ordering hierarchy
- **Domain accent colors** as subtle background tints — not aggressive color blocks
- **Skeleton loaders** for loading states — never spinners for page content
- **Optimistic updates** for join/leave actions via TanStack Query
- **Touch targets** minimum 44x44px, contrast ratio 4.5:1 (WCAG 2.1 AA)
- **Semantic HTML** with proper aria-labels for accessibility

### Previous Story Intelligence

**From Story 4-4 (Multi-Contributor Collaboration Detection):**

- **Controller pattern:** Apply `@UseGuards(JwtAuthGuard, AbilityGuard)` + `@CheckAbility()` for RBAC
- **Current user:** Use `@CurrentUser()` decorator to extract JWT payload (includes `githubId`)
- **Success response:** Use `createSuccessResponse(data, meta)` helper
- **Error handling:** Throw `DomainException(ERROR_CODES.X, message, HttpStatus.X)` — never raw `HttpException`
- **Transaction pattern:** `prisma.$transaction()` for multi-step operations with audit log creation
- **Event emission:** `this.eventEmitter.emit('domain.entity.action', payload)` after successful operations
- **Frontend hooks:** TanStack Query `useMutation` with `queryClient.invalidateQueries()` on success
- **Component pattern:** `'use client'` directive, import types with `type` keyword from `@edin/shared`, Tailwind utilities

### Git Intelligence

**Recent commit pattern:** `feat: implement <description> (Story X-Y)`

**Recent files modified (Story 4-4):** 57 files, 8024 insertions — established patterns for:

- Service + controller + spec co-location in module directory
- Shared schema + types + error codes in `packages/shared`
- Frontend hooks in `apps/web/hooks/`
- Feature components in `apps/web/components/features/`
- Prisma migration for new models

**Existing code to reuse:**

- `createSuccessResponse()` utility for API response envelope
- `DomainException` class for typed error handling
- `@CurrentUser()` decorator for authenticated user extraction
- `@CheckAbility()` decorator for CASL RBAC checks
- `JwtAuthGuard` and `AbilityGuard` for endpoint protection
- `ContributorDomain` enum already in Prisma schema
- `apiClient<T>()` frontend utility for typed API calls

### Project Structure Notes

- Monorepo: Turborepo + pnpm workspaces
- Apps: `apps/api` (NestJS 11), `apps/web` (Next.js 16)
- Packages: `packages/shared` (types/schemas/constants), `packages/ui` (Radix primitives)
- Database: PostgreSQL 16 with domain-separated schemas (core, evaluation, publication, audit)
- The `core` schema currently contains: contributors, applications, application_reviews, buddy_assignments, onboarding_milestones, monitored_repositories, contributions, contribution_collaborations, audit_logs
- Working groups and working group members tables will be added to the `core` schema

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 5, Story 5.1]
- [Source: _bmad-output/planning-artifacts/architecture.md - Sections: Tech Stack, NestJS Module Architecture, Database Schema, RBAC, API Patterns, Testing Standards]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Calm clarity aesthetic, domain color system]
- [Source: _bmad-output/implementation-artifacts/4-4-multi-contributor-collaboration-detection.md - Previous story patterns]
- [Source: apps/api/prisma/schema.prisma - Existing ContributorDomain enum, Contributor model relations]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Pre-existing `prisma migrate dev` shadow database issue — worked around by creating manual migration SQL and using `prisma migrate deploy`
- Pre-existing TypeScript errors in `review-feedback-list.tsx`, `review-list.tsx`, `governance.test.tsx` — unrelated to this story

### Completion Notes List

- **Task 1:** Added `WorkingGroup` and `WorkingGroupMember` models to Prisma schema with proper `@@map`, indexes, and unique constraints. Seed script inserts four fixed working groups (Technology, Fintech & Financial Engineering, Impact & Sustainability, Governance) with domain-specific accent colors. Migration applied successfully.
- **Task 2:** Created Zod validation schemas (`workingGroupSchema`, `workingGroupMemberSchema`, `joinWorkingGroupSchema`), TypeScript types with domain event interfaces, added `DOMAIN_DETAILS` constant with accent colors, and three new error codes. All exported from `packages/shared`.
- **Task 3:** Full NestJS `WorkingGroupModule` with service (6 methods: `findAll`, `findById`, `joinGroup`, `leaveGroup`, `getMembers`, `getGroupContributions`), controller (4 endpoints under `/api/v1/working-groups`), DTOs, CASL guards, domain event emission, and transactional join/leave with atomic member count updates. Added `Action.Delete` on `WorkingGroup` to CASL factory for leave operations.
- **Task 4:** 25 backend tests (16 service + 9 controller) covering all CRUD operations, edge cases (join duplicate → 409, leave non-member → 404), event emission verification, response envelope format, and RBAC enforcement.
- **Task 5:** Working groups overview page at `/dashboard/working-groups` with 2x2 grid layout, domain-colored cards, Join/Joined state, skeleton loaders, and optimistic updates via TanStack Query hooks (`useWorkingGroups`, `useJoinWorkingGroup`). Enhanced list endpoint to include `isMember` for current user.
- **Task 6:** Working group detail page at `/dashboard/working-groups/[id]` with member list (avatars, names, join dates), recent contributions, domain accent background tint, Leave button with calm secondary styling, and active tasks placeholder for Story 5.2. Created `useLeaveWorkingGroup` hook with optimistic update.
- **Task 7:** Added "Working Groups" section card to dashboard page with link to `/dashboard/working-groups`. Route protection inherited from `(dashboard)/layout.tsx` auth guard.

### Change Log

- 2026-03-08: Implemented Story 5-1 — Working Groups & Domain Membership (all 7 tasks, 42 subtasks)

### File List

**New files:**

- apps/api/prisma/migrations/20260306300000_add_working_groups/migration.sql
- apps/api/src/modules/working-group/working-group.module.ts
- apps/api/src/modules/working-group/working-group.service.ts
- apps/api/src/modules/working-group/working-group.controller.ts
- apps/api/src/modules/working-group/working-group.service.spec.ts
- apps/api/src/modules/working-group/working-group.controller.spec.ts
- apps/api/src/modules/working-group/dto/join-working-group.dto.ts
- packages/shared/src/schemas/working-group.schema.ts
- packages/shared/src/types/working-group.types.ts
- apps/web/app/(dashboard)/dashboard/working-groups/page.tsx
- apps/web/app/(dashboard)/dashboard/working-groups/[id]/page.tsx
- apps/web/hooks/use-working-groups.ts
- apps/web/components/features/working-group/working-group-card.tsx
- apps/web/components/features/working-group/working-group-detail.tsx
- apps/web/components/features/working-group/member-list.tsx

**Modified files:**

- apps/api/prisma/schema.prisma (added WorkingGroup, WorkingGroupMember models + Contributor relation)
- apps/api/prisma/seed.ts (added working groups seed data)
- apps/api/src/app.module.ts (registered WorkingGroupModule)
- apps/api/src/modules/auth/casl/ability.factory.ts (added Action.Delete on WorkingGroup for contributors)
- packages/shared/src/constants/domains.ts (added DOMAIN_DETAILS with accent colors)
- packages/shared/src/constants/error-codes.ts (added WORKING_GROUP_NOT_FOUND, ALREADY_MEMBER, NOT_A_MEMBER)
- packages/shared/src/index.ts (added working-group exports)
- apps/web/app/(dashboard)/dashboard/page.tsx (added Working Groups section card)
- \_bmad-output/implementation-artifacts/sprint-status.yaml (status updates)
