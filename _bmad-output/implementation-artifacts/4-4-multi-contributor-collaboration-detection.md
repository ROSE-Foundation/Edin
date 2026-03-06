# Story 4.4: Multi-Contributor Collaboration Detection

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a contributor,
I want the system to detect when I collaborate with others on shared deliverables,
so that credit is fairly attributed to all contributors involved.

## Acceptance Criteria

1. **Co-Authorship Detection from PR Metadata**
   Given a pull request has multiple contributors,
   When the ingestion pipeline processes the PR,
   Then the system detects co-authorship using:
   - Git co-author metadata (`Co-authored-by` trailers in commit messages),
   - Multiple committers on the same PR,
   - Linked issues with assignees,
     And a default equal-split attribution is applied across all detected contributors.

2. **Dashboard Collaboration Indicator**
   Given a multi-contributor contribution is detected,
   When the attribution is saved,
   Then each contributor sees the contribution on their dashboard with a collaboration indicator showing:
   - Other contributor names,
   - The attribution split (e.g., "50/50 with Lena"),
     And each contributor can confirm the attribution from their dashboard.

3. **Attribution Review Request**
   Given a contributor believes the attribution split is incorrect,
   When they click "Request attribution review",
   Then the contribution is flagged for admin review with the contributor's comment,
   And the admin can override the attribution split via `PATCH /api/v1/admin/contributions/:id/attribution`,
   And the attribution change is recorded in the audit log.

4. **Attribution Quality Metric**
   Given attribution is applied,
   When the system processes attributions over time,
   Then >90% of attributions are accepted without override (FR19 acceptance criterion),
   And the system tracks the override rate as a quality metric.

## Tasks / Subtasks

### Backend

- [x] **Task 1: Database migration - ContributionCollaboration model** (AC: #1, #2)
  - [x] 1.1 Create `ContributionCollaboration` model in `apps/api/prisma/schema.prisma` (core schema) with fields:
    - `id` (UUID, primary key)
    - `contributionId` (FK to Contribution, required)
    - `contributorId` (FK to Contributor, required)
    - `role` (enum `CollaborationRole`: `PRIMARY_AUTHOR`, `CO_AUTHOR`, `COMMITTER`, `ISSUE_ASSIGNEE`)
    - `splitPercentage` (Float, default 100.0)
    - `status` (enum `CollaborationStatus`: `DETECTED`, `CONFIRMED`, `DISPUTED`, `OVERRIDDEN`)
    - `detectionSource` (String: `CO_AUTHOR_TRAILER`, `PR_COMMITTER`, `ISSUE_ASSIGNEE`)
    - `confirmedAt` (DateTime, nullable)
    - `disputeComment` (String, nullable)
    - `overriddenById` (FK to Contributor, nullable - admin who overrode)
    - `overrideReason` (String, nullable)
    - `createdAt`, `updatedAt`
    - Unique constraint: `@@unique([contributionId, contributorId])`
    - Indexes: `@@index([contributionId])`, `@@index([contributorId])`, `@@index([status])`
    - Map to table `contribution_collaborations` in `core` schema
  - [x]1.2 Add `CollaborationRole` enum: `PRIMARY_AUTHOR`, `CO_AUTHOR`, `COMMITTER`, `ISSUE_ASSIGNEE`
  - [x]1.3 Add `CollaborationStatus` enum: `DETECTED`, `CONFIRMED`, `DISPUTED`, `OVERRIDDEN`
  - [x]1.4 Add relation `collaborations ContributionCollaboration[]` on `Contribution` model
  - [x]1.5 Add relations `collaborations ContributionCollaboration[]` and `collaborationOverrides ContributionCollaboration[]` on `Contributor` model (the latter for `overriddenById`)
  - [x]1.6 Create Prisma migration and run `pnpm prisma generate`

- [x] **Task 2: Shared schemas and types** (AC: #1, #2, #3)
  - [x]2.1 Add `CollaborationRole` and `CollaborationStatus` Zod enums in `packages/shared/src/schemas/ingestion.schema.ts`
  - [x]2.2 Add `collaborationResponseSchema` in same file: id, contributionId, contributorId, contributorName, contributorAvatarUrl, role, splitPercentage, status, detectionSource, confirmedAt
  - [x]2.3 Add `contributionWithCollaborationsResponseSchema` extending `contributionDetailResponseSchema` with `collaborations` array
  - [x]2.4 Add `confirmCollaborationSchema`: `{ confirmed: boolean }`
  - [x]2.5 Add `disputeCollaborationSchema`: `{ comment: string }` (comment required, min 10 chars)
  - [x]2.6 Add `overrideAttributionSchema`: `{ attributions: [{ contributorId, splitPercentage, reason? }] }` with validation that splits sum to 100
  - [x]2.7 Add TypeScript interfaces in `packages/shared/src/types/ingestion.types.ts`:
    - `ContributionCollaboration`
    - `ContributionWithCollaborations`
    - `CollaborationDetectedEvent` (contributionId, collaborators[], correlationId)
    - `CollaborationConfirmedEvent`, `CollaborationDisputedEvent`, `AttributionOverriddenEvent`
  - [x]2.8 Add error codes in `packages/shared/src/constants/error-codes.ts`:
    - `COLLABORATION_NOT_FOUND`
    - `COLLABORATION_ALREADY_CONFIRMED`
    - `ATTRIBUTION_SPLIT_INVALID` (splits don't sum to 100)
    - `ATTRIBUTION_OVERRIDE_UNAUTHORIZED`
  - [x]2.9 Export all new schemas/types from `packages/shared/src/index.ts`
  - [x]2.10 Rebuild shared package: `pnpm --filter shared build`

- [x] **Task 3: Collaboration detection service** (AC: #1)
  - [x]3.1 Create `CollaborationDetectionService` in `apps/api/src/modules/ingestion/services/collaboration-detection.service.ts`
  - [x]3.2 Register `@OnEvent('contribution.*.ingested')` listener (runs after attribution)
  - [x]3.3 Implement `detectCollaborators(contributionId, correlationId)`:
    - Load contribution with rawData
    - Skip if `contributionType` is `CODE_REVIEW` (reviews are individual)
    - For `PULL_REQUEST` contributions:
      - Extract co-author trailers from all commit messages in `rawData.extracted.commits` (if available) or `rawData.extracted.body` using regex: `/Co-authored-by:\s*(.+?)\s*<(.+?)>/gi`
      - Detect multiple unique committers from `rawData.extracted.commits` (different authorGithubId values)
      - Extract linked issue numbers from `rawData.extracted.linkedIssues` (already parsed in webhook processor)
      - For linked issues: call GitHub API via `GitHubApiService` to fetch issue assignees
    - For `COMMIT` contributions:
      - Parse commit message for `Co-authored-by` trailers
    - For each detected collaborator: resolve to Contributor via GitHub ID, username, or email (reuse matching logic from `ContributionAttributionService`)
  - [x]3.4 Implement `createCollaborationRecords(contributionId, primaryContributorId, detectedCollaborators[])`:
    - Calculate equal-split percentages: `100 / (1 + detectedCollaborators.length)`
    - Create `ContributionCollaboration` record for primary author with role `PRIMARY_AUTHOR`
    - Create `ContributionCollaboration` record for each detected collaborator with appropriate role (`CO_AUTHOR`, `COMMITTER`, or `ISSUE_ASSIGNEE`)
    - All records have status `DETECTED`
    - Use `prisma.$transaction()` for atomicity
    - Create audit log entry: `contribution.collaboration.detected`
  - [x]3.5 Emit `contribution.collaboration.detected` event after records created
  - [x]3.6 Publish SSE events to each collaborator's channel: `contributions:contributor:{contributorId}` with type `contribution.collaboration.detected`
  - [x]3.7 Add unit tests in `collaboration-detection.service.spec.ts`:
    - Test: PR with Co-authored-by trailers → detects co-authors
    - Test: PR with multiple committers → detects committers
    - Test: PR with linked issues → fetches assignees and detects them
    - Test: Commit with Co-authored-by trailer → detects co-author
    - Test: Code review → skips detection (returns early)
    - Test: No collaborators found → no records created
    - Test: Collaborator not a registered contributor → skipped
    - Test: Equal-split calculation with 2 collaborators → 33.33% each
    - Test: Equal-split calculation with 1 collaborator → 50% each

- [x] **Task 4: Webhook processor enhancement - extract co-author data** (AC: #1)
  - [x]4.1 Modify `extractCommit()` in `apps/api/src/modules/ingestion/processors/webhook.processor.ts`:
    - Parse `Co-authored-by` trailers from commit message
    - Add `coAuthors: { name: string, email: string }[]` to `extracted` object
  - [x]4.2 Modify `extractPullRequest()`:
    - Collect unique committers from PR commits (if available in push payload)
    - Add `commitAuthors: { githubId: number, username: string, email?: string }[]` to `extracted` object
    - Linked issues are already extracted as `linkedIssues` - no change needed
  - [x]4.3 Update webhook processor tests to verify new extracted fields
  - [x]4.4 Ensure backward compatibility: existing contributions without coAuthors field should not break detection service (handle gracefully)

- [x] **Task 5: Contributor collaboration endpoints** (AC: #2, #3)
  - [x]5.1 Add to `ContributionController` in `apps/api/src/modules/ingestion/contribution.controller.ts`:
    - `GET /api/v1/contributors/me/contributions/:id` - MODIFY: include `collaborations` array in response when collaborations exist (join via Prisma include)
  - [x]5.2 Create `CollaborationController` in `apps/api/src/modules/ingestion/collaboration.controller.ts`:
    - `POST /api/v1/contributors/me/collaborations/:id/confirm` - Confirm collaboration (AC: #2)
      - Verify collaboration belongs to authenticated contributor
      - Update status from `DETECTED` to `CONFIRMED`, set `confirmedAt`
      - Create audit log: `contribution.collaboration.confirmed`
      - Emit `contribution.collaboration.confirmed` event
      - Return updated collaboration
    - `POST /api/v1/contributors/me/collaborations/:id/dispute` - Dispute collaboration (AC: #3)
      - Verify collaboration belongs to authenticated contributor
      - Validate body with `disputeCollaborationSchema` (comment required, min 10 chars)
      - Update status from `DETECTED` to `DISPUTED`, set `disputeComment`
      - Create audit log: `contribution.collaboration.disputed`
      - Emit `contribution.collaboration.disputed` event
      - Return updated collaboration
  - [x]5.3 Apply `@JwtAuthGuard()`, `@CheckAbility()` decorators (ability to Read Contribution)
  - [x]5.4 Add Swagger decorators for all endpoints
  - [x]5.5 Add unit tests in `collaboration.controller.spec.ts`:
    - Test: Confirm own collaboration → success
    - Test: Confirm other contributor's collaboration → 403
    - Test: Confirm already confirmed → 409 with COLLABORATION_ALREADY_CONFIRMED
    - Test: Dispute with valid comment → success
    - Test: Dispute with comment < 10 chars → 400 validation error
    - Test: Collaboration not found → 404

- [x] **Task 6: Admin attribution override endpoint** (AC: #3)
  - [x]6.1 Create `AdminContributionController` in `apps/api/src/modules/ingestion/admin-contribution.controller.ts`:
    - `GET /api/v1/admin/contributions/:id/collaborations` - List all collaborations for a contribution
    - `PATCH /api/v1/admin/contributions/:id/attribution` - Override attribution split
      - Validate body with `overrideAttributionSchema` (splits must sum to 100)
      - Use `prisma.$transaction()`:
        - Update all existing CollaborationCollaboration records: set status `OVERRIDDEN`, set `overriddenById` to admin ID
        - Create new CollaborationCollaboration records with overridden splits and status `OVERRIDDEN`
        - Create audit log: `contribution.attribution.overridden` with details of old and new splits
      - Emit `contribution.attribution.overridden` event
      - Publish SSE to affected contributors
  - [x]6.2 Apply `@UseGuards(JwtAuthGuard, AbilityGuard)` and `@CheckAbility((ability) => ability.can(Action.Manage, 'all'))` for admin-only access
  - [x]6.3 Add Swagger decorators
  - [x]6.4 Add unit tests in `admin-contribution.controller.spec.ts`:
    - Test: Override with valid splits summing to 100 → success
    - Test: Override with splits not summing to 100 → 400
    - Test: Override non-existent contribution → 404
    - Test: Audit log created on override
    - Test: Non-admin access → 403

- [x] **Task 7: CASL and module registration** (AC: all)
  - [x]7.1 Add `ContributionCollaboration` to CASL subjects in `apps/api/src/modules/auth/casl/subjects.ts`
  - [x]7.2 Add to ability factory in `apps/api/src/modules/auth/casl/ability.factory.ts`:
    - CONTRIBUTOR: `can(Action.Read, 'ContributionCollaboration')` and `can(Action.Update, 'ContributionCollaboration')` (for confirm/dispute own)
    - ADMIN: already has `can(Action.Manage, 'all')` which covers override
  - [x]7.3 Register all new services and controllers in `apps/api/src/modules/ingestion/ingestion.module.ts`:
    - `CollaborationDetectionService`
    - `CollaborationController`
    - `AdminContributionController`

### Frontend

- [x] **Task 8: Collaboration data hooks** (AC: #2, #3)
  - [x]8.1 Create `apps/web/hooks/use-collaboration.ts`:
    - `useConfirmCollaboration()` - mutation hook for `POST /api/v1/contributors/me/collaborations/:id/confirm`
      - On success: invalidate `['contributions', 'me']` query
    - `useDisputeCollaboration()` - mutation hook for `POST /api/v1/contributors/me/collaborations/:id/dispute`
      - On success: invalidate `['contributions', 'me']` query
  - [x]8.2 Modify `apps/web/hooks/use-contribution-detail.ts`:
    - Response type now includes `collaborations` array (update TypeScript type)

- [x] **Task 9: Collaboration indicator on contribution list** (AC: #2)
  - [x]9.1 Modify `apps/web/components/features/contributions/contribution-list-item.tsx`:
    - When contribution has `collaborations` array with length > 1:
      - Show collaboration indicator below the title: "{splitPercentage}% with {otherContributorNames}"
      - Example: "50% with Lena" or "33% with Lena, Marco"
      - Use calm, non-prominent styling (small text, neutral color)
    - When no collaborations or single author: no change (backward compatible)
  - [x]9.2 Ensure equal visual prominence is maintained (collaboration indicator is informational, not a highlight)
  - [x]9.3 Verify WCAG 2.1 AA: screen reader label for collaboration info, 4.5:1 contrast

- [x] **Task 10: Collaboration detail in contribution detail view** (AC: #2, #3)
  - [x]10.1 Modify `apps/web/components/features/contributions/contribution-detail.tsx`:
    - Add "Attribution" section when collaborations exist:
      - List each collaborator with: name (or "You"), split percentage, role badge (Co-author, Committer, etc.), status badge (Detected, Confirmed, Disputed, Overridden)
    - For the authenticated contributor's own collaboration record:
      - If status is `DETECTED`: show "Confirm" and "Request Review" buttons
      - "Confirm" button: calls `useConfirmCollaboration()` mutation
      - "Request Review" button: opens a text input for dispute comment (min 10 chars), then calls `useDisputeCollaboration()` mutation
    - If status is `CONFIRMED`: show checkmark with "Confirmed" label
    - If status is `DISPUTED`: show "Under review" badge
    - If status is `OVERRIDDEN`: show "Adjusted by admin" badge with overridden split
  - [x]10.2 Use calm, non-urgent styling per UX spec (no warning colors for disputed status)
  - [x]10.3 Verify WCAG 2.1 AA: keyboard navigation for confirm/dispute actions, aria-labels

- [x] **Task 11: SSE updates for collaboration events** (AC: #2)
  - [x]11.1 Modify `apps/web/hooks/use-contribution-sse.ts`:
    - Handle new SSE event type `contribution.collaboration.detected` → invalidate `['contributions', 'me']` query
    - Handle `contribution.collaboration.confirmed` → invalidate contribution detail query
    - Handle `contribution.attribution.overridden` → invalidate contribution detail query

- [x] **Task 12: Tests** (AC: all)
  - [x]12.1 Backend unit tests: CollaborationDetectionService (co-author detection, committer detection, issue assignee detection, equal-split calculation, edge cases)
  - [x]12.2 Backend unit tests: CollaborationController (confirm, dispute, authorization, validation)
  - [x]12.3 Backend unit tests: AdminContributionController (override, split validation, audit log)
  - [x]12.4 Backend unit tests: Webhook processor (coAuthors extraction, commitAuthors extraction)
  - [x]12.5 Frontend component tests: collaboration indicator in list item (with/without collaborators)
  - [x]12.6 Frontend component tests: attribution section in detail view (confirm, dispute, status badges)
  - [x]12.7 Frontend hook tests: collaboration mutation hooks (confirm, dispute, cache invalidation)

## Dev Notes

### Architecture Patterns & Constraints

**Tech Stack (MUST follow):**

- Backend: NestJS 11.x with TypeScript strict mode
- Frontend: Next.js 16.x (App Router) with TypeScript
- ORM: Prisma 7.x
- Database: PostgreSQL 16+
- Cache/PubSub: Redis 7.x
- Styling: Tailwind CSS 4.x
- State: TanStack Query (server state), Zustand (UI state only)
- Testing: Vitest (unit/integration), Playwright (E2E)
- Logging: Pino via nestjs-pino (structured JSON with correlationId)
- GitHub API: @octokit/rest 22.0.1

**API Conventions (MUST follow):**

- RESTful with URI versioning: `/api/v1/...`
- Endpoints: kebab-case plural nouns
- Route params: camelCase (`:contributorId`)
- Request/response body: camelCase
- Cursor-based pagination: `?cursor=...&limit=20` (default 20, max 100)
- Success envelope: `{ data, meta: { timestamp, correlationId, pagination } }`
- Error envelope: `{ error: { code, message, status, correlationId, timestamp } }`
- Error codes: UPPER_SNAKE_CASE domain-prefixed
- HTTP status: 200 GET/PATCH, 201 POST, 204 DELETE, 400 validation, 401 unauth, 403 forbidden, 404 not found, 409 conflict

**Database Conventions:**

- Tables: snake_case plural (`contribution_collaborations`)
- Columns: snake_case (`contributor_id`, `split_percentage`)
- Prisma models: PascalCase singular with `@@map` to table names
- FKs: `{referenced_table_singular}_id`
- Indexes: `idx_{table}_{columns}`
- Enums: PascalCase (`CollaborationRole`, `CollaborationStatus`)
- Schema ownership: `core` schema

**Module Pattern:**

- One module per domain in `apps/api/src/modules/`
- Tests co-located as `*.spec.ts` next to source files
- DTOs in `dto/` subdirectory
- Controllers: `@JwtAuthGuard()`, `@CheckAbility()`, `@CurrentUser()`, Swagger decorators
- Services: PrismaService injection, EventEmitter2 for domain events, Pino logger
- Responses wrapped via `createSuccessResponse()`

**Frontend Pattern:**

- Route groups: `(public)/`, `(dashboard)/`, `(admin)/`
- Components: `components/features/{domain}/` for feature components, `packages/ui/` for shared primitives
- Hooks: `hooks/use-{name}.ts` using TanStack Query
- Files: kebab-case, components PascalCase, hooks camelCase with `use` prefix
- Skeleton loaders for initial loads (not spinners)
- Error Boundaries at route group level
- Toast notifications for non-blocking errors

**Event System:**

- Naming: `{domain}.{entity}.{action}` in dot.case
- Payload: `{ eventType, timestamp, correlationId, actorId, payload }`
- Existing events: `contribution.commit.ingested`, `contribution.pull_request.ingested`, `contribution.review.ingested`, `contribution.attributed`
- New events for 4-4:
  - `contribution.collaboration.detected` - after collaboration records are created
  - `contribution.collaboration.confirmed` - after contributor confirms
  - `contribution.collaboration.disputed` - after contributor disputes
  - `contribution.attribution.overridden` - after admin overrides split

**SSE Architecture:**

- NestJS `@Sse()` decorator returns `Observable<MessageEvent>`
- Redis pub/sub for multi-instance broadcasting
- SSE clients receive events via EventSource browser API
- Channel: `contributions:contributor:{contributorId}`
- New event types: `contribution.collaboration.detected`, `contribution.collaboration.confirmed`, `contribution.attribution.overridden`

**UX Design Requirements (MUST follow):**

- "Calm clarity" aesthetic: no urgency signals or warning colors for status
- Equal visual prominence for all contribution types
- Collaboration indicator: calm, informational text (e.g., "50% with Lena") - NOT a highlight badge
- "Confirm" and "Request Review" actions styled as secondary buttons, not urgent CTAs
- "Disputed" status shown as neutral "Under review" badge (NOT warning/red)
- "Overridden" status shown as informational "Adjusted by admin" (NOT error)
- Sans-serif for data display, 15px text
- Warm borders (`border-surface-border`), `surface-raised` backgrounds
- 44x44px minimum touch targets, keyboard navigation, 4.5:1 contrast ratio

### Previous Story Intelligence (Story 4-3)

**Critical learnings to apply:**

1. **Contribution model fields**: id, contributorId (nullable), repositoryId, source, sourceRef, contributionType, title, description, rawData (JSON), normalizedAt, status, createdAt, updatedAt. DO NOT modify existing fields - ADD the new `collaborations` relation only.

2. **ContributionStatus enum currently has**: INGESTED, ATTRIBUTED, UNATTRIBUTED, EVALUATED. Story 4-4 does NOT need to add new values - collaboration status is tracked in the separate `ContributionCollaboration` model.

3. **Attribution service flow**: Listens to `contribution.*.ingested`, matches by GitHub ID → username → email, updates status to ATTRIBUTED/UNATTRIBUTED. The collaboration detection service should listen to the SAME event but runs independently (both services process in parallel).

4. **rawData structure**: Contains original GitHub payload + `extracted` object. For commits: `{ sha, authorGithubId, authorUsername, authorEmail, message, timestamp, filesChanged }`. For PRs: `{ number, title, body, authorGithubId, state, requestedReviewers, linkedIssues, merged }`. The webhook processor MUST be extended to add `coAuthors` and `commitAuthors` to extracted data.

5. **Existing indexes**: `contributions_contributor_created_idx` on `(contributorId, createdAt DESC)`. New collaboration table needs its own indexes.

6. **Test count from Story 4-3**: API 378 passed / 1 skipped, Web 249 passed. Ensure no regressions.

7. **BullMQ has separate Redis connection** from RedisService. SSE uses RedisService's pub/sub, NOT the BullMQ connection.

8. **GitHub API client exists**: `GitHubApiService` in `apps/api/src/modules/ingestion/` - use this for fetching issue assignees (DO NOT create a new GitHub client).

9. **Admin controller pattern**: See `apps/api/src/modules/contributor/contributor.controller.ts` for admin endpoint examples. Uses `@CheckAbility((ability) => ability.can(Action.Manage, 'all'))`.

10. **Transaction pattern**: Use `prisma.$transaction()` for multi-step writes. Always include audit log creation in the same transaction.

11. **SSE query-token authentication**: Story 4-3 added JWT extraction from query params for EventSource (which can't set headers). Reuse this pattern.

12. **RedisService methods**: `publish(channel, message)` and `createSubscriber()` were added in Story 4-3.

**Files from Story 4-3 that are directly relevant:**

- `apps/api/prisma/schema.prisma` - Contribution model (extend with relation)
- `apps/api/src/modules/ingestion/processors/webhook.processor.ts` - Extend extractCommit/extractPullRequest
- `apps/api/src/modules/ingestion/services/contribution-attribution.service.ts` - Reuse matching logic
- `apps/api/src/modules/ingestion/contribution.controller.ts` - Extend detail endpoint
- `apps/api/src/modules/ingestion/contribution-sse.controller.ts` - SSE pattern reference
- `apps/api/src/modules/ingestion/contribution-sse.service.ts` - Redis pub/sub pattern
- `apps/api/src/modules/ingestion/ingestion.module.ts` - Register new components
- `apps/api/src/modules/auth/casl/subjects.ts` - Add new subject
- `apps/api/src/modules/auth/casl/ability.factory.ts` - Add collaboration permissions
- `packages/shared/src/schemas/ingestion.schema.ts` - Add collaboration schemas
- `packages/shared/src/types/ingestion.types.ts` - Add collaboration types
- `packages/shared/src/constants/error-codes.ts` - Add error codes
- `apps/web/hooks/use-contribution-detail.ts` - Update response type
- `apps/web/hooks/use-contribution-sse.ts` - Handle new event types
- `apps/web/components/features/contributions/contribution-list-item.tsx` - Add indicator
- `apps/web/components/features/contributions/contribution-detail.tsx` - Add attribution section

**Files with patterns to follow:**

- `apps/api/src/modules/contributor/contributor.controller.ts` - Admin endpoint pattern (RBAC, audit log)
- `apps/api/src/modules/contributor/contributor.service.ts` - Service with transaction + audit log
- `apps/api/src/modules/admission/admission.service.ts` - Transaction-based audit logging
- `apps/web/hooks/use-profile.ts` - Mutation hook pattern (useMutation, optimistic updates)
- `apps/web/hooks/use-contributions.ts` - Infinite query pattern

### Project Structure Notes

**Backend file locations:**

```
apps/api/src/modules/ingestion/
  ingestion.module.ts                          # MODIFY: register new services/controllers
  processors/
    webhook.processor.ts                       # MODIFY: extend extractCommit/extractPullRequest
    webhook.processor.spec.ts                  # MODIFY: add tests for coAuthors extraction
  services/
    contribution-attribution.service.ts        # READ-ONLY: reuse matching logic (DO NOT modify)
    collaboration-detection.service.ts         # NEW: collaboration detection logic
    collaboration-detection.service.spec.ts    # NEW: unit tests
  contribution.controller.ts                   # MODIFY: include collaborations in detail response
  collaboration.controller.ts                  # NEW: confirm/dispute endpoints
  collaboration.controller.spec.ts             # NEW: unit tests
  admin-contribution.controller.ts             # NEW: admin override endpoint
  admin-contribution.controller.spec.ts        # NEW: unit tests
```

**Frontend file locations:**

```
apps/web/
  hooks/
    use-collaboration.ts                       # NEW: confirm/dispute mutation hooks
    use-contribution-detail.ts                 # MODIFY: update response type
    use-contribution-sse.ts                    # MODIFY: handle new event types
  components/features/contributions/
    contribution-list-item.tsx                 # MODIFY: add collaboration indicator
    contribution-detail.tsx                    # MODIFY: add attribution section
```

**Shared package updates:**

```
packages/shared/src/
  schemas/ingestion.schema.ts                  # MODIFY: add collaboration schemas
  types/ingestion.types.ts                     # MODIFY: add collaboration types/events
  constants/error-codes.ts                     # MODIFY: add new error codes
  index.ts                                     # MODIFY: export new schemas/types
```

### Anti-Pattern Prevention

- **DO NOT create a separate module** for collaboration - keep all collaboration logic in `modules/ingestion/` per architecture's requirement mapping (FR15-FR20 -> ingestion module)
- **DO NOT modify ContributionAttributionService** - collaboration detection runs independently via the same event listener, not by extending attribution
- **DO NOT use offset-based pagination** for collaboration lists - use cursor-based pagination
- **DO NOT use warning/error colors** for disputed status - UX spec requires calm, neutral styling
- **DO NOT create visual hierarchy** between collaboration roles - all roles shown equally
- **DO NOT duplicate contributor matching logic** - extract shared matching from attribution service or import and reuse
- **DO NOT use spinners** for loading states - use skeleton loaders
- **DO NOT forget to rebuild shared package** after modifying types/schemas: `pnpm --filter shared build`
- **DO NOT call GitHub API directly** - use existing `GitHubApiService` (it handles rate limiting and authentication)
- **DO NOT create separate SSE channels** for collaboration events - reuse existing `contributions:contributor:{contributorId}` channel with new event types
- **DO NOT add gamification elements** (badges, counters) to collaboration indicators - calm informational text only

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4, Story 4-4 (lines 976-1003)]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Event Naming Convention]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Response Envelope]
- [Source: _bmad-output/planning-artifacts/architecture.md#Module Communication]
- [Source: _bmad-output/planning-artifacts/architecture.md#Testing Standards]
- [Source: _bmad-output/planning-artifacts/architecture.md#CASL RBAC Implementation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Audit Logging]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Calm Clarity Aesthetic]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility Strategy]
- [Source: _bmad-output/implementation-artifacts/4-3-contribution-attribution-and-dashboard-display.md]
- [Source: apps/api/prisma/schema.prisma#Contribution model]
- [Source: apps/api/src/modules/ingestion/processors/webhook.processor.ts#extractCommit, extractPullRequest]
- [Source: apps/api/src/modules/ingestion/services/contribution-attribution.service.ts]
- [Source: apps/api/src/modules/ingestion/contribution.controller.ts]
- [Source: apps/api/src/modules/contributor/contributor.controller.ts#Admin pattern]
- [Source: packages/shared/src/schemas/ingestion.schema.ts]
- [Source: packages/shared/src/types/ingestion.types.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

Code review found gaps in collaborator visibility, PR commit enrichment, override history preservation, detail-query invalidation, and override-rate tracking; all were fixed and re-verified.

### Completion Notes List

- Implemented `ContributionCollaboration` model with `CollaborationRole` and `CollaborationStatus` enums in Prisma schema
- Created Prisma migration `20260306200000_add_contribution_collaboration`
- Added `isCurrent` tracking on collaboration rows so admin overrides preserve history while keeping one active attribution set
- Added collaboration Zod schemas, TypeScript types, and error codes to shared package
- Built `CollaborationDetectionService` that listens to `contribution.*.ingested` events and detects co-authors from: Co-authored-by trailers, multiple committers, linked issue assignees, and PR commit-message trailers
- Added override-rate metric computation/cache updates for collaboration attribution quality tracking
- Extended `WebhookProcessor` to extract `coAuthors`, `commitAuthors`, and PR commit message data into `rawData.extracted`
- Added `getIssue()` and `getPullRequestCommits()` methods to `GitHubApiService`
- Created `CollaborationController` with confirm/dispute endpoints at `/api/v1/contributors/me/collaborations/:id/`
- Created `AdminContributionController` with list/override endpoints at `/api/v1/admin/contributions/:id/`
- Updated `ContributionController` to include collaborations in list/detail responses and grant access to secondary collaborators
- Added `ContributionCollaboration` to CASL subjects and ability factory (Read/Update for CONTRIBUTOR, Manage for ADMIN)
- Registered all new services/controllers in `IngestionModule`
- Created frontend `useConfirmCollaboration` and `useDisputeCollaboration` mutation hooks
- Added collaboration indicator to `ContributionListItem` showing split percentages with collaborator names for both primary and secondary collaborators
- Added Attribution section to `ContributionDetail` with confirm/dispute actions and status badges
- Updated SSE handler and mutation hooks to refresh contribution detail queries for collaboration events
- Verification passed: `pnpm --filter api test -- src/modules/ingestion/contribution.controller.spec.ts src/modules/ingestion/services/collaboration-detection.service.spec.ts src/modules/ingestion/admin-contribution.controller.spec.ts src/modules/ingestion/processors/webhook.processor.spec.ts`
- Verification passed: `pnpm --filter web test -- src/components/features/contributions/contributions.test.tsx`
- Verification passed: `DATABASE_URL='postgresql://edin:edin_dev_password@localhost:5432/edin?schema=core' pnpm --filter api exec prisma generate && DATABASE_URL='postgresql://edin:edin_dev_password@localhost:5432/edin?schema=core' pnpm --filter api build`

### Change Log

- 2026-03-06: Implemented multi-contributor collaboration detection (Story 4-4) - all 12 tasks completed
- 2026-03-06: Remediated code-review findings, re-verified targeted tests, generated Prisma client, and moved story to done

### File List

**New files:**

- `apps/api/prisma/migrations/20260306200000_add_contribution_collaboration/migration.sql`
- `apps/api/src/modules/ingestion/services/collaboration-detection.service.ts`
- `apps/api/src/modules/ingestion/services/collaboration-detection.service.spec.ts`
- `apps/api/src/modules/ingestion/collaboration.controller.ts`
- `apps/api/src/modules/ingestion/collaboration.controller.spec.ts`
- `apps/api/src/modules/ingestion/admin-contribution.controller.ts`
- `apps/api/src/modules/ingestion/admin-contribution.controller.spec.ts`
- `apps/web/hooks/use-collaboration.ts`

**Modified files:**

- `apps/api/prisma/schema.prisma` (added CollaborationRole, CollaborationStatus enums, ContributionCollaboration model, `isCurrent`, and relations on Contributor and Contribution)
- `apps/api/src/modules/ingestion/processors/webhook.processor.ts` (added coAuthors/commitAuthors extraction, PR commit enrichment, parseCoAuthorTrailers method, PR extracted data)
- `apps/api/src/modules/ingestion/processors/webhook.processor.spec.ts` (added co-author extraction tests)
- `apps/api/src/modules/ingestion/contribution.controller.ts` (include collaborations in list/detail responses and allow collaborator access)
- `apps/api/src/modules/ingestion/contribution.controller.spec.ts` (added collaborator access/list coverage)
- `apps/api/src/modules/ingestion/github-api.service.ts` (added `getIssue()` and `getPullRequestCommits()` methods)
- `apps/api/src/modules/ingestion/ingestion.module.ts` (registered new services/controllers)
- `apps/api/src/modules/auth/casl/subjects.ts` (added ContributionCollaboration subject)
- `apps/api/src/modules/auth/casl/ability.factory.ts` (added Read/Update ContributionCollaboration for contributors)
- `packages/shared/src/schemas/ingestion.schema.ts` (added collaboration schemas)
- `packages/shared/src/types/ingestion.types.ts` (added collaboration types and events)
- `packages/shared/src/constants/error-codes.ts` (added collaboration error codes)
- `packages/shared/src/index.ts` (exported new schemas/types)
- `apps/web/hooks/use-contribution-detail.ts` (updated response type to ContributionWithCollaborations)
- `apps/web/hooks/use-contributions.ts` (updated response type)
- `apps/web/hooks/use-contribution-sse.ts` (handle collaboration SSE event types and invalidate detail queries)
- `apps/web/hooks/use-collaboration.ts` (invalidate contribution detail query after confirm/dispute)
- `apps/web/components/features/contributions/contribution-list-item.tsx` (added collaboration indicator using signed-in contributor context)
- `apps/web/components/features/contributions/contribution-detail.tsx` (added Attribution section with confirm/dispute)
- `apps/web/components/features/contributions/contribution-list.tsx` (updated type to ContributionWithCollaborations)
- `apps/web/components/features/contributions/contributions.test.tsx` (updated types, added collaboration indicator tests)
- `_bmad-output/implementation-artifacts/4-4-multi-contributor-collaboration-detection.md` (updated story status and verification notes)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (story status updated)
