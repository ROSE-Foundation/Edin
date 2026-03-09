import { z } from 'zod';

export const evaluationStatusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED']);

export const evaluationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: evaluationStatusEnum.optional(),
  contributionId: z.string().uuid().optional(),
});

export type EvaluationQuerySchemaDto = z.infer<typeof evaluationQuerySchema>;
