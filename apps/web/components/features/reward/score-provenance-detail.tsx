'use client';

import { useState } from 'react';
import type { ContributionScoreWithProvenanceDto } from '@edin/shared';

interface ScoreProvenanceDetailProps {
  scores: ContributionScoreWithProvenanceDto[];
}

export function ScoreProvenanceDetail({ scores }: ScoreProvenanceDetailProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (scores.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-[var(--spacing-md)]">
        <p className="font-sans text-[14px] text-neutral-400">No scored contributions yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white divide-y divide-neutral-100">
      {scores.map((score) => (
        <div key={score.id} className="px-[var(--spacing-lg)] py-[var(--spacing-md)]">
          <button
            onClick={() => setExpandedId(expandedId === score.id ? null : score.id)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <p className="font-sans text-[14px] font-medium text-brand-primary">
                Score: {score.compositeScore.toFixed(1)}
              </p>
              <p className="font-sans text-[12px] text-neutral-400">
                {new Date(score.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span className="font-sans text-[12px] text-neutral-400">
              {expandedId === score.id ? 'Hide details' : 'View details'}
            </span>
          </button>
          {expandedId === score.id && (
            <div className="mt-[var(--spacing-sm)] space-y-1 pl-[var(--spacing-sm)]">
              <p className="font-sans text-[12px] text-neutral-500">
                AI Evaluation: {score.aiEvalScore.toFixed(1)}
              </p>
              <p className="font-sans text-[12px] text-neutral-500">
                Peer Feedback:{' '}
                {score.peerFeedbackScore !== null ? score.peerFeedbackScore.toFixed(1) : 'Pending'}
              </p>
              <p className="font-sans text-[12px] text-neutral-500">
                Complexity: {'\u00d7'}
                {score.complexityMultiplier.toFixed(2)}
              </p>
              <p className="font-sans text-[12px] text-neutral-500">
                Domain Norm: {'\u00d7'}
                {score.domainNormFactor.toFixed(2)}
              </p>
              <p className="font-sans text-[12px] text-neutral-400 mt-[var(--spacing-xs)]">
                Formula v{score.formulaVersion.version} (effective{' '}
                {new Date(score.formulaVersion.effectiveFrom).toLocaleDateString()})
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
