# Story 2.3: Public Project Showcase Page

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor,
I want to access a public project showcase displaying Edin's mission, vision, and Founding Circle roster,
so that I can understand the project and its community without creating an account.

## Acceptance Criteria

1. **Given** I am an unauthenticated visitor **When** I navigate to the root URL `/` **Then** I see a public showcase page with: a hero section communicating Edin's mission ("Where Expertise Becomes Publication"), a brief value proposition covering AI evaluation, scaling-law rewards, curated community, and publication platform, and a Founding Circle section listing contributors with the FOUNDING_CONTRIBUTOR role showing their names, avatars, domains, and bios **And** the page is server-side rendered with appropriate meta tags (title, description, Open Graph, Twitter Card) **And** the design follows the UX spec: serif headings, warm off-white background (#FAFAF7), generous whitespace (48px+ between sections), institutional authority aesthetic

2. **Given** the Founding Circle has members **When** the showcase page loads **Then** founding contributors are displayed as profile cards with equal visual weight across all domains **And** the page loads with First Contentful Paint <1.5s on 4G connection (NFR-P1)

3. **Given** the Founding Circle is empty (no founding contributors yet) **When** the showcase page loads **Then** the Founding Circle section displays a dignified empty state: "The Founding Circle is forming. Serious contributors are building something different."

## Tasks / Subtasks

- [x] Task 1: Create founding contributors API endpoint (AC: 1, 2, 3)
  - [x] 1.1 Add `getFoundingContributors()` method to `ContributorService` querying contributors where `role = FOUNDING_CONTRIBUTOR` and `isActive = true`, using Prisma `select` for public fields only (id, name, avatarUrl, bio, domain, skillAreas, role, createdAt), ordered by `createdAt ASC`
  - [x] 1.2 Add `GET founding` endpoint to `ProfileController` — place AFTER `GET me` but BEFORE `GET :id` (Express route ordering). NO `JwtAuthGuard`, NO `AbilityGuard` — public access by design
  - [x] 1.3 Return `PublicContributorProfile[]` — auto-wrapped by `ResponseWrapperInterceptor` into `{ data, meta }`
  - [x] 1.4 Unit tests: returns founding contributors only, returns empty array when none exist, excludes non-founding roles, excludes inactive contributors, returns only public fields (no email, githubId)

- [x] Task 2: Create showcase page components (AC: 1, 2, 3)
  - [x] 2.1 Create `apps/web/components/features/showcase/hero-section.tsx` — center-aligned hero with: display heading "Where Expertise Becomes Publication" (serif, `text.display` 2.5rem/40px, 700 weight), value proposition subtext (sans-serif, `text.body-interface` 15px, `brand.secondary`), linear gradient background from `surface.raised` to `surface.sunken`, padding `space.3xl` (64px) vertical
  - [x] 2.2 Create `apps/web/components/features/showcase/founding-circle.tsx` — section with serif heading "Founding Circle" (`text.h1` 2rem/32px), responsive grid of contributor cards (3-col desktop, 2-col tablet, 1-col mobile), gap `space.lg` (24px), empty state when array is empty
  - [x] 2.3 Create `apps/web/components/features/showcase/founding-contributor-card.tsx` — card with: avatar (80px circular, domain-colored fallback with initial), name (`text.h3` 20px, sans-serif, 600 weight), domain badge (pill with domain accent color), bio excerpt (sans-serif, `text.body-interface` 15px, max 2-3 lines), link to `/contributors/:id`. Card styling: `surface.raised` bg, `1px solid #E8E6E1` border, 12px radius, `0 1px 3px rgba(0,0,0,0.06)` shadow, hover lift effect (translateY -2px, 200ms ease-out)
  - [x] 2.4 Create skeleton variants for hero and founding circle sections (pulsing opacity, NOT spinners)
  - [x] 2.5 Accessibility: semantic headings (h1 hero, h2 founding circle), alt text on avatars, WCAG 2.1 AA color contrast (4.5:1 body, 3:1 large text), keyboard navigable cards, focus indicators (2px `brand.accent` outline with 2px offset)

- [x] Task 3: Create `useFoundingContributors` hook (AC: 1, 2)
  - [x] 3.1 Create `apps/web/hooks/use-founding-contributors.ts` using TanStack Query
  - [x] 3.2 Query key: `['contributors', 'founding']`
  - [x] 3.3 Fetch from `GET /api/v1/contributors/founding` using `fetch()` directly (NOT `apiClient` — public endpoint, no auth headers needed)
  - [x] 3.4 Return `{ contributors, isLoading, error }`

- [x] Task 4: Create showcase SSR page (AC: 1, 2, 3)
  - [x] 4.1 Replace existing `apps/web/app/(public)/page.tsx` with showcase page — Server Component that fetches founding contributors server-side with `next: { revalidate: 60 }` for ISR
  - [x] 4.2 **CRITICAL Next.js 16**: Use `fetch()` directly in Server Component for server-side data fetching (not hooks — hooks are client-only)
  - [x] 4.3 Implement `generateMetadata()` for SEO: title "Edin — Where Expertise Becomes Publication", description (value proposition excerpt, 150-160 chars), Open Graph (og:title, og:description, og:type: website), Twitter Card (summary_large_image)
  - [x] 4.4 Compose page from HeroSection + FoundingCircle components, pass server-fetched data as props
  - [x] 4.5 Client Component wrapper for interactive elements (card hover effects, potential navigation)
  - [x] 4.6 Performance target: FCP < 1.5s on 4G (NFR-P1)

- [x] Task 5: Create route loading skeleton (AC: 2)
  - [x] 5.1 Create `apps/web/app/(public)/loading.tsx` with showcase page skeleton (hero placeholder + card grid placeholders)

- [x] Task 6: Backend unit tests (AC: 1, 2, 3)
  - [x] 6.1 Test `getFoundingContributors()`: returns only public fields (verify email, githubId, isActive, updatedAt excluded), returns only FOUNDING_CONTRIBUTOR role, excludes inactive contributors, returns empty array when none exist, ordered by createdAt ASC
  - [x] 6.2 Test `GET /api/v1/contributors/founding`: successful response with data array, empty data array, no auth required (no guard metadata)

- [x] Task 7: Frontend tests (AC: 1, 2, 3)
  - [x] 7.1 Test HeroSection renders heading "Where Expertise Becomes Publication" and value proposition text
  - [x] 7.2 Test FoundingCircle renders correct number of contributor cards
  - [x] 7.3 Test FoundingCircle empty state renders dignified message when array is empty
  - [x] 7.4 Test FoundingContributorCard renders avatar, name, domain badge with correct color, bio excerpt
  - [x] 7.5 Test domain badge colors: Technology #3A7D7E, Fintech #C49A3C, Impact #B06B6B, Governance #7B6B8A
  - [x] 7.6 Test card links to `/contributors/:id`
  - [x] 7.7 Test skeleton components render during loading

- [x] Task 8: Build verification
  - [x] 8.1 `pnpm build` passes all packages
  - [x] 8.2 `pnpm lint` passes (0 errors)
  - [x] 8.3 `pnpm test` passes all existing + new tests

## Dev Notes

### Architecture Compliance

- **Public endpoint**: `GET /api/v1/contributors/founding` on `ProfileController` — NO `JwtAuthGuard`, NO `AbilityGuard`. Public access by design.
- **Route ordering CRITICAL**: In `ProfileController`, method order MUST be: `@Get('me')` → `@Get('founding')` → `@Get(':id')`. Express matches in definition order; if `:id` comes first, "founding" matches as an ID parameter.
- **API envelope**: Response auto-wrapped by `ResponseWrapperInterceptor` into `{ data, meta }`. No manual wrapping needed. The `data` field will contain a `PublicContributorProfile[]` array.
- **Error handling**: Use `DomainException` with error codes from `@edin/shared`. Never throw raw `HttpException`.
- **Audit logging**: Showcase page views do NOT require audit logging (read-only, public). Audit logging only for mutations.
- **No new module needed**: The founding contributors endpoint belongs in the existing `ContributorModule` since it queries the same `Contributor` model and reuses the same `PublicContributorProfile` type.

### Data Exposure Rules — CRITICAL SECURITY

**Founding contributors response MUST include ONLY (same as PublicContributorProfile):**

- `id` (UUID)
- `name`
- `avatarUrl`
- `bio`
- `domain`
- `skillAreas`
- `role` (will always be FOUNDING_CONTRIBUTOR)
- `createdAt` (member since)

**NEVER expose in public response:**

- `email` (PII)
- `githubId` (internal identifier)
- `isActive` (operational data)
- `updatedAt` (timing info)

Use Prisma `select` to limit fields at query level — do NOT fetch all fields and filter in code. Reuse the same `select` object from `getPublicProfile()`.

### Frontend Architecture

- **Showcase page**: Server Component at `app/(public)/page.tsx` — replaces existing minimal home page
- **Next.js 16 BREAKING CHANGE**: `params` is a `Promise`. Not directly relevant here (no dynamic route params on `/`), but `generateMetadata()` follows the same async pattern.
- **Data fetching for showcase**: Use `fetch()` directly in Server Component for SSR. The API endpoint is public, no token needed. Use `next: { revalidate: 60 }` for Incremental Static Regeneration.
- **Client Components**: Only needed for interactive parts (card hover effects, Link navigation). Keep the page primarily Server Component for SSR performance.
- **Skeleton loaders**: Use skeleton components (NOT spinners) per UX spec. Show showcase structure as loading placeholder with pulsing opacity.
- **Reuse `PublicContributorProfile` type** from `@edin/shared` — same type used by public profile endpoint.
- **Reuse domain badge color mapping** from `PublicProfileView` component patterns (Technology: teal, Fintech: amber, Impact: terra rose, Governance: slate violet).

### Design System — Typography, Colors & Spacing

**Dual Typography System:**

- Hero heading: Serif (Libre Baskerville), `text.display` 2.5rem/40px, 700 weight, 1.2 line-height, `brand.primary` (#2D3B45)
- Section headings: Serif, `text.h1` 2rem/32px, 700 weight, 1.25 line-height
- Value proposition text: Sans-serif (Inter), `text.body-interface` 0.9375rem/15px, 400 weight, 1.5 line-height, `brand.secondary` (#6B7B8D)
- Card names: Sans-serif, `text.h3` 1.25rem/20px, 600 weight
- Card bio: Sans-serif, `text.body-interface` 0.9375rem/15px, 400 weight
- Badges: Sans-serif, `text.micro` 0.75rem/12px, 500 weight

**Color Palette (already defined in globals.css as CSS custom properties):**

| Token                 | Hex     | Usage                             |
| --------------------- | ------- | --------------------------------- |
| `brand.primary`       | #2D3B45 | Heading text, primary text        |
| `brand.secondary`     | #6B7B8D | Subtitle text, captions           |
| `brand.accent`        | #C4956A | CTA buttons, highlights           |
| `brand.accent-subtle` | #E8D5C0 | Hover states                      |
| `surface.base`        | #FAFAF7 | Page background (warm off-white)  |
| `surface.raised`      | #FFFFFF | Cards, elevated content           |
| `surface.sunken`      | #F2F0EB | Inset areas, hero gradient target |
| `domain.technology`   | #3A7D7E | Technology badge                  |
| `domain.fintech`      | #C49A3C | Fintech badge                     |
| `domain.impact`       | #B06B6B | Impact badge                      |
| `domain.governance`   | #7B6B8A | Governance badge                  |

**Spacing (8px base, defined in globals.css):**

- Hero vertical padding: `space.3xl` (64px)
- Between major sections: `space.2xl` (48px)
- Between content blocks: `space.lg` (24px) MINIMUM
- Card grid gap: `space.lg` (24px)
- Card internal padding: `space.md` (16px)
- Max content width: 1200px centered
- Value proposition max-width: 560px centered

**Card Styling:**

- Background: `surface.raised` (#FFFFFF)
- Border: `1px solid #E8E6E1`
- Border-radius: 12px
- Shadow: `0 1px 3px rgba(0,0,0,0.06)`
- Hover: `box-shadow: 0 4px 12px rgba(0,0,0,0.08)`, `translateY(-2px)`, 200ms ease-out

**Empty State:**

- Serif heading, `text.h2` 1.5rem/24px, 600 weight, `brand.primary`
- Description: `text.body-interface`, sans-serif, `brand.secondary`, max-width 400px
- NO cheerful illustrations, NO gamification language
- Text: "The Founding Circle is forming. Serious contributors are building something different."

### Responsive Design

- **Mobile (< 640px)**: Single column, hero heading fluid clamp (2rem → 2.5rem), padding `space.lg` (24px) horizontal, cards stack vertically, touch targets 44x44px minimum
- **Tablet (640-1023px)**: 2-column card grid, moderate padding
- **Desktop (1024px+)**: 3-column card grid, full `space.3xl` hero padding, hover effects active
- **Wide desktop (1440px+)**: Max-width containers prevent stretching, extra whitespace on sides

### Accessibility Requirements

- WCAG 2.1 AA compliance mandatory
- Semantic HTML: `<main>`, `<section>`, `<h1>` (hero), `<h2>` (founding circle), `<article>` or `<div>` for cards
- Avatar alt text: contributor name
- Domain badges: text + color (color never sole indicator)
- Focus indicators: 2px `brand.accent` outline with 2px offset on all interactive elements
- Links (cards → profile pages): descriptive accessible names
- `prefers-reduced-motion`: disable card hover transitions
- Color contrast verified: `brand.primary` on `surface.base` = 10.2:1, `brand.secondary` on `surface.base` = 4.7:1

### Project Structure Notes

**Files to CREATE:**

| File                                                                  | Purpose                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------- |
| `apps/web/components/features/showcase/hero-section.tsx`              | Hero section with mission heading and value proposition |
| `apps/web/components/features/showcase/founding-circle.tsx`           | Founding Circle grid with empty state                   |
| `apps/web/components/features/showcase/founding-contributor-card.tsx` | Individual founding contributor card                    |
| `apps/web/components/features/showcase/showcase-skeleton.tsx`         | Skeleton loader for showcase page                       |
| `apps/web/hooks/use-founding-contributors.ts`                         | TanStack Query hook for founding contributors           |
| `apps/web/app/(public)/loading.tsx`                                   | Route-level loading skeleton                            |
| `apps/web/components/features/showcase/showcase.test.tsx`             | Frontend component tests                                |

**Files to MODIFY:**

| File                                                           | Change                                                               |
| -------------------------------------------------------------- | -------------------------------------------------------------------- |
| `apps/web/app/(public)/page.tsx`                               | Replace with showcase page (Server Component with SSR data fetching) |
| `apps/api/src/modules/contributor/profile.controller.ts`       | Add `GET founding` endpoint AFTER `me` and BEFORE `:id`              |
| `apps/api/src/modules/contributor/contributor.service.ts`      | Add `getFoundingContributors()` method                               |
| `apps/api/src/modules/contributor/contributor.service.spec.ts` | Add founding contributors tests                                      |
| `apps/api/src/modules/contributor/profile.controller.spec.ts`  | Add founding endpoint tests                                          |

**Files to NOT touch:**

- `apps/api/prisma/schema.prisma` — No schema changes needed (role enum and contributor model already support FOUNDING_CONTRIBUTOR)
- `apps/api/src/modules/auth/` — No auth changes needed
- `packages/shared/src/types/contributor.types.ts` — `PublicContributorProfile` type already exists and is reused as-is
- `packages/shared/src/index.ts` — No new exports needed
- `apps/web/hooks/use-public-profile.ts` — Existing single-profile hook unchanged
- `apps/web/components/features/contributor-profile/` — Existing profile components unchanged (but reference their patterns)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2, Story 2.3] — User story, acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#API Patterns] — Endpoint design, response envelope, error handling, route ordering
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend] — Route groups, SSR patterns, component structure, App Router
- [Source: _bmad-output/planning-artifacts/architecture.md#Security] — Data exposure rules, PII separation, rate limiting
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#PublicPortal] — Typography, colors, spacing, layout, hero design, card patterns, responsive breakpoints, accessibility
- [Source: _bmad-output/planning-artifacts/prd.md#FR43] — Public project showcase page requirement
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-P1] — FCP < 1.5s performance target
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-A1] — WCAG 2.1 AA accessibility requirement
- [Source: _bmad-output/implementation-artifacts/2-2-public-and-private-contributor-profile-views.md] — Previous story patterns, learnings, domain badge colors, SSR patterns

### Previous Story (2.2) Critical Learnings

1. **NestJS route ordering**: `ProfileController` uses literal paths BEFORE parameterized paths. `@Get('me')` → `@Get('founding')` → `@Get(':id')` order is mandatory.
2. **Prisma 7**: Import from `../../generated/prisma/client/`, NOT `@prisma/client`. PrismaClient requires config object with PrismaPg adapter.
3. **Turbopack compatibility**: `@edin/shared` uses `exports` field in package.json pointing to `dist/` output. `next.config.ts` has `transpilePackages: ['@edin/shared']`.
4. **TanStack Query v5**: Use `useQuery` with `enabled` option for conditional queries.
5. **Response envelope**: All responses auto-wrapped by `ResponseWrapperInterceptor`. Controllers return raw data.
6. **Public endpoint pattern**: Use `fetch()` directly (NOT `apiClient`) for public data fetching — `apiClient` adds auth headers.
7. **SSR data fetching**: Server Components use `fetch()` with `next: { revalidate: 60 }` for ISR. Pass data as props to Client Components.
8. **generateMetadata()**: Fetch requests inside are automatically memoized across the route by Next.js 16.
9. **Domain badge colors**: Technology #3A7D7E, Fintech #C49A3C, Impact #B06B6B, Governance #7B6B8A — all with equal visual weight.
10. **Test infrastructure**: Frontend tests use Vitest + React Testing Library with jsdom environment. Config at `apps/web/vitest.config.ts`, setup at `apps/web/vitest.setup.ts`.
11. **Next.js Image component**: Use `next/image` for avatars. `images.remotePatterns` for `avatars.githubusercontent.com` already configured in `next.config.ts`.
12. **Code review fixes from 2.2**: Domain badge text colors needed WCAG contrast adjustment — ensure text on domain-colored badges meets 4.5:1 ratio.

### Git Intelligence (Recent Commits)

Most recent commit `90f24aa` implemented Stories 2.1 and 2.2 together, establishing:

- Public profile SSR pattern at `app/(public)/contributors/[id]/page.tsx`
- `PublicContributorProfile` shared type
- `getPublicProfile()` service method with Prisma `select`
- `ProfileController` with public `GET :id` endpoint
- Frontend component testing infrastructure (Vitest + RTL)
- Domain badge color system
- Skeleton loading patterns

### Latest Technical Notes (March 2026)

- **Next.js 16**: `params` is fully async (Promise). For the showcase page at `/`, no dynamic params needed, but `generateMetadata()` follows async pattern.
- **Next.js 16**: Turbopack is default bundler.
- **Next.js 16**: `generateMetadata()` fetch requests are automatically memoized.
- **Tailwind CSS 4**: Uses `@theme` directive in CSS for custom properties. Design tokens already configured in `globals.css`.
- **TanStack Query v5**: `useSuspenseQuery` is stable. For the showcase page, the hook is only needed in Client Components; Server Components use direct `fetch()`.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered during implementation.

### Completion Notes List

- Implemented `getFoundingContributors()` in ContributorService with shared `publicProfileSelect` for DRY field selection. Refactored existing `getPublicProfile()` to reuse the same select.
- Added `GET /api/v1/contributors/founding` public endpoint on ProfileController, correctly placed between `GET me` and `GET :id` for Express route ordering.
- Created HeroSection component with serif heading, value proposition, and gradient background per UX spec.
- Created FoundingCircle component with responsive 3/2/1-column grid and dignified empty state message.
- Created FoundingContributorCard as client component with avatar, name, domain badge (color-coded), bio excerpt, link to profile page, and hover lift animation with `prefers-reduced-motion` support.
- Created skeleton components (HeroSkeleton, FoundingCircleSkeleton, ShowcaseSkeleton) using pulsing opacity animation.
- Created `useFoundingContributors` TanStack Query hook using `fetch()` directly (public endpoint, no auth).
- Replaced minimal home page with SSR showcase page (Server Component) using `fetch()` with ISR `revalidate: 60`.
- Implemented async `generateMetadata()` with Open Graph and Twitter Card tags.
- Added a `ShowcaseContent` client wrapper for interactive showcase rendering while preserving server-side data fetching.
- Updated avatar fallback to use domain-colored backgrounds with accessible text contrast.
- Added server-side error logging for founding contributors fetch failures on the public showcase page.
- Verified performance target with Playwright 4G emulation: FCP runs [1004ms, 628ms, 620ms, 616ms, 628ms], avg 699.2ms (<1.5s).
- Created route-level loading.tsx with ShowcaseSkeleton.
- 8 new backend tests (5 service + 3 controller) — all passing.
- 17 new frontend tests (hero, founding circle, contributor card, skeletons) — all passing.
- Build, lint, and full test suite pass (0 errors, 0 regressions).

### Change Log

- 2026-03-03: Implemented Story 2.3 — Public Project Showcase Page
- 2026-03-03: Code review fixes applied — `generateMetadata()`, client showcase wrapper, domain-colored avatar fallback, and story/task alignment updates

### File List

**New files:**

- `apps/web/components/features/showcase/hero-section.tsx`
- `apps/web/components/features/showcase/founding-circle.tsx`
- `apps/web/components/features/showcase/founding-contributor-card.tsx`
- `apps/web/components/features/showcase/showcase-skeleton.tsx`
- `apps/web/components/features/showcase/showcase-content.tsx`
- `apps/web/components/features/showcase/showcase.test.tsx`
- `apps/web/hooks/use-founding-contributors.ts`
- `apps/web/app/(public)/loading.tsx`

**Modified files:**

- `apps/api/src/modules/contributor/contributor.service.ts` — Added `getFoundingContributors()` method and shared `publicProfileSelect`
- `apps/api/src/modules/contributor/profile.controller.ts` — Added `GET founding` endpoint
- `apps/api/src/modules/contributor/contributor.service.spec.ts` — Added founding contributors tests
- `apps/api/src/modules/contributor/profile.controller.spec.ts` — Added founding endpoint tests
- `apps/web/app/(public)/page.tsx` — Replaced with showcase SSR page
- `apps/web/hooks/use-founding-contributors.ts` — Added SSR-hydrated initial data support
- `apps/web/components/features/showcase/founding-contributor-card.tsx` — Updated fallback avatar to domain-colored background
- `apps/web/components/features/showcase/showcase.test.tsx` — Added fallback avatar domain color assertion
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Story status tracking updated

### Senior Developer Review (AI)

- **Date**: 2026-03-03
- **Reviewer**: Fabrice
- **Outcome**: Changes Requested
- **Findings fixed**: Implemented `generateMetadata()`, added client wrapper for interactivity, aligned avatar fallback with UX domain-color requirement, improved fetch error observability, and updated story documentation/file list to match git reality.
- **Open follow-up**: None.
