# EDIN — Contributor Platform

**A Rose Project Initiative**

*Version 0.3 — Draft — February 27, 2026*

---

## 1. Executive Summary

Edin is a curated contributor platform designed to organize, incentivize, and scale collaborative development within the Rose ecosystem. Named after the ancient Sumerian word for a fertile plain — a concept shared across Judeo-Christian, Islamic, and Mesopotamian traditions — Edin embodies the vision of a cultivated garden where diverse contributors come together to build a new financial engine for the future.

The platform combines the collaborative power of open-source development workflows with a structured, admission-based community model, an AI-powered contribution evaluation system, and a multi-scale reward mechanism — operating across both multiple contribution dimensions and multiple time horizons — leveraging blockchain-based tokens for trustless and transparent incentivization. Edin does not replace existing work tools; it integrates with them, analyzes the output contributors produce, and translates quality and impact into fair rewards.

Edin is not just a development tool. It is a social and economic experiment: as AI agents increasingly take over routine work, the platform creates space for human empowerment, skills development, and meaningful participation in the construction of next-generation financial infrastructure.

---

## 2. Context and Origin

### 2.1 The Rose Project

Edin is a core initiative within Rose, a venture structured as a non-profit foundation (IOUR Foundation, Belgium) dedicated to building a next-generation decentralized financial infrastructure. Grounded in the Olsen Real-Time Finance Model (ORTFM), Rose reimagines financial markets through the lens of intrinsic time, fractal microstructure, and 12 empirical scaling laws discovered in high-frequency data. The platform introduces coupled assets (delta-neutral tokenized pairs), real-time atomic settlement, an intraday money market, and a Coastline Trading engine (Alpha Engine) that captures the vast untapped value in price trajectory volatility to fund societal regeneration.

Rose encompasses the foundation's governance, the financial technology, the branding and investor strategy, and the contributor ecosystem. Edin serves as the operational backbone of this last pillar — the platform through which all contributions to the Rose ecosystem flow, are evaluated, and are rewarded. While Rose defines *what* is being built, Edin defines *how* the community collaborates to build it. Notably, Edin's multi-scale reward system is directly informed by Rose's scaling law methodology — the same mathematical principles that govern the Alpha Engine also govern how contributor rewards are sized and distributed across time scales.

### 2.2 The Name: Edin

The name *Edin* was chosen for its deep cultural resonance and inclusivity. In Sumerian, *edin* referred to the fertile steppe between the rivers. The concept reappears as *Eden* in the Hebrew Bible and as *Adin/Edin* in Islamic tradition. By reaching back to the earliest known usage, the name transcends any single religious or cultural frame, evoking a universal symbol of fertile ground, prosperity, and the overcoming of obstacles.

### 2.3 Why Now

The convergence of three forces makes this the right moment to launch Edin:

- **AI transformation of work.** Up to 75% of routine development work is becoming automatable through AI agents. This creates both a challenge and an opportunity: the need for new models that empower people beyond routine tasks.
- **Limitations of the open-source model.** Open-source has proven its power but lacks structured incentive mechanisms for sustained, high-quality contributions. Contributors often burn out or leave without fair compensation.
- **Maturity of blockchain economics.** Blockchain technology now offers efficient means of transparent, trustless reward distribution — making it possible to build incentive models that were not feasible even a few years ago.

Edin sits at the intersection of these trends.

---

## 3. Platform Vision

### 3.1 Core Principles

- **Curated Community.** Edin is not open to all. Contributors join by admission, ensuring quality, trust, and alignment with the project's values. This is a garden, not a wilderness.
- **Multi-Scale Rewards.** The reward system operates across multiple dimensions — different contribution types, different mechanics — and across multiple time scales, from hourly micro-rewards to yearly commitment recognition. Reward sizing follows a scaling law methodology where longer-term engagement yields disproportionately greater value.
- **AI-Augmented Evaluation.** Artificial intelligence is used to analyze contributions, assess quality, track attribution, and ensure fair and objective evaluation at scale.
- **Human Empowerment.** As AI handles more routine tasks, Edin creates opportunities for training, soft skills development, creative thinking, and leadership — the uniquely human capabilities that matter most in an automated world.
- **Simplicity and Scalability.** The platform starts simple and is designed to scale organically. Complexity is added incrementally as the community grows and needs evolve.
- **Integration, Not Reinvention.** Edin does not replace the tools contributors already use. It connects to existing work environments, ingests the artifacts produced, and focuses its intelligence on evaluation, attribution, and reward. Contributors keep their workflows; Edin analyzes their output.

### 3.2 What Edin Is Not

Edin is not a generic freelance marketplace, a bounty board, or an unmoderated open-source repository. It is a closed, curated environment with clear governance, shared purpose, and transparent incentives. It differs from existing platforms through its integration of AI evaluation, blockchain rewards, and a deliberate focus on human growth alongside technical output.

### 3.3 Integration-First Principle

Edin is a contribution platform, not a productivity suite. It does not aim to reinvent or replace the tools that contributors already use — document editors, IDEs, design software, communication platforms, project management tools, or any other workplace applications. Contributors work with whatever tools best fit their expertise and workflow.

Edin's role is to sit on top of these existing tools and analyze what contributors produce: code commits, documents, research outputs, design deliverables, review comments, governance proposals, and any other artifact that represents a contribution to the Rose ecosystem. The platform connects to external tools and repositories, ingests the outputs, and feeds them through the Evaluation Engine for quality assessment, attribution, and reward calculation.

This approach has three important consequences:

- **Zero friction for contributors.** No one is forced to learn a new tool or change their workflow to participate. Edin adapts to contributors, not the other way around.
- **Focus on value, not activity.** By analyzing deliverables rather than tracking time or tool usage, Edin measures what matters — the quality and impact of actual output.
- **Sustainable architecture.** By leveraging mature, battle-tested external tools, Edin avoids the cost and complexity of maintaining general-purpose software and can concentrate all development effort on its unique value: evaluation, reward, and governance.

---

## 4. Functional Architecture

### 4.1 Overview

Edin follows an integration-first architecture: it does not replicate existing tools but connects to them, ingests their outputs, and adds its unique layers of evaluation, reward, and governance. The platform is organized around five interconnected functional layers:

| Layer | Description |
|---|---|
| **Integration Layer** | Connectors to external tools (repositories, document platforms, communication tools, project management) that ingest contributor outputs without imposing workflow changes |
| **Web Portal** | Public-facing website and contributor dashboard for community interaction, onboarding, and visibility |
| **Evaluation Engine** | AI-powered system for analyzing contributions from all connected sources, assessing quality, and attributing credit |
| **Reward System** | Multi-scale incentive mechanism with token-based distribution on blockchain |
| **Governance Layer** | Admission control, role management, community curation, and decision-making frameworks |

### 4.2 Integration Layer

Edin does not host or replace the tools contributors use. Instead, it provides a connective layer that interfaces with external platforms where work actually happens — code repositories, document collaboration suites, communication channels, design tools, and project management systems. The primary integration point is a public GitHub repository that serves as the single source of truth for code and specifications, but the platform is designed to ingest contribution artifacts from any connected source.

**Functional requirements:**

- Connectors to code repositories (GitHub, GitLab) for commit history, pull requests, reviews, and CI/CD outputs
- Connectors to document and knowledge platforms (Google Workspace, Notion, wikis) for written contributions
- Connectors to communication tools (Slack, Discord, forums) for community participation tracking
- A unified contribution ingestion pipeline that normalizes artifacts from all sources into a common format for the Evaluation Engine
- Full contribution history and attribution tracking across all connected tools
- Open connector architecture allowing new tool integrations as the community's needs evolve

### 4.3 Web Portal

The web portal is the public-facing interface of Edin. It serves as the entry point for all stakeholders — contributors, applicants, investors, and the broader community.

**Functional requirements:**

- **Contributor profiles:** Personal dashboard showing contribution history, active projects, earned rewards, and skill areas
- **Activity feed:** Real-time stream of project activity, milestones, and community updates
- **Project showcase:** Public-facing view of the project's progress, key metrics, and achievements
- **Application workflow:** Structured admission process for new contributor candidates, including skill assessment and values alignment review
- **Reward dashboard:** Transparent view of reward distribution, token balances, and earning history
- **Governance hub:** Proposals, votes, community decisions, and governance documentation

### 4.4 AI-Powered Evaluation Engine

One of Edin's distinguishing features is the use of AI for contribution evaluation. Rather than relying solely on manual review or subjective assessments, the platform provides objective, scalable quality assessment. The Evaluation Engine operates on artifacts ingested through the Integration Layer — it analyzes what contributors have produced in their own tools, not what they do inside Edin itself.

**Functional requirements:**

- **Code quality analysis:** Automated assessment of code complexity, maintainability, test coverage, and adherence to standards — based on commits and pull requests ingested from connected repositories
- **Documentation evaluation:** Completeness, clarity, and usefulness scoring for written contributions ingested from document platforms, wikis, and knowledge bases
- **Contribution pattern analysis:** Frequency, consistency, and growth trajectory tracking across all connected sources for each contributor
- **Collaboration scoring:** Recognition of mentoring activity, code review quality, and constructive community participation — drawn from review comments, forum discussions, and communication channels
- **Goal alignment assessment:** Measurement of how individual contributions advance project-level objectives
- **Fair attribution:** Objective credit assignment when multiple contributors work on shared deliverables across different tools
- **Evaluation transparency:** Contributors can see how their work was scored and understand the criteria applied

These evaluations feed directly into the Reward System at every temporal scale, ensuring that incentives are distributed fairly based on measurable impact — from immediate task-level recognition to long-term strategic contribution rewards.

### 4.5 Multi-Scale Reward System

The reward system is the economic heart of Edin. It is multi-scale in two complementary senses: it recognizes multiple *dimensions* of contribution, and it operates across multiple *time scales*. This dual structure ensures that value is captured at every level of granularity — from a quick code review to a year-long strategic initiative — and that contributors are incentivized for both immediate impact and sustained commitment.

#### Reward Dimensions

| Dimension | Examples |
|---|---|
| **Code Contributions** | Commits, pull requests, bug fixes, feature implementations, code reviews |
| **Knowledge Contributions** | Documentation, tutorials, research, architectural proposals, educational content |
| **Community Contributions** | Mentoring, onboarding new members, organizing events, facilitating discussions, governance participation |
| **Strategic Contributions** | Business development, investor outreach, partnership building, branding, market analysis |

#### Temporal Reward Scales

Rewards are distributed across seven distinct time horizons, each capturing a different rhythm of contribution:

| Time Scale | Cycle | Purpose |
|---|---|---|
| **Hourly** | Per task/session | Immediate recognition for focused work sessions, sprint contributions, and real-time collaboration |
| **6-Hourly** | Intra-day | Captures sustained effort within a working day, rewarding deep work and multi-task engagement |
| **Daily** | End of day | Aggregated daily contribution score reflecting overall productivity and quality |
| **Weekly** | End of week | Recognizes consistency and follow-through across a working week, including collaboration patterns |
| **Monthly** | End of month | Rewards sustained engagement, milestone completion, and community participation over a full cycle |
| **Quarterly** | End of quarter | Strategic-level recognition for project milestones, leadership contributions, and measurable impact |
| **Yearly** | Annual | Long-term commitment rewards, ecosystem growth participation, and foundational contribution recognition |

This multi-temporal structure creates a continuous incentive gradient: contributors receive quick feedback through short-cycle rewards while building toward larger, compounding long-term rewards.

#### Scaling Law Methodology

Reward sizing follows a scaling law approach rather than linear distribution — directly inspired by the 12 empirical scaling laws at the heart of the ORTFM (see the Rose Vision Document). Just as the Coastline Law (Law #12) reveals that tradeable opportunity increases non-linearly as observation thresholds decrease, Edin's reward magnitudes across time scales follow a power-law relationship where longer time horizons yield disproportionately larger rewards relative to the sum of their shorter-cycle components. This design:

- **Incentivizes retention:** The compounding nature of longer-cycle rewards creates a strong incentive to stay engaged over time, as the value of sustained contribution grows non-linearly.
- **Reflects real impact:** Strategic and foundational contributions often have outsized, delayed effects that a linear model would undervalue. Scaling laws capture this asymmetry.
- **Prevents gaming:** Short-cycle rewards alone could encourage quantity over quality. The scaling law structure ensures that contributors who optimize for long-term, high-quality engagement are rewarded disproportionately.
- **Mirrors natural systems:** Scaling laws are observed throughout economics, network effects, and natural growth patterns. Applying them to contribution rewards aligns the incentive structure with the organic dynamics of community building.

The precise scaling exponents and distribution parameters will be calibrated during the design phase, informed by empirical data from the community's early contribution patterns.

#### Blockchain Integration

The platform implements a trustless reward distribution model built on blockchain technology:

- **Project token:** A dedicated token representing contribution value within the Edin ecosystem
- **Automated distribution:** Smart contracts that distribute rewards based on Evaluation Engine outputs across all time scales, removing human bias from the process
- **Immutable records:** Transparent and permanent record-keeping of all contributions and associated rewards at every temporal granularity
- **Long-term alignment:** Staking or vesting mechanisms tied to the scaling law structure, amplifying rewards for contributors who commit to the ecosystem's growth over time
- **Secondary value:** Potential for token utility beyond direct rewards (governance voting weight, access tiers, etc.)

The token economics will be designed to balance simplicity of implementation with the sophistication needed for the multi-scale, scaling-law-based incentivization model.

#### Regulatory Considerations

Because the Edin reward token operates on blockchain within the European Union, the platform must be designed in compliance with the evolving EU regulatory framework. Key regulations include MiCA (Markets in Crypto-Assets Regulation), which governs the issuance, offering, and trading of crypto-assets, and eIDAS 2.0 for digital identity. The reward token's classification — whether as a utility token, an e-money token, or an asset-referenced token under MiCA — will determine the applicable compliance requirements and shape the token's design. Rose's non-profit foundation structure also influences how rewards can be distributed and how contributors interact with the token economy. Regulatory compliance is a first-class design constraint, not an afterthought.

### 4.6 Governance and Admission

Edin operates as a closed, curated community. Access is controlled through a structured admission process.

**Admission criteria:**

- Alignment with the project's values and mission
- Relevant skills, experience, or domain expertise
- Willingness to contribute constructively and consistently
- Endorsement by an existing contributor (after initial seeding phase)

**Role framework:**

Once admitted, contributors are assigned roles reflecting their expertise and areas of focus. Roles are organized across four strategic categories:

| Category | Scope |
|---|---|
| **Technology & Development** | Platform architecture, AI integration, blockchain implementation, full-stack development, DevOps |
| **Fintech & Financial Engineering** | Token economics, regulatory compliance, financial infrastructure, payment systems, market mechanisms |
| **Impact & Sustainability** | Social impact measurement, environmental considerations, inclusive design, long-term sustainability |
| **Consciousness & Governance** | Community governance design, ethical frameworks, decision-making structures, values alignment |

**Governance evolution:**

The founding core team establishes the initial governance framework and seeds the community. As the platform grows, governance progressively decentralizes, potentially incorporating DAO-like structures where token holders participate in key decisions. Edin's governance operates within the broader framework of the IOUR Foundation, a Belgian non-profit entity whose capital management follows a conservative 30/70 rule: only 30% of raised capital is actively deployed, while 70% is held in reserve treasury — a principle of abundance and sustainability that also guides Edin's reward economics.

---

## 5. User Journeys

### 5.1 New Contributor

1. Discovers Edin through the web portal or a personal referral
2. Reviews the project's mission, values, and current priorities
3. Submits an application indicating skills, interests, and intended contribution areas
4. Goes through admission review by existing community members
5. Upon acceptance, receives onboarding materials, role assignment, and connection setup for their existing work tools (GitHub access, document platform invitations, communication channel access)
6. Works with familiar tools — Edin's Integration Layer ingests the artifacts produced
7. Receives AI-generated evaluation and feedback on contribution quality through the Edin dashboard
8. Earns rewards proportional to evaluated contribution quality

### 5.2 Active Contributor

1. Logs into the Edin web portal to review active projects, priorities, and personal evaluation dashboard
2. Selects tasks aligned with skills and interests
3. Works in their preferred tools — commits code on GitHub, writes documents in shared workspaces, participates in discussions on communication channels
4. Edin's Integration Layer ingests all artifacts; the Evaluation Engine generates quality assessments and feedback
5. Earns rewards distributed automatically via blockchain across multiple time cycles — from immediate session-level recognition to compounding quarterly and yearly rewards
6. Participates in governance decisions and community discussions
7. Mentors newer contributors, earning additional recognition

### 5.3 Investor or Stakeholder

1. Accesses the public project showcase on the web portal
2. Reviews key metrics: active contributors, contribution velocity, milestone progress
3. Examines the key contributor roster and their backgrounds
4. Understands the reward economics and token distribution model
5. Engages with the core team for deeper diligence

---

## 6. Value Proposition

### 6.1 For Contributors

- Zero-friction participation: work with familiar tools and workflows — Edin analyzes the output, not the process
- Access to a curated, high-quality collaborative environment focused on next-generation financial infrastructure
- Fair and transparent compensation for contributions of all types, not limited to code
- Opportunities for professional growth, skills development, and mentoring in a community that values human empowerment
- Early participation in a project with significant long-term potential, with rewards tied to ecosystem growth

### 6.2 For Investors

- A living, growing community of committed contributors demonstrating real traction
- AI-augmented quality assurance that maximizes development efficiency
- Transparent contribution tracking providing clear metrics on project health and velocity across multiple time scales
- A mathematically grounded reward model based on scaling law economics that aligns contributor incentives with long-term ecosystem growth
- A credible team of high-caliber key contributors across technology, fintech, impact, and governance
- A non-profit IOUR Foundation structure with conservative capital management (30/70 reserve rule) and convertible bond instruments (10% yield, 36-month maturity) for early investors

### 6.3 For the Rose Ecosystem

- The operational engine that transforms vision into tangible output
- A scalable model for attracting and retaining talent in a competitive market
- A demonstration of the project's core thesis: that AI and human collaboration, properly incentivized, can build better financial systems

---

## 7. Phased Roadmap

Edin's roadmap is aligned with Rose's overall project phasing. Rose's financial platform follows a two-phase approach: an initial internal phase (algorithmic market-making, API price publication) followed by an external phase (open exchange). Edin's development supports and accelerates both phases by organizing the contributor community that builds them.

| Phase | Timeline | Objectives | Rose Alignment |
|---|---|---|---|
| **Phase 0 — Foundation** | Q1 2026 | Platform specification, repository setup, core team onboarding, initial branding, coordination infrastructure | Circle of 60 recruitment, IOUR Foundation reactivation, Seed/MVP fundraising (€1M) |
| **Phase 1 — MVP** | Q2 2026 | Web portal launch, contributor profiles, basic reward tracking, admission workflow, first external contributors | Sandbox environment, real-time clearing tests with synthetic tokens |
| **Phase 2 — Intelligence** | Q3–Q4 2026 | AI evaluation engine integration, blockchain reward prototype, expanded contributor base, governance formalization | Prototype development: first coupled assets on private chain, inside exchange activation |
| **Phase 3 — Scale** | 2027+ | Full token economics, decentralized governance, scaled community, public visibility, ecosystem partnerships | Compliance & risk phase, then public rollout and outside exchange opening |

---

## 8. Immediate Next Steps

1. **Repository creation.** Set up the public Edin repository with initial project structure, documentation, and contribution guidelines.
2. **Core team onboarding.** Invite founding contributors and establish access, roles, and coordination channels.
3. **Specification refinement.** Develop detailed functional specifications for each platform component through collaborative iteration.
4. **Investor preparation.** Build the key contributor roster and prepare materials demonstrating traction, credibility, and momentum.
5. **Branding consolidation.** Finalize the Edin identity within the broader Rose branding framework.

---

*Edin — Where contributions take root and grow.*
