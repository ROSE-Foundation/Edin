import { z } from 'zod';

export const newspaperEditionsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
});

export type NewspaperEditionsQueryDto = z.infer<typeof newspaperEditionsQuerySchema>;

export interface NewspaperEditionDto {
  id: string;
  editionNumber: number;
  status: string;
  temporalSpanStart: string;
  temporalSpanEnd: string;
  eventCount: number;
  eventDensity: number;
  significanceDistribution: Record<string, number>;
  referenceScaleMetadata: {
    temporalSpanHumanReadable: string;
    significanceSummary: string;
    comparisonContext: string;
  };
  publishedAt: string | null;
  itemCount: number;
}

export interface EditionChannelDto {
  channelId: string;
  channelName: string;
  channelType: string;
  itemCount: number;
}

export interface NewspaperEditionWithItemsDto extends NewspaperEditionDto {
  items: NewspaperItemSummaryDto[];
  channels?: EditionChannelDto[];
}

export interface NewspaperEditionItemsResponseDto {
  items: import('./newspaper-item.dto.js').NewspaperItemDto[];
  channels: EditionChannelDto[];
}

export interface NewspaperItemSummaryDto {
  id: string;
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
