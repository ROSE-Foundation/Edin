# Story 3.1: Contributor Application with Micro-Task

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an applicant,
I want to submit a contribution-based application including a domain-specific micro-task,
so that I can demonstrate my competence and join the Edin community.

## Acceptance Criteria

1. **Given** I am an unauthenticated visitor **When** I navigate to `/apply` **Then** I see an application form with fields for: name, email, primary domain (select: Technology, Finance, Impact, Governance), a brief statement of interest (max 300 characters), and a domain-specific micro-task assignment displayed based on my selected domain **And** the micro-task description clearly states expected deliverable, estimated effort (2-4 hours), and submission format **And** the page design follows UX spec: "respectful challenge" — feels like an invitation to demonstrate competence, not a gatekeeping hurdle

2. **Given** I have completed the application form and micro-task **When** I click Submit **Then** my application is saved via POST `/api/v1/admission/applications` with status PENDING **And** I receive an on-screen confirmation: "We'll review your application within 48 hours" **And** a contributor record is created with role APPLICANT if I authenticated via GitHub, or the application is stored for linking upon first GitHub auth **And** an audit log entry records the application submission

3. **Given** I am submitting the application **When** the form is displayed **Then** a GDPR data processing agreement is presented with a checkbox for explicit consent (FR61) **And** the application cannot be submitted without consent being granted **And** the consent record is stored with timestamp and version of the agreement

4. **Given** I submit an application with invalid data **When** Zod validation fails **Then** field-level error messages are shown inline **And** the API returns 400 with validation details

## Tasks / Subtasks

- [x] Task 1: Add Prisma schema models for admission (AC: #1, #2, #3)
  - [x] 1.1 Add `ApplicationStatus` enum (PENDING, UNDER_REVIEW, APPROVED, DECLINED) to `core` schema
  - [x] 1.2 Add `Application` model with fields: id, applicantName, applicantEmail, domain, statementOfInterest, microTaskDomain, microTaskResponse, microTaskSubmissionUrl, gdprConsentVersion, gdprConsentedAt, status, contributorId (nullable FK), createdAt, updatedAt — in `core` schema
  - [x] 1.3 Add `ConsentRecord` model with fields: id, entityType, entityId, consentType, consentVersion, accepted, acceptedAt, ipAddress, userAgent — in `audit` schema
  - [x] 1.4 Add `MicroTask` model with fields: id, domain, title, description, expectedDeliverable, estimatedEffort, submissionFormat, isActive, createdAt, updatedAt — in `core` schema
  - [x] 1.5 Run `npx prisma migrate dev --name add-admission-models` and verify migration
  - [x] 1.6 Rebuild Prisma client: `pnpm --filter api prisma:generate`

- [x] Task 2: Create shared Zod schemas and types (AC: #1, #4)
  - [x] 2.1 Create `packages/shared/src/types/admission.types.ts` with `ApplicationStatus`, `Application`, `MicroTask`, `ConsentRecord` interfaces
  - [x] 2.2 Create `packages/shared/src/schemas/admission.schema.ts` with `createApplicationSchema` (name: string min 1 max 100, email: string email, domain: domainEnum, statementOfInterest: string max 300, microTaskResponse: string min 1, microTaskSubmissionUrl: string url optional, gdprConsent: boolean refine(val => val === true))
  - [x] 2.3 Add admission error codes to `packages/shared/src/constants/error-codes.ts`: APPLICATION_NOT_FOUND, APPLICATION_ALREADY_EXISTS, DOMAIN_MICRO_TASK_NOT_FOUND, GDPR_CONSENT_REQUIRED
  - [x] 2.4 Export all new types, schemas, and constants from `packages/shared/src/index.ts`
  - [x] 2.5 Rebuild shared package: `pnpm --filter shared build`

- [x] Task 3: Create NestJS admission module — backend (AC: #1, #2, #3, #4)
  - [x] 3.1 Create `apps/api/src/modules/admission/admission.module.ts` importing PrismaService, CaslModule
  - [x] 3.2 Create `apps/api/src/modules/admission/admission.service.ts` with methods: `createApplication()`, `getApplicationById()`, `getActiveMicroTaskByDomain()`
  - [x] 3.3 Create `apps/api/src/modules/admission/admission.controller.ts` with endpoints:
    - `POST /api/v1/admission/applications` (no auth) — validate with Zod pipe, create application, create audit log, create consent record
    - `GET /api/v1/admission/applications/:id` (no auth, rate-limited) — return application status only
    - `GET /api/v1/admission/micro-tasks/:domain` (no auth) — return active micro-task for domain
  - [x] 3.4 Create DTOs: `apps/api/src/modules/admission/dto/create-application.dto.ts`
  - [x] 3.5 Create domain events: `admission.application.submitted` via EventEmitter2
  - [x] 3.6 Register AdmissionModule in AppModule

- [x] Task 4: Seed micro-task data (AC: #1)
  - [x] 4.1 Create or update seed script to insert one active micro-task per domain (Technology, Finance, Impact, Governance) with realistic descriptions, expected deliverables, and estimated effort (2-4 hours)
  - [x] 4.2 Run seed: `pnpm --filter api prisma:seed`

- [x] Task 5: Create frontend application page (AC: #1, #3, #4)
  - [x] 5.1 Create `apps/web/app/(public)/apply/page.tsx` as Server Component with `generateMetadata()` for SEO
  - [x] 5.2 Create `apps/web/app/(public)/apply/loading.tsx` with skeleton loader
  - [x] 5.3 Create `apps/web/components/features/admission/application-form.tsx` — Client Component using React Hook Form + Zod resolver with `createApplicationSchema` from `@edin/shared`
  - [x] 5.4 Create `apps/web/components/features/admission/domain-selector.tsx` — domain selection with micro-task preview that fetches active micro-task via `GET /api/v1/admission/micro-tasks/:domain`
  - [x] 5.5 Create `apps/web/components/features/admission/micro-task-display.tsx` — displays micro-task description, expected deliverable, estimated effort, submission format
  - [x] 5.6 Create `apps/web/components/features/admission/gdpr-consent.tsx` — GDPR checkbox with consent agreement text, version tracking
  - [x] 5.7 Create `apps/web/components/features/admission/application-confirmation.tsx` — success state with "We'll review your application within 48 hours" message
  - [x] 5.8 Create `apps/web/components/features/admission/admission-skeleton.tsx` — skeleton components mirroring form layout

- [x] Task 6: Add "Apply" link to public navigation (AC: #1)
  - [x] 6.1 Add "Apply" link to the public portal top navigation bar (alongside Publication, Contributors, About)

- [x] Task 7: Write tests (AC: #1-4)
  - [x] 7.1 Create `apps/api/src/modules/admission/admission.service.spec.ts` — unit tests: create application (success, duplicate email, missing fields), get micro-task by domain, audit log creation, consent record creation
  - [x] 7.2 Create `apps/api/src/modules/admission/admission.controller.spec.ts` — controller tests: POST /applications (valid, invalid, missing GDPR consent), GET /applications/:id, GET /micro-tasks/:domain
  - [x] 7.3 Create `apps/web/components/features/admission/admission.test.tsx` — component tests: form renders, domain selection updates micro-task, validation errors display inline, GDPR consent required, successful submission shows confirmation, skeleton renders, accessibility attributes, mobile layout

## Dev Notes

### Architecture & Patterns

- **Full-stack feature:** Unlike Epic 2 stories (static content pages), Story 3.1 is the first story requiring a complete NestJS backend module with database models, API endpoints, and a dynamic frontend form. This is a significant pattern shift.
- **NestJS module pattern:** Follow the established `contributor` module structure exactly: `admission.module.ts`, `admission.controller.ts`, `admission.service.ts`, co-located specs, DTOs in `dto/` subdirectory.
- **Unauthenticated endpoint:** `POST /api/v1/admission/applications` and `GET /api/v1/admission/micro-tasks/:domain` are public endpoints. Do NOT add `@UseGuards(JwtAuthGuard)`. Apply rate limiting via `@nestjs/throttler` to prevent abuse (e.g., 5 applications per IP per hour).
- **Database schemas:** `Application` and `MicroTask` models go in `core` schema. `ConsentRecord` goes in `audit` schema. Follow the architecture's data boundary rules — admission module owns `applications` table in `core` schema.
- **Validation flow:** Zod schema defined in `packages/shared/src/schemas/admission.schema.ts` — used by both React Hook Form (frontend) and NestJS validation pipe (backend). Single source of truth.
- **Audit logging:** Every application submission MUST create an `AuditLog` entry with action `admission.application.submitted`, entityType `Application`, and the correlation ID from the request. Use the existing `AuditLog` model.
- **Domain events:** Emit `admission.application.submitted` via EventEmitter2 after successful creation. This enables future listeners (notification service, analytics) without coupling.
- **API response envelope:** All responses MUST use the standard envelope format: `{ data: {...}, meta: { timestamp, correlationId } }` for success, `{ error: { code, message, status, correlationId, timestamp, details } }` for errors.
- **Error handling:** Create admission-specific error codes. Throw `DomainException` subclasses, never raw `HttpException`. Prisma unique constraint violations (duplicate email) map to 409.

### UX Design Requirements

- **Form layout:** Single-column, mobile-first. Never side-by-side fields. Progressive disclosure — show micro-task section only after domain is selected.
- **Input styling:** 8px radius, `#D8D4CE` border, warm off-white background. Focus: border transitions to `brand.accent` (#C4956A) with warm shadow ring. Labels above fields (never floating), 13px, 500 weight, `brand.secondary` (#6B7B8D).
- **Validation:** Inline errors below fields, appear on blur (not keystroke). Error text in `semantic.error` (#A85A5A) with field border matching. Success is invisible — no green checkmarks.
- **Submit button:** Primary button style — solid `brand.accent` (#C4956A) background, white text, 8px radius. Only one primary button on the page. Text: "Submit Application".
- **Confirmation state:** After successful submission, replace form with confirmation message. Use warm-toned descriptive text: "We'll review your application within 48 hours." No exclamation marks, no celebration, no confetti. Factual and brief.
- **Typography:** Sans-serif (Inter / Source Sans Pro) for form labels, buttons, metadata. Serif (Libre Baskerville / Source Serif Pro) for page heading and the micro-task description narrative.
- **Spacing:** `space.lg` (24px) between field groups, `space.md` (16px) between label and input. `space.2xl` (48px) between major page sections.
- **Page background:** `surface.base` (#FAFAF7) — warm off-white, never pure white. Cards use `surface.raised` (#FFFFFF).
- **GDPR consent:** Styled as a clear checkbox with accompanying legal text. Not buried — visible before the submit button. The application CANNOT be submitted without consent checked.
- **"Respectful challenge" tone:** The micro-task section should feel like an invitation to demonstrate competence, not a gatekeeping hurdle. Frame it positively: "Show us what you can do" not "You must complete this to be considered."

### Mobile & Accessibility

- **Mobile-first:** Single-column layout at all breakpoints. Touch targets minimum 48px. Forms remain single-column even on desktop (reduces cognitive load).
- **WCAG 2.1 AA:** Color contrast 4.5:1 for body text, 3:1 for large text. Keyboard navigation for all interactive elements. `aria-describedby` linking error/help text to inputs. Focus visible with 2px accent outline. Screen reader compatible.
- **`prefers-reduced-motion`:** Wrap any transitions in motion media query. Instant transitions at reduced motion.

### Project Structure Notes

- **Backend module location:** `apps/api/src/modules/admission/` — follows contributor module pattern
- **Frontend page location:** `apps/web/app/(public)/apply/page.tsx` — public route, no auth required
- **Frontend components:** `apps/web/components/features/admission/` — follows established feature component organization
- **Shared types:** `packages/shared/src/types/admission.types.ts` — follows `contributor.types.ts` pattern
- **Shared schemas:** `packages/shared/src/schemas/admission.schema.ts` — follows `contributor.schema.ts` pattern
- **Shared constants:** Update `packages/shared/src/constants/error-codes.ts` with admission error codes
- **No new external dependencies needed** — React Hook Form, Zod, @hookform/resolvers already in the project. Radix UI available via `@edin/ui`.

### Critical Anti-Patterns (DO NOT)

- **DO NOT** require GitHub authentication for application submission — applicants may not have GitHub accounts yet. The form is fully public.
- **DO NOT** use floating labels inside inputs — always labels above fields per UX spec.
- **DO NOT** validate on keystroke — validate on blur per UX spec.
- **DO NOT** use green checkmarks for success — success is invisible per UX spec.
- **DO NOT** use percentage progress bars or countdown timers — never per UX spec.
- **DO NOT** create a separate `__tests__/` directory — co-locate tests with source files.
- **DO NOT** throw raw `HttpException` — use `DomainException` subclasses.
- **DO NOT** log without correlationId — include it in every log statement.
- **DO NOT** skip audit logging — every application submission MUST be audited.
- **DO NOT** use horizontal form layout — single column always.
- **DO NOT** hardcode micro-task content in the frontend — fetch from API (backed by database), enabling admin management in Story 3.3.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Lines 715-750] Epic 3 overview and Story 3.1 acceptance criteria
- [Source: _bmad-output/planning-artifacts/prd.md — Lines 703-711] FR8-FR14 Admission & Onboarding requirements
- [Source: _bmad-output/planning-artifacts/prd.md — Lines 807-811] FR61 GDPR data processing consent
- [Source: _bmad-output/planning-artifacts/prd.md — Lines 238-246] Daniel (Applicant) journey — discovery to first contribution
- [Source: _bmad-output/planning-artifacts/prd.md — Lines 519-527] RBAC table — Applicant role: "Application workflow, micro-task submission"
- [Source: _bmad-output/planning-artifacts/prd.md — Lines 326-332] GDPR requirements — DPAs, consent, pseudonymization
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 480-523] NestJS module organization pattern
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 1137-1153] API boundaries — `/api/v1/admission/*` partial auth
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 1163-1172] Data boundaries — `applications` table in `core` schema, `consent_records` in `audit` schema
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 1176-1181] FR-to-module mapping — admission module, (public)/apply/, admission.schema.ts
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 250-254] Zod validation — shared schemas, single source of truth
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 256-275] Authentication — Passport.js, JWT, CASL RBAC, 7 tiers
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 302-307] Error handling — global exception filter, standard error envelope, correlationId
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 658-661] Event naming — `admission.application.submitted` dot.case
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 693-709] Error handling — DomainException, Prisma error mapping, BullMQ retry
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 434-476] Naming conventions — files, classes, schemas, modules
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 1239-1262] Form patterns — input styling, validation, layout
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 1180-1203] Button hierarchy — primary, secondary, destructive
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 1214-1225] Error/success feedback patterns
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 799-833] Daniel's discovery journey — application flow, micro-task, buddy assignment
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 1340-1378] Responsive strategy — mobile-first, 48px touch targets
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 1380-1409] Accessibility — WCAG 2.1 AA, focus indicators, screen reader
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 600-670] Color system and typography
- [Source: _bmad-output/implementation-artifacts/2-6-progressive-decentralization-roadmap.md] Previous story patterns — SSR, component organization, metadata, testing, Prettier

### Previous Story Intelligence (from Story 2-6 and Epic 2 patterns)

- **First backend module story:** Epic 2 was entirely static content (no API calls). Story 3.1 is the first story creating a NestJS module with DB models, API endpoints, and dynamic frontend. Do NOT follow the "static content import from @edin/shared" pattern — this story requires full backend integration.
- **Component organization confirmed:** Features in `apps/web/components/features/{feature-name}/` with co-located tests. Follow this for `admission/`.
- **Metadata pattern:** Use `generateMetadata()` returning `{ title, description, openGraph, twitter }` per previous stories.
- **Skeleton pattern:** Co-locate skeleton variants. Use `role="status"` and `aria-label="Loading..."`.
- **Testing pattern:** Vitest + React Testing Library for frontend. Vitest for NestJS service/controller unit tests. Use `@testing-library/user-event` for form interaction tests.
- **Prettier:** Run `npx prettier --write` on all new files before committing to avoid pre-commit hook failures.
- **Git convention:** Commit as `feat: implement [feature description] (Story X-Y)`.

### Git Intelligence

Recent commits follow pattern: `feat: implement [feature description] (Story X-Y)`. Last 10 commits cover all of Epic 1 (foundation, DB, auth, RBAC, founding contributor) and Epic 2 (profiles, showcase, manifestos, metrics, governance roadmap). Convention is well-established.

Key existing infrastructure from previous stories that this story builds on:

- **Prisma + PostgreSQL** with domain-separated schemas (core, evaluation, publication, audit) — Story 1.2
- **GitHub OAuth + JWT auth** with Passport.js — Story 1.3
- **CASL RBAC** with ability guards, `APPLICANT` role already defined in enum — Story 1.4
- **AuditLog model** already exists in audit schema — Story 1.2
- **Contributor model** with `role` field including `APPLICANT` value — Story 1.2
- **Error codes** in `packages/shared/src/constants/error-codes.ts` — add admission-specific codes
- **Zod schemas** in `packages/shared/src/schemas/` — follow `contributor.schema.ts` pattern
- **Public route group** `apps/web/app/(public)/` — established in Epic 2

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Added `@nestjs/event-emitter` dependency (not listed in "no new dependencies" note but explicitly required by Task 3.5)
- Prisma schema uses `@unique` on `MicroTask.domain` to enable `upsert` by domain in seed script (one active task per domain)

### Completion Notes List

- Task 1: Added `ApplicationStatus` enum, `Application` model (core schema), `MicroTask` model (core schema), `ConsentRecord` model (audit schema). Migration `20260304134609_add_admission_models` applied successfully. Prisma client regenerated.
- Task 2: Created shared Zod schema `createApplicationSchema` with all field validations. Created TypeScript interfaces for `Application`, `MicroTask`, `ConsentRecord`, `ApplicationStatus`. Added 4 admission error codes. All exported from shared package index.
- Task 3: Created NestJS `AdmissionModule` with controller (3 public endpoints), service (3 methods), and DTO. Endpoints: `POST /api/v1/admission/applications` (rate-limited: 5/hour), `GET /api/v1/admission/applications/:id`, `GET /api/v1/admission/micro-tasks/:domain`. All public (no auth guards). Audit logging, consent records, and domain events (`admission.application.submitted`) implemented. EventEmitterModule registered globally.
- Task 4: Seed script updated with 4 domain-specific micro-tasks (Technology, Finance, Impact, Governance). Each has realistic descriptions, expected deliverables, estimated effort (2-4 hours), and submission format. Uses `upsert` for idempotency.
- Task 5: Created `/apply` page with Server Component, loading skeleton, and Client Component form. Form uses React Hook Form + Zod resolver with shared schema. Progressive disclosure — micro-task fields appear after domain selection. GDPR consent checkbox required. Confirmation state replaces form after successful submission. Follows UX spec: single-column, mobile-first, validate on blur, warm color palette, "respectful challenge" tone.
- Task 6: Created `PublicNav` component with Publication, Contributors, About, Apply links. Integrated into public layout. Active link highlighting using `usePathname()`.
- Task 7: 17 API tests (9 service + 8 controller) and 20 frontend component tests. All pass with no regressions across existing test suites (205 API, 144 web).
- Code review fixes applied: added duplicate-application conflict handling (409) with unique applicant email constraint, aligned audit action naming to `admission.application.submitted`, removed PII from info logs, added optional contributor linkage path when authenticated, imported `PrismaModule` and `CaslModule` in `AdmissionModule`, removed production localhost API fallback in web components, and strengthened controller endpoint envelope tests.

### File List

**New Files:**

- `apps/api/prisma/migrations/20260304134609_add_admission_models/migration.sql`
- `apps/api/src/modules/admission/admission.module.ts`
- `apps/api/src/modules/admission/admission.service.ts`
- `apps/api/src/modules/admission/admission.controller.ts`
- `apps/api/src/modules/admission/admission.service.spec.ts`
- `apps/api/src/modules/admission/admission.controller.spec.ts`
- `apps/api/src/modules/admission/dto/create-application.dto.ts`
- `packages/shared/src/types/admission.types.ts`
- `packages/shared/src/schemas/admission.schema.ts`
- `apps/web/app/(public)/apply/page.tsx`
- `apps/web/app/(public)/apply/loading.tsx`
- `apps/web/components/features/admission/application-form.tsx`
- `apps/web/components/features/admission/application-confirmation.tsx`
- `apps/web/components/features/admission/domain-selector.tsx`
- `apps/web/components/features/admission/micro-task-display.tsx`
- `apps/web/components/features/admission/gdpr-consent.tsx`
- `apps/web/components/features/admission/admission-skeleton.tsx`
- `apps/web/components/features/admission/admission.test.tsx`
- `apps/web/components/features/navigation/public-nav.tsx`

**Modified Files:**

- `apps/api/prisma/schema.prisma` — Added ApplicationStatus enum, Application, MicroTask, ConsentRecord models
- `apps/api/prisma/seed.ts` — Added micro-task seed data for 4 domains
- `apps/api/src/app.module.ts` — Added EventEmitterModule and AdmissionModule imports
- `apps/api/package.json` — Added @nestjs/event-emitter dependency
- `pnpm-lock.yaml` — Added lockfile updates for newly added API dependency
- `packages/shared/src/constants/error-codes.ts` — Added 4 admission error codes
- `packages/shared/src/index.ts` — Added admission exports
- `apps/web/app/(public)/layout.tsx` — Added PublicNav component

## Senior Developer Review (AI)

- Outcome: **Approve**
- Fixed all HIGH and MEDIUM findings from adversarial review:
  - Module wiring now includes `PrismaModule` and `CaslModule`
  - Application creation now supports authenticated contributor linkage context when available
  - Duplicate application email path now returns `APPLICATION_ALREADY_EXISTS` with HTTP 409
  - Audit action naming aligned to `admission.application.submitted`
  - PII removed from info-level admission logs
  - Public navigation label aligned with story requirement (`Publication`)
  - Web API base URL fallback no longer silently defaults to localhost outside test environment
  - Controller tests now validate envelope behavior for all admission endpoints
- Validation run:
  - `pnpm --filter api test -- src/modules/admission`
  - `pnpm --filter web test -- src/components/features/admission/admission.test.tsx`

## Change Log

- 2026-03-04: Implemented Story 3.1 — Full-stack contributor application with micro-task. Added admission backend module (NestJS), database models (Prisma), shared validation schemas (Zod), frontend application form (React Hook Form), public navigation, micro-task seeding, GDPR consent tracking, audit logging, and domain events. 37 tests added (17 API + 20 frontend).
- 2026-03-04: Adversarial code review fixes applied — corrected admission module imports, duplicate email conflict handling, audit action naming, logging PII exposure, optional contributor linkage path, public nav label alignment, API base URL safety, and strengthened admission controller endpoint tests.
