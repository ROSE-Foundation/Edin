import { z } from 'zod';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const newspaperItemsQuerySchema = z.object({
  channelId: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      // Support comma-separated channel IDs for multi-channel OR filtering
      const ids = val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length === 0) return undefined;
      // Validate each is a UUID; reject the whole param if any are invalid
      if (ids.some((id) => !UUID_REGEX.test(id))) return undefined;
      return ids;
    }),
});

export type NewspaperItemsQueryDto = z.infer<typeof newspaperItemsQuerySchema>;

export interface NewspaperItemDto {
  id: string;
  editionId: string;
  sourceEventType: string;
  channelId: string;
  channelName: string;
  headline: string;
  body: string;
  chathamHouseLabel: string;
  significanceScore: number;
  rank: number;
  communityVoteCount: number;
  createdAt: string;
}
