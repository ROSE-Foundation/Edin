export type ActivityLevel = 'high' | 'above-average' | 'normal' | 'below-average' | 'low';

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
