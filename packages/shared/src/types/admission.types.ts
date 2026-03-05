import type { z } from 'zod';
import type {
  createApplicationSchema,
  submitReviewSchema,
  updateApplicationStatusSchema,
  assignReviewerSchema,
  listApplicationsQuerySchema,
  createMicroTaskSchema,
  updateMicroTaskSchema,
  listMicroTasksQuerySchema,
  assignBuddySchema,
  overrideBuddySchema,
  buddyOptInSchema,
  listBuddyAssignmentsQuerySchema,
  recordMilestoneSchema,
  listOnboardingStatusQuerySchema,
} from '../schemas/admission.schema.js';

export type ApplicationStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'DECLINED';

export type ReviewRecommendation = 'APPROVE' | 'REQUEST_MORE_INFO' | 'DECLINE';

export interface Application {
  id: string;
  applicantName: string;
  applicantEmail: string;
  domain: string;
  statementOfInterest: string;
  microTaskDomain: string;
  microTaskResponse: string;
  microTaskSubmissionUrl: string | null;
  gdprConsentVersion: string;
  gdprConsentedAt: string;
  status: ApplicationStatus;
  contributorId: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  declineReason: string | null;
  ignitionStartedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationReview {
  id: string;
  applicationId: string;
  reviewerId: string;
  recommendation: ReviewRecommendation | null;
  feedback: string | null;
  submittedAt: string | null;
  createdAt: string;
}

export interface MicroTask {
  id: string;
  domain: string;
  title: string;
  description: string;
  expectedDeliverable: string;
  estimatedEffort: string;
  submissionFormat: string;
  isActive: boolean;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentRecord {
  id: string;
  entityType: string;
  entityId: string;
  consentType: string;
  consentVersion: string;
  accepted: boolean;
  acceptedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;
export type AssignReviewerInput = z.infer<typeof assignReviewerSchema>;
export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;
export type CreateMicroTaskInput = z.infer<typeof createMicroTaskSchema>;
export type UpdateMicroTaskInput = z.infer<typeof updateMicroTaskSchema>;
export type ListMicroTasksQueryInput = z.infer<typeof listMicroTasksQuerySchema>;

// --- Buddy assignment types (Story 3-4) ---

export interface BuddyAssignment {
  id: string;
  contributorId: string;
  buddyId: string;
  assignedAt: string;
  expiresAt: string;
  isActive: boolean;
  notes: string | null;
}

export interface BuddyProfile {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  domain: string | null;
}

export interface FirstTaskRecommendation {
  taskTitle: string;
  taskDescription: string;
  estimatedEffort: string;
  domain: string;
  claimable: boolean;
}

export type AssignBuddyInput = z.infer<typeof assignBuddySchema>;
export type OverrideBuddyInput = z.infer<typeof overrideBuddySchema>;
export type BuddyOptInInput = z.infer<typeof buddyOptInSchema>;
export type ListBuddyAssignmentsQueryInput = z.infer<typeof listBuddyAssignmentsQuerySchema>;

// --- Onboarding tracking types (Story 3-5) ---

export type OnboardingMilestoneType =
  | 'ACCOUNT_ACTIVATED'
  | 'BUDDY_ASSIGNED'
  | 'FIRST_TASK_VIEWED'
  | 'FIRST_TASK_CLAIMED'
  | 'FIRST_CONTRIBUTION_SUBMITTED';

export interface OnboardingMilestone {
  id: string;
  contributorId: string;
  milestoneType: OnboardingMilestoneType;
  completedAt: string;
  metadata: Record<string, unknown> | null;
}

export interface OnboardingStatus {
  contributorId: string;
  contributorName: string;
  contributorDomain: string | null;
  ignitionStartedAt: string | null;
  milestones: OnboardingMilestone[];
  isWithin72Hours: boolean;
  isComplete: boolean;
  isAtRisk: boolean;
  isExpired: boolean;
  hoursElapsed: number | null;
}

export type RecordMilestoneInput = z.infer<typeof recordMilestoneSchema>;
export type ListOnboardingStatusQueryInput = z.infer<typeof listOnboardingStatusQuerySchema>;
