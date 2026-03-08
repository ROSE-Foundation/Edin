'use client';

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'text-semantic-success',
  CLAIMED: 'text-[#C49A3C]',
  IN_PROGRESS: 'text-[#3A7D7E]',
  COMPLETED: 'text-brand-secondary',
  EVALUATED: 'text-[#7B6B8A]',
  RETIRED: 'text-brand-secondary/50',
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Available',
  CLAIMED: 'Claimed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  EVALUATED: 'Evaluated',
  RETIRED: 'Retired',
};

interface TaskStatusBadgeProps {
  status: string;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-sans text-[13px] font-medium ${STATUS_STYLES[status] ?? 'text-brand-secondary'}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
