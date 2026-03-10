'use client';

import { useState } from 'react';
import { useCreateFormulaVersion } from '../../../../hooks/use-scores';

export function FormulaEditor() {
  const [aiEvalWeight, setAiEvalWeight] = useState(0.4);
  const [peerFeedbackWeight, setPeerFeedbackWeight] = useState(0.25);
  const [complexityWeight, setComplexityWeight] = useState(0.2);
  const [domainNormWeight, setDomainNormWeight] = useState(0.15);
  const createFormula = useCreateFormulaVersion();

  const total = aiEvalWeight + peerFeedbackWeight + complexityWeight + domainNormWeight;
  const isValid = Math.abs(total - 1.0) < 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    createFormula.mutate({
      aiEvalWeight,
      peerFeedbackWeight,
      complexityWeight,
      domainNormWeight,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-neutral-200 bg-white p-[var(--spacing-lg)]"
    >
      <h3 className="mb-[var(--spacing-md)] font-sans text-[14px] font-semibold text-brand-primary">
        Create New Formula Version
      </h3>

      <div className="space-y-[var(--spacing-sm)]">
        {[
          { label: 'AI Evaluation Weight', value: aiEvalWeight, setter: setAiEvalWeight },
          {
            label: 'Peer Feedback Weight',
            value: peerFeedbackWeight,
            setter: setPeerFeedbackWeight,
          },
          { label: 'Complexity Weight', value: complexityWeight, setter: setComplexityWeight },
          {
            label: 'Domain Normalization Weight',
            value: domainNormWeight,
            setter: setDomainNormWeight,
          },
        ].map(({ label, value, setter }) => (
          <div key={label} className="flex items-center justify-between">
            <label className="font-sans text-[13px] text-neutral-600">{label}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={value}
              onChange={(e) => setter(parseFloat(e.target.value) || 0)}
              className="w-20 rounded border border-neutral-300 px-2 py-1 text-right font-sans text-[13px]"
            />
          </div>
        ))}
      </div>

      <div className="mt-[var(--spacing-md)] flex items-center justify-between">
        <p className={`font-sans text-[12px] ${isValid ? 'text-neutral-400' : 'text-amber-600'}`}>
          Total: {total.toFixed(2)} {!isValid && '(must equal 1.00)'}
        </p>
        <button
          type="submit"
          disabled={!isValid || createFormula.isPending}
          className="rounded bg-brand-primary px-4 py-2 font-sans text-[13px] text-white disabled:opacity-50"
        >
          {createFormula.isPending ? 'Creating...' : 'Create Version'}
        </button>
      </div>

      {createFormula.isSuccess && (
        <p className="mt-[var(--spacing-sm)] font-sans text-[12px] text-green-600">
          Formula version created successfully.
        </p>
      )}
      {createFormula.isError && (
        <p className="mt-[var(--spacing-sm)] font-sans text-[12px] text-red-500">
          {createFormula.error.message}
        </p>
      )}
    </form>
  );
}
