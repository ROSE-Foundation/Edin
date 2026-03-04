import type { z } from 'zod';
import type { createApplicationSchema } from '../schemas/admission.schema.js';

export type ApplicationStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'DECLINED';

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
  createdAt: string;
  updatedAt: string;
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
