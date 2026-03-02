# Story 1.3: GitHub OAuth Authentication

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a contributor,
I want to sign in with my GitHub account,
so that I can access the platform without creating a separate account.

## Acceptance Criteria

### AC1: GitHub OAuth Redirect

**Given** I am an unauthenticated visitor on the landing page
**When** I click "Sign in with GitHub"
**Then** I am redirected to GitHub's OAuth authorization page requesting minimal permissions (read:user, user:email)

### AC2: OAuth Callback and Token Issuance

**Given** I have authorized the application on GitHub
**When** GitHub redirects me back to the callback URL
**Then** a contributor record is created or updated in the database with my GitHub profile data (name, avatar, email)
**And** a JWT access token (15-minute expiry) is returned in the response body
**And** a refresh token (30-day expiry) is stored in Redis and set as an httpOnly secure cookie
**And** I am redirected to the contributor dashboard

### AC3: Authenticated API Requests

**Given** I have a valid access token
**When** I make API requests
**Then** the requests are authenticated and my contributor context is available via a `@CurrentUser()` decorator

### AC4: Token Refresh with Rotation

**Given** my access token has expired
**When** I make an API request
**Then** the frontend automatically uses the refresh token cookie to obtain a new access token
**And** the old refresh token is invalidated and a new one is issued (token rotation)
**And** the request is retried transparently

### AC5: Logout

**Given** I am authenticated
**When** I click "Sign out"
**Then** my refresh token is invalidated in Redis
**And** the httpOnly cookie is cleared
**And** I am redirected to the public landing page

### AC6: First-Time User Creation

**Given** a contributor does not exist with my GitHub ID
**When** I complete GitHub OAuth for the first time
**Then** a new contributor record is created with role APPLICANT
**And** an audit log entry is recorded for the account creation

## Tasks / Subtasks

- [x] Task 1: Install and configure authentication dependencies (AC: 1, 2, 3, 4)
  - [x] 1.1: Install `@nestjs/passport@^11.0.5`, `passport@^0.7.0`, `passport-github2@^0.1.12`, `@nestjs/jwt@^11.0.2`, `passport-jwt@^4.0.1`, `ioredis@^5.10.0` in apps/api
  - [x] 1.2: Install `@types/passport-github2`, `@types/passport-jwt` as devDependencies in apps/api
  - [x] 1.3: Create `apps/api/src/config/auth.config.ts` — Zod-validated env config for JWT_SECRET, JWT_EXPIRATION (default 15m), REFRESH_TOKEN_EXPIRATION (default 30d)
  - [x] 1.4: Create `apps/api/src/config/github.config.ts` — Zod-validated env config for GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_CALLBACK_URL
  - [x] 1.5: Create `apps/api/src/config/redis.config.ts` — Zod-validated env config for REDIS_URL (may already exist in app.config.ts, extend or create as needed)
  - [x] 1.6: Update `.env.example` — uncomment/add GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_CALLBACK_URL, JWT_SECRET, JWT_EXPIRATION, REFRESH_TOKEN_EXPIRATION
- [x] Task 2: Create Redis service for token storage (AC: 2, 4, 5)
  - [x] 2.1: Create `apps/api/src/common/redis/redis.module.ts` — global module providing ioredis client via ConfigService (REDIS_URL)
  - [x] 2.2: Create `apps/api/src/common/redis/redis.service.ts` — wraps ioredis with typed methods: `setRefreshToken(contributorId, token, ttl)`, `getRefreshToken(contributorId)`, `deleteRefreshToken(contributorId)`, `deleteAllRefreshTokens(contributorId)`
  - [x] 2.3: Create `apps/api/src/common/redis/redis.service.spec.ts` — unit tests for all token operations
- [x] Task 3: Create auth module with GitHub OAuth strategy (AC: 1, 2, 6)
  - [x] 3.1: Create `apps/api/src/modules/auth/auth.module.ts` — imports PassportModule, JwtModule (async config with auth.config), RedisModule, PrismaModule
  - [x] 3.2: Create `apps/api/src/modules/auth/strategies/github.strategy.ts` — Passport GitHub OAuth strategy using passport-github2, extracts profile (id, displayName, emails, photos)
  - [x] 3.3: Create `apps/api/src/modules/auth/strategies/jwt.strategy.ts` — Passport JWT strategy extracting token from Authorization Bearer header, validates contributor exists and is active
  - [x] 3.4: Create `apps/api/src/modules/auth/auth.service.ts` — core auth logic: `validateGithubUser(profile)`, `generateTokens(contributor)`, `refreshTokens(oldRefreshToken)`, `logout(contributorId)`, `createAuditLog(action, details)`
  - [x] 3.5: Create `apps/api/src/modules/auth/auth.controller.ts` — endpoints: GET `/auth/github` (initiates OAuth), GET `/auth/github/callback` (handles callback), POST `/auth/refresh` (token refresh), POST `/auth/logout` (invalidate tokens)
  - [x] 3.6: Create `apps/api/src/modules/auth/dto/auth-response.dto.ts` — Zod schemas for auth responses (token response, contributor profile response)
- [x] Task 4: Create guards and decorators (AC: 3)
  - [x] 4.1: Create `apps/api/src/common/guards/jwt-auth.guard.ts` — extends AuthGuard('jwt'), handles 401 with proper error envelope using DomainException
  - [x] 4.2: Create `apps/api/src/common/decorators/current-user.decorator.ts` — `@CurrentUser()` param decorator extracting contributor from request
  - [x] 4.3: Update `apps/api/src/app.module.ts` — import AuthModule, RedisModule
- [x] Task 5: Add Zod auth schemas to packages/shared (AC: 2, 4)
  - [x] 5.1: Create `packages/shared/src/schemas/auth.schema.ts` — `authTokenResponseSchema`, `refreshTokenRequestSchema`, `githubCallbackQuerySchema`
  - [x] 5.2: Create `packages/shared/src/types/auth.types.ts` — TypeScript types inferred from Zod schemas
  - [x] 5.3: Update `packages/shared/src/index.ts` — re-export new auth schemas and types
- [x] Task 6: Frontend auth integration (AC: 1, 3, 4, 5)
  - [x] 6.1: Create `apps/web/lib/auth.ts` — auth utility functions: `getAccessToken()`, `setAccessToken()`, `clearAuth()`, `isAuthenticated()`; access token stored in memory (NOT localStorage)
  - [x] 6.2: Update `apps/web/lib/api-client.ts` — add Authorization header injection, automatic 401 → refresh token → retry logic using the httpOnly cookie
  - [x] 6.3: Create `apps/web/hooks/use-auth.ts` — React hook providing `{ user, isAuthenticated, isLoading, login, logout }` with TanStack Query integration
  - [x] 6.4: Update landing page — add "Sign in with GitHub" button that redirects to `/api/v1/auth/github`
  - [x] 6.5: Create `apps/web/app/api/auth/callback/route.ts` — Next.js route handler to receive callback redirect, store access token, redirect to dashboard
- [x] Task 7: Unit and integration tests (AC: 1, 2, 3, 4, 5, 6)
  - [x] 7.1: Create `apps/api/src/modules/auth/auth.service.spec.ts` — unit tests for all auth service methods (GitHub user validation, token generation, refresh rotation, logout)
  - [x] 7.2: Create `apps/api/src/modules/auth/auth.controller.spec.ts` — unit tests for controller endpoints with mocked auth service
  - [x] 7.3: Create `apps/api/src/modules/auth/strategies/github.strategy.spec.ts` — unit tests for GitHub strategy profile mapping
  - [x] 7.4: Create `apps/api/src/modules/auth/strategies/jwt.strategy.spec.ts` — unit tests for JWT validation
  - [x] 7.5: Verify `pnpm build` passes, `pnpm lint` passes, `pnpm test` passes

## Dev Notes

### Architecture Compliance

- **Authentication:** Passport.js via `@nestjs/passport` with GitHub OAuth strategy (primary). Local email/password strategy is NOT in scope for this story — it is a fallback mentioned in architecture but not required by Story 1.3 ACs
- **Token strategy:** JWT access tokens (15-minute expiry) stored in memory on frontend (NOT localStorage). Refresh tokens (30-day expiry) stored in Redis with httpOnly secure cookies. Token rotation on every refresh
- **Session expiry:** 24 hours of inactivity (NFR-S4) — implement via refresh token last-used tracking in Redis
- **API envelope:** All auth endpoints return responses through the existing ResponseWrapperInterceptor `{ data, meta }` format
- **Error handling:** Use DomainException with existing error codes from `@edin/shared`: AUTHENTICATION_FAILED, TOKEN_EXPIRED, TOKEN_INVALID, REFRESH_TOKEN_INVALID
- **Audit logging:** Record account creation (AC6) and logout events via the existing AuditLog model in the `audit` schema. Use the existing CorrelationIdInterceptor's correlation ID
- **Module ownership:** Auth module writes to `core.contributors` (create/update on OAuth) and `audit.audit_logs` (audit entries). Auth module reads from `core.contributors` for JWT validation

### Prisma 7 Critical Gotchas (from Story 1.2 learnings)

- **PrismaClient constructor:** Requires config object with PrismaPg adapter — do NOT use zero-argument constructor
- **Import path:** Import PrismaClient from `../../generated/prisma/client/` (generated output path), NOT from `@prisma/client`
- **Multi-schema:** Contributor model is in `@@schema("core")`, AuditLog in `@@schema("audit")` — both accessed via single PrismaClient instance
- **ESM requirement:** TypeScript targets `ES2023`, module `ESNext`
- **prisma.config.ts** at `apps/api/prisma.config.ts` — config file is at project root (NOT inside prisma/)

### NestJS 11 Authentication Gotchas

- **Express v5 is default in NestJS 11:** Route wildcards use `/users/*path` instead of `/users/*`. Verify callback URL route patterns work correctly
- **@nestjs/passport v11.0.5:** Use `>=11.0.4` to avoid TypeScript strategy constructor overload bugs
- **passport v0.7.0:** `req.logout()` is now ASYNC and requires a callback — never call `req.logout()` without a callback or promisification
- **@nestjs/jwt v11.0.2:** `secret` option accepts `crypto.KeyObject` for 2x-50x performance — consider using KeyObject for production. `signAsync()` supports generics
- **passport-github2 v0.1.12:** Package is functional but unmaintained (last update ~6 years ago). Works with GitHub OAuth v3 API. Monitor for future migration to `passport-oauth2` direct usage

### Library Versions (Verified March 2026)

| Package                 | Version | Notes                                                   |
| ----------------------- | ------- | ------------------------------------------------------- |
| @nestjs/passport        | ^11.0.5 | NestJS 11 compatible, TypeScript fix in 11.0.4          |
| passport                | ^0.7.0  | req.logout() requires callback since 0.6.0              |
| passport-github2        | ^0.1.12 | Functional but unmaintained, works with GitHub OAuth v3 |
| @nestjs/jwt             | ^11.0.2 | Supports crypto.KeyObject for performance               |
| passport-jwt            | ^4.0.1  | Stable, works with jsonwebtoken 9.0.3                   |
| ioredis                 | ^5.10.0 | Redis 7.x compatible, actively maintained               |
| @types/passport-github2 | latest  | DevDependency                                           |
| @types/passport-jwt     | latest  | DevDependency                                           |

### GitHub OAuth Flow (Architecture Reference)

1. User clicks "Sign in with GitHub" on landing page
2. Frontend redirects to `/api/v1/auth/github`
3. NestJS Passport GitHub strategy redirects to GitHub OAuth authorization page (scopes: `read:user`, `user:email`)
4. User authorizes on GitHub → GitHub redirects to `/api/v1/auth/github/callback`
5. NestJS Passport validates OAuth code, fetches GitHub profile
6. Auth service creates or updates contributor record (upsert by `github_id`)
7. JWT access token (15min) generated and returned in response body
8. Refresh token (30-day, random UUID) stored in Redis with key pattern `refresh_token:{contributorId}:{tokenId}` and set as httpOnly secure cookie
9. Frontend stores access token in memory (JavaScript variable, NOT localStorage)
10. On 401 response, frontend interceptor calls POST `/api/v1/auth/refresh` with httpOnly cookie → new access + refresh tokens issued, old refresh token invalidated (rotation)
11. Logout: POST `/api/v1/auth/logout` → invalidate refresh token in Redis, clear httpOnly cookie

### Token Storage Design

**Access Token:**

- JWT signed with HS256 (JWT_SECRET)
- Payload: `{ sub: contributorId, role: contributorRole, iat, exp }`
- 15-minute expiry
- Stored in memory on frontend (not localStorage, not sessionStorage — avoids XSS exposure)

**Refresh Token:**

- Random UUID (NOT a JWT — opaque token)
- Stored in Redis: key `refresh_token:{contributorId}:{tokenId}`, value `{ contributorId, createdAt, lastUsedAt }`
- 30-day TTL in Redis
- Sent as httpOnly, secure, sameSite=strict cookie named `edin_refresh_token`
- Token rotation: on every use, old token is deleted and new token is issued

**Redis Key Patterns:**

- `refresh_token:{contributorId}:{tokenId}` — individual refresh token
- Use `SCAN` with pattern `refresh_token:{contributorId}:*` for "logout all devices"

### Database Operations

**On GitHub OAuth callback (upsert):**

```
prisma.contributor.upsert({
  where: { githubId: profile.id },
  create: { githubId, name, email, avatarUrl, role: 'APPLICANT' },
  update: { name, email, avatarUrl, updatedAt: new Date() }
})
```

**On first-time creation (audit log):**

```
prisma.auditLog.create({
  data: { actorId: null, action: 'CREATED', entityType: 'contributor', entityId: newContributor.id, details: { source: 'github_oauth', githubId }, correlationId }
})
```

### Naming Conventions (from Story 1.2)

| Element        | Convention                 | Example                                    |
| -------------- | -------------------------- | ------------------------------------------ |
| Files (NestJS) | kebab-case with suffix     | `auth.service.ts`, `github.strategy.ts`    |
| Test files     | `.spec.ts` co-located      | `auth.service.spec.ts`                     |
| Classes        | PascalCase                 | `AuthService`, `GithubStrategy`            |
| Functions      | camelCase                  | `validateGithubUser()`, `generateTokens()` |
| Constants      | UPPER_SNAKE_CASE           | `REFRESH_TOKEN_PREFIX`                     |
| Zod schemas    | camelCase + Schema suffix  | `authTokenResponseSchema`                  |
| NestJS modules | PascalCase + Module suffix | `AuthModule`                               |
| Guards         | PascalCase + Guard suffix  | `JwtAuthGuard`                             |
| Decorators     | PascalCase                 | `CurrentUser`                              |

### Logging Standards

- Log successful login at `info` level: `{ contributorId, isNewUser, correlationId }`
- Log token refresh at `debug` level: `{ contributorId, correlationId }`
- Log logout at `info` level: `{ contributorId, correlationId }`
- Log failed authentication at `warn` level: `{ reason, githubId (if available), correlationId }`
- NEVER log tokens, secrets, or PII (email, name) at any level — use contributor ID only
- Always include `correlationId` from CorrelationIdInterceptor

### File Locations

| File                  | Path                                                       | Action |
| --------------------- | ---------------------------------------------------------- | ------ |
| Auth config           | `apps/api/src/config/auth.config.ts`                       | CREATE |
| GitHub config         | `apps/api/src/config/github.config.ts`                     | CREATE |
| Redis module          | `apps/api/src/common/redis/redis.module.ts`                | CREATE |
| Redis service         | `apps/api/src/common/redis/redis.service.ts`               | CREATE |
| Auth module           | `apps/api/src/modules/auth/auth.module.ts`                 | CREATE |
| Auth service          | `apps/api/src/modules/auth/auth.service.ts`                | CREATE |
| Auth controller       | `apps/api/src/modules/auth/auth.controller.ts`             | CREATE |
| GitHub strategy       | `apps/api/src/modules/auth/strategies/github.strategy.ts`  | CREATE |
| JWT strategy          | `apps/api/src/modules/auth/strategies/jwt.strategy.ts`     | CREATE |
| Auth DTOs             | `apps/api/src/modules/auth/dto/auth-response.dto.ts`       | CREATE |
| JWT auth guard        | `apps/api/src/common/guards/jwt-auth.guard.ts`             | CREATE |
| CurrentUser decorator | `apps/api/src/common/decorators/current-user.decorator.ts` | CREATE |
| Auth Zod schemas      | `packages/shared/src/schemas/auth.schema.ts`               | CREATE |
| Auth types            | `packages/shared/src/types/auth.types.ts`                  | CREATE |
| Shared index          | `packages/shared/src/index.ts`                             | UPDATE |
| Frontend auth lib     | `apps/web/src/lib/auth.ts`                                 | CREATE |
| Frontend api-client   | `apps/web/src/lib/api-client.ts`                           | UPDATE |
| Frontend auth hook    | `apps/web/src/hooks/use-auth.ts`                           | CREATE |
| Auth callback route   | `apps/web/src/app/api/auth/callback/route.ts`              | CREATE |
| Landing page          | `apps/web/src/app/(public)/page.tsx`                       | UPDATE |
| App module            | `apps/api/src/app.module.ts`                               | UPDATE |
| .env.example          | `apps/api/.env.example`                                    | UPDATE |
| API package.json      | `apps/api/package.json`                                    | UPDATE |

### Existing Infrastructure (Do NOT modify)

- Docker Compose: PostgreSQL 16 + Redis 7 already configured and running
- NestJS bootstrap (main.ts): Pino logging, OpenTelemetry, Swagger, CORS, Helmet all configured
- GlobalExceptionFilter: Already wraps errors in standard envelope `{ error: { code, message, status, correlationId, timestamp } }`
- CorrelationIdInterceptor: Already assigns correlation IDs to requests
- ResponseWrapperInterceptor: Already wraps success responses in `{ data, meta }`
- ZodValidationPipe: Already available for request validation
- DomainException: Already available for business error throwing
- Error codes in `@edin/shared`: AUTHENTICATION_FAILED, AUTHORIZATION_DENIED, TOKEN_EXPIRED, TOKEN_INVALID, REFRESH_TOKEN_INVALID already defined
- Prisma schema: Contributor model with `githubId` (Int, unique) field already exists
- AuditLog model already exists in `audit` schema
- CI/CD pipeline: Already runs build, lint, test, security scan
- Husky + commitlint: Already enforcing commit standards

### Previous Story Intelligence (Story 1.2)

**Key learnings to apply:**

- Use `PrismaPg` adapter pattern for all Prisma operations (not zero-arg PrismaClient)
- Import PrismaClient from generated path `../../generated/prisma/client/`
- Use `z.infer<typeof schema>` for type inference from Zod — never duplicate types
- Use `.strict()` on Zod schemas that should reject extra fields
- Seed data uses `upsert` pattern — apply same pattern for OAuth user creation
- All tests co-located as `*.spec.ts` next to source files
- `pnpm build` must pass for all packages after changes

**Files created in Story 1.2 relevant to this story:**

- `apps/api/prisma/schema.prisma` — Contributor model (githubId field) and AuditLog model
- `packages/shared/src/schemas/contributor.schema.ts` — createContributorSchema (validates github_id, name, email, avatar_url)
- `packages/shared/src/constants/roles.ts` — ROLES object with all ContributorRole values
- `packages/shared/src/constants/error-codes.ts` — ERROR_CODES with auth-related codes

### Cross-Story Dependencies

**This story depends on:**

- Story 1.1 (DONE) — Monorepo scaffold, Docker Compose (PostgreSQL + Redis), NestJS bootstrap, CI/CD
- Story 1.2 (DONE) — Contributor model with githubId, AuditLog model, Zod schemas, PrismaService

**This story blocks:**

- Story 1.4 (RBAC) — needs authentication guards as foundation for authorization
- Story 1.5 (Founding Contributor) — needs authenticated contributor context
- Epic 2+ stories — all authenticated features depend on this story

### Scope Boundaries

**IN scope for this story:**

- GitHub OAuth login/callback flow
- JWT access token generation and validation
- Refresh token storage in Redis with rotation
- `@CurrentUser()` decorator
- JwtAuthGuard for protecting endpoints
- Frontend token management and auto-refresh
- "Sign in with GitHub" button on landing page
- Audit logging for account creation

**NOT in scope (deferred to later stories):**

- RBAC / CASL ability factory (Story 1.4)
- `@CheckAbility()` guard (Story 1.4)
- Email/password fallback authentication (architecture mentions it but no story requires it for MVP)
- eIDAS 2.0 digital identity wallet (Phase 2+)
- Rate limiting per-user (already globally configured via ThrottlerModule, per-user is Story 1.4+)

### Testing Requirements

- **Unit tests:** Co-located `*.spec.ts` files using Vitest
- **Auth service tests:** Mock PrismaService and RedisService, test: GitHub user validation (new + existing), token generation, refresh with rotation, logout, audit log creation
- **Controller tests:** Mock AuthService, test: endpoint routing, guard application, response format
- **Strategy tests:** Mock Passport callbacks, test: GitHub profile mapping to contributor fields, JWT payload validation
- **Redis service tests:** Mock ioredis, test: set/get/delete token operations, TTL setting
- **Build verification:** `pnpm build` must pass without errors
- **Lint verification:** `pnpm lint` must pass
- **Full test suite:** `pnpm test` must pass (existing 60+ tests + new auth tests)

### Project Structure Notes

- Monorepo uses Turborepo + pnpm workspaces
- Local packages: `"@edin/shared": "workspace:*"`
- Build: `pnpm build` (all), `pnpm --filter api build` (API only)
- Dev: `pnpm dev` (all), `pnpm --filter api dev` (API only)
- Test: `pnpm test` (all), `pnpm --filter api test` (API only)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — Authentication & Security, Token Strategy, Authentication Flow, File Structure]
- [Source: _bmad-output/planning-artifacts/prd.md — FR6, NFR-S1-S9, Authentication & Authorization section]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Authentication Flow patterns]
- [Source: _bmad-output/implementation-artifacts/1-2-database-schema-foundation-and-prisma-configuration.md — Prisma 7 Gotchas, Database Naming, Existing Infrastructure]
- [Source: _bmad-output/implementation-artifacts/1-1-initialize-monorepo-and-development-environment.md — Monorepo structure, CI/CD, Docker Compose]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Pre-existing build error in `vitest.config.ts` (@types/node version conflict in monorepo) — not introduced by this story
- Pre-existing lint errors in `*.spec.ts` files (vitest globals not typed for ESLint) — same pattern as existing test files

### Completion Notes List

- Implemented full GitHub OAuth authentication flow: login redirect, callback, token issuance, refresh with rotation, logout
- Created RedisService with typed methods for refresh token CRUD operations and SCAN-based bulk deletion
- GitHub OAuth strategy extracts profile (id, displayName, emails, photos) and maps to contributor fields
- JWT strategy validates tokens against database, checking contributor exists and is active
- AuthService handles contributor upsert on OAuth callback, with APPLICANT role for new users
- Audit logging for account creation events with correlation ID tracking
- JwtAuthGuard returns proper DomainException error envelopes (TOKEN_EXPIRED, AUTHENTICATION_FAILED)
- @CurrentUser() decorator extracts authenticated contributor from request
- Frontend: access token stored in memory (not localStorage), refresh token in httpOnly secure cookie
- API client: automatic 401 → refresh → retry logic with deduplication of concurrent refresh attempts
- useAuth hook with TanStack Query integration for user state management
- Landing page updated with GitHub OAuth sign-in button (SVG icon)
- All 42 tests pass (33 new auth tests + 9 existing)
- cookie-parser middleware added to NestJS bootstrap for reading refresh token cookies
- Added FRONTEND_URL config for OAuth redirect (defaults to http://localhost:3000)

### File List

**New files:**

- `apps/api/src/config/auth.config.ts` — JWT/refresh token env validation
- `apps/api/src/config/github.config.ts` — GitHub OAuth env validation
- `apps/api/src/config/redis.config.ts` — Redis URL env validation
- `apps/api/src/common/redis/redis.module.ts` — Global Redis module
- `apps/api/src/common/redis/redis.service.ts` — Redis operations for refresh tokens
- `apps/api/src/common/redis/redis.service.spec.ts` — Redis service tests (10 tests)
- `apps/api/src/common/guards/jwt-auth.guard.ts` — JWT authentication guard
- `apps/api/src/common/decorators/current-user.decorator.ts` — @CurrentUser() decorator
- `apps/api/src/modules/auth/auth.module.ts` — Auth module with Passport + JWT config
- `apps/api/src/modules/auth/auth.service.ts` — Core auth business logic
- `apps/api/src/modules/auth/auth.service.spec.ts` — Auth service tests (9 tests)
- `apps/api/src/modules/auth/auth.controller.ts` — Auth REST endpoints
- `apps/api/src/modules/auth/auth.controller.spec.ts` — Controller tests (5 tests)
- `apps/api/src/modules/auth/strategies/github.strategy.ts` — Passport GitHub OAuth strategy
- `apps/api/src/modules/auth/strategies/github.strategy.spec.ts` — GitHub strategy tests (6 tests)
- `apps/api/src/modules/auth/strategies/jwt.strategy.ts` — Passport JWT strategy
- `apps/api/src/modules/auth/strategies/jwt.strategy.spec.ts` — JWT strategy tests (3 tests)
- `apps/api/src/modules/auth/dto/auth-response.dto.ts` — Auth response Zod schemas
- `packages/shared/src/schemas/auth.schema.ts` — Shared auth Zod schemas
- `packages/shared/src/types/auth.types.ts` — Shared auth TypeScript types
- `apps/web/lib/auth.ts` — Frontend auth utility (in-memory token storage)
- `apps/web/hooks/use-auth.ts` — React auth hook with TanStack Query
- `apps/web/app/api/auth/callback/route.ts` — Next.js auth callback route handler

**Modified files:**

- `apps/api/package.json` — Added auth dependencies
- `apps/api/.env.example` — Added GitHub OAuth, JWT, refresh token env vars
- `apps/api/src/main.ts` — Added cookie-parser middleware
- `apps/api/src/app.module.ts` — Imported AuthModule and RedisModule
- `apps/web/package.json` — Added @tanstack/react-query
- `apps/web/lib/api-client.ts` — Added auth header injection and 401 refresh retry
- `apps/web/app/(public)/page.tsx` — Added "Sign in with GitHub" button
- `packages/shared/src/index.ts` — Re-exported auth schemas and types
- `pnpm-lock.yaml` — Updated lockfile

### Change Log

- 2026-03-02: Story 1.3 implemented — GitHub OAuth authentication with JWT access tokens, refresh token rotation in Redis, frontend auth integration with TanStack Query (42 tests passing)
