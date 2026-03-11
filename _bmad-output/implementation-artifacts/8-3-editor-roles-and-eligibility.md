# Story 8.3: Editor Roles & Eligibility

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a contributor,
I want to claim an editor role in my domain of expertise,
so that I can help shape the quality of published content and earn editorial rewards.

## Acceptance Criteria

### AC1: Eligibility Criteria Display

**Given** I am an authenticated contributor
**When** I navigate to /dashboard/publication/editor-application
**Then** I see the editor eligibility criteria for each domain: minimum contribution history threshold (configurable by admins, e.g., 10+ evaluated contributions in the domain) and minimum governance weight threshold (configurable by admins) (FR74)
**And** my current status against each criterion is displayed (met/not met) with my actual values shown

### AC2: Editor Application Submission

**Given** I meet the eligibility criteria for a domain
**When** I click "Apply as Editor" for that domain
**Then** my editor application is submitted via POST /api/v1/publication/editor-applications
**And** admins are notified of the pending application
**And** the application status is visible on my dashboard

### AC3: Admin Editor Management

**Given** I am an admin
**When** I navigate to /admin/publication/editors
**Then** I see pending editor applications with contributor profile, domain, contribution history summary, and governance weight
**And** I can approve or reject applications with a reason
**And** I can manage editorial standards and publication guidelines (FR77): configurable eligibility thresholds per domain, editorial rubric guidelines, and maximum concurrent assignments per editor
**And** I can revoke editor status from existing editors with an audit trail

### AC4: Editor Dashboard Section

**Given** I am an approved editor
**When** I view my dashboard
**Then** I see an "Editorial" section showing: my active assignments, completed reviews, and available articles in my domain that need an editor
**And** I can claim available unassigned articles in my domain (within my concurrent assignment limit)

## Tasks / Subtasks

### Backend

- [ ] **Task 1: Prisma Schema — EditorApplication & EditorEligibilityCriteria models** (AC: 1, 2, 3)
  - [ ] 1.1 Add `EditorApplicationStatus` enum to `publication` schema: `PENDING`, `APPROVED`, `REJECTED`, `REVOKED`
  - [ ] 1.2 Add `EditorApplication` model: id (UUID PK), contributorId (FK→Contributor), domain (ContributorDomain), status (EditorApplicationStatus default PENDING), applicationStatement (Text, 300 chars max — why they want to be editor), reviewedById (FK→Contributor nullable — admin who reviewed), reviewedAt (DateTime nullable), reviewNotes (Text nullable), revokedAt (DateTime nullable), revokedById (FK→Contributor nullable), revokeReason (Text nullable), createdAt, updatedAt
  - [ ] 1.3 Add `EditorEligibilityCriteria` model: id (UUID PK), domain (ContributorDomain, unique), minContributionCount (Int default 10 — minimum evaluated contributions in the domain), minGovernanceWeight (Decimal default 0 — placeholder for Phase 2 governance weight), maxConcurrentAssignments (Int default 5 — max articles an editor can review simultaneously), updatedAt, updatedById (FK→Contributor nullable)
  - [ ] 1.4 Add relations: Contributor has `editorApplications EditorApplication[]`; EditorApplication has `contributor Contributor`, `reviewedBy Contributor?`, `revokedBy Contributor?`; EditorEligibilityCriteria has `updatedBy Contributor?`
  - [ ] 1.5 Add unique constraint on EditorApplication: `@@unique([contributorId, domain])` — one active application per contributor per domain
  - [ ] 1.6 Add indexes: `idx_editor_application_status`, `idx_editor_application_contributor_id`
  - [ ] 1.7 Use `@@map("editor_applications")` and `@@map("editor_eligibility_criteria")` with `@@schema("publication")`
  - [ ] 1.8 Add `EDITOR_APPLICATION_SUBMITTED` to `NotificationType` enum
  - [ ] 1.9 Create migration SQL file in `apps/api/prisma/migrations/`
  - [ ] 1.10 Run `pnpm prisma generate` to verify schema compiles
  - [ ] 1.11 Seed default EditorEligibilityCriteria for all four domains (Technology, Finance, Impact, Governance) with default thresholds

- [ ] **Task 2: Shared Package — Editor eligibility Zod schemas, types** (AC: 1, 2, 3, 4)
  - [ ] 2.1 Create `packages/shared/src/schemas/editor.schema.ts`:
    - `editorApplicationSchema`: domain (ContributorDomain enum), applicationStatement (string, min 20, max 300)
    - `reviewEditorApplicationSchema`: decision ('APPROVED' | 'REJECTED'), reviewNotes (string, optional)
    - `updateEligibilityCriteriaSchema`: minContributionCount (number, int, min 1, optional), minGovernanceWeight (number, min 0, optional), maxConcurrentAssignments (number, int, min 1, max 20, optional)
    - `revokeEditorSchema`: reason (string, min 10)
  - [ ] 2.2 Create `packages/shared/src/types/editor.types.ts`:
    - `EditorApplicationStatus` type: `'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED'`
    - `EditorApplicationDto`: id, contributorId, contributorName, contributorAvatarUrl, domain, status, applicationStatement, reviewedById, reviewedAt, reviewNotes, revokedAt, revokeReason, createdAt
    - `EditorEligibilityCriteriaDto`: id, domain, minContributionCount, minGovernanceWeight, maxConcurrentAssignments, updatedAt
    - `EligibilityCheckDto`: domain, eligible (boolean), criteria (EditorEligibilityCriteriaDto), current (object with contributionCount, governanceWeight), existingApplication (EditorApplicationDto | null)
    - `EditorDashboardDto`: activeAssignments (ArticleListItemDto[]), completedReviews (count), availableArticles (ArticleListItemDto[])
    - `ActiveEditorDto`: id, contributorId, contributorName, contributorAvatarUrl, domain, activeAssignmentCount, totalReviews, approvedAt
    - `EditorApplicationSubmittedEvent`: applicationId, contributorId, contributorName, domain, timestamp, correlationId
    - `EditorApplicationReviewedEvent`: applicationId, contributorId, domain, decision, reviewedById, timestamp, correlationId
    - `EditorRoleRevokedEvent`: contributorId, domain, revokedById, reason, timestamp, correlationId
  - [ ] 2.3 Add error codes to `packages/shared/src/constants/error-codes.ts`:
    - `EDITOR_APPLICATION_NOT_FOUND` (404)
    - `EDITOR_APPLICATION_ALREADY_EXISTS` (409) — active application already exists for this contributor+domain
    - `EDITOR_INELIGIBLE` (422) — contributor does not meet eligibility criteria
    - `EDITOR_APPLICATION_ALREADY_REVIEWED` (409) — application already has a decision
    - `EDITOR_CRITERIA_NOT_FOUND` (404) — no criteria for this domain
    - `EDITOR_MAX_ASSIGNMENTS_REACHED` (422) — editor has too many active assignments
    - `EDITOR_NOT_ACTIVE` (403) — contributor is not an active editor
  - [ ] 2.4 Export all new types/schemas from `packages/shared/src/index.ts`

- [ ] **Task 3: Editor Eligibility Service** (AC: 1, 2, 3, 4)
  - [ ] 3.1 Create `apps/api/src/modules/publication/editor-eligibility.service.ts`:
    - `checkEligibility(contributorId, domain)`: Query contributor's evaluated contributions count in the given domain (from `evaluation` schema, counting evaluations with status COMPLETED on contributions in that domain). Query EditorEligibilityCriteria for the domain. Check existing application for this contributor+domain. Return `EligibilityCheckDto` with met/not-met status per criterion
    - `checkAllDomainEligibility(contributorId)`: Return eligibility check for all four domains (Technology, Finance, Impact, Governance) — call `checkEligibility` for each
    - `submitApplication(contributorId, domain, applicationStatement, correlationId)`: Verify eligibility criteria are met. Check no existing PENDING or APPROVED application. Create EditorApplication record. Emit `publication.editor.application-submitted` event. Return `EditorApplicationDto`
    - `reviewApplication(applicationId, adminId, decision, reviewNotes, correlationId)`: Validate application is in PENDING status. Update application status, reviewedById, reviewedAt, reviewNotes. If APPROVED: update contributor role to EDITOR (only if not already EDITOR or higher). Emit `publication.editor.application-reviewed` event. Notify applicant of decision
    - `revokeEditorStatus(contributorId, domain, adminId, reason, correlationId)`: Find APPROVED application for contributor+domain. Update application status to REVOKED. Set revokedAt, revokedById, revokeReason. Check if contributor has other APPROVED editor applications in different domains — if not, demote role from EDITOR to CONTRIBUTOR. Emit `publication.editor.role-revoked` event. Notify contributor
    - `getEligibilityCriteria(domain)`: Return EditorEligibilityCriteriaDto for the given domain
    - `updateEligibilityCriteria(domain, data, adminId)`: Update criteria for the given domain. Return updated EditorEligibilityCriteriaDto
    - `listApplications(filters: { status?, domain? })`: Return paginated list of EditorApplicationDto with contributor info
    - `listActiveEditors(domain?)`: Return list of ActiveEditorDto — contributors with APPROVED applications, enriched with active assignment count and total reviews
    - `getEditorDashboard(editorId)`: Return EditorDashboardDto — active assignments (articles in EDITORIAL_REVIEW/REVISION_REQUESTED where editorId matches), completed reviews count, available articles (SUBMITTED articles in editor's domain with no editorId assigned)
    - `claimArticle(articleId, editorId, correlationId)`: Verify editor is active (has APPROVED application for article's domain). Verify editor has not exceeded maxConcurrentAssignments. Verify article is in SUBMITTED status with no editor assigned. Assign editor and transition to EDITORIAL_REVIEW. Emit `publication.editor.assigned` event
  - [ ] 3.2 Register `EditorEligibilityService` in `PublicationModule` providers
  - [ ] 3.3 Update `EditorialService.assignEditor()` to also check `maxConcurrentAssignments` from EditorEligibilityCriteria when auto-assigning editors — skip editors who are at their limit

- [ ] **Task 4: Editor Eligibility Controller Routes** (AC: 1, 2, 3, 4)
  - [ ] 4.1 Create `apps/api/src/modules/publication/editor-eligibility.controller.ts`:
    - `GET /api/v1/publication/editor-eligibility` → checkAllDomainEligibility (auth: any authenticated contributor)
    - `GET /api/v1/publication/editor-eligibility/:domain` → checkEligibility for specific domain (auth: any authenticated contributor)
    - `POST /api/v1/publication/editor-applications` → submitApplication (auth: any authenticated contributor)
    - `GET /api/v1/publication/editor-applications/mine` → list current user's applications (auth: any authenticated contributor)
    - `GET /api/v1/publication/editor-applications` → listApplications with filters (auth: Admin)
    - `PATCH /api/v1/publication/editor-applications/:id/review` → reviewApplication (auth: Admin)
    - `POST /api/v1/publication/editors/:contributorId/revoke` → revokeEditorStatus (auth: Admin)
    - `GET /api/v1/publication/editor-criteria` → list all domain criteria (auth: Admin)
    - `PATCH /api/v1/publication/editor-criteria/:domain` → updateEligibilityCriteria (auth: Admin)
    - `GET /api/v1/publication/editors` → listActiveEditors (auth: Admin)
    - `GET /api/v1/publication/editor-dashboard` → getEditorDashboard (auth: Editor)
    - `POST /api/v1/publication/editor-claim/:articleId` → claimArticle (auth: Editor)
  - [ ] 4.2 Add validation using Zod schemas from shared package
  - [ ] 4.3 Use `createSuccessResponse()` for all responses
  - [ ] 4.4 Use `@UseGuards(JwtAuthGuard)` for all routes, admin/editor checks in controller

- [ ] **Task 5: Notification Integration** (AC: 2, 3)
  - [ ] 5.1 Add `@OnEvent('publication.editor.application-submitted')` handler in NotificationService:
    - Send notification to all ADMINs: type `EDITOR_APPLICATION_SUBMITTED`, title "New editor application received", entityId = applicationId, category = 'editorial'
  - [ ] 5.2 Add `@OnEvent('publication.editor.application-reviewed')` handler:
    - Send notification to applicant: type `ARTICLE_FEEDBACK`, title "Your editor application has been [approved/rejected]", entityId = applicationId, category = 'editorial'
  - [ ] 5.3 Add `@OnEvent('publication.editor.role-revoked')` handler:
    - Send notification to contributor: type `ARTICLE_FEEDBACK`, title "Your editor status has been revoked", entityId = contributorId, category = 'editorial'

- [ ] **Task 6: Backend Unit Tests** (AC: 1, 2, 3, 4)
  - [ ] 6.1 Create `editor-eligibility.service.spec.ts`: test checkEligibility (eligible, not eligible, partial), submitApplication (success, ineligible rejection, duplicate prevention), reviewApplication (approve with role upgrade, reject, already reviewed), revokeEditorStatus (success, demote when last domain, keep EDITOR when other domains exist), getEditorDashboard (assignment count, available articles), claimArticle (success, max assignments, wrong domain, already assigned)
  - [ ] 6.2 Create `editor-eligibility.controller.spec.ts`: test all routes with auth guards, admin-only restrictions, validation errors, response shapes

### Frontend

- [ ] **Task 7: Editor Application Page** (AC: 1, 2)
  - [ ] 7.1 Create `apps/web/app/(dashboard)/publication/editor-application/page.tsx`:
    - Display all four domains as cards with eligibility criteria
    - Each domain card shows: domain name with accent color, criteria (minContributionCount, minGovernanceWeight), contributor's current values, met/not-met visual indicator per criterion
    - If eligible: "Apply as Editor" button enabled
    - If not eligible: button disabled with tooltip showing unmet criteria
    - If application already PENDING: show "Application Pending" badge
    - If already APPROVED: show "Active Editor" badge
    - If REJECTED: show "Application Declined" with option to reapply (if still eligible)
  - [ ] 7.2 Create `apps/web/components/features/publication/editor-eligibility/eligibility-card.tsx`:
    - Domain card with accent color border/header
    - Criteria checklist: green check for met, red x for not met, with actual values vs required
    - Application statement textarea (shown when "Apply" clicked)
    - Progressive disclosure: compact by default, expandable for details
  - [ ] 7.3 Create `apps/web/components/features/publication/editor-eligibility/application-status.tsx`:
    - Shows current application status badge (PENDING → amber, APPROVED → green, REJECTED → red)
    - If rejected: shows review notes (reason for rejection)
    - Timestamp of application and review

- [ ] **Task 8: Admin Editor Management Page** (AC: 3)
  - [ ] 8.1 Create `apps/web/app/(dashboard)/admin/publication/editors/page.tsx`:
    - Tab layout: "Pending Applications" | "Active Editors" | "Eligibility Criteria"
    - Pending tab: list of applications with contributor info, domain, contribution summary, approve/reject buttons with notes dialog
    - Active Editors tab: list of editors with domain, active assignment count, total reviews, revoke button
    - Eligibility Criteria tab: per-domain configuration form (minContributionCount, minGovernanceWeight, maxConcurrentAssignments)
  - [ ] 8.2 Create `apps/web/components/features/publication/editor-eligibility/application-review-card.tsx`:
    - Shows applicant profile (name, avatar, domain badge), application statement
    - Contribution summary (count of evaluated contributions in domain)
    - Approve/Reject buttons with review notes textarea in modal/dialog
  - [ ] 8.3 Create `apps/web/components/features/publication/editor-eligibility/criteria-form.tsx`:
    - Form for editing eligibility criteria per domain
    - Number inputs with validation for each field
    - Save button per domain

- [ ] **Task 9: Editor Dashboard Section** (AC: 4)
  - [ ] 9.1 Update `apps/web/app/(dashboard)/publication/page.tsx`:
    - Add "Editorial Dashboard" section for users with EDITOR role
    - Show active assignments (articles in review), completed reviews count, available articles to claim
    - "Claim" button on available articles
  - [ ] 9.2 Create `apps/web/components/features/publication/editor-eligibility/editor-dashboard-section.tsx`:
    - Three sections: "My Active Reviews" (article cards with status), "Completed Reviews" (count + recent list), "Available to Claim" (article cards with claim button)
    - Claim button triggers POST /api/v1/publication/editor-claim/:articleId
    - Updates list after successful claim

- [ ] **Task 10: Data Fetching Hooks** (AC: 1, 2, 3, 4)
  - [ ] 10.1 Create `apps/web/hooks/use-editor-eligibility.ts`:
    - `useEditorEligibility()`: query, GET /api/v1/publication/editor-eligibility — returns eligibility for all domains
    - `useSubmitEditorApplication()`: mutation, POST /api/v1/publication/editor-applications, invalidates eligibility queries
    - `useMyEditorApplications()`: query, GET /api/v1/publication/editor-applications/mine
    - `useEditorDashboard()`: query, GET /api/v1/publication/editor-dashboard (enabled for EDITOR role)
    - `useClaimArticle()`: mutation, POST /api/v1/publication/editor-claim/:articleId, invalidates dashboard
  - [ ] 10.2 Create `apps/web/hooks/use-editor-admin.ts`:
    - `useEditorApplications(filters)`: query, GET /api/v1/publication/editor-applications (admin)
    - `useReviewEditorApplication()`: mutation, PATCH /api/v1/publication/editor-applications/:id/review, invalidates application list
    - `useActiveEditors(domain?)`: query, GET /api/v1/publication/editors
    - `useRevokeEditor()`: mutation, POST /api/v1/publication/editors/:contributorId/revoke, invalidates editor list
    - `useEditorCriteria()`: query, GET /api/v1/publication/editor-criteria
    - `useUpdateEditorCriteria()`: mutation, PATCH /api/v1/publication/editor-criteria/:domain, invalidates criteria
  - [ ] 10.3 Follow existing hook patterns: TanStack Query, `queryKey` arrays, `apiClient` helper, `API_BASE_URL` from env

- [ ] **Task 11: Frontend Component Tests** (AC: 1, 2, 3, 4)
  - [ ] 11.1 Create `eligibility-card.test.tsx`: test renders domain name, criteria values, met/not-met indicators, button state (enabled/disabled), application form display
  - [ ] 11.2 Create `application-review-card.test.tsx`: test applicant info display, approve/reject actions, review notes
  - [ ] 11.3 Create `editor-dashboard-section.test.tsx`: test active assignments list, available articles list, claim action
  - [ ] 11.4 Create `criteria-form.test.tsx`: test form renders with current values, validation on inputs, save action

## Dev Notes

### Architecture Patterns — MUST FOLLOW

**Module Structure:** Extend existing publication module. Add `editor-eligibility.service.ts` and `editor-eligibility.controller.ts` alongside existing services — DO NOT create a separate module.

```
apps/api/src/modules/publication/
├── publication.module.ts              (update: add EditorEligibilityService + controller)
├── article.controller.ts              (existing — DO NOT modify)
├── article.service.ts                 (existing — DO NOT modify)
├── editorial.controller.ts            (existing — DO NOT modify)
├── editorial.service.ts               (update: add maxConcurrentAssignments check in assignEditor)
├── editor-eligibility.controller.ts   (NEW — all editor eligibility routes)
├── editor-eligibility.service.ts      (NEW — all editor eligibility business logic)
├── editor-eligibility.service.spec.ts (NEW)
├── editor-eligibility.controller.spec.ts (NEW — optional, Zod-direct validation)
```

**API Response Envelope:** Use `createSuccessResponse(data, correlationId, pagination?)` from `apps/api/src/common/types/api-response.type.ts`. All endpoints return `{ data, meta: { timestamp, correlationId, pagination? } }`.

**Auth Guards:** Use `@UseGuards(JwtAuthGuard)` for all routes. Admin check in controller: `if (userRole !== 'ADMIN') throw DomainException(FORBIDDEN)`. Editor check: `if (userRole !== 'EDITOR' && userRole !== 'ADMIN') throw DomainException(FORBIDDEN)`. See `editorial.controller.ts:117` for the existing pattern.

**Error Handling:** Use `DomainException` from `apps/api/src/common/exceptions/domain.exception.ts`. Example at `editorial.service.ts:53-57`.

**Domain Events:** Use `EventEmitter2` with standard payload structure including `correlationId`. See `editorial.service.ts:154-162` for the pattern.

**Logging:** Use `Logger` from `@nestjs/common`. Include `module: 'publication'` in all log contexts. Log at `info` for successful operations, `warn` for edge cases, `error` for failures.

### Editor Assignment Algorithm Update

Story 8-2 implemented editor auto-assignment in `editorial.service.ts:assignEditor()`. Story 8-3 must update this method to:

1. Check `EditorEligibilityCriteria.maxConcurrentAssignments` for the article's domain
2. Filter out editors whose active assignment count >= maxConcurrentAssignments
3. The existing logic already queries `role: 'EDITOR'` and sorts by fewest assignments — just add the max cap filter

**Current code at `editorial.service.ts:70-86`:**

```typescript
const eligibleEditors = await this.prisma.contributor.findMany({
  where: {
    role: 'EDITOR',
    domain: article.domain,
    isActive: true,
    id: { not: article.authorId },
  },
  select: {
    id: true,
    editedArticles: {
      where: {
        status: { in: ['EDITORIAL_REVIEW', 'REVISION_REQUESTED'] },
      },
      select: { id: true },
    },
  },
});
```

Add after this query: filter out editors where `editedArticles.length >= criteria.maxConcurrentAssignments`.

### Role Upgrade Logic

When an editor application is APPROVED, the contributor's role must be upgraded to EDITOR. However, the role system uses a single `role` field (not a set of roles). Important considerations:

- Only upgrade if current role is CONTRIBUTOR (or lower: PUBLIC, APPLICANT)
- Do NOT downgrade if current role is FOUNDING_CONTRIBUTOR, WORKING_GROUP_LEAD, or ADMIN
- On revoke: only downgrade to CONTRIBUTOR if no other APPROVED editor applications exist
- The CASL ability factory at `ability.factory.ts:27-29` already handles the EDITOR case — it adds `can(Action.Update, 'Article')`, `can(Action.Read, 'EditorialFeedback')`, `can(Action.Create, 'EditorialFeedback')`

### Eligibility Criteria — Contribution Count

The contribution count checks how many evaluated contributions the contributor has in the target domain. This requires querying across schemas:

- `core.contributions` → filtered by contributor + domain
- `evaluation.evaluations` → filtered by status COMPLETED, linked to those contributions

Query pattern:

```typescript
const count = await this.prisma.evaluation.count({
  where: {
    status: 'COMPLETED',
    contribution: {
      contributorId,
      repository: {
        // domain mapping needed OR use contributor's primary domain
      },
    },
  },
});
```

**Alternative (simpler):** Count evaluations directly linked to the contributor's contributions, filtered by the contributor's domain matching the target domain. Since `Contribution` doesn't have a direct `domain` field, use `contributor.domain` as the mapping. The eligibility check is domain-specific: "contributions in this domain" means contributions by this contributor when their primary domain matches.

**Simplest approach for Phase 1:** Count all COMPLETED evaluations for the contributor's contributions regardless of specific domain mapping, since a contributor's domain is their primary expertise area. This keeps the query simple and can be refined in Phase 2.

### Governance Weight — Phase 2 Placeholder

Governance weight (FR56) is not yet implemented. For Phase 1:

- Include `minGovernanceWeight` in the criteria model (default 0)
- Return `governanceWeight: 0` in eligibility checks (always passes threshold of 0)
- The criteria form shows the field but with a note: "Governance weight tracking coming in Phase 2"
- This allows admins to configure the threshold now, ready for when governance weight is implemented

### Existing Code to Extend

| File                                                        | Change                                                                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `apps/api/prisma/schema.prisma`                             | Add EditorApplicationStatus enum, EditorApplication model, EditorEligibilityCriteria model, NotificationType enum update |
| `apps/api/src/modules/publication/publication.module.ts`    | Add EditorEligibilityService + EditorEligibilityController                                                               |
| `apps/api/src/modules/publication/editorial.service.ts`     | Update assignEditor() with maxConcurrentAssignments check                                                                |
| `apps/api/src/modules/notification/notification.service.ts` | Add event handlers for editor application events                                                                         |
| `packages/shared/src/constants/error-codes.ts`              | Add editor-specific error codes                                                                                          |
| `packages/shared/src/index.ts`                              | Export new schemas and types                                                                                             |
| `apps/web/app/(dashboard)/publication/page.tsx`             | Add editor dashboard section for EDITOR role                                                                             |

### New Files to Create

| File                                                                                            | Purpose                                 |
| ----------------------------------------------------------------------------------------------- | --------------------------------------- |
| `packages/shared/src/schemas/editor.schema.ts`                                                  | Editor application/criteria Zod schemas |
| `packages/shared/src/types/editor.types.ts`                                                     | Editor DTOs and event types             |
| `apps/api/src/modules/publication/editor-eligibility.service.ts`                                | Editor eligibility business logic       |
| `apps/api/src/modules/publication/editor-eligibility.service.spec.ts`                           | Service unit tests                      |
| `apps/api/src/modules/publication/editor-eligibility.controller.ts`                             | Editor eligibility routes               |
| `apps/web/app/(dashboard)/publication/editor-application/page.tsx`                              | Contributor editor application page     |
| `apps/web/app/(dashboard)/admin/publication/editors/page.tsx`                                   | Admin editor management page            |
| `apps/web/hooks/use-editor-eligibility.ts`                                                      | Contributor-facing hooks                |
| `apps/web/hooks/use-editor-admin.ts`                                                            | Admin-facing hooks                      |
| `apps/web/components/features/publication/editor-eligibility/eligibility-card.tsx`              | Domain eligibility card                 |
| `apps/web/components/features/publication/editor-eligibility/eligibility-card.test.tsx`         | Card tests                              |
| `apps/web/components/features/publication/editor-eligibility/application-status.tsx`            | Application status badge                |
| `apps/web/components/features/publication/editor-eligibility/application-review-card.tsx`       | Admin review card                       |
| `apps/web/components/features/publication/editor-eligibility/application-review-card.test.tsx`  | Review card tests                       |
| `apps/web/components/features/publication/editor-eligibility/criteria-form.tsx`                 | Admin criteria form                     |
| `apps/web/components/features/publication/editor-eligibility/criteria-form.test.tsx`            | Criteria form tests                     |
| `apps/web/components/features/publication/editor-eligibility/editor-dashboard-section.tsx`      | Editor dashboard panel                  |
| `apps/web/components/features/publication/editor-eligibility/editor-dashboard-section.test.tsx` | Dashboard tests                         |

### UX Requirements — CRITICAL

**Editor Application Page:**

- Four domain cards in a 2x2 grid (desktop) or stacked (mobile)
- Each card: domain name + accent color header, eligibility criteria as checklist items
- Met criteria: green checkmark + `semantic.success` (#5A8A6B) text
- Unmet criteria: gray x + muted text showing "You have X / Y required"
- "Apply as Editor" button: primary style when eligible, disabled/muted when not
- Application form: slide-down or modal with textarea for application statement
- After submission: card shows "Application Pending" with amber badge

**Domain Card Colors:** Use existing domain accents:

- Technology: `#3A7D7E`
- Finance: `#C49A3C`
- Impact: `#B06B6B`
- Governance: `#7B6B8A`

**Admin Editor Management:**

- Tab-based layout (Radix UI Tabs)
- Pending Applications: card list with approve/reject action buttons
- Approve dialog: simple confirmation with optional review notes
- Reject dialog: required review notes textarea
- Active Editors: table/card list with revoke button (confirmation dialog required)
- Criteria form: clean number inputs per domain, save per domain

**Editor Dashboard Section:**

- Part of existing /dashboard/publication page — not a separate page
- Collapsible section header: "Editorial Dashboard"
- Active assignments: compact article cards with status badge
- Available articles: article cards with "Claim" button
- Claim confirmation: simple dialog

**Typography in Editor Context:**

- Domain card headers: Inter/Source Sans Pro, 18px, font-weight 600
- Criteria text: Inter/Source Sans Pro, 14px
- Application statement: Inter/Source Sans Pro, 14px
- Admin interface: Inter/Source Sans Pro throughout

### API Endpoint Contracts

**GET /api/v1/publication/editor-eligibility** — Check eligibility for all domains

```json
Response 200: {
  "data": [
    {
      "domain": "Technology",
      "eligible": true,
      "criteria": {
        "id": "uuid",
        "domain": "Technology",
        "minContributionCount": 10,
        "minGovernanceWeight": 0,
        "maxConcurrentAssignments": 5,
        "updatedAt": "2026-03-09T..."
      },
      "current": {
        "contributionCount": 15,
        "governanceWeight": 0
      },
      "existingApplication": null
    },
    {
      "domain": "Finance",
      "eligible": false,
      "criteria": { ... },
      "current": { "contributionCount": 3, "governanceWeight": 0 },
      "existingApplication": null
    }
  ],
  "meta": { "timestamp": "...", "correlationId": "..." }
}
```

**POST /api/v1/publication/editor-applications** — Submit editor application

```json
Request: {
  "domain": "Technology",
  "applicationStatement": "I have extensive experience in..."
}
Response 200: { "data": { ...EditorApplicationDto }, "meta": { ... } }
Errors: 422 (ineligible), 409 (already exists)
```

**GET /api/v1/publication/editor-applications/mine** — My applications

```json
Response 200: {
  "data": [ { ...EditorApplicationDto } ],
  "meta": { ... }
}
```

**GET /api/v1/publication/editor-applications** — List applications (Admin)

```json
Response 200: {
  "data": [ { ...EditorApplicationDto with contributor info } ],
  "meta": { ... }
}
Query params: ?status=PENDING&domain=Technology
```

**PATCH /api/v1/publication/editor-applications/:id/review** — Review application (Admin)

```json
Request: { "decision": "APPROVED", "reviewNotes": "Strong contributor, approved." }
Response 200: { "data": { ...EditorApplicationDto }, "meta": { ... } }
Errors: 404, 409 (already reviewed)
```

**POST /api/v1/publication/editors/:contributorId/revoke** — Revoke editor (Admin)

```json
Request: { "reason": "Inactive editor, no reviews in 6 months" }
Response 200: { "data": { "success": true }, "meta": { ... } }
Errors: 404 (not an active editor)
```

**GET /api/v1/publication/editor-criteria** — List eligibility criteria (Admin)

```json
Response 200: {
  "data": [
    { "domain": "Technology", "minContributionCount": 10, "minGovernanceWeight": 0, "maxConcurrentAssignments": 5, "updatedAt": "..." },
    { "domain": "Finance", ... },
    { "domain": "Impact", ... },
    { "domain": "Governance", ... }
  ],
  "meta": { ... }
}
```

**PATCH /api/v1/publication/editor-criteria/:domain** — Update criteria (Admin)

```json
Request: { "minContributionCount": 15, "maxConcurrentAssignments": 3 }
Response 200: { "data": { ...updated EditorEligibilityCriteriaDto }, "meta": { ... } }
```

**GET /api/v1/publication/editor-dashboard** — Editor dashboard data

```json
Response 200: {
  "data": {
    "activeAssignments": [ { ...ArticleListItemDto } ],
    "completedReviews": 12,
    "availableArticles": [ { ...ArticleListItemDto } ]
  },
  "meta": { ... }
}
```

**POST /api/v1/publication/editor-claim/:articleId** — Claim article for review

```json
Request: {} // no body needed
Response 200: { "data": { ...ArticleDto with editorId set, status EDITORIAL_REVIEW }, "meta": { ... } }
Errors: 403 (not editor), 409 (already assigned), 422 (max assignments reached)
```

### Anti-Patterns to Avoid

- **DO NOT** create a separate NestJS module for editor eligibility — it belongs in the existing `publication` module
- **DO NOT** modify `article.service.ts` — all editor eligibility logic goes in `editor-eligibility.service.ts`
- **DO NOT** implement governance weight calculation — just use placeholder value 0, with the threshold model ready
- **DO NOT** implement a multi-role system — use the existing single `role` field with upgrade/downgrade logic
- **DO NOT** implement the admin publication management page (`/admin/publication/assignments`) — that's already handled by the existing editorial controller
- **DO NOT** add new CASL subjects for editor eligibility — use controller-level role checks (ADMIN role guard pattern from editorial.controller.ts)
- **DO NOT** implement real-time notifications for editor applications — use the existing BullMQ notification queue
- **DO NOT** create an `EditorApplication` unique constraint that prevents reapplication after rejection — use status-based logic to check for active (PENDING/APPROVED) applications only

### Dependencies to Install

**Backend (apps/api):** No new dependencies needed.

**Frontend (apps/web):** No new dependencies needed — Radix UI, Tailwind, TanStack Query already installed.

### Testing Standards

- **Vitest** for all tests (unit + integration)
- **@nestjs/testing** for NestJS module testing
- Tests co-located: `editor-eligibility.service.spec.ts` next to `editor-eligibility.service.ts`
- Mock PrismaService, EventEmitter2, Logger in service tests
- Mock service in controller tests
- Frontend component tests: Vitest + React Testing Library
- Test eligibility criteria display (met/not-met visual states)
- Test application form validation (statement length, eligible/ineligible button states)
- Test admin approval/rejection workflow
- Test editor dashboard claim interaction

### Previous Story Learnings (from Story 8-2)

- **Controller pattern:** Create separate controller file (`editorial.controller.ts`) — don't add to existing controller. Use `@Controller({ path: 'publication', version: '1' })` for the new editor routes to group under `/api/v1/publication/` prefix
- **Notification events:** Import event types from `@edin/shared` in notification service. Use `ARTICLE_FEEDBACK` type for general editorial notifications. The `EDITOR_APPLICATION_SUBMITTED` type needs to be added to the Prisma NotificationType enum
- **Service pattern:** `@Injectable()` with `private readonly logger = new Logger(ServiceName.name)`
- **Response helper:** `createSuccessResponse(data, req.correlationId)`
- **Frontend:** `'use client'` directive, CSS custom properties, aria-labels for accessibility
- **Hook pattern:** TanStack Query with `queryKey` arrays, `useMutation` with `onSuccess` invalidation
- **Event listener pattern:** `@OnEvent('event.name')` with try-catch error handling (see `editorial.service.ts:30-43`)
- **Zod validation in controller:** `safeParse()` with DomainException on failure (see `editorial.controller.ts:34-41`)

### Project Structure Notes

- Editor eligibility service extends existing `publication/` module — follows same multi-service pattern as evaluation module
- Frontend editor-eligibility components go in `components/features/publication/editor-eligibility/`
- Editor application page at `(dashboard)/publication/editor-application/page.tsx`
- Admin editor management at `(dashboard)/admin/publication/editors/page.tsx`
- Hooks split into two files: `use-editor-eligibility.ts` (contributor) and `use-editor-admin.ts` (admin) — keeps concerns separated
- No variances or conflicts with existing structure detected

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 8, Story 8.3]
- [Source: _bmad-output/planning-artifacts/prd.md — FR74, FR77]
- [Source: _bmad-output/planning-artifacts/architecture.md — Publication Module Structure, RBAC, Event Naming]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Design System, Domain Colors, Typography]
- [Source: _bmad-output/implementation-artifacts/8-2-editorial-workflow-and-lifecycle.md — Previous story patterns and learnings]
- [Source: apps/api/src/modules/publication/editorial.service.ts — Editor assignment algorithm, service patterns]
- [Source: apps/api/src/modules/publication/editorial.controller.ts — Route and validation patterns]
- [Source: apps/api/src/modules/publication/publication.module.ts — Module structure]
- [Source: apps/api/src/modules/auth/casl/ability.factory.ts — EDITOR role CASL abilities]
- [Source: apps/api/src/modules/notification/notification.service.ts — Event handler and notification patterns]
- [Source: apps/api/prisma/schema.prisma — Contributor model, ContributorRole enum, NotificationType enum]
- [Source: packages/shared/src/constants/error-codes.ts — Existing error code patterns]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
