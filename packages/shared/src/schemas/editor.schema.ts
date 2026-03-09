import { z } from 'zod';
import { domainEnum } from './contributor.schema.js';

export const EDITOR_APPLICATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED'] as const;
export const EDITOR_APPLICATION_DECISIONS = ['APPROVED', 'REJECTED'] as const;

export const editorApplicationStatusEnum = z.enum(EDITOR_APPLICATION_STATUSES);
export const editorApplicationDecisionEnum = z.enum(EDITOR_APPLICATION_DECISIONS);

/**
 * Schema for submitting an editor application.
 */
export const editorApplicationSchema = z.object({
  domain: domainEnum,
  applicationStatement: z
    .string()
    .min(20, 'Application statement must be at least 20 characters')
    .max(300, 'Application statement must be 300 characters or less'),
});

/**
 * Schema for admin reviewing an editor application.
 */
export const reviewEditorApplicationSchema = z.object({
  decision: editorApplicationDecisionEnum,
  reviewNotes: z.string().optional(),
});

/**
 * Schema for admin updating eligibility criteria.
 */
export const updateEligibilityCriteriaSchema = z.object({
  minContributionCount: z.number().int().min(1).optional(),
  minGovernanceWeight: z.number().min(0).optional(),
  maxConcurrentAssignments: z.number().int().min(1).max(20).optional(),
});

/**
 * Schema for admin revoking editor status.
 */
export const revokeEditorSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

export type EditorApplicationInput = z.infer<typeof editorApplicationSchema>;
export type ReviewEditorApplicationInput = z.infer<typeof reviewEditorApplicationSchema>;
export type UpdateEligibilityCriteriaInput = z.infer<typeof updateEligibilityCriteriaSchema>;
export type RevokeEditorInput = z.infer<typeof revokeEditorSchema>;
