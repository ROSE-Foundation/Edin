# Story 1.4: Role-Based Access Control (RBAC)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform operator,
I want the system to enforce role-based access control across all API endpoints,
so that contributors, admins, and public visitors can only access permitted resources.

## Acceptance Criteria

### AC1: CASL Ability Factory and @CheckAbility Guard

**Given** the CASL ability factory is configured with 7 permission tiers
**When** a request is made to any protected API endpoint
**Then** a `@CheckAbility()` guard verifies the contributor's role has the required permission for the requested action and resource
**And** unauthorized requests return 403 with error code `AUTHORIZATION_DENIED`

### AC2: Permission Tier Definitions

**Given** the following RBAC tiers are defined
**When** permissions are evaluated
**Then** PUBLIC can access: project showcase, contributor roster, domain manifestos, public metrics, published articles
**And** APPLICANT can access: application workflow, micro-task submission
**And** CONTRIBUTOR can access: dashboard, profile, contribution history, evaluations, peer feedback, working groups, task menu, article submission
**And** EDITOR can access: all contributor access + editorial workflow on assigned articles, Editor profile
**And** FOUNDING_CONTRIBUTOR can access: all contributor access + governance weight bonus, early feature access
**And** WORKING_GROUP_LEAD can access: all contributor access + working group management, domain task curation
**And** ADMIN can access: full platform access including admission queue, health metrics, settings, content moderation

### AC3: Role Change Audit Logging

**Given** a contributor's role is changed
**When** the role update is persisted
**Then** an audit log entry is recorded with the old role, new role, actor, and correlation ID

### AC4: RBAC Automated Test Coverage (NFR-S5)

**Given** the RBAC system is in place
**When** automated tests run
**Then** every RBAC tier is verified with tests confirming access grants and denials for each endpoint (NFR-S5)

## Tasks / Subtasks

- [x] Task 1: Install CASL dependencies (AC: 1)
  - [x] 1.1: Install `@casl/ability@^6.8.0` and `@casl/prisma@^1.6.1` in `apps/api`
  - [x] 1.2: CRITICAL — verify installed version is >= 6.7.5 to avoid CVE-2026-1774 (prototype pollution in `rulesToFields`)
  - [x] 1.3: Update `apps/api/package.json` with new dependencies
- [x] Task 2: Define CASL action enum and subject types (AC: 1, 2)
  - [x] 2.1: Create `apps/api/src/modules/auth/casl/action.enum.ts` — enum with `Manage`, `Create`, `Read`, `Update`, `Delete`
  - [x] 2.2: Create `apps/api/src/modules/auth/casl/subjects.ts` — define `AppSubjects` type using CASL's `Subjects` utility mapped to Prisma models (Contributor, AuditLog, and future models as `'all'` placeholder subjects: Article, WorkingGroup, Application, Evaluation, PeerFeedback, Task, HealthMetrics, PlatformSettings)
  - [x] 2.3: Create `apps/api/src/modules/auth/casl/app-ability.type.ts` — export `AppAbility = PureAbility<[Action, AppSubjects | 'all'], PrismaQuery>`
- [x] Task 3: Create CaslAbilityFactory with hierarchical role permissions (AC: 1, 2)
  - [x] 3.1: Create `apps/api/src/modules/auth/casl/ability.factory.ts` — Injectable factory with `createForUser(user: CurrentUserPayload): AppAbility`
  - [x] 3.2: Implement hierarchical permission composition using private methods per tier: `addPublicPermissions()`, `addApplicantPermissions()`, `addContributorPermissions()`, `addEditorPermissions()`, `addFoundingContributorPermissions()`, `addWorkingGroupLeadPermissions()`, `addAdminPermissions()`
  - [x] 3.3: Use `createPrismaAbility` from `@casl/prisma` (NOT deprecated `Ability` class or `createMongoAbility`) for Prisma 7 WhereInput-compatible conditions
  - [x] 3.4: Use `can(Action.Manage, 'all')` for ADMIN role (special CASL keyword matching any action+subject)
  - [x] 3.5: Implement resource-level conditions where applicable (e.g., contributor can only update own profile: `can(Action.Update, 'Contributor', { id: user.id })`)
- [x] Task 4: Create @CheckAbility decorator and AbilityGuard (AC: 1)
  - [x] 4.1: Create `apps/api/src/common/decorators/check-ability.decorator.ts` — uses `SetMetadata` to store policy handlers (callback or class-based)
  - [x] 4.2: Create `apps/api/src/common/guards/ability.guard.ts` — implements `CanActivate`, reads policy handlers from Reflector, creates ability via CaslAbilityFactory, attaches ability to `request.ability` for service-layer access
  - [x] 4.3: Guard must throw `DomainException(ERROR_CODES.AUTHORIZATION_DENIED, 'Insufficient permissions', HttpStatus.FORBIDDEN)` on failure — NOT raw ForbiddenException
  - [x] 4.4: Guard returns `true` if no `@CheckAbility()` metadata found (authentication-only endpoints)
- [x] Task 5: Create CaslModule and integrate into AuthModule (AC: 1)
  - [x] 5.1: Create `apps/api/src/modules/auth/casl/casl.module.ts` — exports CaslAbilityFactory
  - [x] 5.2: Update `apps/api/src/modules/auth/auth.module.ts` — import CaslModule, re-export it
  - [x] 5.3: Update `apps/api/src/app.module.ts` — ensure AuthModule (which now re-exports CaslModule) is available globally, or import CaslModule where needed
- [x] Task 6: Add shared RBAC types to packages/shared (AC: 1, 2)
  - [x] 6.1: Create `packages/shared/src/types/rbac.types.ts` — export `Action` enum and permission-related types for frontend consumption
  - [x] 6.2: Update `packages/shared/src/index.ts` — re-export RBAC types
- [x] Task 7: Apply @CheckAbility to existing auth endpoints as demonstration (AC: 1, 2)
  - [x] 7.1: Update `apps/api/src/modules/auth/auth.controller.ts` — add `@CheckAbility()` to `GET /auth/me` endpoint requiring `Read` action on `Contributor` subject
  - [x] 7.2: Add `AbilityGuard` alongside existing `JwtAuthGuard` using `@UseGuards(JwtAuthGuard, AbilityGuard)` pattern
  - [x] 7.3: Verify unauthenticated public endpoints (health check) remain unprotected
- [x] Task 8: Implement role change with audit logging (AC: 3)
  - [x] 8.1: Create `apps/api/src/modules/contributor/contributor.module.ts` — ContributorModule with Prisma and CASL dependencies
  - [x] 8.2: Create `apps/api/src/modules/contributor/contributor.service.ts` — `updateRole(contributorId, newRole, actorId)` method that validates role transition, updates DB, and creates audit log entry
  - [x] 8.3: Create `apps/api/src/modules/contributor/contributor.controller.ts` — `PATCH /api/v1/admin/contributors/:contributorId/role` endpoint protected by `@CheckAbility()` requiring ADMIN + `Update` on `Contributor`
  - [x] 8.4: Create `apps/api/src/modules/contributor/dto/update-role.dto.ts` — Zod schema validating `{ role: ContributorRole }` using shared enum
  - [x] 8.5: Audit log entry must include: `{ action: 'ROLE_CHANGED', entityType: 'contributor', entityId, details: { oldRole, newRole, actorId }, correlationId }`
- [x] Task 9: Add Express type augmentation for ability on request (AC: 1)
  - [x] 9.1: Update `apps/api/src/common/types/express.d.ts` — augment Express Request with `ability?: AppAbility` property
- [x] Task 10: Unit and integration tests (AC: 1, 2, 3, 4)
  - [x] 10.1: Create `apps/api/src/modules/auth/casl/ability.factory.spec.ts` — test ALL 7 roles with specific grants AND denials for each subject. Minimum tests per role: 3-5 positive (can do X) and 3-5 negative (cannot do Y). Use `subject()` helper for resource-level checks
  - [x] 10.2: Create `apps/api/src/common/guards/ability.guard.spec.ts` — test guard execution: no policies = pass, policy pass = allow, policy fail = DomainException with AUTHORIZATION_DENIED, no user = DomainException
  - [x] 10.3: Create `apps/api/src/modules/contributor/contributor.service.spec.ts` — test role change: valid transition, audit log creation, invalid role rejection
  - [x] 10.4: Create `apps/api/src/modules/contributor/contributor.controller.spec.ts` — test role change endpoint: ADMIN allowed, non-ADMIN rejected (403), missing contributor (404)
  - [x] 10.5: Verify `pnpm build` passes, `pnpm lint` passes, `pnpm test` passes (all existing 42+ tests + new RBAC tests)

## Dev Notes

### Architecture Compliance

- **Authorization:** CASL (`@casl/ability`) with NestJS guards — decorator-based `@CheckAbility()` for clean controller code [Source: architecture.md — RBAC section]
- **7 permission tiers:** PUBLIC, APPLICANT, CONTRIBUTOR, EDITOR, FOUNDING_CONTRIBUTOR, WORKING_GROUP_LEAD, ADMIN — resource-level granularity, not just action-level
- **Guard stacking:** `@UseGuards(JwtAuthGuard, AbilityGuard)` — authentication FIRST, then authorization. Never apply AbilityGuard without JwtAuthGuard on protected endpoints
- **Error responses:** Use `DomainException` with `ERROR_CODES.AUTHORIZATION_DENIED` for 403 — NEVER throw raw `ForbiddenException` or `HttpException`
- **API envelope:** All responses through `ResponseWrapperInterceptor` `{ data, meta }` format
- **Audit logging:** All role changes logged to `audit.audit_logs` table with actor, old role, new role, correlation ID
- **Route groups mapping:** Frontend `(public)` = PUBLIC tier, `(dashboard)` = CONTRIBUTOR+ tiers, `(admin)` = ADMIN tier [Source: architecture.md — Structure Alignment]

### CASL Integration Pattern (CRITICAL)

**Use `@casl/prisma` with `createPrismaAbility`** — NOT `createMongoAbility`. The Prisma integration uses Prisma WhereInput syntax for conditions, not MongoDB query syntax. This ensures `accessibleBy()` generates valid Prisma `where` clauses for data-level filtering.

```
// CORRECT for Prisma 7:
import { createPrismaAbility } from '@casl/prisma';
const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

// WRONG (MongoDB syntax, won't work with Prisma):
import { createMongoAbility } from '@casl/ability';
```

**The `Ability` class is DEPRECATED in CASL v6.** Use `PureAbility` as the base type and `createPrismaAbility` as the builder factory.

**Special CASL keywords:**

- `manage` = matches ANY action (wildcard for actions)
- `'all'` = matches ANY subject (wildcard for subjects)
- `can(Action.Manage, 'all')` = full access (use for ADMIN only)

### Permission Matrix (Definitive Reference)

| Role                 | Subjects & Actions                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PUBLIC               | Read: public showcase pages, contributor roster, domain manifestos, public metrics, published articles                                                            |
| APPLICANT            | Public + Read/Create: application workflow, micro-task submission                                                                                                 |
| CONTRIBUTOR          | Applicant + Read/Update own profile, Read contribution history, Read evaluations, Read peer feedback, Read/Join working groups, Read/Claim tasks, Create articles |
| EDITOR               | Contributor + Update assigned articles (editorial workflow), Read/Create editorial feedback                                                                       |
| FOUNDING_CONTRIBUTOR | Contributor + governance weight bonus flag, early feature access flag (same permissions as Contributor, differentiated by business logic not CASL rules)          |
| WORKING_GROUP_LEAD   | Contributor + Manage own working group (members, tasks, announcements), Create/Update/Delete domain tasks                                                         |
| ADMIN                | Manage all — full platform access. Includes: admission queue, health metrics, platform settings, content moderation, role management, contributor management      |

**IMPORTANT:** FOUNDING_CONTRIBUTOR has same CASL abilities as CONTRIBUTOR. The difference is business-logic level (governance weight multiplier, feature flags) — NOT permission-level. Do NOT create separate CASL rules for FOUNDING_CONTRIBUTOR beyond CONTRIBUTOR rules.

### Prisma 7 Critical Gotchas (from Story 1.2 & 1.3 learnings)

- **PrismaClient constructor:** Requires config object with PrismaPg adapter — do NOT use zero-argument constructor
- **Import path:** Import PrismaClient from `../../generated/prisma/client/` (generated output path), NOT from `@prisma/client`
- **Multi-schema:** Contributor model is in `@@schema("core")`, AuditLog in `@@schema("audit")` — both accessed via single PrismaClient instance
- **@casl/prisma Prisma 7 compatibility:** Use `createPrismaAbilityFor<Prisma.TypeMap>()` pattern if standard `createPrismaAbility` has type issues with Prisma 7's TypeMap — test this during implementation
- **prisma.config.ts** at `apps/api/prisma.config.ts` — config file is at project root (NOT inside prisma/)

### NestJS 11 Guard Pattern

- **Express v5 is default in NestJS 11:** Route patterns use `/users/*path` not `/users/*`
- **Guard execution order matters:** Guards execute in the order listed in `@UseGuards()`. Always: `JwtAuthGuard` first (sets `request.user`), then `AbilityGuard` (reads `request.user` to build abilities)
- **Reflector usage:** Use `reflector.get()` to read `@CheckAbility()` metadata from handler context
- **Global vs local guards:** Do NOT register AbilityGuard globally — apply per-controller or per-endpoint. Public endpoints must remain unguarded

### Library Versions (Verified March 2026)

| Package          | Version | Notes                                                                                                                           |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| @casl/ability    | ^6.8.0  | MUST be >= 6.7.5 (CVE-2026-1774 prototype pollution fix). `Ability` class deprecated, use `PureAbility` + `createPrismaAbility` |
| @casl/prisma     | ^1.6.1  | Prisma 7 support via `createPrismaAbilityFor<Prisma.TypeMap>()`. Conditions use Prisma WhereInput syntax                        |
| @nestjs/common   | ^11.0.1 | Already installed                                                                                                               |
| @nestjs/passport | ^11.0.5 | Already installed                                                                                                               |
| @nestjs/jwt      | ^11.0.2 | Already installed                                                                                                               |
| prisma           | ^7.4.2  | Already installed                                                                                                               |

### CASL Security Note (CVE-2026-1774)

Versions 2.4.0 through 6.7.4 of `@casl/ability` contain a prototype pollution vulnerability in `rulesToFields()` via `setByPath()`. The fix in 6.7.5 adds validation rejecting property names starting with `__`, containing `constructor`, or `prototype`. **Always verify installed version >= 6.7.5.**

### Naming Conventions (from Story 1.2 & 1.3)

| Element        | Convention                 | Example                                  |
| -------------- | -------------------------- | ---------------------------------------- |
| Files (NestJS) | kebab-case with suffix     | `ability.factory.ts`, `ability.guard.ts` |
| Test files     | `.spec.ts` co-located      | `ability.factory.spec.ts`                |
| Classes        | PascalCase                 | `CaslAbilityFactory`, `AbilityGuard`     |
| Enums          | PascalCase                 | `Action`                                 |
| Constants      | UPPER_SNAKE_CASE           | `CHECK_ABILITY_KEY`                      |
| Decorators     | PascalCase                 | `CheckAbility`                           |
| NestJS modules | PascalCase + Module suffix | `CaslModule`                             |
| Guards         | PascalCase + Guard suffix  | `AbilityGuard`                           |
| Types          | PascalCase                 | `AppAbility`, `AppSubjects`              |

### Logging Standards

- Log role changes at `info` level: `{ contributorId, oldRole, newRole, actorId, correlationId }`
- Log authorization check failures at `warn` level: `{ contributorId, action, subject, correlationId }`
- Log CASL ability creation at `debug` level: `{ contributorId, role, correlationId }`
- NEVER log tokens, secrets, or PII (email, name) — use contributor ID only
- Always include `correlationId` from CorrelationIdInterceptor

### File Locations

| File                         | Path                                                              | Action |
| ---------------------------- | ----------------------------------------------------------------- | ------ |
| Action enum                  | `apps/api/src/modules/auth/casl/action.enum.ts`                   | CREATE |
| Subject types                | `apps/api/src/modules/auth/casl/subjects.ts`                      | CREATE |
| AppAbility type              | `apps/api/src/modules/auth/casl/app-ability.type.ts`              | CREATE |
| Ability factory              | `apps/api/src/modules/auth/casl/ability.factory.ts`               | CREATE |
| Ability factory tests        | `apps/api/src/modules/auth/casl/ability.factory.spec.ts`          | CREATE |
| CASL module                  | `apps/api/src/modules/auth/casl/casl.module.ts`                   | CREATE |
| CheckAbility decorator       | `apps/api/src/common/decorators/check-ability.decorator.ts`       | CREATE |
| AbilityGuard                 | `apps/api/src/common/guards/ability.guard.ts`                     | CREATE |
| AbilityGuard tests           | `apps/api/src/common/guards/ability.guard.spec.ts`                | CREATE |
| Contributor module           | `apps/api/src/modules/contributor/contributor.module.ts`          | CREATE |
| Contributor service          | `apps/api/src/modules/contributor/contributor.service.ts`         | CREATE |
| Contributor controller       | `apps/api/src/modules/contributor/contributor.controller.ts`      | CREATE |
| Contributor service tests    | `apps/api/src/modules/contributor/contributor.service.spec.ts`    | CREATE |
| Contributor controller tests | `apps/api/src/modules/contributor/contributor.controller.spec.ts` | CREATE |
| Update role DTO              | `apps/api/src/modules/contributor/dto/update-role.dto.ts`         | CREATE |
| Shared RBAC types            | `packages/shared/src/types/rbac.types.ts`                         | CREATE |
| Express type augmentation    | `apps/api/src/common/types/express.d.ts`                          | UPDATE |
| Auth module                  | `apps/api/src/modules/auth/auth.module.ts`                        | UPDATE |
| App module                   | `apps/api/src/app.module.ts`                                      | UPDATE |
| Auth controller              | `apps/api/src/modules/auth/auth.controller.ts`                    | UPDATE |
| Shared index                 | `packages/shared/src/index.ts`                                    | UPDATE |
| API package.json             | `apps/api/package.json`                                           | UPDATE |

### Existing Infrastructure (Do NOT recreate — REUSE)

- **JwtAuthGuard** at `apps/api/src/common/guards/jwt-auth.guard.ts` — already handles 401 authentication errors. Do NOT modify this guard. Stack `AbilityGuard` after it
- **CurrentUser decorator** at `apps/api/src/common/decorators/current-user.decorator.ts` — already provides `CurrentUserPayload` with `{ id, githubId, name, email, avatarUrl, role }`. Role is already available
- **DomainException** at `apps/api/src/common/exceptions/domain.exception.ts` — use for AUTHORIZATION_DENIED errors
- **ERROR_CODES** in `@edin/shared` — `AUTHORIZATION_DENIED` already defined. Do NOT add new error codes unless absolutely necessary
- **ROLES and ROLE_HIERARCHY** in `packages/shared/src/constants/roles.ts` — role constants and hierarchy already defined. Comment says "use CASL for permission checks"
- **ContributorRole enum** in Prisma schema — all 7 roles already defined (PUBLIC, APPLICANT, CONTRIBUTOR, EDITOR, FOUNDING_CONTRIBUTOR, WORKING_GROUP_LEAD, ADMIN)
- **GlobalExceptionFilter** — already wraps DomainException errors in standard envelope format
- **CorrelationIdInterceptor** — already assigns correlation IDs to all requests
- **ResponseWrapperInterceptor** — already wraps success responses in `{ data, meta }`
- **AuthModule** at `apps/api/src/modules/auth/auth.module.ts` — already imports PassportModule, JwtModule, exports AuthService and JwtModule
- **JWT payload** already includes `{ sub: contributorId, role: contributorRole }` — role is decoded in JWT strategy and set on request.user
- **Redis infrastructure** — already running via Docker Compose, RedisService already available
- **Prisma schema** — Contributor model with `role` field (ContributorRole enum), AuditLog model in `audit` schema
- **42+ existing tests** passing — do NOT break them

### Previous Story Intelligence (Story 1.3)

**Key patterns to follow:**

- Auth service uses `PrismaService.contributor.upsert()` pattern — apply similar Prisma usage
- Auth service uses `PrismaService.auditLog.create()` for audit entries — reuse same pattern for role change audit
- JWT payload structure: `{ sub: contributor.id, role: contributor.role }` — abilities should be built from this payload
- All tests use Vitest with `vi.fn()` for mocks and `Test.createTestingModule()` for NestJS testing
- Auth controller uses `@UseGuards(JwtAuthGuard)` pattern — extend to `@UseGuards(JwtAuthGuard, AbilityGuard)`
- Error handling uses `DomainException` with error codes from shared package
- Auth service injects PrismaService and Logger via NestJS DI

**Known issues from Story 1.3:**

- Pre-existing build error in `vitest.config.ts` (@types/node version conflict) — not introduced by stories, ignore
- Pre-existing lint errors in `*.spec.ts` files (vitest globals not typed for ESLint) — same pattern as existing test files

**Files created in Story 1.3 relevant to this story:**

- `apps/api/src/modules/auth/auth.service.ts` — generateTokens() includes role in JWT payload
- `apps/api/src/modules/auth/strategies/jwt.strategy.ts` — JwtPayload interface with `role: string`, validates contributor is active
- `apps/api/src/common/guards/jwt-auth.guard.ts` — authentication guard to stack with AbilityGuard
- `apps/api/src/common/decorators/current-user.decorator.ts` — CurrentUserPayload includes role

### Git Intelligence (Recent Commits)

Last 3 commits implement Stories 1.1 → 1.2 → 1.3 progressively. Patterns established:

- Commit messages: `feat: implement [feature description] (Story X.Y)`
- Each story creates new module directories under `apps/api/src/modules/`
- Shared types and schemas go to `packages/shared/src/`
- Co-located tests as `*.spec.ts` next to source files
- Dependencies added to workspace-specific `package.json` (not root)
- `.env.example` updated when new env vars needed (no new env vars expected for RBAC)

### Cross-Story Dependencies

**This story depends on:**

- Story 1.1 (DONE) — Monorepo scaffold, Docker Compose, NestJS bootstrap, CI/CD
- Story 1.2 (DONE) — Contributor model with role enum, AuditLog model, PrismaService, shared schemas
- Story 1.3 (DONE) — GitHub OAuth, JWT tokens with role in payload, JwtAuthGuard, @CurrentUser decorator, Redis

**This story blocks:**

- Story 1.5 (Founding Contributor Designation) — needs RBAC to protect admin endpoint for founding status assignment
- Story 2.1+ (Contributor Profiles) — needs @CheckAbility to protect profile endpoints
- All Epic 2+ stories — all authenticated features need RBAC enforcement

### Scope Boundaries

**IN scope for this story:**

- CASL ability factory with all 7 role tiers
- @CheckAbility() decorator and AbilityGuard
- CaslModule integrated into AuthModule
- Permission definitions for all roles (using placeholder subjects for future models)
- Role change endpoint (PATCH /api/v1/admin/contributors/:contributorId/role) with audit logging
- Shared RBAC types for frontend consumption
- Comprehensive tests for all 7 role tiers (NFR-S5)
- @CheckAbility applied to existing auth/me endpoint as demonstration

**NOT in scope (deferred to later stories):**

- Founding Contributor designation endpoint (Story 1.5)
- Per-user rate limiting beyond global ThrottlerModule (Epic 10)
- Frontend route guards or ability checks (Epic 2+, when dashboard/admin pages are built)
- `accessibleBy()` data-level filtering in queries (apply per-feature as models are created)
- CASL integration with Prisma query filtering (infrastructure ready, apply when features need it)
- Email/password authentication (architecture mentions it but no story requires it for MVP)

### Testing Requirements

- **Unit tests:** Co-located `*.spec.ts` files using Vitest
- **AbilityFactory tests:** Test ALL 7 roles with both positive grants (can) and negative denials (cannot) for each relevant subject. This is the NFR-S5 compliance test — it must prove zero unauthorized access
- **AbilityGuard tests:** Mock Reflector and CaslAbilityFactory, test: no policies = allow, policy pass = allow, policy fail = DomainException(AUTHORIZATION_DENIED), no user = DomainException
- **Contributor service tests:** Mock PrismaService, test: valid role change + audit log creation, invalid contributor (404), same-role-change rejection
- **Contributor controller tests:** Mock ContributorService, test: admin can change roles, non-admin gets 403, validation errors for invalid roles
- **Build verification:** `pnpm build` must pass without errors
- **Lint verification:** `pnpm lint` must pass
- **Full test suite:** `pnpm test` must pass (existing 42+ tests + new RBAC tests)

### Project Structure Notes

- Monorepo uses Turborepo + pnpm workspaces
- Local packages: `"@edin/shared": "workspace:*"`
- CASL files go under `apps/api/src/modules/auth/casl/` (architecture specifies this path)
- New guards/decorators go under `apps/api/src/common/guards/` and `apps/api/src/common/decorators/`
- New contributor module goes under `apps/api/src/modules/contributor/`
- Build: `pnpm build` (all), `pnpm --filter api build` (API only)
- Test: `pnpm test` (all), `pnpm --filter api test` (API only)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.4]
- [Source: _bmad-output/planning-artifacts/architecture.md — RBAC section (lines 270-275), File Structure (lines 932-961), Guards & Decorators (lines 933-939), Security (lines 279-280)]
- [Source: _bmad-output/planning-artifacts/prd.md — FR7, FR7b, NFR-S5, Authentication & Authorization RBAC table (lines 519-527)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Route groups (public)/(dashboard)/(admin), Role-based UI patterns]
- [Source: _bmad-output/implementation-artifacts/1-3-github-oauth-authentication.md — Auth module, JWT strategy, guards, decorators, Prisma gotchas, testing patterns]
- [Source: _bmad-output/implementation-artifacts/1-2-database-schema-foundation-and-prisma-configuration.md — Prisma schema, ContributorRole enum, AuditLog model]
- [Source: packages/shared/src/constants/roles.ts — ROLES, ROLE_HIERARCHY]
- [Source: packages/shared/src/constants/error-codes.ts — AUTHORIZATION_DENIED]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- CASL v6 with `PureAbility` requires `conditionsMatcher` — resolved by using `createPrismaAbility` from `@casl/prisma` as the AbilityBuilder factory, which provides a built-in conditions matcher
- `AppSubjects` defined as string-only union (not Prisma model instances) to avoid type conflicts with `PrismaQuery` type parameter when most subjects are placeholder strings for future models
- `ability.can()` with conditions requires `subject()` helper from `@casl/ability` to wrap the subject with condition properties (3rd positional arg is `field`, not conditions)
- Existing `auth.controller.spec.ts` needed `CaslAbilityFactory` and `Reflector` providers added after `AbilityGuard` was introduced to `getMe` endpoint

### Completion Notes List

- Installed `@casl/ability@6.8.0` and `@casl/prisma@1.6.1` (CVE-2026-1774 addressed, >= 6.7.5)
- Implemented hierarchical CASL ability factory with all 7 permission tiers (PUBLIC through ADMIN)
- FOUNDING_CONTRIBUTOR shares CONTRIBUTOR permissions (differentiated by business logic, not CASL rules)
- Created `@CheckAbility()` decorator and `AbilityGuard` supporting both callback and class-based policy handlers
- `AbilityGuard` throws `DomainException(AUTHORIZATION_DENIED)` for 403 responses, never raw ForbiddenException
- Applied `@CheckAbility` to `GET /auth/me` as demonstration — stacked with `JwtAuthGuard`
- Created ContributorModule with role change endpoint (`PATCH /api/v1/admin/contributors/:id/role`) protected by ADMIN-level CASL check
- Role changes create audit log entries with old/new role, actorId, and correlationId
- Shared `Action` enum and `PermissionCheck` type exported from `@edin/shared` for frontend consumption
- Express Request augmented with `ability?: AppAbility` for service-layer access
- 76 new tests added (58 ability factory, 9 guard, 5 contributor service, 4 contributor controller)
- All 118 tests pass, build passes, lint passes (0 errors, 1 acceptable warning)
- Code review fixes applied: AbilityGuard registered in runtime modules, admin role-change policy hardened, contributor controller authorization test added, and CASL PrismaQuery typing restored

### File List

**New files:**

- `apps/api/src/modules/auth/casl/action.enum.ts` — Action enum (Manage, Create, Read, Update, Delete)
- `apps/api/src/modules/auth/casl/subjects.ts` — AppSubjects type (string union of all subjects)
- `apps/api/src/modules/auth/casl/app-ability.type.ts` — AppAbility type alias
- `apps/api/src/modules/auth/casl/ability.factory.ts` — CaslAbilityFactory with hierarchical permissions
- `apps/api/src/modules/auth/casl/ability.factory.spec.ts` — 58 tests covering all 7 roles
- `apps/api/src/modules/auth/casl/casl.module.ts` — CaslModule exporting factory
- `apps/api/src/common/decorators/check-ability.decorator.ts` — @CheckAbility decorator
- `apps/api/src/common/guards/ability.guard.ts` — AbilityGuard with policy handler execution
- `apps/api/src/common/guards/ability.guard.spec.ts` — 9 tests for guard behavior
- `apps/api/src/modules/contributor/contributor.module.ts` — ContributorModule
- `apps/api/src/modules/contributor/contributor.service.ts` — Role change with audit logging
- `apps/api/src/modules/contributor/contributor.service.spec.ts` — 5 tests for role changes
- `apps/api/src/modules/contributor/contributor.controller.ts` — PATCH role endpoint
- `apps/api/src/modules/contributor/contributor.controller.spec.ts` — 5 tests for endpoint (includes non-admin 403 authorization check)
- `apps/api/src/modules/contributor/dto/update-role.dto.ts` — Zod validation schema
- `packages/shared/src/types/rbac.types.ts` — Shared Action enum and PermissionCheck type

**Modified files:**

- `apps/api/package.json` — Added @casl/ability@^6.8.0 and @casl/prisma@^1.6.1
- `apps/api/src/modules/auth/auth.module.ts` — Import/re-export CaslModule and register AbilityGuard provider
- `apps/api/src/modules/auth/auth.controller.ts` — Added @CheckAbility to GET /auth/me
- `apps/api/src/modules/auth/auth.controller.spec.ts` — Added CaslAbilityFactory provider
- `apps/api/src/app.module.ts` — Added ContributorModule import
- `apps/api/src/common/types/express.d.ts` — Added ability property to Request
- `packages/shared/src/index.ts` — Re-exported RBAC types
- `pnpm-lock.yaml` — Updated lockfile for CASL dependency installation
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Story development status synced to workflow state

## Senior Developer Review (AI)

### Reviewer

Fabrice (AI Code Review Workflow)

### Review Date

2026-03-03

### Outcome

Changes Requested → Addressed in this review pass

### Findings Resolved

- HIGH: Registered `AbilityGuard` as a provider in runtime modules to prevent DI resolution failures on guarded endpoints
- HIGH: Hardened admin role-change authorization to require ADMIN-level CASL permission (`manage all`)
- HIGH: Added explicit non-admin rejection test path validating 403 `AUTHORIZATION_DENIED` behavior
- MEDIUM: Restored CASL PrismaQuery typing on `AppAbility` and removed unsafe `any` cast in ability factory builder
- MEDIUM: Story documentation updated to reflect review fixes and updated test count

### Validation Evidence

- `pnpm --filter api test` passed: 11 test files, 119 tests

## Change Log

- 2026-03-02: Implemented RBAC system with CASL — 7 permission tiers, @CheckAbility decorator, AbilityGuard, role change endpoint with audit logging, 76 new tests (Story 1.4)
- 2026-03-03: Code review remediation applied — fixed guard provider registration, tightened admin-only role update policy, added non-admin authorization test, and restored CASL PrismaQuery typing
