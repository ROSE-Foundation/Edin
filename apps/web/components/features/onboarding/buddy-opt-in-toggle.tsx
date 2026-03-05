'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { useToast } from '../../ui/toast';

interface BuddyOptInToggleProps {
  initialOptIn: boolean;
}

export function BuddyOptInToggle({ initialOptIn }: BuddyOptInToggleProps) {
  const [optIn, setOptIn] = useState(initialOptIn);
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (newOptIn: boolean) => {
      return apiClient('/api/v1/contributors/me/buddy-opt-in', {
        method: 'PATCH',
        body: JSON.stringify({ optIn: newOptIn }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    },
  });

  const handleToggle = () => {
    if (!optIn) {
      setShowConfirm(true);
    } else {
      mutation.mutate(false, {
        onSuccess: () => {
          setOptIn(false);
          toast({ title: 'Buddy availability updated', variant: 'success' });
        },
        onError: () => {
          toast({ title: 'Failed to update buddy availability', variant: 'error' });
        },
      });
    }
  };

  const handleConfirmOptIn = () => {
    setShowConfirm(false);
    mutation.mutate(true, {
      onSuccess: () => {
        setOptIn(true);
        toast({ title: 'Buddy availability updated', variant: 'success' });
      },
      onError: () => {
        toast({ title: 'Failed to update buddy availability', variant: 'error' });
      },
    });
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-sans text-[15px] font-medium text-brand-primary">
            Available as a buddy for new contributors
          </h3>
          <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-brand-secondary">
            {optIn
              ? 'You may be paired with new contributors in your domain.'
              : 'Toggle on to help welcome new contributors.'}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={mutation.isPending}
          className={`relative h-[28px] w-[52px] shrink-0 rounded-full transition-colors duration-[var(--transition-fast)] ${
            optIn ? 'bg-brand-accent' : 'bg-surface-sunken'
          } ${mutation.isPending ? 'opacity-50' : ''}`}
          role="switch"
          aria-checked={optIn}
          aria-label="Toggle buddy availability"
        >
          <span
            className={`absolute top-[2px] h-[24px] w-[24px] rounded-full bg-white shadow-sm transition-transform duration-[var(--transition-fast)] ${
              optIn ? 'translate-x-[26px]' : 'translate-x-[2px]'
            }`}
          />
        </button>
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div
            className="w-full max-w-[400px] rounded-[16px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-lg"
            role="alertdialog"
            aria-labelledby="buddy-confirm-title"
          >
            <h3
              id="buddy-confirm-title"
              className="font-serif text-[18px] font-bold text-brand-primary"
            >
              Become a buddy
            </h3>
            <p className="mt-[var(--spacing-sm)] font-serif text-[15px] leading-[1.65] text-brand-secondary">
              You&apos;ll be matched with new contributors in your domain. You can opt out at any
              time.
            </p>
            <div className="mt-[var(--spacing-lg)] flex justify-end gap-[var(--spacing-sm)]">
              <button
                onClick={() => setShowConfirm(false)}
                className="min-h-[44px] rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-md)] font-sans text-[15px] font-medium text-brand-secondary transition-colors hover:bg-surface-sunken"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOptIn}
                className="min-h-[44px] rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-md)] font-sans text-[15px] font-medium text-surface-raised transition-opacity duration-[var(--transition-fast)] hover:opacity-90"
              >
                Yes, I&apos;d like to help
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
