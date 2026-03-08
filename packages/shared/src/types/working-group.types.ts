import type { Domain } from '../constants/domains.js';
import type { MicroTask } from './admission.types.js';
import type { AnnouncementDto } from './announcement.types.js';

export interface WorkingGroup {
  id: string;
  name: string;
  description: string;
  domain: Domain;
  accentColor: string;
  memberCount: number;
  isMember: boolean;
  leadContributor?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkingGroupMember {
  id: string;
  workingGroupId: string;
  contributorId: string;
  joinedAt: string;
  recentContributionCount?: number;
  contributor?: {
    id: string;
    name: string;
    avatarUrl: string | null;
    domain: Domain | null;
    role: string;
  };
}

export interface WorkingGroupDetail extends WorkingGroup {
  members: WorkingGroupMember[];
  isMember: boolean;
  announcements: AnnouncementDto[];
  activeTasks: Pick<
    MicroTask,
    'id' | 'title' | 'description' | 'estimatedEffort' | 'submissionFormat'
  >[];
}

export interface DomainHealthIndicators {
  activeMembers: number;
  contributionVelocity: number;
  totalContributions: number;
}

export interface WorkingGroupLeadAssignedEvent {
  eventType: 'working-group.lead.assigned';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    workingGroupId: string;
    contributorId: string;
    workingGroupName: string;
  };
}

export interface WorkingGroupMemberJoinedEvent {
  eventType: 'working-group.member.joined';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    workingGroupId: string;
    contributorId: string;
    workingGroupName: string;
  };
}

export interface WorkingGroupMemberLeftEvent {
  eventType: 'working-group.member.left';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    workingGroupId: string;
    contributorId: string;
    workingGroupName: string;
  };
}
