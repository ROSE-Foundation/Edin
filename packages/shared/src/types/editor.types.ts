import type { ArticleListItemDto } from './article.types.js';

// ─── Editor Application Types ──────────────────────────────────────────────

export type EditorApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';

export interface EditorApplicationDto {
  id: string;
  contributorId: string;
  contributorName: string;
  contributorAvatarUrl: string | null;
  domain: string;
  status: EditorApplicationStatus;
  applicationStatement: string;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  createdAt: string;
}

// ─── Eligibility Types ─────────────────────────────────────────────────────

export interface EditorEligibilityCriteriaDto {
  id: string;
  domain: string;
  minContributionCount: number;
  minGovernanceWeight: number;
  maxConcurrentAssignments: number;
  updatedAt: string;
}

export interface EligibilityCheckDto {
  domain: string;
  eligible: boolean;
  criteria: EditorEligibilityCriteriaDto;
  current: {
    contributionCount: number;
    governanceWeight: number;
  };
  existingApplication: EditorApplicationDto | null;
}

// ─── Editor Dashboard Types ────────────────────────────────────────────────

export interface EditorDashboardDto {
  activeAssignments: ArticleListItemDto[];
  completedReviews: number;
  availableArticles: ArticleListItemDto[];
}

export interface ActiveEditorDto {
  id: string;
  contributorId: string;
  contributorName: string;
  contributorAvatarUrl: string | null;
  domain: string;
  activeAssignmentCount: number;
  totalReviews: number;
  approvedAt: string;
}

// ─── Editor Events ─────────────────────────────────────────────────────────

export interface EditorApplicationSubmittedEvent {
  applicationId: string;
  contributorId: string;
  contributorName: string;
  domain: string;
  timestamp: string;
  correlationId: string;
}

export interface EditorApplicationReviewedEvent {
  applicationId: string;
  contributorId: string;
  domain: string;
  decision: string;
  reviewedById: string;
  timestamp: string;
  correlationId: string;
}

export interface EditorRoleRevokedEvent {
  contributorId: string;
  domain: string;
  revokedById: string;
  reason: string;
  timestamp: string;
  correlationId: string;
}
