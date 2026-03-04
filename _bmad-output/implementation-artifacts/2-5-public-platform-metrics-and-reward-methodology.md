# Story 2.5: Public Platform Metrics & Reward Methodology

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor or investor,
I want to view key platform metrics and understand the scaling-law reward methodology,
so that I can evaluate community health and the economic model.

## Acceptance Criteria

1. **Given** I am an unauthenticated visitor **When** I navigate to `/metrics` **Then** I see key platform metrics including: number of active contributors, contribution velocity (contributions per week), domain distribution (percentage per domain), and retention rates **And** metrics are presented using calm, insightful visualizations (Recharts) with organic visual language — no red/green traffic-light indicators **And** the page is server-side rendered for SEO

2. **Given** the platform has no contributor data yet **When** I view the metrics page **Then** placeholder visualizations display with dignified empty states explaining what each metric will show

3. **Given** I am an unauthenticated visitor **When** I navigate to `/rewards` **Then** I see a clear explanation of the scaling-law reward methodology with visual representations showing how compounding rewards grow with sustained engagement **And** the explanation uses organic growth metaphors ("Your garden is growing") rather than financial dashboards **And** the content is structured for >80% comprehension (per PRD Success Criteria) **And** the page is server-side rendered for SEO

## Tasks / Subtasks

- [x] Task 1: Install Recharts and create metrics API endpoint (AC: 1, 2)
  - [x]1.1 Install `recharts@^3.7.0` in `apps/web/package.json` — Recharts 3.x is React 19 compatible, no longer depends on recharts-scale or react-smooth
  - [x]1.2 Create `apps/api/src/modules/showcase/` module directory with `showcase.module.ts`, `showcase.controller.ts`, `showcase.service.ts`
  - [x]1.3 Implement `ShowcaseService.getPlatformMetrics()` method that queries the database for:
    - **Active contributors**: `COUNT(contributors) WHERE is_active = true` (total active count)
    - **Contribution velocity**: For Phase 1, return 0 or a placeholder value — actual contribution data requires Epic 4 (Contribution Ingestion Pipeline). Document this as a known limitation
    - **Domain distribution**: `GROUP BY domain` on contributors table → returns `{ domain: string, count: number, percentage: number }[]`
    - **Retention rate**: For Phase 1, derive from contributor creation dates — percentage of contributors created >30 days ago who are still active. Full retention tracking requires Epic 4
  - [x]1.4 Cache metrics in Redis with key `showcase:platform-metrics`, TTL 15 minutes. Use `RedisService` (already registered in `AppModule`). On cache hit, return cached; on miss, compute from DB and cache
  - [x]1.5 Create `GET /api/v1/showcase/metrics` endpoint on `ShowcaseController` — NO `JwtAuthGuard`, NO `AbilityGuard` (public endpoint). Returns `{ activeContributors: number, contributionVelocity: number, domainDistribution: DomainDistribution[], retentionRate: number }`
  - [x]1.6 Create `PlatformMetrics` type and `DomainDistribution` type in `packages/shared/src/types/metrics.types.ts`
  - [x]1.7 Export new types from `packages/shared/src/index.ts`
  - [x]1.8 Register `ShowcaseModule` in `AppModule` imports (in `apps/api/src/app.module.ts`). Import `PrismaModule` and `RedisModule` into `ShowcaseModule`

- [x] Task 2: Create reward methodology API endpoint (AC: 3)
  - [x]2.1 Implement `ShowcaseService.getRewardMethodology()` returning static reward methodology content:
    - Overview text explaining the scaling-law model in organic language
    - Scaling curve data points for visualization (precomputed static array showing how compounding works over time horizons: 1 month, 3 months, 6 months, 1 year, 2 years)
    - Scoring formula components: AI evaluation, peer feedback, task complexity, domain normalization
    - Glossary terms with definitions
  - [x]2.2 Create `RewardMethodology` type in `packages/shared/src/types/metrics.types.ts` with fields: `overview: string`, `scalingCurve: ScalingDataPoint[]`, `formulaComponents: FormulaComponent[]`, `glossary: GlossaryTerm[]`
  - [x]2.3 Create `GET /api/v1/showcase/reward-methodology` endpoint on `ShowcaseController` — public, no auth. Returns `RewardMethodology`
  - [x]2.4 Store methodology content as constants in `packages/shared/src/constants/reward-methodology.ts` (static content, like domain manifestos). Import directly in both API response and frontend SSR

- [x] Task 3: Create platform metrics page components (AC: 1, 2)
  - [x]3.1 Create `apps/web/components/features/metrics/metrics-hero.tsx` — Hero section: heading "Platform Metrics" (serif, `text.display`), subtitle explaining what these metrics represent. Pattern: follow `AboutHero` from Story 2-4. Gradient background, centered, generous padding
  - [x]3.2 Create `apps/web/components/features/metrics/stat-card.tsx` — Reusable metric summary card displaying: metric label (sans-serif, `text.body-interface`), metric value (serif, `text.h1`, bold), trend description or context text (sans-serif, `text.small`, `brand.secondary`). Card styling: `surface.raised` bg, `surface.border` border, 12px radius, `shadow-card`, `space.lg` (24px) padding. NO red/green indicators — use `brand.accent` for highlights
  - [x]3.3 Create `apps/web/components/features/metrics/domain-distribution-chart.tsx` — Recharts `PieChart` (or `RadialBarChart`) showing domain distribution with domain accent colors: Technology `#3A7D7E`, Fintech `#C49A3C`, Impact `#B06B6B`, Governance `#7B6B8A`. Include labels with domain names and percentages. Responsive: full-width on mobile, constrained on desktop. `aria-label` with text summary of distribution. Alternative data table toggle for accessibility (WCAG 2.1 AA, NFR-A4)
  - [x]3.4 Create `apps/web/components/features/metrics/metrics-stats-grid.tsx` — 2x2 grid on desktop, single column on mobile. Renders 4 `StatCard` components for: Active Contributors, Contribution Velocity, Retention Rate, Total Contributors. Gap: `space.lg` (24px)
  - [x]3.5 Create `apps/web/components/features/metrics/metrics-empty-state.tsx` — Dignified empty state component for when no data exists. Centered text explaining what each metric will show: "As our community grows, you'll see real-time metrics reflecting contributor activity across all four domains." Muted styling (`brand.secondary` text), generous whitespace. NO cheerful placeholders or spinning loaders
  - [x]3.6 Create `apps/web/components/features/metrics/metrics-skeleton.tsx` — Skeleton loader: hero placeholder + 4 stat card placeholders + chart area placeholder. Pulsing opacity 0.4-0.7, 2s cycle on warm grey rectangles

- [x] Task 4: Create reward methodology page components (AC: 3)
  - [x]4.1 Create `apps/web/components/features/rewards/rewards-hero.tsx` — Hero section: heading "How Rewards Work" (serif, `text.display`), subtitle with organic growth metaphor. Pattern: follow `AboutHero`/`MetricsHero`. Gradient background
  - [x]4.2 Create `apps/web/components/features/rewards/scaling-law-explainer.tsx` — Main narrative section: 2-3 paragraphs of editorial-quality text (serif body, `text.body`, 1.65 line-height) explaining the scaling-law model in plain language. Uses garden/cultivation metaphors ("sustained engagement grows your contribution garden"). Max-width 720px for optimal reading measure. Structure for progressive disclosure: summary visible first, detailed breakdown expandable
  - [x]4.3 Create `apps/web/components/features/rewards/growth-curve-chart.tsx` — Recharts `AreaChart` showing compounding reward growth curve over time. X-axis: months of sustained engagement (1, 3, 6, 12, 24). Y-axis: reward multiplier. Organic visual: use `brand.accent` (#C4956A) fill with gradient opacity, smooth monotone curve. NOT angular line chart — use `type="monotone"` for organic bezier feel. Include annotations at key milestones. Responsive. `role="img"` with `aria-label`. Alternative data table toggle for accessibility
  - [x]4.4 Create `apps/web/components/features/rewards/formula-breakdown.tsx` — Visual breakdown of scoring formula components: AI Evaluation, Peer Feedback, Task Complexity, Domain Normalization. Use cards or stacked sections with icons. Each component: label (sans-serif bold), description (serif body), weight indicator. NO numeric weights exposed — use qualitative descriptions ("significant factor", "balancing adjustment")
  - [x]4.5 Create `apps/web/components/features/rewards/glossary-section.tsx` — Expandable glossary at page bottom. Terms: "Domain Normalization", "Complexity Multiplier", "Temporal Aggregation", "Scaling-Law Compounding". Use `<details>`/`<summary>` or Radix Accordion for progressive disclosure. Serif headings, sans-serif definitions
  - [x]4.6 Create `apps/web/components/features/rewards/rewards-skeleton.tsx` — Skeleton loader matching rewards page structure

- [x] Task 5: Create `usePlatformMetrics` hook (AC: 1, 2)
  - [x]5.1 Create `apps/web/hooks/use-platform-metrics.ts` using TanStack Query `useQuery`
  - [x]5.2 Query key: `['showcase', 'platform-metrics']`
  - [x]5.3 Fetch from `GET /api/v1/showcase/metrics` using `fetch()` directly (public endpoint, no auth — do NOT use apiClient)
  - [x]5.4 Accept `initialData` prop for SSR hydration (same pattern as `useFoundingContributors`)
  - [x]5.5 `staleTime: 5 * 60 * 1000` (5 minutes client-side cache) since server caches for 15 minutes

- [x] Task 6: Create `/metrics` SSR page (AC: 1, 2)
  - [x]6.1 Create `apps/web/app/(public)/metrics/page.tsx` — Server Component. Fetch initial metrics data with `fetch()` and `next: { revalidate: 300 }` (5 min ISR — metrics don't need 60s freshness like roster). Pass initial data to client components
  - [x]6.2 Compose page from: MetricsHero + MetricsStatsGrid + DomainDistributionChart. If metrics indicate no data (activeContributors === 0), render MetricsEmptyState instead of charts
  - [x]6.3 Implement `generateMetadata()` for SEO: title "Platform Metrics — Edin Community", description (community health overview, 150-160 chars), Open Graph tags, Twitter Card
  - [x]6.4 Create `apps/web/app/(public)/metrics/loading.tsx` with MetricsSkeleton

- [x] Task 7: Create `/rewards` SSR page (AC: 3)
  - [x]7.1 Create `apps/web/app/(public)/rewards/page.tsx` — Server Component. Reward methodology content is STATIC (like manifestos) — import constants directly from `@edin/shared`, no API call needed for Phase 1. Optionally fetch scaling curve data from API if dynamic computation is needed
  - [x]7.2 Compose page from: RewardsHero + ScalingLawExplainer + GrowthCurveChart + FormulaBreakdown + GlossarySection
  - [x]7.3 Implement `generateMetadata()` for SEO: title "Reward Methodology — Edin", description (scaling-law reward model explanation, 150-160 chars), Open Graph tags, Twitter Card
  - [x]7.4 Create `apps/web/app/(public)/rewards/loading.tsx` with RewardsSkeleton

- [x] Task 8: Backend unit tests (AC: 1, 2, 3)
  - [x]8.1 Create `apps/api/src/modules/showcase/showcase.service.spec.ts`:
    - Returns correct active contributor count (only `is_active = true`)
    - Returns domain distribution with percentages summing to 100%
    - Returns 0 contribution velocity (Phase 1 placeholder)
    - Returns retention rate based on creation dates
    - Handles empty database (0 contributors) gracefully
    - Returns cached metrics on cache hit (mock RedisService)
    - Computes and caches on cache miss
    - Returns reward methodology static content
  - [x]8.2 Create `apps/api/src/modules/showcase/showcase.controller.spec.ts`:
    - `GET /api/v1/showcase/metrics` returns 200 with correct response envelope
    - `GET /api/v1/showcase/reward-methodology` returns 200 with methodology content
    - Endpoints require no authentication (no JwtAuthGuard)
    - Response wrapped in `{ data, meta }` envelope

- [x] Task 9: Frontend tests (AC: 1, 2, 3)
  - [x]9.1 Test StatCard renders label, value, and context text
  - [x]9.2 Test MetricsStatsGrid renders 4 stat cards with correct data
  - [x]9.3 Test DomainDistributionChart renders with correct domain colors (Technology #3A7D7E, Fintech #C49A3C, Impact #B06B6B, Governance #7B6B8A)
  - [x]9.4 Test DomainDistributionChart shows accessible data table alternative
  - [x]9.5 Test MetricsEmptyState renders dignified message when no data
  - [x]9.6 Test MetricsHero renders heading and subtitle
  - [x]9.7 Test RewardsHero renders heading with organic growth language
  - [x]9.8 Test ScalingLawExplainer renders narrative text with garden metaphors
  - [x]9.9 Test GrowthCurveChart renders Recharts AreaChart with correct data points
  - [x]9.10 Test FormulaBreakdown renders all 4 scoring components
  - [x]9.11 Test GlossarySection renders expandable terms
  - [x]9.12 Test skeleton components render during loading
  - [x]9.13 Test MetricsSkeleton and RewardsSkeleton have correct placeholder counts

- [x] Task 10: Build verification
  - [x]10.1 `pnpm build` passes all packages (including new recharts dependency)
  - [x]10.2 `pnpm lint` passes (0 errors)
  - [x]10.3 `pnpm test` passes all existing + new tests

## Dev Notes

### Architecture Compliance

- **New ShowcaseModule**: Create `apps/api/src/modules/showcase/` with `ShowcaseModule`, `ShowcaseController`, `ShowcaseService`. Register in `AppModule`. Import `PrismaModule` and `RedisModule`. This module handles all public-facing showcase data (metrics, methodology). Do NOT put these endpoints on `ProfileController` — showcase has a separate concern.
- **Public endpoints**: `GET /api/v1/showcase/metrics` and `GET /api/v1/showcase/reward-methodology` — NO `JwtAuthGuard`, NO `AbilityGuard`. Public access by design.
- **API envelope**: Response auto-wrapped by `ResponseWrapperInterceptor` into `{ data, meta }`. Controllers return raw data objects.
- **Error handling**: Use `DomainException` with error codes from `@edin/shared`. Add `SHOWCASE_METRICS_UNAVAILABLE` error code if needed.
- **Validation**: No query params on these simple GET endpoints — no Zod schema needed.
- **Redis caching**: Use `RedisService` already available. Key pattern: `showcase:platform-metrics`. TTL: 900 seconds (15 minutes). Call `redisService.get(key)` and `redisService.set(key, value, ttl)`.
- **Reward methodology is STATIC content**: Like domain manifestos, store as constants in `@edin/shared`. The API endpoint wraps constants in a response for consistency, but the frontend `/rewards` page can also import constants directly for SSR (no API call needed). Choose one approach — recommend importing directly for `/rewards` (same pattern as `/about` page with manifestos).

### Phase 1 Scope — Critical Limitations

**What IS available in Phase 1:**

- Active contributor count (from `contributors` table, `is_active = true`)
- Domain distribution (from `contributors.domain`, GROUP BY)
- Basic retention rate (derived from `contributors.created_at` — % created >30 days ago still active)
- Static reward methodology content (explanatory text, pre-computed scaling curve visualization data)

**What is NOT available until later epics:**

- **Contribution velocity** (requires Epic 4 — Contribution Ingestion Pipeline). Return 0 or "Coming Soon" placeholder
- **Actual contribution scores** (requires Epic 7 — AI Evaluation Engine). Reward methodology page explains the _model_, not actual scores
- **AI-human evaluation agreement rate** (requires Epic 7)
- **Publication metrics** (requires Epic 8 — Publication Platform)
- **Multi-temporal scoring** (Phase 2+ feature per FR60)

**Implementation approach**: Build the full UI structure now with placeholder/empty states for unavailable data. When later epics deliver contribution data, the metrics endpoint only needs to add queries — the frontend is already ready.

### Data Exposure Rules — No Security Concerns

Both endpoints return aggregated/static data only:

- **Metrics**: Aggregate counts and percentages — no PII, no individual contributor data
- **Methodology**: Static educational content — no sensitive information
- No authentication needed, no RBAC checks

### Frontend Architecture

- **Metrics page** (`/metrics`): Server Component for SSR + Client Component wrapper for chart interactivity. Fetch metrics via API for initial render with ISR (5 min revalidation). Use `usePlatformMetrics` hook for client-side refresh.
- **Rewards page** (`/rewards`): Pure Server Component — import static methodology constants directly from `@edin/shared` (same pattern as `/about` page with manifesto data). No API call needed. Charts use static pre-computed data points.
- **Recharts SSR**: Recharts 3.x supports SSR. However, charts with interactivity (tooltips, hover) need `"use client"` directive on the chart wrapper component. The page itself remains a Server Component — only chart components are Client Components.
- **Next.js 16 patterns**: `params` and `searchParams` are `Promise` in page components.
- **Skeleton loaders**: Use skeleton components (NOT spinners) per UX spec. Pulsing opacity animation.

### Design System — Typography, Colors & Spacing

**Metrics Page Visual Design:**

- Hero: Same pattern as AboutHero — gradient background (`from-surface-raised to-surface-sunken`), centered, serif display heading
- Stat cards: 2x2 grid (desktop), 1-col (mobile). `surface.raised` bg, warm border, 12px radius, card shadow. Value in serif `text.h1`, label in sans-serif `text.body-interface`
- Domain distribution chart: Use domain accent colors (same as contributor roster/manifesto sections). Pie or donut chart with Recharts
- NO red/green indicators anywhere — use `brand.accent` (#C4956A) for highlights, domain colors for distribution
- Max content width: 1200px centered (wider than rewards page for grid layout)

**Rewards Page Visual Design:**

- Hero: Same pattern, but with subtitle using organic growth language
- Narrative section: 720px max-width centered for optimal reading measure (60-75 chars per line). Serif body text (`text.body`, 17px, 1.65 line-height). Generous whitespace between paragraphs (`space.xl`)
- Growth curve chart: `brand.accent` (#C4956A) fill with gradient, smooth monotone curve. Full-width within content area. Annotations at milestones
- Formula breakdown: Cards or stacked sections, each with icon, label, description. Sans-serif for labels, serif for descriptions
- Glossary: Accordion-style expandable sections at bottom

**Color Constraints:**

- NEVER use red/green for scoring or evaluation indicators
- Domain colors for distribution: Technology `#3A7D7E`, Fintech `#C49A3C`, Impact `#B06B6B`, Governance `#7B6B8A`
- Use `DOMAIN_COLORS` from `apps/web/lib/domain-colors.ts` (extracted in Story 2-4)
- Brand accent `#C4956A` for growth curves and highlights

**Responsive Design:**

- Mobile (< 640px): Single column, charts full-width, stat cards stack vertically
- Tablet (640-1023px): 2-column stat grid, charts full-width
- Desktop (1024px+): 2x2 stat grid, charts within max-width container
- Touch targets: 44x44px minimum on interactive chart elements

### Recharts 3.x Implementation Notes

- **Version**: Install `recharts@^3.7.0` (latest stable, React 19 compatible)
- **Breaking changes from v2**: Recharts 3.x removed dependencies on `recharts-scale` and `react-smooth`. Scale utilities are now exported from `recharts` directly. Animations are internal.
- **Removed props**: `Pie` component no longer has `blendStroke` — use `stroke="none"` instead
- **CartesianGrid**: New `xAxisId`/`yAxisId` properties that must match corresponding `XAxis`/`YAxis` IDs
- **SSR support**: Recharts 3.x renders SVG which works with SSR. Wrap interactive chart components in `"use client"` directive
- **Key components to use**:
  - `PieChart` + `Pie` + `Cell` for domain distribution (with `ResponsiveContainer`)
  - `AreaChart` + `Area` for growth curve (with `type="monotone"` for organic feel)
  - `Tooltip` for hover data (client-side only)
  - `ResponsiveContainer` for fluid chart sizing
- **Accessibility**: Add `role="img"` and `aria-label` to chart containers. Provide data table toggle alternative

### Previous Story (2-4) Critical Learnings — MUST FOLLOW

1. **NestJS module registration**: Add `ShowcaseModule` to `AppModule.imports` array in `apps/api/src/app.module.ts`
2. **Prisma 7**: Import from `../../generated/prisma/client/`, NOT `@prisma/client`. PrismaClient requires config object with PrismaPg adapter
3. **Turbopack compatibility**: `@edin/shared` uses `exports` field in package.json pointing to `dist/` output. `next.config.ts` has `transpilePackages: ['@edin/shared']`. After adding new exports (metrics types, reward constants), rebuild shared package
4. **Response envelope**: All responses auto-wrapped by `ResponseWrapperInterceptor`. Controllers return raw data. No manual wrapping needed
5. **Public endpoint pattern**: Use `fetch()` directly (NOT `apiClient`) for public data fetching on the frontend — `apiClient` adds auth headers
6. **SSR data fetching**: Server Components use `fetch()` with `next: { revalidate: N }` for ISR. Pass data as props to Client Components
7. **generateMetadata()**: Fetch requests inside are automatically memoized by Next.js 16
8. **Domain colors**: Technology #3A7D7E, Fintech #C49A3C, Impact #B06B6B, Governance #7B6B8A — reuse `DOMAIN_COLORS` from `apps/web/lib/domain-colors.ts`
9. **Test infrastructure**: Frontend tests use Vitest + React Testing Library with jsdom environment. Config at `apps/web/vitest.config.ts`, setup at `apps/web/vitest.setup.ts`. Backend tests use Vitest + NestJS testing utilities
10. **Code review fix from 2-4**: Domain badge text colors need WCAG contrast — white text on Technology (#3A7D7E) and Governance (#7B6B8A), dark text on Fintech (#C49A3C) and Impact (#B06B6B)
11. **CSS custom properties**: Use `var(--spacing-lg)`, `var(--color-brand-primary)`, etc. from `globals.css`. Tailwind classes map to these: `bg-surface-raised`, `text-brand-primary`, `border-surface-border`
12. **Component location**: Components in `apps/web/components/features/{feature-name}/`. Hooks in `apps/web/hooks/`. Tests co-located

### Git Intelligence — Recent Patterns

| Commit                       | Pattern                                                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `c0378ed` (Story 2-4)        | Domain manifestos (static constants in shared), contributor roster (API endpoint + TanStack Query), `/about` and `/contributors` SSR pages, skeleton loaders, domain color system |
| `6f150c0` (Story 2-3)        | SSR showcase page, Server Component + Client wrapper, `generateMetadata()`, founding contributors endpoint, skeleton loaders                                                      |
| `90f24aa` (Stories 2-1, 2-2) | Contributor profile CRUD, public profile SSR, `PublicContributorProfile` type, Prisma select pattern                                                                              |

**Key patterns to replicate:**

- Server Component → fetch() with revalidate → pass props to Client Component (for metrics page)
- Static constants in `@edin/shared` → import directly in Server Component (for rewards page)
- Components in `apps/web/components/features/{feature-name}/`
- Hooks in `apps/web/hooks/` using TanStack Query
- Tests co-located with components and services

### Project Structure Notes

**Files to CREATE:**

| File                                                                 | Purpose                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------ |
| `apps/api/src/modules/showcase/showcase.module.ts`                   | Showcase NestJS module                                       |
| `apps/api/src/modules/showcase/showcase.controller.ts`               | Public showcase API endpoints                                |
| `apps/api/src/modules/showcase/showcase.service.ts`                  | Metrics computation and caching                              |
| `apps/api/src/modules/showcase/showcase.service.spec.ts`             | Service unit tests                                           |
| `apps/api/src/modules/showcase/showcase.controller.spec.ts`          | Controller tests                                             |
| `packages/shared/src/types/metrics.types.ts`                         | PlatformMetrics, DomainDistribution, RewardMethodology types |
| `packages/shared/src/constants/reward-methodology.ts`                | Static reward methodology content                            |
| `apps/web/app/(public)/metrics/page.tsx`                             | Metrics SSR page                                             |
| `apps/web/app/(public)/metrics/loading.tsx`                          | Metrics page loading skeleton                                |
| `apps/web/app/(public)/rewards/page.tsx`                             | Rewards methodology SSR page                                 |
| `apps/web/app/(public)/rewards/loading.tsx`                          | Rewards page loading skeleton                                |
| `apps/web/components/features/metrics/metrics-hero.tsx`              | Metrics page hero section                                    |
| `apps/web/components/features/metrics/stat-card.tsx`                 | Reusable metric summary card                                 |
| `apps/web/components/features/metrics/domain-distribution-chart.tsx` | Recharts pie chart for domain breakdown                      |
| `apps/web/components/features/metrics/metrics-stats-grid.tsx`        | 2x2 stat card grid                                           |
| `apps/web/components/features/metrics/metrics-empty-state.tsx`       | Dignified empty state                                        |
| `apps/web/components/features/metrics/metrics-skeleton.tsx`          | Metrics page skeleton loader                                 |
| `apps/web/components/features/metrics/metrics.test.tsx`              | Metrics component tests                                      |
| `apps/web/components/features/rewards/rewards-hero.tsx`              | Rewards page hero section                                    |
| `apps/web/components/features/rewards/scaling-law-explainer.tsx`     | Narrative explanation of scaling law                         |
| `apps/web/components/features/rewards/growth-curve-chart.tsx`        | Recharts area chart for growth curve                         |
| `apps/web/components/features/rewards/formula-breakdown.tsx`         | Scoring formula visual breakdown                             |
| `apps/web/components/features/rewards/glossary-section.tsx`          | Expandable glossary terms                                    |
| `apps/web/components/features/rewards/rewards-skeleton.tsx`          | Rewards page skeleton loader                                 |
| `apps/web/components/features/rewards/rewards.test.tsx`              | Rewards component tests                                      |
| `apps/web/hooks/use-platform-metrics.ts`                             | TanStack Query hook for metrics data                         |

**Files to MODIFY:**

| File                           | Change                                                |
| ------------------------------ | ----------------------------------------------------- |
| `apps/api/src/app.module.ts`   | Add `ShowcaseModule` to imports                       |
| `apps/web/package.json`        | Add `recharts@^3.7.0` dependency                      |
| `packages/shared/src/index.ts` | Export metrics types and reward methodology constants |

**Files to NOT touch:**

- `apps/api/prisma/schema.prisma` — No schema changes needed (aggregate queries use existing Contributor model)
- `apps/api/src/modules/contributor/` — No changes to existing contributor module
- `apps/api/src/modules/auth/` — No auth changes needed
- `apps/web/app/(public)/about/` — Existing about page UNCHANGED
- `apps/web/app/(public)/contributors/` — Existing contributor pages UNCHANGED
- `apps/web/components/features/showcase/` — Existing showcase components UNCHANGED
- `apps/web/components/features/roster/` — Existing roster components UNCHANGED
- `apps/web/components/features/about/` — Existing about components UNCHANGED

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2, Story 2.5] — User story, acceptance criteria
- [Source: _bmad-output/planning-artifacts/prd.md#FR45] — Key platform metrics display requirement
- [Source: _bmad-output/planning-artifacts/prd.md#FR47] — Aggregate AI evaluation data (Phase 2+ for actual scores)
- [Source: _bmad-output/planning-artifacts/prd.md#FR59] — Scaling-law reward methodology explanation requirement
- [Source: _bmad-output/planning-artifacts/prd.md#Success Criteria] — >80% reward comprehension target
- [Source: _bmad-output/planning-artifacts/architecture.md#Showcase Module] — ShowcaseController endpoints, public API patterns
- [Source: _bmad-output/planning-artifacts/architecture.md#API Patterns] — Response envelope, error codes, caching strategy
- [Source: _bmad-output/planning-artifacts/architecture.md#Database] — Contributor model, evaluation schema (Phase 2+)
- [Source: _bmad-output/planning-artifacts/architecture.md#Performance] — NFR-P1 FCP <1.5s, Redis caching, aggregation query optimization
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#TrajectoryVisualization] — Organic growth curves, Recharts, no traffic-light colors
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#ExperiencePrinciples] — Insight before numbers, the page breathes, narrative-first data
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#DesignTokens] — Color palette, typography scale, spacing scale
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#EmptyStates] — Dignified empty states pattern
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility] — WCAG 2.1 AA, NFR-A1, NFR-A4 for data visualizations
- [Source: _bmad-output/implementation-artifacts/2-4-domain-manifestos-and-contributor-roster.md] — Previous story patterns, SSR patterns, domain colors, component structure, test patterns, DOMAIN_COLORS extraction

## Change Log

- 2026-03-03: Implemented Story 2-5 — Public Platform Metrics & Reward Methodology. Created ShowcaseModule with public API endpoints for platform metrics and reward methodology. Built `/metrics` SSR page with Recharts visualizations (donut chart for domain distribution, stat cards for key metrics) and `/rewards` SSR page with scaling-law narrative, growth curve chart, formula breakdown, and expandable glossary. Added Redis caching for metrics (15 min TTL), TanStack Query hook for client-side refresh, comprehensive backend and frontend tests. All 286 tests pass, build and lint green.
- 2026-03-04: Senior code review fixes applied. Added explicit `PrismaModule` and `RedisModule` imports to `ShowcaseModule`, corrected domain distribution percentage denominator for non-null domain data, replaced hardcoded chart colors with shared `DOMAIN_HEX_COLORS`, expanded metrics empty state to include placeholder visualizations for all metrics, and added controller envelope tests using `ResponseWrapperInterceptor`.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed Recharts 3.x TypeScript typing for `Pie` label prop (`PieLabelRenderProps` does not include custom data fields; used `props.name` and `props.percent` instead)
- Fixed Recharts `Tooltip` formatter type (value param is `number | undefined` in v3, removed explicit type annotation)
- Added `@testing-library/user-event` as devDependency for interactive test assertions (button click for data table toggle)
- Fixed test data to avoid duplicate values between `activeContributors` and `totalContributors` causing `getByText` ambiguity
- Fixed test expectations for JS number formatting (`1.0` renders as `1`, `14.0` renders as `14`)
- Added generic `get<T>()`, `set()`, `del()` methods to RedisService for caching beyond refresh tokens

### Completion Notes List

- All 3 Acceptance Criteria satisfied
- AC1: `/metrics` page shows active contributors, contribution velocity (Coming Soon placeholder for Phase 1), domain distribution, retention rates with Recharts visualizations and no red/green indicators; SSR with ISR 5 min revalidation
- AC2: Empty-state experience now includes dignified placeholder visualizations (stat placeholders + domain distribution placeholder) explaining what each metric will show when data is available
- AC3: `/rewards` page shows scaling-law methodology with organic growth metaphors, growth curve chart, formula breakdown, and expandable glossary; pure SSR using static constants from `@edin/shared`
- Backend: 186 tests passing (including 8 new showcase service tests + 4 new controller tests)
- Frontend: 100 tests passing (including 14 new metrics tests + 15 new rewards tests)
- Build: `pnpm build` passes all packages
- Lint: `pnpm lint` 0 errors (2 pre-existing warnings in unrelated files)
- Phase 1 limitations documented: contribution velocity returns 0, retention rate based on creation dates only

### File List

**New files:**

- `packages/shared/src/types/metrics.types.ts`
- `packages/shared/src/constants/reward-methodology.ts`
- `apps/api/src/modules/showcase/showcase.module.ts`
- `apps/api/src/modules/showcase/showcase.controller.ts`
- `apps/api/src/modules/showcase/showcase.service.ts`
- `apps/api/src/modules/showcase/showcase.service.spec.ts`
- `apps/api/src/modules/showcase/showcase.controller.spec.ts`
- `apps/web/components/features/metrics/metrics-hero.tsx`
- `apps/web/components/features/metrics/stat-card.tsx`
- `apps/web/components/features/metrics/domain-distribution-chart.tsx`
- `apps/web/components/features/metrics/metrics-stats-grid.tsx`
- `apps/web/components/features/metrics/metrics-empty-state.tsx`
- `apps/web/components/features/metrics/metrics-skeleton.tsx`
- `apps/web/components/features/metrics/metrics-content.tsx`
- `apps/web/components/features/metrics/metrics.test.tsx`
- `apps/web/components/features/rewards/rewards-hero.tsx`
- `apps/web/components/features/rewards/scaling-law-explainer.tsx`
- `apps/web/components/features/rewards/growth-curve-chart.tsx`
- `apps/web/components/features/rewards/formula-breakdown.tsx`
- `apps/web/components/features/rewards/glossary-section.tsx`
- `apps/web/components/features/rewards/rewards-skeleton.tsx`
- `apps/web/components/features/rewards/rewards.test.tsx`
- `apps/web/hooks/use-platform-metrics.ts`
- `apps/web/app/(public)/metrics/page.tsx`
- `apps/web/app/(public)/metrics/loading.tsx`
- `apps/web/app/(public)/rewards/page.tsx`
- `apps/web/app/(public)/rewards/loading.tsx`

**Modified files:**

- `apps/api/src/app.module.ts` (added ShowcaseModule import)
- `apps/api/src/common/redis/redis.service.ts` (added generic get/set/del cache methods)
- `apps/api/src/modules/showcase/showcase.module.ts` (imported PrismaModule and RedisModule per story requirement)
- `apps/api/src/modules/showcase/showcase.service.ts` (fixed domain distribution percentage denominator)
- `apps/api/src/modules/showcase/showcase.controller.spec.ts` (added response-envelope integration tests)
- `apps/web/package.json` (added recharts@^3.7.0, @testing-library/user-event)
- `apps/web/components/features/metrics/domain-distribution-chart.tsx` (reused shared DOMAIN_HEX_COLORS)
- `apps/web/components/features/metrics/metrics-empty-state.tsx` (added placeholder visualizations for all metrics)
- `apps/web/lib/domain-colors.ts` (added DOMAIN_HEX_COLORS export for chart consistency)
- `packages/shared/src/index.ts` (exported metrics types and REWARD_METHODOLOGY constant)
- `pnpm-lock.yaml` (dependency lock updates)
- `_bmad-output/implementation-artifacts/2-5-public-platform-metrics-and-reward-methodology.md` (review notes and status update)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (story status updated)

## Senior Developer Review (AI)

**Reviewer:** Fabrice (AI-assisted) on 2026-03-04

**Outcome:** Changes Requested → Fixed

**Findings addressed:**

- `showcase.module.ts` now explicitly imports `PrismaModule` and `RedisModule` as required by Task 1.8.
- Domain distribution percentages now compute against contributors with a known domain to avoid skewed totals when active contributors have `null` domain.
- Metrics no-data state now includes placeholder visualizations for all key metrics and domain distribution, satisfying AC2's visualization requirement.
- Domain chart colors now come from shared `apps/web/lib/domain-colors.ts` source-of-truth instead of local hardcoded values.
- Controller-level envelope validation now includes interceptor-driven HTTP tests for both showcase endpoints.

**Validation run:**

- `pnpm --filter api test showcase` (pass)
- `pnpm --filter web test metrics.test.tsx rewards.test.tsx` (pass)
