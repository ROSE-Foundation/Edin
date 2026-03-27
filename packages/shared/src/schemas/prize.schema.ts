import { z } from 'zod';

// ─── Enums ──────────────────────────────────────────────────────────────────

export const channelTypeEnum = z.enum(['DOMAIN', 'WORKING_GROUP', 'CROSS_DOMAIN', 'CUSTOM']);
export type ChannelType = z.infer<typeof channelTypeEnum>;

export const prizeDetectionTypeEnum = z.enum(['AUTOMATED', 'COMMUNITY_NOMINATED']);
export type PrizeDetectionType = z.infer<typeof prizeDetectionTypeEnum>;

// ─── Threshold Config ───────────────────────────────────────────────────────

/**
 * Discrete threshold operators — no continuous scoring functions (NP-NFR1).
 */
export const discreteThresholdSchema = z
  .object({
    operator: z.enum(['discrete_step', 'gte', 'eq']),
  })
  .passthrough();

export const thresholdConfigSchema = z
  .record(z.string(), discreteThresholdSchema)
  .refine((config) => Object.keys(config).length > 0, {
    message: 'threshold_config must contain at least one threshold rule',
  });

export const scalingConfigSchema = z
  .object({
    temporal_decay: z
      .object({
        enabled: z.boolean(),
        half_life_days: z.number().int().positive().optional(),
      })
      .optional(),
    frequency_cap: z
      .object({
        max_awards_per_contributor_per_period: z.number().int().positive(),
        period_days: z.number().int().positive(),
      })
      .optional(),
  })
  .passthrough();

// ─── Channel Schemas ────────────────────────────────────────────────────────

export const channelSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().min(1),
  type: channelTypeEnum,
  parentChannelId: z.string().uuid().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1),
  type: channelTypeEnum,
  parentChannelId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  isActive: z.boolean().optional(),
});
export type CreateChannelDto = z.infer<typeof createChannelSchema>;

export const updateChannelSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().min(1).optional(),
    type: channelTypeEnum.optional(),
    parentChannelId: z.string().uuid().nullable().optional(),
    metadata: z.record(z.unknown()).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });
export type UpdateChannelDto = z.infer<typeof updateChannelSchema>;

// ─── Prize Category Schemas ─────────────────────────────────────────────────

export const prizeCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().min(1),
  channelId: z.string().uuid().nullable(),
  detectionType: prizeDetectionTypeEnum,
  thresholdConfig: thresholdConfigSchema,
  scalingConfig: scalingConfigSchema,
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createPrizeCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1),
  channelId: z.string().uuid().nullable().optional(),
  detectionType: prizeDetectionTypeEnum,
  thresholdConfig: thresholdConfigSchema,
  scalingConfig: scalingConfigSchema,
  isActive: z.boolean().optional(),
});
export type CreatePrizeCategoryDto = z.infer<typeof createPrizeCategorySchema>;

export const updatePrizeCategorySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().min(1).optional(),
    channelId: z.string().uuid().nullable().optional(),
    detectionType: prizeDetectionTypeEnum.optional(),
    thresholdConfig: thresholdConfigSchema.optional(),
    scalingConfig: scalingConfigSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });
export type UpdatePrizeCategoryDto = z.infer<typeof updatePrizeCategorySchema>;

// ─── Prize Award Schema ─────────────────────────────────────────────────────

export const prizeAwardSchema = z.object({
  id: z.string().uuid(),
  prizeCategoryId: z.string().uuid(),
  recipientContributorId: z.string().uuid(),
  contributionId: z.string().uuid().nullable(),
  significanceLevel: z.number().int().min(1).max(3),
  channelId: z.string().uuid(),
  chathamHouseLabel: z.string().min(1),
  narrative: z.string().min(1),
  awardedAt: z.string().datetime(),
  metadata: z.record(z.unknown()).nullable(),
});

export const prizeAwardQuerySchema = z.object({
  prizeCategoryId: z.string().uuid().optional(),
  channelId: z.string().uuid().optional(),
  recipientContributorId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().uuid().optional(),
});
export type PrizeAwardQueryDto = z.infer<typeof prizeAwardQuerySchema>;

// ─── Community Nomination Schemas ──────────────────────────────────────────

export const nominationStatusEnum = z.enum(['OPEN', 'AWARDED', 'EXPIRED', 'WITHDRAWN']);
export type NominationStatusType = z.infer<typeof nominationStatusEnum>;

export const createNominationSchema = z.object({
  nomineeId: z.string().uuid(),
  prizeCategoryId: z.string().uuid(),
  channelId: z.string().uuid(),
  rationale: z.string().min(50, 'Rationale must be at least 50 characters').max(2000),
});
export type CreateNominationDto = z.infer<typeof createNominationSchema>;
