export interface NewspaperEditionPublishedEvent {
  eventType: 'newspaper.edition.published';
  timestamp: string;
  correlationId: string;
  payload: {
    editionId: string;
    editionNumber: number;
    itemCount: number;
    temporalSpanStart: string;
    temporalSpanEnd: string;
  };
}

export interface NewspaperItemVoteCastEvent {
  eventType: 'newspaper.item.vote_cast';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    voteId: string;
    newspaperItemId: string;
    voterId: string;
    currentVoteCount: number;
  };
}
