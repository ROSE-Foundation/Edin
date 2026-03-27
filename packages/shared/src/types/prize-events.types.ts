// ─── Meaningful Event Tracking (Story np-1.2) ────────────────────────────────

export interface CrossDomainCollaborationMetadata {
  domains: string[];
  channelIds: string[];
  contributionId: string;
  contributorWorkingGroups: string[];
}

export interface HighSignificanceMetadata {
  compositeScore: number;
  percentileRank: number;
  domainBaseline95th: number;
  domain: string;
  channelId: string | null;
  baselineWindowDays: number;
  baselineSampleSize: number;
}

export interface CrossDomainDetectedEvent {
  eventType: 'prize.event.cross_domain_detected';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    contributionId: string;
    contributorId: string;
    domains: string[];
    channelIds: string[];
  };
}

export interface HighSignificanceDetectedEvent {
  eventType: 'prize.event.high_significance_detected';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    contributionId: string;
    contributorId: string;
    compositeScore: number;
    percentileRank: number;
    domainBaseline95th: number;
    domain: string;
    channelId: string | null;
  };
}

// ─── Prize Award Events (Story np-1.3) ──────────────────────────────────────

export interface PrizeAwardedMetadata {
  prizeCategoryId: string;
  prizeCategoryName: string;
  prizeAwardId: string;
  significanceLevel: number;
  channelId: string;
  chathamHouseLabel: string;
  contributionId: string | null;
}

export interface PrizeAwardedEvent {
  eventType: 'prize.event.awarded';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    prizeAwardId: string;
    prizeCategoryId: string;
    prizeCategoryName: string;
    recipientContributorId: string;
    contributionId: string | null;
    significanceLevel: number;
    channelId: string;
    chathamHouseLabel: string;
    narrative: string;
  };
}

// ─── Community Nomination Events (Story np-2.1) ─────────────────────────────

export interface PeerNominationReceivedEvent {
  eventType: 'prize.event.peer_nomination_received';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    nominationId: string;
    nomineeId: string;
    prizeCategoryId: string;
    prizeCategoryName: string;
    channelId: string;
    channelName: string;
  };
}

// ─── Nomination Voting Events (Story np-2.2) ────────────────────────────────

export interface NominationVoteCastEvent {
  eventType: 'prize.event.nomination_vote_cast';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    voteId: string;
    nominationId: string;
    voterId: string;
    nomineeId: string;
    prizeCategoryName: string;
    channelName: string;
    currentVoteCount: number;
  };
}
