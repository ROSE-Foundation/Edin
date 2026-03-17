'use client';

import { useFormulaHistory } from '../../../../hooks/use-scores';

export function FormulaHistory() {
  const { formulas, isLoading, error } = useFormulaHistory();

  if (isLoading) {
    return <p className="font-sans text-[14px] text-neutral-400">Loading formula history...</p>;
  }

  if (error) {
    return <p className="font-sans text-[14px] text-red-500">Failed to load formula history.</p>;
  }

  if (formulas.length === 0) {
    return (
      <p className="font-sans text-[14px] text-neutral-400">No formula versions created yet.</p>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-neutral-50">
          <tr>
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[12px] font-medium text-neutral-500">
              Version
            </th>
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[12px] font-medium text-neutral-500">
              AI Eval
            </th>
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[12px] font-medium text-neutral-500">
              Peer
            </th>
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[12px] font-medium text-neutral-500">
              Complexity
            </th>
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[12px] font-medium text-neutral-500">
              Domain
            </th>
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[12px] font-medium text-neutral-500">
              Effective From
            </th>
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[12px] font-medium text-neutral-500">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {formulas.map((formula) => (
            <tr key={formula.id}>
              <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[13px] text-text-primary">
                v{formula.version}
              </td>
              <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[13px] text-neutral-600">
                {formula.aiEvalWeight.toFixed(2)}
              </td>
              <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[13px] text-neutral-600">
                {formula.peerFeedbackWeight.toFixed(2)}
              </td>
              <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[13px] text-neutral-600">
                {formula.complexityWeight.toFixed(2)}
              </td>
              <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[13px] text-neutral-600">
                {formula.domainNormWeight.toFixed(2)}
              </td>
              <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[13px] text-neutral-400">
                {new Date(formula.effectiveFrom).toLocaleDateString()}
              </td>
              <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[12px]">
                {formula.effectiveTo === null ? (
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-700">
                    Active
                  </span>
                ) : (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-500">
                    Archived
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
