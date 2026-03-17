'use client';

import { useState } from 'react';
import { useEligibleBuddies, useOverrideBuddyAssignment } from '../../../../hooks/use-buddy-admin';
import { useToast } from '../../../ui/toast';

interface BuddyOverrideDialogProps {
  assignmentId: string;
  contributorName: string;
  onClose: () => void;
}

export function BuddyOverrideDialog({
  assignmentId,
  contributorName,
  onClose,
}: BuddyOverrideDialogProps) {
  const [selectedBuddyId, setSelectedBuddyId] = useState('');
  const { buddies, isLoading: buddiesLoading } = useEligibleBuddies();
  const overrideMutation = useOverrideBuddyAssignment();
  const { toast } = useToast();

  const handleOverride = async () => {
    if (!selectedBuddyId) return;

    try {
      await overrideMutation.mutateAsync({
        assignmentId,
        newBuddyId: selectedBuddyId,
      });
      toast({ title: 'Buddy assignment updated', variant: 'success' });
      onClose();
    } catch {
      toast({ title: 'Failed to override buddy assignment', variant: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div
        className="w-full max-w-[480px] rounded-[16px] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-lg"
        role="alertdialog"
        aria-labelledby="override-dialog-title"
      >
        <h2
          id="override-dialog-title"
          className="font-serif text-[20px] font-bold text-text-primary"
        >
          Reassign Buddy
        </h2>
        <p className="mt-[var(--spacing-sm)] font-serif text-[15px] leading-[1.65] text-text-secondary">
          Select a new buddy for {contributorName}. The current assignment will be deactivated.
        </p>

        <div className="mt-[var(--spacing-md)]">
          <label
            htmlFor="buddy-select"
            className="block font-sans text-[13px] font-medium text-text-secondary"
          >
            New buddy
          </label>
          <select
            id="buddy-select"
            value={selectedBuddyId}
            onChange={(e) => setSelectedBuddyId(e.target.value)}
            disabled={buddiesLoading}
            className="mt-[var(--spacing-xs)] w-full min-h-[44px] rounded-[var(--radius-md)] border border-surface-subtle bg-surface-base px-[var(--spacing-md)] font-sans text-[15px] text-text-primary"
          >
            <option value="">Select a buddy...</option>
            {buddies.map((buddy) => (
              <option key={buddy.id} value={buddy.id}>
                {buddy.name} {buddy.domain ? `(${buddy.domain})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-[var(--spacing-lg)] flex justify-end gap-[var(--spacing-sm)]">
          <button
            onClick={onClose}
            className="min-h-[44px] rounded-[var(--radius-md)] border border-surface-subtle px-[var(--spacing-md)] font-sans text-[15px] font-medium text-text-secondary transition-colors hover:bg-surface-sunken"
          >
            Cancel
          </button>
          <button
            onClick={handleOverride}
            disabled={!selectedBuddyId || overrideMutation.isPending}
            className="min-h-[44px] rounded-[var(--radius-md)] bg-accent-primary px-[var(--spacing-md)] font-sans text-[15px] font-medium text-surface-raised transition-opacity duration-[var(--transition-fast)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {overrideMutation.isPending ? 'Updating...' : 'Reassign'}
          </button>
        </div>
      </div>
    </div>
  );
}
