export interface AnnouncementDto {
  id: string;
  workingGroupId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface CreateAnnouncementDto {
  content: string;
}

export interface AnnouncementCreatedEvent {
  eventType: 'working-group.announcement.created';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    announcementId: string;
    workingGroupId: string;
    authorId: string;
    content: string;
  };
}

export interface AnnouncementDeletedEvent {
  eventType: 'working-group.announcement.deleted';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    announcementId: string;
    workingGroupId: string;
  };
}
