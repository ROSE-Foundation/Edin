# Story 2.4: Domain Manifestos & Contributor Roster

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor,
I want to view domain manifestos and browse the contributor roster,
so that I can understand each domain pillar and evaluate the community's caliber.

## Acceptance Criteria

1. **Given** I am an unauthenticated visitor **When** I navigate to `/about` **Then** I see four domain manifesto sections: Technology, Fintech & Financial Engineering, Impact & Sustainability, and Governance **And** each manifesto section has its domain accent color as a subtle visual element (border or background tint) **And** all four sections have identical layout structure and visual weight (no domain dominates) **And** the page is server-side rendered for SEO

2. **Given** I am an unauthenticated visitor **When** I navigate to `/contributors` **Then** I see a browsable contributor roster showing: name, avatar, domain, role designation, and a brief bio excerpt for each contributor **And** I can filter contributors by domain (Technology, Fintech, Impact, Governance) **And** I can search contributors by name **And** filtering and search return results within <1s (NFR-P7) **And** the contributor list uses cursor-based pagination (default 20, max 100)

3. **Given** the contributor roster is displayed **When** I click on a contributor card **Then** I am navigated to their public profile page at `/contributors/:id`

## Tasks / Subtasks

- [x] Task 1: Create contributor roster API endpoint with filtering, search, and pagination (AC: 2, 3)
  - [x] 1.1 Add `getContributorRoster()` method to `ContributorService` querying contributors where `isActive = true`, using Prisma `select` with the shared `publicProfileSelect` (same fields as `getFoundingContributors()`), accepting optional `domain` filter (enum), `search` string (name ILIKE), `cursor` (opaque token), and `limit` (default 20, max 100)
  - [x] 1.2 Implement cursor-based pagination: order by `createdAt ASC, id ASC`, use composite cursor `(createdAt, id)` for stable ordering. Return `{ items: PublicContributorProfile[], cursor: string | null, hasMore: boolean, total: number }`
  - [x] 1.3 Implement domain filtering: `where: { domain: domainFilter }` when domain query param provided. Validate domain against `ContributorDomain` enum
  - [x] 1.4 Implement name search: `where: { name: { contains: searchTerm, mode: 'insensitive' } }` using Prisma `mode: 'insensitive'` for case-insensitive search
  - [x] 1.5 Add `@Get()` root endpoint on `ProfileController` — place BEFORE `@Get('me')` to match root path. NO `JwtAuthGuard`, NO `AbilityGuard` — public access. Accept `@Query()` params: `domain?: string`, `search?: string`, `cursor?: string`, `limit?: number`
  - [x] 1.6 Create Zod validation schema in `@edin/shared` for roster query params: `rosterQuerySchema` with optional `domain` (enum), `search` (string, max 100 chars), `cursor` (opaque string token), `limit` (number, min 1, max 100, default 20)
  - [x] 1.7 Return paginated response — `ResponseWrapperInterceptor` auto-wraps into `{ data, meta }`. Set `meta.pagination` with `{ cursor, hasMore, total }`
  - [x] 1.8 Unit tests: returns paginated results, filters by domain correctly, searches by name case-insensitively, returns empty results for no matches, respects limit parameter, cursor pagination works across pages, returns only public fields (no email, githubId), validates query params

- [x] Task 2: Create domain manifesto data and types (AC: 1)
  - [x] 2.1 Create `packages/shared/src/constants/manifestos.ts` with manifesto content for each domain: `DOMAIN_MANIFESTOS` — an array of `{ domain, title, subtitle, content, highlights }` for Technology, Fintech & Financial Engineering, Impact & Sustainability, and Governance. Content describes each domain pillar's mission, what contributors do, and why it matters
  - [x] 2.2 Create `DomainManifesto` type in `packages/shared/src/types/manifesto.types.ts`: `{ domain: ContributorDomain, title: string, subtitle: string, content: string, highlights: string[] }`
  - [x] 2.3 Export from `packages/shared/src/index.ts`

- [x] Task 3: Create domain manifesto page components (AC: 1)
  - [x] 3.1 Create `apps/web/components/features/about/manifesto-section.tsx` — a reusable section component that receives a `DomainManifesto` object. Renders: section heading (serif, `text.h2`), subtitle (sans-serif, `text.body-interface`, `brand.secondary`), content paragraph(s) (serif body text for editorial feel), and a highlights list. Applies domain accent color as left border (4px) and subtle background tint (5% opacity). All four instances MUST have identical layout structure
  - [x] 3.2 Create `apps/web/components/features/about/about-hero.tsx` — hero section for the About page: heading "About Edin" or "Our Domains" (serif, `text.display`), brief intro paragraph explaining Edin's four-pillar structure. Styled like the showcase HeroSection pattern (gradient background, centered, generous padding)
  - [x] 3.3 Create `apps/web/components/features/about/manifesto-grid.tsx` — container component that renders all four `ManifestoSection` components in a single-column layout with `space.2xl` (48px) spacing between sections. Ensures equal visual weight
  - [x] 3.4 Create `apps/web/components/features/about/about-skeleton.tsx` — skeleton loader matching about page structure: hero placeholder + 4 manifesto section placeholders with pulsing opacity
  - [x] 3.5 Accessibility: semantic headings (h1 page title, h2 per domain), `aria-label` on domain sections, WCAG 2.1 AA color contrast on domain-colored elements, `prefers-reduced-motion` respected

- [x] Task 4: Create `/about` SSR page (AC: 1)
  - [x] 4.1 Create `apps/web/app/(public)/about/page.tsx` — Server Component. Import manifesto data from `@edin/shared`. No API call needed (static content). Compose from AboutHero + ManifestoGrid components
  - [x] 4.2 Implement `generateMetadata()` for SEO: title "About Edin — Four Pillars of Contribution", description (overview of domains, 150-160 chars), Open Graph tags, Twitter Card
  - [x] 4.3 Create `apps/web/app/(public)/about/loading.tsx` with AboutSkeleton

- [x] Task 5: Create contributor roster page components (AC: 2, 3)
  - [x] 5.1 Create `apps/web/components/features/roster/roster-filters.tsx` — Client Component with domain filter buttons (All + 4 domains, pill-shaped, domain-colored when active, neutral when inactive) and a search input (debounced 300ms, magnifying glass icon, placeholder "Search contributors by name..."). Updates URL search params for shareable filter state
  - [x] 5.2 Create `apps/web/components/features/roster/contributor-roster-card.tsx` — card displaying: avatar (64px circular, domain-colored fallback with initial), name (`text.h3`, sans-serif, 600 weight), domain badge (pill with domain accent color), role designation badge (subtle, secondary style), bio excerpt (max 2 lines, truncated with ellipsis). Card is a Link to `/contributors/:id`. Card styling: same as founding-contributor-card pattern (`surface.raised` bg, border, 12px radius, shadow, hover lift). Reuse `DOMAIN_COLORS` mapping from showcase components
  - [x] 5.3 Create `apps/web/components/features/roster/contributor-roster-grid.tsx` — responsive grid (3-col desktop, 2-col tablet, 1-col mobile) rendering ContributorRosterCard for each contributor. Empty state: "No contributors found matching your criteria." for filtered empty, "The community is growing. Check back soon." for global empty
  - [x] 5.4 Create `apps/web/components/features/roster/roster-pagination.tsx` — "Load more" button at bottom of grid (NOT numbered pages — cursor pagination). Shows count "Showing X of Y contributors". Disabled/hidden when `hasMore` is false. Loading state on the button while fetching next page
  - [x] 5.5 Create `apps/web/components/features/roster/roster-content.tsx` — Client Component wrapper that orchestrates filters, grid, and pagination. Manages filter/search/pagination state via URL search params and TanStack Query
  - [x] 5.6 Create `apps/web/components/features/roster/roster-skeleton.tsx` — skeleton loader: filter bar placeholder + 6 card placeholders in grid
  - [x] 5.7 Accessibility: search input with label and aria-describedby, filter buttons as toggle button group with aria-pressed, focus management after filter change, keyboard navigable cards, "Load more" button with aria-label including count

- [x] Task 6: Create `useContributorRoster` hook (AC: 2, 3)
  - [x] 6.1 Create `apps/web/hooks/use-contributor-roster.ts` using TanStack Query `useInfiniteQuery`
  - [x] 6.2 Query key: `['contributors', 'roster', { domain, search }]` — re-fetches when filters change
  - [x] 6.3 Fetch from `GET /api/v1/contributors?domain=...&search=...&cursor=...&limit=20` using `fetch()` directly (public endpoint, no auth)
  - [x] 6.4 `getNextPageParam`: return `lastPage.meta.pagination.cursor` if `hasMore`, else `undefined`
  - [x] 6.5 Return `{ contributors: allPages.flatMap(p => p.data), isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, total, error }`
  - [x] 6.6 Debounce search term: accept raw search string, debounce 300ms before updating query key (use `useDeferredValue` or custom debounce hook)

- [x] Task 7: Create `/contributors` SSR page (AC: 2, 3)
  - [x] 7.1 Create `apps/web/app/(public)/contributors/page.tsx` — Server Component that fetches initial page of contributors server-side with `fetch()` and `next: { revalidate: 60 }` for ISR. Pass initial data to RosterContent client component
  - [x] 7.2 Implement `generateMetadata()` for SEO: title "Contributors — Edin Community", description (contributor community overview, 150-160 chars), Open Graph tags, Twitter Card
  - [x] 7.3 Create `apps/web/app/(public)/contributors/loading.tsx` with RosterSkeleton
  - [x] 7.4 **IMPORTANT**: The existing `apps/web/app/(public)/contributors/[id]/page.tsx` (public profile) must remain untouched. The new `page.tsx` at `/contributors` is the roster index, NOT a conflict — Next.js App Router handles `page.tsx` (index) and `[id]/page.tsx` (dynamic) correctly

- [x] Task 8: Backend unit tests (AC: 1, 2, 3)
  - [x] 8.1 Test `getContributorRoster()`: returns only public fields (verify email, githubId, isActive, updatedAt excluded), filters by domain correctly, searches by name case-insensitively, returns paginated results with correct cursor, respects limit parameter, returns empty results for no matches, excludes inactive contributors, returns total count
  - [x] 8.2 Test `GET /api/v1/contributors`: successful response with paginated data, empty results, domain filter, search query, pagination with cursor, no auth required, invalid domain param returns 400, limit > 100 returns 400

- [x] Task 9: Frontend tests (AC: 1, 2, 3)
  - [x] 9.1 Test ManifestoSection renders domain title, subtitle, content, highlights, and domain accent border color
  - [x] 9.2 Test ManifestoGrid renders all four domain sections with equal structure
  - [x] 9.3 Test AboutHero renders page heading and intro text
  - [x] 9.4 Test RosterFilters renders All + 4 domain filter buttons, search input, and calls onFilterChange/onSearchChange
  - [x] 9.5 Test ContributorRosterCard renders avatar, name, domain badge with correct color, role badge, bio excerpt, and links to `/contributors/:id`
  - [x] 9.6 Test ContributorRosterGrid renders correct number of cards and shows empty state messages
  - [x] 9.7 Test RosterPagination shows count and "Load more" button, hides when hasMore is false
  - [x] 9.8 Test domain badge colors: Technology #3A7D7E, Fintech #C49A3C, Impact #B06B6B, Governance #7B6B8A
  - [x] 9.9 Test skeleton components render during loading

- [x] Task 10: Build verification
  - [x] 10.1 `pnpm build` passes all packages
  - [x] 10.2 `pnpm lint` passes (0 errors)
  - [x] 10.3 `pnpm test` passes all existing + new tests

## Dev Notes

### Architecture Compliance

- **Public roster endpoint**: `GET /api/v1/contributors` on `ProfileController` — NO `JwtAuthGuard`, NO `AbilityGuard`. Public access by design. This is the root path of the controller (`@Get()`).
- **Route ordering CRITICAL**: In `ProfileController`, method order MUST be: `@Get()` (roster root) → `@Get('me')` → `@Get('founding')` → `@Get(':id')`. Express matches routes in definition order. The root GET with no path must come first so it doesn't conflict. Alternatively, if the root conflicts, use a dedicated `@Get('roster')` path or a separate `ShowcaseController`.
- **API envelope**: Response auto-wrapped by `ResponseWrapperInterceptor` into `{ data, meta }`. For paginated responses, set `meta.pagination` with `{ cursor, hasMore, total }`. The interceptor already supports this — check existing implementation.
- **Error handling**: Use `DomainException` with error codes from `@edin/shared`. Never throw raw `HttpException`.
- **Validation**: Use Zod schemas from `@edin/shared` for query param validation. Apply via NestJS validation pipe.
- **No new NestJS module needed**: Both the roster endpoint and manifesto data belong to existing modules. The roster endpoint goes on `ProfileController` (or a new `RosterController` in the same `ContributorModule`). Manifesto data is static frontend content.
- **Domain manifesto content is STATIC**: Manifesto descriptions are not user-editable content. They describe what each domain pillar is about. Store as constants in `@edin/shared` for SSR on the frontend. No API endpoint needed — import directly in the Server Component.

### Data Exposure Rules — CRITICAL SECURITY

**Contributor roster response MUST include ONLY (same as PublicContributorProfile):**

- `id` (UUID)
- `name`
- `avatarUrl`
- `bio`
- `domain`
- `skillAreas`
- `role`
- `createdAt` (member since)

**NEVER expose in public response:**

- `email` (PII)
- `githubId` (internal identifier)
- `isActive` (operational data — filter server-side, never send to client)
- `updatedAt` (timing info)

Use the existing `publicProfileSelect` from `ContributorService` — same select object used by `getFoundingContributors()` and `getPublicProfile()`.

### Frontend Architecture

- **About page** (`/about`): Pure Server Component — no client interactivity needed. Manifesto data imported as constants. SSR for SEO. No API call.
- **Contributors page** (`/contributors`): Server Component for initial SSR data + Client Component wrapper (`RosterContent`) for filters, search, and infinite scroll pagination.
- **Next.js 16 patterns**: `params` and `searchParams` are `Promise` in page components. For `/contributors` page, `searchParams` can carry initial `domain` and `search` values for deep-linkable filter state.
- **Data fetching for roster SSR**: Use `fetch()` directly in Server Component for initial page. The API endpoint is public, no token needed. Use `next: { revalidate: 60 }` for ISR.
- **Client-side pagination**: Use TanStack Query `useInfiniteQuery` for cursor-based "Load more" pattern. NOT numbered page buttons.
- **URL-driven filter state**: Store `domain` and `search` in URL search params (`?domain=Technology&search=jane`) for shareable/bookmarkable filter states. Use `useSearchParams()` from Next.js.
- **Search debouncing**: Debounce search input 300ms before triggering API call. Use `useDeferredValue` or a custom debounce hook.
- **Skeleton loaders**: Use skeleton components (NOT spinners) per UX spec for both pages.
- **Reuse `PublicContributorProfile` type** from `@edin/shared`.
- **Reuse `DOMAIN_COLORS` mapping** from showcase components. Consider extracting to a shared utility if not already: `apps/web/lib/domain-colors.ts`.

### Design System — Typography, Colors & Spacing

**Domain Manifesto Section Design:**

- Each section: left border 4px solid domain accent color + subtle background tint (domain color at 5% opacity)
- Section heading: Serif (Libre Baskerville), `text.h2` 1.5rem/24px, 700 weight, `brand.primary`
- Section subtitle: Sans-serif (Inter), `text.body-interface` 15px, 400 weight, `brand.secondary`
- Section content: Serif body text for editorial quality feel, `text.body-editorial` or `text.body-interface`, 1.6 line-height
- Highlights: Bullet list with domain accent color markers
- Section padding: `space.lg` (24px) internal padding
- Between sections: `space.2xl` (48px) vertical spacing
- All four sections MUST have identical layout structure — NO domain-specific layout differences
- Max content width: 800px centered (narrower than roster for readability)

**Contributor Roster Card Design:**

- Same card pattern as `founding-contributor-card.tsx` from Story 2-3
- Background: `surface.raised` (#FFFFFF)
- Border: `1px solid #E8E6E1`
- Border-radius: 12px
- Shadow: `0 1px 3px rgba(0,0,0,0.06)`
- Hover: `box-shadow: 0 4px 12px rgba(0,0,0,0.08)`, `translateY(-2px)`, 200ms ease-out
- Avatar: 64px circular (slightly smaller than founding cards' 80px)
- Name: Sans-serif, `text.h3` 1.25rem/20px, 600 weight
- Domain badge: Pill shape with domain accent color bg, appropriate text color for contrast
- Role badge: Secondary style, subtle background
- Bio: Sans-serif, `text.body-interface` 15px, max 2 lines with text-overflow ellipsis

**Filter UI Design:**

- Filter buttons: Pill-shaped, domain-colored background when active, neutral `surface.sunken` when inactive
- "All" button: `brand.accent` when active
- Search input: rounded border, `surface.raised` bg, `brand.secondary` placeholder text, magnifying glass icon
- Filters row: Horizontal scroll on mobile if needed, gap `space.sm` (8px)

**Color Palette (already defined in globals.css):**

| Token               | Hex     | Usage                              |
| ------------------- | ------- | ---------------------------------- |
| `domain.technology` | #3A7D7E | Technology manifesto accent, badge |
| `domain.fintech`    | #C49A3C | Fintech manifesto accent, badge    |
| `domain.impact`     | #B06B6B | Impact manifesto accent, badge     |
| `domain.governance` | #7B6B8A | Governance manifesto accent, badge |

**Responsive Design:**

- **Mobile (< 640px)**: Single column cards, filter buttons horizontal scroll, search input full width, manifesto sections stack with reduced padding
- **Tablet (640-1023px)**: 2-column roster grid, filter bar inline
- **Desktop (1024px+)**: 3-column roster grid, full spacing, hover effects active
- Touch targets: 44x44px minimum on all interactive elements

### Cursor-Based Pagination Implementation

**Backend (Prisma):**

```
Strategy: createdAt ASC + id ASC for stable ordering
Cursor: Base64-encoded JSON { createdAt, id }
Query: WHERE (createdAt > cursor.createdAt) OR (createdAt = cursor.createdAt AND id > cursor.id)
Response: { items[], cursor: string | null, hasMore: boolean, total: number }
```

**Implementation notes:**

- Use Prisma's built-in cursor pagination: `cursor: { id: cursorId }, skip: 1` (skip the cursor item itself)
- Alternatively, use `where: { createdAt: { gte: cursorDate } }` with manual cursor parsing for more control
- The `total` count requires a separate `count()` query — consider caching this value for performance
- Encode cursor as Base64 string for URL-safe transmission
- Decode and validate cursor on the backend with Zod

**Frontend (TanStack Query useInfiniteQuery):**

```
queryFn: fetches page with cursor param
getNextPageParam: extracts cursor from last page's meta.pagination
data: pages array, flatten to get all contributors
UI: "Load more" button calls fetchNextPage()
```

### Previous Story (2-3) Critical Learnings — MUST FOLLOW

1. **NestJS route ordering**: `ProfileController` uses literal paths BEFORE parameterized paths. Adding the roster root `@Get()` requires careful placement. Test route matching manually.
2. **Prisma 7**: Import from `../../generated/prisma/client/`, NOT `@prisma/client`. PrismaClient requires config object with PrismaPg adapter.
3. **Turbopack compatibility**: `@edin/shared` uses `exports` field in package.json pointing to `dist/` output. `next.config.ts` has `transpilePackages: ['@edin/shared']`. After adding new exports (manifesto constants, roster schema), rebuild the shared package.
4. **TanStack Query v5**: Use `useInfiniteQuery` for paginated data. `enabled` option for conditional queries. `useSuspenseInfiniteQuery` is also available if using Suspense boundaries.
5. **Response envelope**: All responses auto-wrapped by `ResponseWrapperInterceptor`. Controllers return raw data. For paginated responses, the interceptor needs to handle the pagination meta — verify how it currently handles this or if manual meta setting is needed.
6. **Public endpoint pattern**: Use `fetch()` directly (NOT `apiClient`) for public data fetching — `apiClient` adds auth headers.
7. **SSR data fetching**: Server Components use `fetch()` with `next: { revalidate: 60 }` for ISR. Pass data as props to Client Components.
8. **generateMetadata()**: Fetch requests inside are automatically memoized by Next.js 16.
9. **Domain badge colors**: Technology #3A7D7E, Fintech #C49A3C, Impact #B06B6B, Governance #7B6B8A — reuse DOMAIN_COLORS from showcase.
10. **Test infrastructure**: Frontend tests use Vitest + React Testing Library with jsdom environment. Config at `apps/web/vitest.config.ts`, setup at `apps/web/vitest.setup.ts`.
11. **Next.js Image component**: Use `next/image` for avatars. `images.remotePatterns` for `avatars.githubusercontent.com` already configured in `next.config.ts`.
12. **Code review fix from 2-2**: Domain badge text colors need WCAG contrast — ensure white text on Technology (#3A7D7E) and Governance (#7B6B8A), dark text on Fintech (#C49A3C) and Impact (#B06B6B).

### Git Intelligence — Recent Patterns

Most recent commits established:

| Commit                       | Pattern                                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `6f150c0` (Story 2-3)        | SSR showcase page, Server Component + Client wrapper, `generateMetadata()`, founding contributors endpoint, skeleton loaders, domain badge color system       |
| `90f24aa` (Stories 2-1, 2-2) | Contributor profile CRUD, public profile SSR, `PublicContributorProfile` type, `publicProfileSelect`, Prisma select pattern, ProfileController route ordering |
| `03e5e35` (Story 1.5)        | Founding contributor designation, role-based features                                                                                                         |
| `20d1176` (Story 1.4)        | CASL authorization, AbilityGuard, role checks                                                                                                                 |
| `da2e772` (Story 1.3)        | GitHub OAuth, JWT sessions, auth flow                                                                                                                         |

**Key code patterns to follow:**

- Server Component → fetch() with revalidate → pass props to Client Component
- ContributorService methods use shared `publicProfileSelect`
- ProfileController: public endpoints have NO guards, route ordering is literal-first
- Components in `apps/web/components/features/{feature-name}/`
- Hooks in `apps/web/hooks/`
- Tests co-located with components and services

### Project Structure Notes

**Files to CREATE:**

| File                                                              | Purpose                                |
| ----------------------------------------------------------------- | -------------------------------------- |
| `packages/shared/src/constants/manifestos.ts`                     | Static domain manifesto content        |
| `packages/shared/src/types/manifesto.types.ts`                    | DomainManifesto type definition        |
| `packages/shared/src/schemas/roster.schema.ts`                    | Zod schema for roster query params     |
| `apps/web/app/(public)/about/page.tsx`                            | About/manifesto SSR page               |
| `apps/web/app/(public)/about/loading.tsx`                         | About page loading skeleton            |
| `apps/web/app/(public)/contributors/page.tsx`                     | Contributor roster SSR page            |
| `apps/web/app/(public)/contributors/loading.tsx`                  | Roster page loading skeleton           |
| `apps/web/components/features/about/manifesto-section.tsx`        | Single domain manifesto section        |
| `apps/web/components/features/about/about-hero.tsx`               | About page hero section                |
| `apps/web/components/features/about/manifesto-grid.tsx`           | All four manifesto sections container  |
| `apps/web/components/features/about/about-skeleton.tsx`           | About page skeleton loader             |
| `apps/web/components/features/about/about.test.tsx`               | About page component tests             |
| `apps/web/components/features/roster/roster-filters.tsx`          | Domain filter buttons + search input   |
| `apps/web/components/features/roster/contributor-roster-card.tsx` | Individual contributor card            |
| `apps/web/components/features/roster/contributor-roster-grid.tsx` | Responsive card grid with empty states |
| `apps/web/components/features/roster/roster-pagination.tsx`       | "Load more" button with count          |
| `apps/web/components/features/roster/roster-content.tsx`          | Client wrapper orchestrating roster UI |
| `apps/web/components/features/roster/roster-skeleton.tsx`         | Roster page skeleton loader            |
| `apps/web/components/features/roster/roster.test.tsx`             | Roster component tests                 |
| `apps/web/hooks/use-contributor-roster.ts`                        | TanStack Query useInfiniteQuery hook   |

**Files to MODIFY:**

| File                                                           | Change                                                                 |
| -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `apps/api/src/modules/contributor/contributor.service.ts`      | Add `getContributorRoster()` method with filtering, search, pagination |
| `apps/api/src/modules/contributor/profile.controller.ts`       | Add `GET` root endpoint for roster (before `me` and other routes)      |
| `apps/api/src/modules/contributor/contributor.service.spec.ts` | Add roster tests                                                       |
| `apps/api/src/modules/contributor/profile.controller.spec.ts`  | Add roster endpoint tests                                              |
| `packages/shared/src/index.ts`                                 | Export manifesto constants/types and roster schema                     |

**Files to NOT touch:**

- `apps/api/prisma/schema.prisma` — No schema changes needed (Contributor model already has domain, role, bio, etc.)
- `apps/api/src/modules/auth/` — No auth changes needed
- `apps/web/app/(public)/contributors/[id]/page.tsx` — Existing public profile page UNCHANGED
- `apps/web/components/features/contributor-profile/` — Existing profile components UNCHANGED
- `apps/web/components/features/showcase/` — Existing showcase components UNCHANGED (but reference their patterns)
- `apps/web/hooks/use-founding-contributors.ts` — Existing hook UNCHANGED
- `apps/web/hooks/use-public-profile.ts` — Existing hook UNCHANGED

**Shared utility to EXTRACT (if not already):**

- `DOMAIN_COLORS` mapping is currently defined in `founding-contributor-card.tsx`. If not already shared, extract to `apps/web/lib/domain-colors.ts` and import from both the showcase and roster components. Do NOT duplicate the mapping.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2, Story 2.4] — User story, acceptance criteria, BDD scenarios
- [Source: _bmad-output/planning-artifacts/architecture.md#API Patterns] — Endpoint design, response envelope, cursor-based pagination, API boundaries
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend] — Route groups, SSR patterns, component structure, App Router, TanStack Query
- [Source: _bmad-output/planning-artifacts/architecture.md#Database] — Contributor model, core schema, Prisma patterns
- [Source: _bmad-output/planning-artifacts/architecture.md#Security] — Data exposure rules, PII separation, public endpoint access
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#DomainIdentityPattern] — Domain accent colors, equal visual weight, editorial design DNA
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey6-Henrik] — Investor due diligence flow, public portal requirements
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#ExperiencePrinciples] — Equal by design, publication quality, the garden grows
- [Source: _bmad-output/planning-artifacts/prd.md#FR44] — Domain manifestos requirement
- [Source: _bmad-output/planning-artifacts/prd.md#FR46] — Public contributor roster requirement
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-P7] — Filtering and search <1s performance target
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-A1] — WCAG 2.1 AA accessibility requirement
- [Source: _bmad-output/implementation-artifacts/2-3-public-project-showcase-page.md] — Previous story patterns, SSR patterns, domain badge colors, skeleton loaders, component structure, test patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed TypeScript type error in `useInfiniteQuery` pageParam typing — `initialPageParam` needed explicit `string | undefined` type annotation and `queryFn` needed explicit return type `Promise<RosterApiResponse>` for proper TanStack Query v5 generic inference
- Fixed Prettier formatting issues in API files via `eslint --fix`
- Fixed code review findings: implemented true composite cursor pagination token (Base64 JSON `{ createdAt, id }`) and removed raw search text from API logs
- Fixed code review findings: added explicit search URL debounce behavior and focus management after roster filter changes

### Completion Notes List

- **Task 1**: Implemented `getContributorRoster()` in ContributorService with stable composite cursor pagination (opaque Base64 token carrying `createdAt` + `id`), domain filtering, and case-insensitive name search. Added `@Get()` root endpoint on ProfileController (before `@Get('me')` for route ordering). Created `rosterQuerySchema` Zod validation in `@edin/shared`. Returns paginated response via `createSuccessResponse` with pagination meta. Full test coverage (service + controller tests).
- **Task 2**: Created static domain manifesto data (`DOMAIN_MANIFESTOS`) and `DomainManifesto` type in `@edin/shared`. Exported from package index.
- **Task 3**: Built 4 about page components: `ManifestoSection` (domain accent border + 5% tint background via `color-mix`), `AboutHero` (gradient hero with skeleton variant), `ManifestoGrid` (800px max-width single-column, 48px gap), `AboutSkeleton` (4 placeholder sections). All with semantic HTML and ARIA labels.
- **Task 4**: Created `/about` SSR page as pure Server Component importing static manifesto data. Added `generateMetadata()` for SEO. Loading skeleton via `loading.tsx`.
- **Task 5**: Built 6 roster components: `RosterFilters` (domain pill buttons with ARIA toggle-button group semantics + debounced search), `ContributorRosterCard` (64px avatar, domain/role badges, 2-line bio), `ContributorRosterGrid` (3/2/1 col responsive grid with dual empty states), `RosterPagination` ("Load more" with count), `RosterContent` (client orchestrator with URL-driven filter state and focus management after filter changes), `RosterSkeleton`.
- **Task 6**: Created `useContributorRoster` hook using TanStack Query `useInfiniteQuery` with SSR initial data hydration, 300ms debounced search input flow (`useDeferredValue` over debounced state), cursor-based page params.
- **Task 7**: Created `/contributors` SSR page with ISR (60s revalidation), `generateMetadata()` for SEO, loading skeleton. Existing `[id]/page.tsx` untouched.
- **Task 8**: Backend tests covered in Task 1 (8 service + 6 controller test cases).
- **Task 9**: Created 38 frontend tests: 13 about component tests + 25 roster component tests covering rendering, domain colors, interactions, accessibility, empty states, pagination.
- **Task 10**: Build verification — `pnpm build` passes, `pnpm lint` passes (0 errors), `pnpm test` passes (297 total tests).
- **Extracted DOMAIN_COLORS** to shared utility `apps/web/lib/domain-colors.ts`, updated `founding-contributor-card.tsx` to import from there (no duplication).
- **Code review remediation**: Fixed all HIGH/MEDIUM review issues by aligning cursor implementation with story claims, adjusting roster filter accessibility semantics, debouncing URL updates for search, and adding post-filter focus management.

### Change Log

- 2026-03-03: Implemented Story 2.4 — Domain Manifestos and Contributor Roster. Added public roster API endpoint with filtering/search/pagination, static domain manifesto content, `/about` SSR page, `/contributors` SSR page with client-side infinite scroll, 38 new frontend tests and 14 new backend tests. Extracted DOMAIN_COLORS to shared utility.
- 2026-03-03: Code review remediation pass — fixed composite cursor token implementation, roster accessibility semantics and focus behavior, debounced URL search updates, and sanitized roster logging fields. Re-ran workspace tests (`api`, `web`) successfully.

### File List

**New files:**

- `packages/shared/src/constants/manifestos.ts` — Static domain manifesto content
- `packages/shared/src/types/manifesto.types.ts` — DomainManifesto type
- `packages/shared/src/schemas/roster.schema.ts` — Zod schema for roster query params
- `apps/web/lib/domain-colors.ts` — Shared DOMAIN_COLORS mapping (extracted from founding-contributor-card)
- `apps/web/app/(public)/about/page.tsx` — About/manifesto SSR page
- `apps/web/app/(public)/about/loading.tsx` — About page loading skeleton
- `apps/web/app/(public)/contributors/page.tsx` — Contributor roster SSR page
- `apps/web/app/(public)/contributors/loading.tsx` — Roster page loading skeleton
- `apps/web/components/features/about/manifesto-section.tsx` — Domain manifesto section component
- `apps/web/components/features/about/about-hero.tsx` — About page hero with skeleton
- `apps/web/components/features/about/manifesto-grid.tsx` — Manifesto sections container
- `apps/web/components/features/about/about-skeleton.tsx` — About page skeleton loader
- `apps/web/components/features/about/about.test.tsx` — About component tests (13 tests)
- `apps/web/components/features/roster/roster-filters.tsx` — Domain filter buttons + search
- `apps/web/components/features/roster/contributor-roster-card.tsx` — Contributor card component
- `apps/web/components/features/roster/contributor-roster-grid.tsx` — Responsive card grid
- `apps/web/components/features/roster/roster-pagination.tsx` — Load more button with count
- `apps/web/components/features/roster/roster-content.tsx` — Client wrapper orchestrating roster UI
- `apps/web/components/features/roster/roster-skeleton.tsx` — Roster skeleton loader
- `apps/web/components/features/roster/roster.test.tsx` — Roster component tests (25 tests)
- `apps/web/hooks/use-contributor-roster.ts` — TanStack Query useInfiniteQuery hook

**Modified files:**

- `apps/api/src/modules/contributor/contributor.service.ts` — Added `getContributorRoster()` method
- `apps/api/src/modules/contributor/profile.controller.ts` — Added `@Get()` roster endpoint, Zod validation, paginated response
- `apps/api/src/modules/contributor/contributor.service.spec.ts` — Added 8 roster service tests
- `apps/api/src/modules/contributor/profile.controller.spec.ts` — Added 6 roster controller tests
- `packages/shared/src/index.ts` — Exported manifesto constants/types and roster schema
- `apps/web/components/features/showcase/founding-contributor-card.tsx` — Imported DOMAIN_COLORS from shared utility
- `_bmad-output/implementation-artifacts/2-4-domain-manifestos-and-contributor-roster.md` — Updated status and Dev Agent Record after code review remediation
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Synced story status to `done`
