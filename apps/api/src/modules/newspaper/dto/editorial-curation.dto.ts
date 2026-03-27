import { z } from 'zod';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const bulkEditorialRankUpdateSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().regex(UUID_REGEX, 'Invalid UUID format'),
        editorialRankOverride: z.number().int().min(1).nullable(),
      }),
    )
    .min(1, 'At least one item required')
    .max(100, 'Maximum 100 items per request'),
});

export type BulkEditorialRankUpdateDto = z.infer<typeof bulkEditorialRankUpdateSchema>;
