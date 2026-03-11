---
title: 'Add Rose Project Context to Edin Homepage'
slug: 'add-rose-context-homepage'
created: '2026-03-11'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  ['Next.js 16 (App Router)', 'React 19', 'Tailwind CSS v4', 'Radix UI (accordion)', 'TypeScript']
files_to_modify:
  - 'apps/web/components/features/showcase/hero-section.tsx'
  - 'apps/web/components/features/showcase/showcase-content.tsx'
  - 'apps/web/components/features/showcase/domains-section.tsx'
  - 'apps/web/components/features/navigation/public-nav.tsx'
  - 'apps/web/app/(public)/page.tsx'
files_to_create:
  - 'apps/web/components/features/showcase/rose-section.tsx'
  - 'apps/web/app/(public)/rose/page.tsx'
  - 'apps/web/components/features/rose/rose-hero.tsx'
  - 'apps/web/components/features/rose/rose-details.tsx'
code_patterns:
  - 'Section components as standalone exports in showcase/ directory'
  - 'Max-width 1200px container with mx-auto'
  - 'Spacing via CSS custom properties: var(--spacing-*)'
  - 'Typography: font-serif for headings, font-sans for body'
  - 'Colors: text-brand-primary (headings), text-brand-secondary (body), text-brand-accent (highlights)'
  - 'Sections use aria-label for accessibility'
  - 'Background alternation: surface-raised, surface-sunken, transparent'
  - 'Radix accordion with accordion-content CSS class and existing animations in globals.css'
  - 'NAV_LINKS array pattern in public-nav.tsx'
  - 'About page pattern: hero component + details component, imported in route page.tsx'
  - 'Server component page.tsx with generateMetadata() for SEO'
test_patterns: ['No frontend tests for showcase components — visual/manual testing only']
---

# Tech-Spec: Add Rose Project Context to Edin Homepage

**Created:** 2026-03-11

## Overview

### Problem Statement

Edin is the contributor platform for the Rose project, but the homepage makes no reference to Rose. Visitors see Edin's four contribution domains without understanding what project they'd be contributing to. The relationship between Edin (platform) and Rose (project) is invisible.

### Solution

Add Rose context throughout the homepage: update the hero tagline to anchor Edin to Rose, create a new "About Rose" section after the hero, add an intro sentence to the domains section, add an "About Rose" link to navigation, and create a dedicated `/rose` page with full Rose details.

### Scope

**In Scope:**

- Update hero section with Rose-anchored tagline and "Discover Rose" CTA
- New "About Rose" section on homepage (after hero, before HowItWorks)
- Intro sentence above domains section linking all domains to Rose
- "About Rose" link in public navigation
- New `/rose` route with full Rose content page
- Update homepage metadata to reference Rose
- Responsive design for all new content

**Out of Scope:**

- Rose logo or custom visual branding (inherit Edin's design system)
- Changes to existing domain content or descriptions
- Backend/API changes
- i18n (project is English-only)
- Changes to authenticated/dashboard routes

## Context for Development

### Codebase Patterns

**Section component pattern (showcase/):**

- Each section is a standalone function component exported from its own file
- Sections follow: `<section aria-label="..." className="..."> <div className="mx-auto max-w-[1200px]"> ... </div> </section>`
- Sections alternate backgrounds: `bg-surface-sunken`, `bg-surface-raised`, or no bg (transparent = `surface-base`)
- ShowcaseContent orchestrates order: Hero → HowItWorks → Pillars → EvaluationMetrics → Domains → FoundingCircle → CTA

**Typography:**

- Headings: `font-serif text-[clamp(1.5rem,3vw,2rem)] font-bold text-brand-primary`
- Subtitles: `font-sans text-[15px] leading-[1.6] text-brand-secondary`
- Body: `font-sans text-[14px] leading-[1.65] text-brand-secondary`
- Labels: `font-mono text-[13px] font-medium uppercase tracking-[0.15em] text-brand-accent`

**Spacing:**

- Section padding: `px-[var(--spacing-lg)] py-[var(--spacing-2xl)]`
- Between elements: `mt-[var(--spacing-sm)]` to `mt-[var(--spacing-xl)]`

**Navigation:**

- `NAV_LINKS` array of `{ href, label }` objects
- Active state: `text-brand-accent`, inactive: `text-brand-secondary hover:text-brand-primary`

**Page route pattern (about/ as reference):**

- `page.tsx` is a server component with `generateMetadata()` for SEO
- Composes hero + details components
- Wraps in `<main className="min-h-screen bg-surface-base">`

**Accordion (already available):**

- `@radix-ui/react-accordion` in dependencies
- CSS animations for `accordion-content[data-state='open'|'closed']` already in `globals.css`
- Respects `prefers-reduced-motion`

### Files to Reference

| File                                                         | Purpose                                                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `apps/web/components/features/showcase/showcase-content.tsx` | Homepage section orchestrator — add RoseSection import + render                            |
| `apps/web/components/features/showcase/hero-section.tsx`     | Hero with tagline "Where Expertise Becomes Publication" + 2 CTAs — update tagline, add CTA |
| `apps/web/components/features/showcase/pillars-section.tsx`  | Reference for card layout with icons                                                       |
| `apps/web/components/features/showcase/domains-section.tsx`  | Four domain cards — add intro sentence                                                     |
| `apps/web/components/features/navigation/public-nav.tsx`     | NAV_LINKS array — add "About Rose" entry                                                   |
| `apps/web/app/(public)/page.tsx`                             | Homepage route with metadata — update metadata                                             |
| `apps/web/app/(public)/about/page.tsx`                       | About page — reference pattern for `/rose` route                                           |
| `apps/web/components/features/about/about-hero.tsx`          | About hero — reference for rose-hero.tsx                                                   |
| `apps/web/components/features/about/about-details.tsx`       | About details — reference for rose-details.tsx                                             |
| `apps/web/app/globals.css`                                   | Design tokens + accordion animations                                                       |
| `docs/edin-add-rose-context.md`                              | Source requirements with all Rose content                                                  |

### Technical Decisions

- **Key concepts layout on homepage**: Use Radix accordion — compact, expandable, mobile-friendly, already installed with CSS animations. Each concept (Intrinsic Time, Fractal Market, Coastline Trading, Coupled Assets, Atomic Settlement) is an accordion item with a bolded title and 1-2 sentence description.
- **Rose section on homepage**: Concise overview (what Rose is + key concepts accordion + "Learn more" link to `/rose`). Background: `bg-surface-sunken` to visually distinguish from hero above.
- **`/rose` page**: Full detail page following the about page pattern — `rose-hero.tsx` + `rose-details.tsx`. Contains all content from requirements doc: what, problem, approach (expanded), vision, structure.
- **Hero update**: Keep existing tagline as secondary line. Add primary line: "The contributor platform powering Rose, a new financial infrastructure for a fairer economy." Add third CTA button "Discover Rose" linking to `/rose`.
- **Domains intro**: Add paragraph above the domain cards: "Rose is built by contributors across four complementary domains. Every contribution, regardless of domain, advances the Rose mission."
- **Nav placement**: Add "About Rose" link after "About" in NAV_LINKS — logical grouping.
- **Metadata**: Update homepage `generateMetadata()` to include Rose in title and description.
- **Tone**: Professional, serious financial infrastructure. No crypto/DeFi hype. Rose is a "non-profit financial infrastructure project."

## Implementation Plan

### Tasks

#### Task 1: Create the homepage Rose section component

- [x] **Create file:** `apps/web/components/features/showcase/rose-section.tsx`
- **Action:** Create a `'use client'` component `RoseSection` that renders a concise "About Rose" overview for the homepage. This component must:
  - Use `bg-surface-sunken` background to contrast with the hero above
  - Follow section pattern: `<section aria-label="About Rose">` with `max-w-[1200px]` container
  - Include a mono label "The Rose Project" (using label typography pattern)
  - Include heading: "A New Financial Infrastructure for a Fairer Economy"
  - Include a short "What Rose Is" paragraph:
    > "Rose is a non-profit financial infrastructure project operated under the IOUR Foundation, a Belgian public benefit foundation. Founded by Richard Olsen — co-founder of OANDA, pioneer in high-frequency finance research — Rose aims to reinvent the core plumbing of the global financial system."
  - Include a Radix accordion with 5 items for the key concepts. Each item has a bold trigger title and a content body (1-2 sentences). Use the `accordion-content` CSS class for animations. The 5 items:
    1. **Intrinsic Time** — "Instead of measuring markets by the clock, Rose uses event-driven time that adapts to actual market activity — accelerating during high volatility, slowing during calm periods. This reveals the true dynamics that clock-based models miss."
    2. **Fractal Market Microstructure & Scaling Laws** — "Markets exhibit self-similar patterns across all time scales. Richard Olsen's research identified 12 empirical scaling laws in high-frequency data that provide statistical predictability to what appears chaotic."
    3. **Coastline Trading (Alpha Engine)** — "A trading strategy that captures value from the total path traveled by prices (the 'coastline'), not just net price changes. An asset may end the year flat but travel a cumulative distance of 1,600% — the Alpha Engine harvests this volatility to generate yield."
    4. **Coupled Assets** — "Tokenized pairs of opposite positions (long + short) that create instruments with built-in stability. The issuer is always delta-neutral, collateral is never idle, and every buyer automatically creates a counterparty."
    5. **Atomic Settlement & Intraday Money Market** — "Real-time, instant settlement replacing the current T+2 cycle. An intraday money market allows lending and borrowing for minutes or hours, paying interest continuously. Zero counterparty risk by design."
  - Include a "Learn more about Rose" link (`<Link href="/rose">`) styled as a text link with accent color
  - Import `@radix-ui/react-accordion` for the accordion component
  - Responsive: accordion items stack vertically naturally; no special mobile handling needed
- **Notes:** Reference `pillars-section.tsx` for the section structure pattern. Use the existing accordion CSS animations from `globals.css` by applying `className="accordion-content"` to `Accordion.Content`.

#### Task 2: Update the hero section

- [x] **Modify file:** `apps/web/components/features/showcase/hero-section.tsx`
- **Action:** Update the `HeroSection` component:
  1. Change the mono label from `"Curated Contributor Platform"` to `"Contributor Platform for Rose"`
  2. Keep the existing h1 tagline "Where Expertise Becomes Publication" as-is
  3. Replace the subtitle paragraph text:
     - **From:** `"A curated platform where every contribution is evaluated by AI, rewarded through scaling-law economics, and published by the community that built it."`
     - **To:** `"The contributor platform powering Rose, a new financial infrastructure for a fairer economy. Every contribution is evaluated by AI, rewarded through scaling-law economics, and published by the community."`
  4. Add a third CTA button "Discover Rose" between the existing two buttons, linking to `/rose`. Style it the same as the "Learn More" button (outline/secondary style with border):
     ```
     <Link href="/rose" className="inline-flex items-center rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-semibold text-brand-primary transition-all duration-[var(--transition-fast)] hover:border-brand-secondary">
       Discover Rose
     </Link>
     ```
  5. Reorder CTAs: "Apply to Join" (primary) → "Discover Rose" (secondary) → "Learn More" (secondary)
- **Notes:** The `HeroSkeleton` export does not need changes (it doesn't render text content).

#### Task 3: Update the domains section with Rose intro

- [x] **Modify file:** `apps/web/components/features/showcase/domains-section.tsx`
- **Action:** Add a Rose-linking introductory paragraph below the existing subtitle paragraph and above the grid:
  - Add a new `<p>` tag after the existing subtitle paragraph (the one starting with "Unlike code-centric platforms..."):
    ```
    <p className="mx-auto mt-[var(--spacing-sm)] max-w-[520px] text-center font-sans text-[15px] leading-[1.6] text-brand-secondary">
      Rose is built by contributors across four complementary domains. Every contribution, regardless of domain, advances the Rose mission.
    </p>
    ```
- **Notes:** The existing subtitle and heading remain unchanged. Only add the new paragraph.

#### Task 4: Add "About Rose" to navigation

- [x] **Modify file:** `apps/web/components/features/navigation/public-nav.tsx`
- **Action:** Add a new entry to the `NAV_LINKS` array after the "About" entry:
  ```typescript
  { href: '/rose', label: 'About Rose' },
  ```
  The resulting array should be:
  ```typescript
  const NAV_LINKS = [
    { href: '/articles', label: 'Publication' },
    { href: '/contributors', label: 'Contributors' },
    { href: '/about', label: 'About' },
    { href: '/rose', label: 'About Rose' },
    { href: '/docs', label: 'Docs' },
    { href: '/apply', label: 'Apply' },
  ];
  ```
- **Notes:** Active state styling is already handled generically by the `isActive` logic based on `pathname`.

#### Task 5: Wire RoseSection into homepage orchestrator

- [x] **Modify file:** `apps/web/components/features/showcase/showcase-content.tsx`
- **Action:**
  1. Add import: `import { RoseSection } from './rose-section';`
  2. Add `<RoseSection />` after `<HeroSection />` and before `<HowItWorksSection />` in the JSX:
     ```tsx
     <HeroSection />
     <RoseSection />
     <HowItWorksSection />
     ```
- **Notes:** No props needed — RoseSection is fully self-contained with static content.

#### Task 6: Update homepage metadata

- [x] **Modify file:** `apps/web/app/(public)/page.tsx`
- **Action:** Update `generateMetadata()` to reference Rose:
  - **title:** `"Edin — Contributor Platform Powering Rose"`
  - **description:** `"Edin is the contributor platform for Rose, a non-profit financial infrastructure project. Contribute across technology, finance, impact, and governance — evaluated by AI, rewarded through scaling-law economics."`
  - Update both `openGraph` and `twitter` objects with the same title and description.
- **Notes:** No other changes to this file. The server-side data fetching remains unchanged.

#### Task 7: Create the Rose hero component

- [x] **Create file:** `apps/web/components/features/rose/rose-hero.tsx`
- **Action:** Create a `RoseHero` component following the `about-hero.tsx` pattern:
  - Background: `bg-linear-to-b from-surface-raised to-surface-sunken`
  - Heading (h1): "About Rose"
  - Subtitle paragraph: "Rose is a non-profit financial infrastructure project operated under the IOUR Foundation, a Belgian public benefit foundation. Founded by Richard Olsen — co-founder of OANDA, pioneer in high-frequency finance research — Rose aims to reinvent the core plumbing of the global financial system."
  - Follow exact same styling as `about-hero.tsx` (padding, max-width, font sizes, centering)
- **Notes:** Include a `RoseHeroSkeleton` export following the same pattern as `AboutHeroSkeleton`.

#### Task 8: Create the Rose details component

- [x] **Create file:** `apps/web/components/features/rose/rose-details.tsx`
- **Action:** Create a `RoseDetails` component following the `about-details.tsx` pattern. Must contain these sections in order:

  **Section 1: "The Problem"** (no background / transparent)
  - Heading: "The Problem Rose Solves"
  - Body (use same `font-serif text-[15px] leading-[1.7]` prose style as about-details Mission section):
    > "Today's financial system runs on infrastructure designed decades ago. Settlement takes days (T+2), capital sits idle overnight, and the system's slow reaction times amplify crises. Trillions in value are lost to friction, counterparty risk, and inefficiency. These structural flaws disproportionately affect smaller participants while concentrating advantages among large institutions."

  **Section 2: "The Rose Approach"** (`bg-surface-sunken`)
  - Heading: "The Rose Approach"
  - Render the 5 key concepts in a vertical numbered list (following the `HOW_IT_WORKS_STEPS` pattern from about-details.tsx with numbered circles and connector lines). Each concept:
    1. **Intrinsic Time** — full description from requirements doc
    2. **Fractal Market Microstructure & Scaling Laws** — full description
    3. **Coastline Trading (Alpha Engine)** — full description
    4. **Coupled Assets** — full description
    5. **Atomic Settlement & Intraday Money Market** — full description
  - Use the numbered circle + connector line pattern from `about-details.tsx` `HOW_IT_WORKS_STEPS`

  **Section 3: "The Broader Vision"** (no background / transparent)
  - Heading: "The Broader Vision"
  - Body:
    > "Rose is more than a financial engine. The efficiency gains and yield captured by the Alpha Engine are designed to fund commons — free water, free energy, and peace-building initiatives. The project aims to shift the economy from extraction to regeneration."

  **Section 4: "Structure"** (`bg-surface-sunken`)
  - Heading: "Foundation Structure"
  - Body:
    > "Rose operates under the IOUR Foundation, a Belgian public benefit foundation. All intellectual property is held by the foundation. Commercial entities may be licensed to operate the technology, but always under conditions set by the foundation's governance."

- **Notes:** Follow exact styling patterns from `about-details.tsx`. Use `max-w-[800px]` for content width. Use `font-serif` for headings and body prose as in the Mission section.

#### Task 9: Create the `/rose` route page

- [x] **Create file:** `apps/web/app/(public)/rose/page.tsx`
- **Action:** Create a server component page following the `about/page.tsx` pattern:
  1. Import `RoseHero` from `../../../components/features/rose/rose-hero`
  2. Import `RoseDetails` from `../../../components/features/rose/rose-details`
  3. Export `generateMetadata()`:
     - **title:** `"About Rose — A New Financial Infrastructure for a Fairer Economy"`
     - **description:** `"Rose is a non-profit financial infrastructure project by the IOUR Foundation, reinventing the global financial system through intrinsic time, fractal markets, and atomic settlement."`
     - Include `openGraph` and `twitter` objects with same values
  4. Default export `RosePage` component:
     ```tsx
     export default function RosePage() {
       return (
         <main className="min-h-screen bg-surface-base">
           <RoseHero />
           <RoseDetails />
         </main>
       );
     }
     ```
- **Notes:** No data fetching needed — all content is static.

### Acceptance Criteria

- [ ] **AC 1:** Given a visitor on the homepage, when the page loads, then the hero section displays "Contributor Platform for Rose" as the label and the subtitle references Rose as "a new financial infrastructure for a fairer economy."

- [ ] **AC 2:** Given a visitor on the homepage, when they see the hero CTAs, then three buttons are visible: "Apply to Join", "Discover Rose" (links to `/rose`), and "Learn More" (links to `/about`).

- [ ] **AC 3:** Given a visitor on the homepage, when they scroll past the hero, then an "About Rose" section is visible with a description of Rose and an accordion containing 5 expandable key concepts (Intrinsic Time, Fractal Market Microstructure & Scaling Laws, Coastline Trading, Coupled Assets, Atomic Settlement & Intraday Money Market).

- [ ] **AC 4:** Given a visitor clicks an accordion item in the Rose section, when the item expands, then it smoothly animates open and shows the concept description. When clicked again, it smoothly closes.

- [ ] **AC 5:** Given a visitor on the homepage, when they reach the domains section, then a new paragraph is visible above the domain cards: "Rose is built by contributors across four complementary domains. Every contribution, regardless of domain, advances the Rose mission."

- [ ] **AC 6:** Given a visitor looking at the navigation bar, when they view the nav links, then "About Rose" appears between "About" and "Docs" and links to `/rose`.

- [ ] **AC 7:** Given a visitor navigating to `/rose`, when the page loads, then a full Rose detail page is displayed with sections: hero, "The Problem Rose Solves", "The Rose Approach" (5 numbered concepts), "The Broader Vision", and "Foundation Structure."

- [ ] **AC 8:** Given a visitor on the `/rose` page, when they view the page source or social preview, then the page title is "About Rose — A New Financial Infrastructure for a Fairer Economy" and the description references the IOUR Foundation.

- [ ] **AC 9:** Given a visitor on a mobile device (viewport < 640px), when they view the homepage Rose section, then the accordion items stack vertically and are fully usable with touch. The "Discover Rose" CTA in the hero wraps properly.

- [ ] **AC 10:** Given a visitor on the homepage Rose section, when they click "Learn more about Rose", then they are navigated to `/rose`.

## Additional Context

### Dependencies

- No new package dependencies required
- `@radix-ui/react-accordion` already installed
- Accordion CSS animations already in `globals.css`
- No backend/API changes needed
- All content is static (from requirements doc `docs/edin-add-rose-context.md`)

### Testing Strategy

- **Manual visual testing:** Verify each AC visually in the browser at multiple viewpoints (mobile 375px, tablet 768px, desktop 1280px+)
- **Accordion interaction:** Verify open/close animations, multiple items behavior (single vs multiple open), keyboard accessibility (Enter/Space to toggle)
- **Navigation:** Verify "About Rose" link appears, highlights correctly on `/rose`, and navigates properly
- **SEO:** Verify page metadata in browser dev tools (title, description, OG tags) for both homepage and `/rose`
- **Accessibility:** Verify `aria-label` on sections, accordion keyboard navigation, screen reader announces accordion state changes
- **No regressions:** Verify existing homepage sections (HowItWorks, Pillars, Metrics, Domains cards, FoundingCircle, CTA) are unchanged

### Notes

- The Finance domain was recently renamed from "Fintech" — spec uses "Finance"
- The About page hero already mentions "the Rose decentralized finance ecosystem" — so Rose as a concept exists in the codebase, just not on the homepage
- New homepage page flow: Hero (Edin is for Rose) → **About Rose** → HowItWorks → Pillars → Metrics → Domains (with intro sentence) → FoundingCircle → CTA
- Navigation order: Publication, Contributors, About, **About Rose**, Docs, Apply
- All Rose content is sourced from `docs/edin-add-rose-context.md` — no content needs to be invented
- Tone is critical: Rose is a "non-profit financial infrastructure project", not a "crypto startup" or "DeFi protocol"

## Review Notes

- Adversarial review completed
- Findings: 12 total, 5 fixed, 7 skipped (spec-driven/noise/pattern-consistent)
- Resolution approach: auto-fix
- Fixes applied: extracted shared rose-data.ts (F2/F3), created loading.tsx for /rose (F4), extracted metadata constants (F8), title-based accordion values (F9)
- Skipped: F1 (pre-existing nav architecture), F5 (spec requires Radix), F6/F7 (spec-driven), F10 (matches codebase pattern), F11 (noise), F12 (minor/no icon library)
