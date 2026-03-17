'use client';

import type { AnnouncementDto, DomainHealthIndicators, WorkingGroupMember } from '@edin/shared';
import { DomainHealthCard } from './domain-health-card';
import { AnnouncementForm } from './announcement-form';
import { AnnouncementList } from './announcement-list';
import { TaskPriorityList } from './task-priority-list';
import { MemberList } from './member-list';
import { DomainApplications } from './domain-applications';
import {
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useReorderTasks,
} from '../../../hooks/use-working-group-lead';
import { useDomainApplications } from '../../../hooks/use-admission-admin';
import { useToast } from '../../ui/toast';

interface TaskItem {
  id: string;
  title: string;
  status: string;
  sortOrder: number;
}

interface WgLeadDashboardProps {
  workingGroupId: string;
  domain: string;
  healthIndicators: DomainHealthIndicators;
  announcements: AnnouncementDto[];
  tasks: TaskItem[];
  members: WorkingGroupMember[];
  currentUserId: string;
  isAdmin: boolean;
}

export function WgLeadDashboard({
  workingGroupId,
  domain,
  healthIndicators,
  announcements,
  tasks,
  members,
  currentUserId,
  isAdmin,
}: WgLeadDashboardProps) {
  const createAnnouncementMutation = useCreateAnnouncement();
  const deleteAnnouncementMutation = useDeleteAnnouncement();
  const reorderTasksMutation = useReorderTasks();
  const { applications, isLoading: isApplicationsLoading } = useDomainApplications(domain);
  const { toast } = useToast();

  const handleCreateAnnouncement = (content: string) => {
    createAnnouncementMutation.mutate(
      { workingGroupId, content },
      {
        onSuccess: () => toast({ title: 'Announcement posted.' }),
        onError: (error) => toast({ title: error.message, variant: 'error' }),
      },
    );
  };

  const handleDeleteAnnouncement = (announcementId: string) => {
    deleteAnnouncementMutation.mutate(
      { workingGroupId, announcementId },
      {
        onSuccess: () => toast({ title: 'Announcement deleted.' }),
        onError: (error) => toast({ title: error.message, variant: 'error' }),
      },
    );
  };

  const handleReorderTasks = (reordered: Array<{ taskId: string; sortOrder: number }>) => {
    reorderTasksMutation.mutate(
      { workingGroupId, domain, tasks: reordered },
      {
        onSuccess: () => toast({ title: 'Task order updated.' }),
        onError: (error) => toast({ title: error.message, variant: 'error' }),
      },
    );
  };

  return (
    <div className="space-y-[var(--spacing-2xl)]">
      {/* Domain Health */}
      <DomainHealthCard healthIndicators={healthIndicators} />

      <section role="region" aria-label="Member Activity">
        <h3 className="font-sans text-[16px] font-medium text-text-primary">Member Activity</h3>
        <div className="mt-[var(--spacing-md)]">
          <MemberList members={members} isLoading={false} />
        </div>
      </section>

      {/* Announcements */}
      <section role="region" aria-label="Announcements">
        <h3 className="font-sans text-[16px] font-medium text-text-primary">Announcements</h3>
        <div className="mt-[var(--spacing-md)] space-y-[var(--spacing-md)]">
          <AnnouncementForm
            onSubmit={handleCreateAnnouncement}
            isPending={createAnnouncementMutation.isPending}
          />
          <AnnouncementList
            announcements={announcements}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onDelete={handleDeleteAnnouncement}
            isDeletePending={deleteAnnouncementMutation.isPending}
          />
        </div>
      </section>

      {/* Task Priority */}
      <section role="region" aria-label="Task Priority">
        <h3 className="font-sans text-[16px] font-medium text-text-primary">Task Priority</h3>
        <div className="mt-[var(--spacing-md)]">
          <TaskPriorityList
            tasks={tasks}
            onReorder={handleReorderTasks}
            isPending={reorderTasksMutation.isPending}
          />
        </div>
      </section>

      <section role="region" aria-label="Pending Reviews">
        <h3 className="font-sans text-[16px] font-medium text-text-primary">Pending Reviews</h3>
        <div className="mt-[var(--spacing-md)]">
          <DomainApplications applications={applications} isPending={isApplicationsLoading} />
        </div>
      </section>
    </div>
  );
}
