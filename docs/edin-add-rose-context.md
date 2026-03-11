# Task: Add Rose Project Context to the Edin Homepage

## Context

Edin is a contributor collaboration platform. Currently, the homepage presents Edin and its four contribution domains (Technology & Development, Fintech & Financial Engineering, Impact & Sustainability, Consciousness & Governance) without explaining what project contributors are actually working on. Edin currently has no reference to Rose anywhere.

**The key relationship:** Edin is the contributor platform _for_ Rose. All four domains serve Rose. Rose is not a fifth domain — it is the project that gives Edin its purpose.

---

## Changes Required

### 1. Homepage Header/Hero — Anchor Edin to Rose

The homepage should make the relationship clear from the first screen. The tagline or subtitle should convey that **Edin is the contributor platform for the Rose project**. Something like:

> "Edin — The contributor platform powering Rose, a new financial infrastructure for a fairer economy."

The current tagline "Where contributions take root and grow" can remain as a secondary line, but the Rose connection must come first.

---

### 2. New Section: "About Rose" (on the homepage, before the domains)

Add a dedicated section presenting Rose to visitors. This section should include the following content.

#### What Rose Is

Rose is a non-profit financial infrastructure project operated under the IOUR Foundation, a Belgian public benefit foundation (fondation d'utilité publique). Founded by Richard Olsen — co-founder of OANDA, pioneer in high-frequency finance research — Rose aims to reinvent the core plumbing of the global financial system.

#### The Problem Rose Solves

Today's financial system runs on infrastructure designed decades ago. Settlement takes days (T+2), capital sits idle overnight, and the system's slow reaction times amplify crises. Trillions in value are lost to friction, counterparty risk, and inefficiency. These structural flaws disproportionately affect smaller participants while concentrating advantages among large institutions.

#### The Rose Approach

Present the following key concepts. Keep descriptions short (1–2 sentences each). Use cards, an accordion, or a clean vertical layout — whatever fits the existing design system.

- **Intrinsic Time:** Instead of measuring markets by the clock, Rose uses event-driven time that adapts to actual market activity — accelerating during high volatility, slowing during calm periods. This reveals the true dynamics that clock-based models miss.

- **Fractal Market Microstructure & Scaling Laws:** Markets exhibit self-similar patterns across all time scales. Richard Olsen's research identified 12 empirical scaling laws in high-frequency data that provide statistical predictability to what appears chaotic.

- **Coastline Trading (Alpha Engine):** A trading strategy that captures value from the total path traveled by prices (the "coastline"), not just net price changes. An asset may end the year flat but travel a cumulative distance of 1,600% — the Alpha Engine harvests this volatility to generate yield.

- **Coupled Assets:** Tokenized pairs of opposite positions (long + short) that create instruments with built-in stability. The issuer is always delta-neutral, collateral is never idle, and every buyer automatically creates a counterparty.

- **Atomic Settlement & Intraday Money Market:** Real-time, instant settlement replacing the current T+2 cycle. An intraday money market allows lending and borrowing for minutes or hours, paying interest continuously. Zero counterparty risk by design.

#### The Broader Vision

Rose is more than a financial engine. The efficiency gains and yield captured by the Alpha Engine are designed to fund commons — free water, free energy, and peace-building initiatives. The project aims to shift the economy from extraction to regeneration.

#### Structure

Rose operates under the IOUR Foundation, a Belgian public benefit foundation. All intellectual property is held by the foundation. Commercial entities may be licensed to operate the technology, but always under conditions set by the foundation's governance.

---

### 3. Update the Domains Section

Add a short introductory sentence above the four domain cards:

> "Rose is built by contributors across four complementary domains. Every contribution, regardless of domain, advances the Rose mission."

The four domains remain unchanged:

1. Technology & Development
2. Fintech & Financial Engineering
3. Impact & Sustainability
4. Consciousness & Governance

---

### 4. Design and UX Guidelines

- **Page flow:** Visitor lands → sees Edin is for Rose (hero) → understands what Rose is (About Rose section) → sees how to contribute (four domains) → calls to action.
- **Tone:** Clean, professional. Rose is a serious financial infrastructure project, not a crypto startup. Avoid hype language.
- **Rose section length on homepage:** Concise overview. Add a "Learn more" link pointing to a dedicated `/rose` or `/about-rose` page where the full detail can live later.
- **Visual consistency:** Keep the Rose section consistent with Edin's existing design system. If a Rose logo or color scheme exists (shield with a rose motif, financial blue/teal tones), it can be used as an accent in this section. Otherwise, inherit Edin's styles.
- **Responsive:** The Rose section must work well on mobile. The key concepts can stack vertically on small screens.

---

## Summary of All Changes

| Location                     | Change                                           |
| ---------------------------- | ------------------------------------------------ |
| Hero / header                | Add Rose reference to main tagline               |
| New section (before domains) | "About Rose" — what, why, how, vision, structure |
| Domains section              | Add intro sentence linking all domains to Rose   |
| Navigation (optional)        | Add "Rose" or "About Rose" link in nav           |
| New route (optional, later)  | `/rose` or `/about-rose` for full detail page    |
