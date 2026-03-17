'use client';

import { useState } from 'react';
import { useContributionDetail } from '../../../hooks/use-contribution-detail';
import { useConfirmCollaboration, useDisputeCollaboration } from '../../../hooks/use-collaboration';
import { useEvaluationStatus } from '../../../hooks/use-evaluations';
import { useProfile } from '../../../hooks/use-profile';
import { EvaluationStatusBadge } from '../evaluation/evaluation-status-badge';
import type { ContributionCollaborationType } from '@edin/shared';

const TYPE_LABELS: Record<string, string> = {
  COMMIT: 'Commit',
  PULL_REQUEST: 'Pull Request',
  CODE_REVIEW: 'Code Review',
};

const ROLE_LABELS: Record<string, string> = {
  PRIMARY_AUTHOR: 'Author',
  CO_AUTHOR: 'Co-author',
  COMMITTER: 'Committer',
  ISSUE_ASSIGNEE: 'Assignee',
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DETECTED: {
    label: 'Detected',
    className: 'bg-surface-sunken text-text-secondary border-surface-subtle',
  },
  CONFIRMED: {
    label: 'Confirmed',
    className: 'bg-surface-sunken text-text-secondary border-surface-subtle',
  },
  DISPUTED: {
    label: 'Under review',
    className: 'bg-surface-sunken text-text-secondary border-surface-subtle',
  },
  OVERRIDDEN: {
    label: 'Adjusted by admin',
    className: 'bg-surface-sunken text-text-secondary border-surface-subtle',
  },
};

interface ContributionDetailProps {
  contributionId: string;
  onClose: () => void;
}

function CollaborationActions({ collaboration }: { collaboration: ContributionCollaborationType }) {
  const confirmMutation = useConfirmCollaboration();
  const disputeMutation = useDisputeCollaboration();
  const [showDisputeInput, setShowDisputeInput] = useState(false);
  const [disputeComment, setDisputeComment] = useState('');

  if (collaboration.status === 'CONFIRMED') {
    return (
      <span className="font-sans text-[12px] text-text-secondary" aria-label="Confirmed">
        Confirmed
      </span>
    );
  }

  if (collaboration.status === 'DISPUTED') {
    return null;
  }

  if (collaboration.status === 'OVERRIDDEN') {
    return null;
  }

  if (collaboration.status !== 'DETECTED') {
    return null;
  }

  return (
    <div className="flex items-center gap-[var(--spacing-sm)]">
      <button
        type="button"
        onClick={() => confirmMutation.mutate(collaboration.id)}
        disabled={confirmMutation.isPending}
        className="min-h-[44px] rounded-[var(--radius-sm)] border border-surface-subtle bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[13px] text-text-secondary transition-colors hover:bg-surface-sunken disabled:opacity-50"
        aria-label="Confirm collaboration"
      >
        {confirmMutation.isPending ? 'Confirming...' : 'Confirm'}
      </button>

      {!showDisputeInput ? (
        <button
          type="button"
          onClick={() => setShowDisputeInput(true)}
          className="min-h-[44px] rounded-[var(--radius-sm)] border border-surface-subtle bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[13px] text-text-secondary transition-colors hover:bg-surface-sunken"
          aria-label="Request attribution review"
        >
          Request review
        </button>
      ) : (
        <div className="flex flex-col gap-[var(--spacing-xs)]">
          <textarea
            value={disputeComment}
            onChange={(e) => setDisputeComment(e.target.value)}
            placeholder="Explain why the attribution needs review (min 10 chars)"
            className="min-h-[60px] w-full rounded-[var(--radius-sm)] border border-surface-subtle bg-surface-raised p-[var(--spacing-sm)] font-sans text-[13px] text-text-primary placeholder:text-text-secondary/50"
            aria-label="Dispute comment"
          />
          <div className="flex gap-[var(--spacing-xs)]">
            <button
              type="button"
              onClick={() => {
                disputeMutation.mutate({
                  collaborationId: collaboration.id,
                  comment: disputeComment,
                });
              }}
              disabled={disputeComment.length < 10 || disputeMutation.isPending}
              className="min-h-[44px] rounded-[var(--radius-sm)] border border-surface-subtle bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[13px] text-text-secondary transition-colors hover:bg-surface-sunken disabled:opacity-50"
              aria-label="Submit dispute"
            >
              {disputeMutation.isPending ? 'Submitting...' : 'Submit'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDisputeInput(false);
                setDisputeComment('');
              }}
              className="min-h-[44px] rounded-[var(--radius-sm)] border border-surface-subtle bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[13px] text-text-secondary transition-colors hover:bg-surface-sunken"
              aria-label="Cancel dispute"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ContributionDetail({ contributionId, onClose }: ContributionDetailProps) {
  const { contribution, isLoading } = useContributionDetail(contributionId);
  const { profile } = useProfile();
  const { status: evaluationStatus } = useEvaluationStatus(contributionId);

  if (isLoading) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
        <div className="space-y-[var(--spacing-md)]">
          <div className="skeleton h-[24px] w-[200px]" />
          <div className="skeleton h-[16px] w-[300px]" />
          <div className="skeleton h-[100px] w-full" />
        </div>
      </div>
    );
  }

  if (!contribution) {
    return null;
  }

  const rawData = contribution.rawData as Record<string, unknown>;
  const extracted = rawData?.extracted as Record<string, unknown> | undefined;

  return (
    <div className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-sans text-[18px] font-medium text-text-primary">
            {contribution.title}
          </h3>
          <div className="mt-[var(--spacing-xs)] flex items-center gap-[var(--spacing-sm)]">
            <span className="font-sans text-[13px] text-text-secondary">
              {TYPE_LABELS[contribution.contributionType] ?? contribution.contributionType}
            </span>
            <span className="text-text-secondary/40" aria-hidden="true">
              ·
            </span>
            <span className="font-sans text-[13px] text-text-secondary">
              {contribution.repositoryName}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] rounded-[var(--radius-sm)] p-[var(--spacing-xs)] font-sans text-[18px] text-text-secondary transition-colors hover:bg-surface-sunken"
          aria-label="Close detail view"
        >
          &times;
        </button>
      </div>

      {/* Evaluation status — calm style per UX spec */}
      <div className="mt-[var(--spacing-md)]">
        {evaluationStatus ? (
          <EvaluationStatusBadge status={evaluationStatus} />
        ) : (
          <div className="inline-flex items-center rounded-full border border-surface-subtle bg-surface-sunken px-[var(--spacing-sm)] py-[2px]">
            <span className="font-sans text-[13px] text-text-secondary">
              {contribution.status === 'EVALUATED' ? 'Evaluated' : 'Awaiting evaluation'}
            </span>
          </div>
        )}
      </div>

      {/* Details grid */}
      <dl className="mt-[var(--spacing-lg)] space-y-[var(--spacing-md)]">
        <div>
          <dt className="font-sans text-[13px] font-medium uppercase tracking-wide text-text-secondary">
            Source
          </dt>
          <dd className="mt-[2px] font-sans text-[15px] text-text-primary">
            {contribution.source}
          </dd>
        </div>

        <div>
          <dt className="font-sans text-[13px] font-medium uppercase tracking-wide text-text-secondary">
            Timestamp
          </dt>
          <dd className="mt-[2px] font-sans text-[15px] text-text-primary">
            {new Date(contribution.normalizedAt).toLocaleString()}
          </dd>
        </div>

        {contribution.description && (
          <div>
            <dt className="font-sans text-[13px] font-medium uppercase tracking-wide text-text-secondary">
              Description
            </dt>
            <dd className="mt-[2px] whitespace-pre-wrap font-sans text-[15px] leading-[1.6] text-text-primary">
              {contribution.description}
            </dd>
          </div>
        )}

        {/* Commit-specific details */}
        {contribution.contributionType === 'COMMIT' && extracted && (
          <>
            {extracted.filesChanged && (
              <div>
                <dt className="font-sans text-[13px] font-medium uppercase tracking-wide text-text-secondary">
                  Files Changed
                </dt>
                <dd className="mt-[2px] flex gap-[var(--spacing-md)] font-sans text-[15px] text-text-primary">
                  <span className="text-green-600">
                    +{(extracted.filesChanged as Record<string, string[]>)?.added?.length ?? 0}{' '}
                    added
                  </span>
                  <span className="text-red-600">
                    -{(extracted.filesChanged as Record<string, string[]>)?.removed?.length ?? 0}{' '}
                    removed
                  </span>
                  <span className="text-text-secondary">
                    ~{(extracted.filesChanged as Record<string, string[]>)?.modified?.length ?? 0}{' '}
                    modified
                  </span>
                </dd>
              </div>
            )}
          </>
        )}

        {/* PR-specific details */}
        {contribution.contributionType === 'PULL_REQUEST' && rawData && (
          <>
            {rawData.number != null && (
              <div>
                <dt className="font-sans text-[13px] font-medium uppercase tracking-wide text-text-secondary">
                  PR Number
                </dt>
                <dd className="mt-[2px] font-sans text-[15px] text-text-primary">
                  #{String(rawData.number)}
                </dd>
              </div>
            )}
            {rawData.head && rawData.base && (
              <div>
                <dt className="font-sans text-[13px] font-medium uppercase tracking-wide text-text-secondary">
                  Branch
                </dt>
                <dd className="mt-[2px] font-sans text-[15px] text-text-primary">
                  {String((rawData.head as Record<string, unknown>).ref)} &rarr;{' '}
                  {String((rawData.base as Record<string, unknown>).ref)}
                </dd>
              </div>
            )}
            <div>
              <dt className="font-sans text-[13px] font-medium uppercase tracking-wide text-text-secondary">
                Merge Status
              </dt>
              <dd className="mt-[2px] font-sans text-[15px] text-text-primary">
                {rawData.merged
                  ? 'Merged'
                  : rawData.state === 'open'
                    ? 'Open'
                    : String(rawData.state ?? 'Unknown')}
              </dd>
            </div>
          </>
        )}

        {/* Review-specific details */}
        {contribution.contributionType === 'CODE_REVIEW' && rawData && (
          <div>
            <dt className="font-sans text-[13px] font-medium uppercase tracking-wide text-text-secondary">
              Review State
            </dt>
            <dd className="mt-[2px] font-sans text-[15px] capitalize text-text-primary">
              {String(rawData.state ?? 'Unknown')
                .replace('_', ' ')
                .toLowerCase()}
            </dd>
          </div>
        )}
      </dl>

      {/* Attribution section — shown when collaborations exist */}
      {contribution.collaborations && contribution.collaborations.length > 1 && (
        <div className="mt-[var(--spacing-lg)]">
          <h4 className="font-sans text-[13px] font-medium uppercase tracking-wide text-text-secondary">
            Attribution
          </h4>
          <ul
            className="mt-[var(--spacing-sm)] space-y-[var(--spacing-sm)]"
            aria-label="Collaboration attributions"
          >
            {contribution.collaborations.map((collab) => {
              const isOwnCollaboration = profile && collab.contributorId === profile.id;
              const roleLabel = ROLE_LABELS[collab.role] ?? collab.role;
              const statusInfo = STATUS_LABELS[collab.status] ?? STATUS_LABELS.DETECTED;

              return (
                <li
                  key={collab.id}
                  className="flex flex-col gap-[var(--spacing-xs)] rounded-[var(--radius-sm)] border border-surface-subtle bg-surface-sunken p-[var(--spacing-sm)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-[var(--spacing-sm)]">
                      <span className="font-sans text-[15px] text-text-primary">
                        {isOwnCollaboration ? 'You' : collab.contributorName}
                      </span>
                      <span className="rounded-full border border-surface-subtle bg-surface-raised px-[var(--spacing-xs)] py-[1px] font-sans text-[11px] text-text-secondary">
                        {roleLabel}
                      </span>
                      <span
                        className={`rounded-full border px-[var(--spacing-xs)] py-[1px] font-sans text-[11px] ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                    <span className="font-sans text-[13px] text-text-secondary">
                      {Math.round(collab.splitPercentage)}%
                    </span>
                  </div>
                  {isOwnCollaboration && collab.status === 'DETECTED' && (
                    <CollaborationActions collaboration={collab} />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
