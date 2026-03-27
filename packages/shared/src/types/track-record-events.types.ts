export interface TrackRecordMilestoneCrossedEvent {
  eventType: 'track-record.milestone.crossed';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    milestoneId: string;
    contributorId: string;
    milestoneType: string;
    thresholdName: string;
  };
}

export interface TrackRecordOutcomeGrantedEvent {
  eventType: 'track-record.outcome.granted';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    outcomeId: string;
    milestoneId: string;
    contributorId: string;
    outcomeType: string;
  };
}
