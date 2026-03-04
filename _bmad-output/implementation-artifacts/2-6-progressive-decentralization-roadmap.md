# Story 2.6: Progressive Decentralization Roadmap

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a contributor or visitor,
I want to view a progressive decentralization roadmap,
so that I can understand the timeline for governance authority transfer from the founding team to the community.

## Acceptance Criteria

1. **Given** I am an unauthenticated visitor **When** I navigate to `/governance` **Then** I see a static progressive decentralization roadmap displaying specific milestones for governance transfer, the current stage highlighted, and a timeline for authority transition **And** the roadmap is presented as a visual vertical timeline with calm, clear design — no urgency signals, no countdown timers, no percentage progress bars **And** each milestone includes a brief description of what governance capability is transferred **And** the page is server-side rendered for SEO

2. **Given** the platform is in Phase 1 (Foundation) **When** I view the governance roadmap **Then** Phase 1 is visually highlighted as the current phase using warm accent color (#C4956A) **And** completed phases show muted success indicators (#5A8A6B) **And** future phases show cool info indicators (#5A7A8A) **And** all status is conveyed through both color AND text labels (never color-only)

3. **Given** the roadmap is a Phase 1 static display **When** the page renders **Then** the content is loaded from a configurable constants file (`packages/shared/src/constants/governance-roadmap.ts`) so that it can be updated without code changes to components **And** the content includes: overview description, phase definitions with governance capabilities, timeline ranges, glossary of governance terms

4. **Given** I am viewing a milestone on the roadmap **When** I interact with it **Then** I can expand/collapse detailed governance capabilities using progressive disclosure (Radix Accordion pattern) **And** the expanded view shows: governance capabilities transferred, description of authority changes, and key metrics for the phase

5. **Given** I am on a mobile device **When** I view the governance roadmap **Then** the timeline displays as a single-column stacked layout with touch targets of at least 48px **And** all interactive elements are keyboard-navigable **And** the page meets WCAG 2.1 Level AA accessibility standards

> **Design Note on Route:** The epics AC1 references `/dashboard/governance` (authenticated), but the Epic 2 description explicitly states "Visitors can browse... a static progressive decentralization roadmap — all without authentication." Since this is a static informational page identical in nature to `/metrics` and `/rewards`, and since the PRD emphasizes transparency and trust-building with visitors/investors, this story implements the roadmap as a **public page** at `/(public)/governance` following the established Epic 2 pattern. The full roadmap is public — no authentication required for Phase 1 static display.

## Tasks / Subtasks

- [x] Task 1: Create shared types and constants (AC: #3)
  - [x] 1.1 Create `packages/shared/src/types/governance.types.ts` with `DecentralizationMilestone`, `GovernancePhase`, `ProgressiveDecentralizationRoadmap`, and `GovernanceGlossaryTerm` interfaces
  - [x] 1.2 Create `packages/shared/src/constants/governance-roadmap.ts` with `PROGRESSIVE_DECENTRALIZATION_ROADMAP` constant containing 4 phases (Foundation, Community Input, Distributed Governance, Full Decentralization), timeline data, and governance glossary
  - [x] 1.3 Export new types and constants from `packages/shared/src/index.ts`
  - [x] 1.4 Rebuild shared package: `pnpm --filter shared build`

- [x] Task 2: Create governance page and loading state (AC: #1, #5)
  - [x] 2.1 Create `apps/web/app/(public)/governance/page.tsx` as Server Component with `generateMetadata()` for SEO (OpenGraph, Twitter Cards)
  - [x] 2.2 Create `apps/web/app/(public)/governance/loading.tsx` with skeleton loader
  - [x] 2.3 Import `PROGRESSIVE_DECENTRALIZATION_ROADMAP` directly from `@edin/shared` (static content, no API call — same pattern as rewards page)

- [x] Task 3: Create governance components (AC: #1, #2, #4)
  - [x] 3.1 Create `apps/web/components/features/governance/governance-hero.tsx` — hero section with serif title, governance description, governance violet accent (#7B6B8A)
  - [x] 3.2 Create `apps/web/components/features/governance/roadmap-timeline.tsx` — vertical timeline with domain-colored dots, phase cards, current phase highlighting (warm accent #C4956A), completed (#5A8A6B), future (#5A7A8A)
  - [x] 3.3 Create `apps/web/components/features/governance/milestone-card.tsx` — expandable card with Radix Accordion for progressive disclosure; shows phase label, timeline range, governance capabilities, description
  - [x] 3.4 Create `apps/web/components/features/governance/governance-explainer.tsx` — narrative section explaining how decentralization works at Edin (serif typography, 720px max-width, 17px/1.65 line-height)
  - [x] 3.5 Create `apps/web/components/features/governance/governance-glossary.tsx` — collapsible glossary of governance terms (DAO, governance weight, progressive decentralization, etc.)
  - [x] 3.6 Create `apps/web/components/features/governance/governance-skeleton.tsx` — skeleton components mirroring timeline layout

- [x] Task 4: Implement responsive design and accessibility (AC: #2, #5)
  - [x] 4.1 Ensure vertical timeline is single-column on mobile with 48px touch targets
  - [x] 4.2 Add `role="img"` with descriptive `aria-label` on timeline visualization
  - [x] 4.3 Ensure all interactive elements are keyboard-navigable (Radix primitives handle this)
  - [x] 4.4 Verify color contrast meets 4.5:1 minimum (WCAG 2.1 AA)
  - [x] 4.5 Add alternative text-based representation of roadmap data (data table toggle, same pattern as domain-distribution-chart)
  - [x] 4.6 Support `prefers-reduced-motion` for any animations

- [x] Task 5: Write tests (AC: #1-5)
  - [x] 5.1 Create `apps/web/components/features/governance/governance.test.tsx` — component tests: renders all phases, current phase highlighted, progressive disclosure works, glossary renders, skeleton renders, data table toggle, accessibility attributes
  - [x] 5.2 Verify SEO metadata generation in page test
  - [x] 5.3 Verify responsive layout renders correctly

## Dev Notes

### Architecture & Patterns

- **Static content approach (NO API endpoint needed):** Follow the exact pattern from Story 2-5 `/rewards` page — import `PROGRESSIVE_DECENTRALIZATION_ROADMAP` directly from `@edin/shared`. The roadmap is static Phase 1 content. No `GovernanceModule`, no controller, no service, no Redis caching needed. This matches the rewards page approach where `REWARD_METHODOLOGY` is imported directly.
- **NO database changes:** Phase 1 is purely configuration-driven. Database models for governance will be added in Phase 2 when dynamic tracking is needed.
- **Public page pattern:** Place in `apps/web/app/(public)/governance/` route group following the metrics/rewards pattern. No auth guards.
- **Component composition:** Server Component page imports static data and passes to Client Components for interactive elements (Accordion).

### Design Requirements (from UX Spec)

- **Typography:** Serif (Libre Baskerville / Source Serif Pro) for milestone titles and narrative descriptions. Sans-serif (Inter / Source Sans Pro) for labels, dates, timeline metadata.
- **Color system:**
  - Governance domain accent: `#7B6B8A` (slate violet) for dots and section accents
  - Current phase: `#C4956A` (warm terracotta) — subtle background tint + accent border
  - Completed phase: `#5A8A6B` (muted sage green) — indicator dot/border
  - Future phase: `#5A7A8A` (cool slate blue) — muted indicator
  - **NEVER** use red/green traffic-light indicators
- **Layout:** Max-width 720px for narrative content (optimal reading measure). Vertical timeline. Generous whitespace (`space.lg` = 24px minimum between milestone cards, `space.xl` = 32px between major sections).
- **Progressive disclosure:** Summary first (phase name + timeline + 1-2 sentence description), detail on expand (full governance capabilities, authority changes, key metrics). Use Radix Accordion with smooth 300ms transition.
- **Trust signals:** Use specific, honest language about governance mechanics. "Phase 1: Founding team maintains governance authority" not "Phase 1: Empowering the community." Acknowledge tradeoffs (e.g., "founding team retains veto authority during Phase 2").

### Content for Governance Roadmap Phases

The `PROGRESSIVE_DECENTRALIZATION_ROADMAP` constant should include these phases based on PRD analysis:

**Phase 0: Foundation (Q1 2026)** — Status: `completed`

- Founding team establishes platform, admission criteria, and community norms
- Governance: direct, human-facilitated decisions by founding team
- Capabilities: admission decisions, platform settings, community norms definition

**Phase 1: Community Input (Q2-Q3 2026)** — Status: `current`

- Contributors provide input on governance design through structured feedback
- Founding contributors influence governance framework design itself
- Capabilities: structured governance feedback, domain manifesto co-creation, evaluation criteria input

**Phase 2: Distributed Governance (Q4 2026 - Q1 2027)** — Status: `planned`

- Governance proposal workflow operational (FR53-FR55)
- Contributors accumulate governance weight from sustained quality contributions
- Governance weight formula: f(cumulative contribution score, active engagement duration, domain breadth multiplier) — quality-based, NOT token-based
- Capabilities: submit proposals, structured discussions, community voting on evaluation criteria, governance weight accumulation
- Founding team retains veto authority during transition

**Phase 3: Full Decentralization (2027+)** — Status: `planned`

- DAO governance with transparent voting mechanisms
- Governance weight fully determines voting power
- Founding team transitions to advisory/emeritus roles
- Capabilities: on-chain voting, autonomous governance proposals, community-elected leadership, immutable decision records

**Glossary terms:** Progressive Decentralization, Governance Weight, DAO, Governance Proposal, Founding Contributor, Domain Breadth Multiplier

### Critical Anti-Patterns (DO NOT)

- **DO NOT** add a NestJS module/controller/service — this is static content imported directly (same as rewards page)
- **DO NOT** use countdown timers, percentage progress bars, or urgency language
- **DO NOT** use red/green color coding for phase status
- **DO NOT** use marketing language — be specific and honest about governance mechanics
- **DO NOT** create database migrations — Phase 1 is constants-only
- **DO NOT** require authentication — this is a public page
- **DO NOT** use horizontal timeline — vertical is better for mobile and content scanning

### Project Structure Notes

- Alignment with established pattern: `apps/web/app/(public)/governance/` matches `metrics/` and `rewards/`
- Components in `apps/web/components/features/governance/` matches `metrics/` and `rewards/` organization
- Shared types in `packages/shared/src/types/governance.types.ts` matches `metrics.types.ts`
- Shared constants in `packages/shared/src/constants/governance-roadmap.ts` matches `reward-methodology.ts`
- No new dependencies needed — Radix UI (for Accordion) already available via `@edin/ui`

### References

- [Source: _bmad-output/planning-artifacts/prd.md — FR55b, Lines 778-779] Progressive decentralization roadmap definition
- [Source: _bmad-output/planning-artifacts/prd.md — Lines 228-236] Yuki persona journey (governance specialist)
- [Source: _bmad-output/planning-artifacts/prd.md — Lines 624-650] Phase 1/2/3 roadmap definitions
- [Source: _bmad-output/planning-artifacts/epics.md — Lines 693-713] Story 2.6 acceptance criteria and technical requirements
- [Source: _bmad-output/planning-artifacts/architecture.md] NestJS module patterns, Next.js App Router, API conventions
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] Timeline visualization, governance violet (#7B6B8A), typography, progressive disclosure, accessibility
- [Source: _bmad-output/implementation-artifacts/2-5-public-platform-metrics-and-reward-methodology.md] Previous story patterns — static content approach, SSR, component organization, Recharts patterns, testing approach
- [Source: apps/web/app/(public)/rewards/page.tsx] Direct pattern reference for static content page
- [Source: packages/shared/src/constants/reward-methodology.ts] Direct pattern reference for shared constants structure
- [Source: apps/web/components/features/rewards/] Component organization pattern reference

### Previous Story Intelligence (from Story 2-5)

- **Static content pattern confirmed:** Rewards page imports `REWARD_METHODOLOGY` directly from `@edin/shared` — no API call needed. Follow this exact pattern.
- **Component organization:** Hero, explainer, chart, breakdown, glossary pattern. Apply same structure: GovernanceHero, RoadmapTimeline, GovernanceExplainer, GovernanceGlossary.
- **Metadata pattern:** Use `generateMetadata()` returning `{ title, description, openGraph, twitter }`.
- **Skeleton pattern:** Co-locate skeleton variants with main components. Use `role="status"` and `aria-label="Loading..."`.
- **Testing pattern:** Use Vitest + React Testing Library. Test render, accessibility attributes, data table toggle, skeleton rendering. Use `@testing-library/user-event` for interactive tests.
- **Recharts lesson:** Not applicable to this story (no charts needed — timeline is custom CSS/HTML, not Recharts).
- **Prettier formatting:** Run `npx prettier --write` on all new files before committing to avoid pre-commit hook failures.

### Git Intelligence

Recent commits follow pattern: `feat: implement [feature description] (Story X-Y)`. Last 5 commits are all Epic 2 stories. Convention is well-established.

Files from Story 2-5 that serve as direct templates:

- `apps/web/app/(public)/rewards/page.tsx` — page structure
- `apps/web/app/(public)/rewards/loading.tsx` — loading skeleton
- `packages/shared/src/constants/reward-methodology.ts` — constants file structure
- `packages/shared/src/types/metrics.types.ts` — type definitions structure
- `apps/web/components/features/rewards/rewards-hero.tsx` — hero component
- `apps/web/components/features/rewards/glossary-section.tsx` — glossary pattern
- `apps/web/components/features/rewards/scaling-law-explainer.tsx` — narrative explainer
- `apps/web/components/features/rewards/rewards.test.tsx` — test file structure

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered. All tasks completed successfully in a single pass.

### Completion Notes List

- Implemented progressive decentralization roadmap as a public page at `/(public)/governance` following the established rewards/metrics pattern
- Created governance types (`DecentralizationMilestone`, `GovernancePhase`, `ProgressiveDecentralizationRoadmap`, `GovernanceGlossaryTerm`) and constants with 4 phases and 6 glossary terms
- Built vertical timeline UI with Radix Accordion for progressive disclosure — each phase shows summary by default and expands to reveal governance model, capabilities, and milestone descriptions
- Color system follows spec: current phase (#C4956A warm accent), completed (#5A8A6B muted sage), planned (#5A7A8A cool slate), governance violet (#7B6B8A) for hero title
- All status conveyed via both color AND text labels (never color-only) per AC #2
- Data table toggle provides accessible alternative to visual timeline (same pattern as domain-distribution-chart)
- `prefers-reduced-motion` media query disables accordion animations
- Server-side rendered page with `generateMetadata()` for full SEO (OpenGraph + Twitter Cards)
- 22 component tests covering: hero, explainer, timeline phases, progressive disclosure, glossary, data table toggle, skeleton, accessibility attributes
- Full regression suite passes (122 tests across 9 test files, 0 failures)
- All files formatted with Prettier
- Post-review hardening: added per-phase key metrics in constants + expanded milestone details, typed status mapping with `PhaseStatus`, reduced-motion handling for skeleton animation, and governance metadata unit test coverage
- Added explicit touch-target assertion (`min-h-[48px]`) and key-metrics rendering assertion in governance interaction tests

### Change Log

- 2026-03-04: Implemented Story 2-6 — Progressive Decentralization Roadmap public page with vertical timeline, Radix Accordion progressive disclosure, governance glossary, accessibility features, and 22 component tests
- 2026-03-04: Addressed code-review findings — added key metrics to expanded milestone view, strengthened typing for status colors, added metadata and touch-target tests, and extended reduced-motion handling to skeleton loaders

### File List

New files:

- `packages/shared/src/types/governance.types.ts`
- `packages/shared/src/constants/governance-roadmap.ts`
- `apps/web/app/(public)/governance/page.tsx`
- `apps/web/app/(public)/governance/loading.tsx`
- `apps/web/components/features/governance/governance-hero.tsx`
- `apps/web/components/features/governance/roadmap-timeline.tsx`
- `apps/web/components/features/governance/milestone-card.tsx`
- `apps/web/components/features/governance/governance-explainer.tsx`
- `apps/web/components/features/governance/governance-glossary.tsx`
- `apps/web/components/features/governance/governance-skeleton.tsx`
- `apps/web/components/features/governance/governance.test.tsx`

Modified files:

- `packages/shared/src/index.ts` — added governance type/constant exports
- `apps/web/app/globals.css` — added Radix Accordion animation keyframes and prefers-reduced-motion support
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status update
- `_bmad-output/implementation-artifacts/2-6-progressive-decentralization-roadmap.md` — task completion and dev record
