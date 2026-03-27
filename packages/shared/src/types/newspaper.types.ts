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

export interface NewspaperItemDto {
  id: string;
  editionId?: string;
  sourceEventType: string;
  channelId: string;
  channelName: string;
  headline: string;
  body: string;
  chathamHouseLabel: string;
  significanceScore: number;
  rank: number;
  communityVoteCount: number;
  hasVoted?: boolean;
  createdAt: string;
}

export interface EditionChannelDto {
  channelId: string;
  channelName: string;
  channelType: string;
  itemCount: number;
}

export interface NewspaperEditionWithItemsDto extends NewspaperEditionDto {
  items: NewspaperItemDto[];
  channels?: EditionChannelDto[];
}

export interface NewspaperEditionItemsResponse {
  items: NewspaperItemDto[];
  channels: EditionChannelDto[];
}

export type ActivityLevel = 'high' | 'above-average' | 'normal' | 'below-average' | 'low';

export interface EditorialRankUpdateItemDto {
  itemId: string;
  editorialRankOverride: number | null;
}

export interface BulkEditorialRankUpdateDto {
  items: EditorialRankUpdateItemDto[];
}

export interface EditorialCurationResultDto {
  editionId: string;
  updatedItems: Array<{
    itemId: string;
    previousRank: number | null;
    newRank: number | null;
  }>;
}

export interface EditorialAuditEntryDto {
  id: string;
  editorId: string;
  editorRole: string | null;
  editionId: string;
  action: string;
  itemChanges: Array<{
    itemId: string;
    previousRank: number | null;
    newRank: number | null;
  }>;
  createdAt: string;
}

export interface NewspaperItemVoteResultDto {
  voteId: string;
  newspaperItemId: string;
  currentVoteCount: number;
}

export interface NewspaperItemVoteStatusDto {
  hasVoted: boolean;
}

export interface NewspaperItemBatchVoteStatusDto {
  votedItemIds: string[];
}

export interface ReferenceScaleDto {
  editionId: string;
  editionNumber: number;
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
  isQuietPeriod: boolean;
  activityLevel: ActivityLevel;
  densityRatio: number | null;
}
