import { z } from 'zod';

export const addRepositorySchema = z.object({
  owner: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Invalid owner format'),
  repo: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Invalid repo format'),
});

export type AddRepositoryDto = z.infer<typeof addRepositorySchema>;

export const repositoryStatusEnum = z.enum(['ACTIVE', 'PENDING', 'ERROR', 'REMOVING']);

export const repositoryVisibilityEnum = z.enum(['PUBLIC', 'PRIVATE', 'UNKNOWN']);

export type RepositoryVisibility = z.infer<typeof repositoryVisibilityEnum>;

export const repositoryResponseSchema = z.object({
  id: z.string().uuid(),
  owner: z.string(),
  repo: z.string(),
  fullName: z.string(),
  webhookId: z.number().nullable(),
  status: repositoryStatusEnum,
  statusMessage: z.string().nullable(),
  visibility: repositoryVisibilityEnum,
  addedById: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listRepositoriesQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListRepositoriesQueryDto = z.infer<typeof listRepositoriesQuerySchema>;

// Contribution schemas

export const contributionSourceEnum = z.enum(['GITHUB']);

export const contributionTypeEnum = z.enum(['COMMIT', 'PULL_REQUEST', 'CODE_REVIEW']);

export const contributionStatusEnum = z.enum([
  'INGESTED',
  'ATTRIBUTED',
  'UNATTRIBUTED',
  'EVALUATED',
]);

export const webhookDeliveryStatusEnum = z.enum(['RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED']);

export const contributionResponseSchema = z.object({
  id: z.string().uuid(),
  contributorId: z.string().uuid().nullable(),
  repositoryId: z.string().uuid(),
  source: contributionSourceEnum,
  sourceRef: z.string(),
  contributionType: contributionTypeEnum,
  title: z.string(),
  description: z.string().nullable(),
  rawData: z.record(z.unknown()),
  normalizedAt: z.string(),
  status: contributionStatusEnum,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const webhookPayloadSchema = z.object({
  eventType: z.enum(['push', 'pull_request', 'pull_request_review']),
  repositoryFullName: z.string(),
  payload: z.record(z.unknown()),
  deliveryId: z.string(),
});

// Contribution list/detail schemas (Story 4-3)

export const contributionListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: contributionTypeEnum.optional(),
});

export type ContributionListQueryDto = z.infer<typeof contributionListQuerySchema>;

export const contributionDetailResponseSchema = z.object({
  id: z.string().uuid(),
  contributorId: z.string().uuid().nullable(),
  repositoryId: z.string().uuid(),
  repositoryName: z.string(),
  source: contributionSourceEnum,
  sourceRef: z.string(),
  contributionType: contributionTypeEnum,
  title: z.string(),
  description: z.string().nullable(),
  rawData: z.record(z.unknown()),
  normalizedAt: z.string(),
  status: contributionStatusEnum,
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Collaboration schemas (Story 4-4)

export const collaborationRoleEnum = z.enum([
  'PRIMARY_AUTHOR',
  'CO_AUTHOR',
  'COMMITTER',
  'ISSUE_ASSIGNEE',
]);

export const collaborationStatusEnum = z.enum(['DETECTED', 'CONFIRMED', 'DISPUTED', 'OVERRIDDEN']);

export const collaborationResponseSchema = z.object({
  id: z.string().uuid(),
  contributionId: z.string().uuid(),
  contributorId: z.string().uuid(),
  contributorName: z.string(),
  contributorAvatarUrl: z.string().nullable(),
  role: collaborationRoleEnum,
  splitPercentage: z.number(),
  status: collaborationStatusEnum,
  detectionSource: z.string(),
  confirmedAt: z.string().nullable(),
});

export const contributionWithCollaborationsResponseSchema = contributionDetailResponseSchema.extend(
  {
    collaborations: z.array(collaborationResponseSchema),
  },
);

export const confirmCollaborationSchema = z.object({
  confirmed: z.boolean(),
});

export type ConfirmCollaborationDto = z.infer<typeof confirmCollaborationSchema>;

export const disputeCollaborationSchema = z.object({
  comment: z.string().min(10, 'Comment must be at least 10 characters'),
});

export type DisputeCollaborationDto = z.infer<typeof disputeCollaborationSchema>;

export const overrideAttributionSchema = z.object({
  attributions: z
    .array(
      z.object({
        contributorId: z.string().uuid(),
        splitPercentage: z.number().min(0).max(100),
        reason: z.string().optional(),
      }),
    )
    .refine(
      (attributions) => {
        const sum = attributions.reduce((acc, a) => acc + a.splitPercentage, 0);
        return Math.abs(sum - 100) < 0.01;
      },
      { message: 'Attribution splits must sum to 100' },
    ),
});

export type OverrideAttributionDto = z.infer<typeof overrideAttributionSchema>;
