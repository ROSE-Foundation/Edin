'use client';

import { useState } from 'react';
import {
  useEvaluationModels,
  useEvaluationModelMetrics,
  useCreateEvaluationModel,
} from '../../../../../hooks/use-evaluation-models';
import { useAgreementRates } from '../../../../../hooks/use-evaluation-review';
import { ModelRegistryList } from '../../../../../components/features/evaluation/admin/model-registry-list';
import { ModelMetricsComparison } from '../../../../../components/features/evaluation/admin/model-metrics-comparison';
import { AgreementRateCard } from '../../../../../components/features/evaluation/admin/agreement-rate-card';

export default function EvaluationModelsPage() {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', version: '', provider: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const { models, isLoading: modelsLoading, error: modelsError } = useEvaluationModels();
  const createModel = useCreateEvaluationModel();
  const { metrics, isLoading: metricsLoading } = useEvaluationModelMetrics(selectedModelId);
  const { rates, isLoading: ratesLoading } = useAgreementRates(selectedModelId ?? undefined);

  if (modelsLoading) {
    return (
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <div className="animate-pulse space-y-[var(--spacing-md)]">
          <div className="h-8 w-64 rounded bg-surface-border" />
          <div className="h-64 rounded-[var(--radius-lg)] bg-surface-border" />
        </div>
      </div>
    );
  }

  if (modelsError) {
    return (
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <p className="text-red-600">Failed to load evaluation models.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <h1 className="font-serif text-[24px] font-bold text-brand-primary">
        Evaluation Model Registry
      </h1>
      <p className="mt-[var(--spacing-xs)] text-[14px] text-brand-secondary">
        Manage AI evaluation model versions, track performance, and compare metrics.
      </p>

      <div className="mt-[var(--spacing-lg)]">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] text-[14px] font-medium text-white hover:bg-brand-accent/90"
          >
            Register New Model
          </button>
        ) : (
          <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
            <h2 className="mb-[var(--spacing-md)] font-sans text-[16px] font-semibold text-brand-primary">
              Register New Model
            </h2>
            <div className="flex flex-wrap gap-[var(--spacing-md)]">
              <div className="flex-1 min-w-[180px]">
                <label
                  htmlFor="model-name"
                  className="mb-[var(--spacing-xs)] block text-[13px] font-medium text-brand-secondary"
                >
                  Name
                </label>
                <input
                  id="model-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((f) => ({ ...f, name: e.target.value }));
                    setFormError(null);
                    if (createModel.error) createModel.reset();
                  }}
                  placeholder="e.g. gpt-4o"
                  className="w-full rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary placeholder:text-brand-secondary/50 focus:border-brand-accent focus:outline-none"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label
                  htmlFor="model-version"
                  className="mb-[var(--spacing-xs)] block text-[13px] font-medium text-brand-secondary"
                >
                  Version
                </label>
                <input
                  id="model-version"
                  type="text"
                  value={formData.version}
                  onChange={(e) => {
                    setFormData((f) => ({ ...f, version: e.target.value }));
                    setFormError(null);
                    if (createModel.error) createModel.reset();
                  }}
                  placeholder="e.g. 2024-05-13"
                  className="w-full rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary placeholder:text-brand-secondary/50 focus:border-brand-accent focus:outline-none"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label
                  htmlFor="model-provider"
                  className="mb-[var(--spacing-xs)] block text-[13px] font-medium text-brand-secondary"
                >
                  Provider
                </label>
                <input
                  id="model-provider"
                  type="text"
                  value={formData.provider}
                  onChange={(e) => {
                    setFormData((f) => ({ ...f, provider: e.target.value }));
                    setFormError(null);
                    if (createModel.error) createModel.reset();
                  }}
                  placeholder="e.g. OpenAI"
                  className="w-full rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary placeholder:text-brand-secondary/50 focus:border-brand-accent focus:outline-none"
                />
              </div>
            </div>
            {formError && (
              <p className="mt-[var(--spacing-xs)] text-[12px] text-red-600">{formError}</p>
            )}
            {createModel.error && (
              <p className="mt-[var(--spacing-xs)] text-[12px] text-red-600">
                Failed to register model: {createModel.error.message}
              </p>
            )}
            <div className="mt-[var(--spacing-md)] flex gap-[var(--spacing-sm)]">
              <button
                onClick={() => {
                  const { name, version, provider } = formData;
                  if (!name.trim() || !version.trim() || !provider.trim()) {
                    setFormError('All fields are required.');
                    return;
                  }
                  createModel.mutate(
                    { name: name.trim(), version: version.trim(), provider: provider.trim() },
                    {
                      onSuccess: () => {
                        setFormData({ name: '', version: '', provider: '' });
                        setShowForm(false);
                        setFormError(null);
                      },
                    },
                  );
                }}
                disabled={createModel.isPending}
                className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] text-[13px] font-medium text-white hover:bg-brand-accent/90 disabled:opacity-50"
              >
                {createModel.isPending ? 'Registering...' : 'Register'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormData({ name: '', version: '', provider: '' });
                  setFormError(null);
                  createModel.reset();
                }}
                disabled={createModel.isPending}
                className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] text-[13px] text-brand-secondary hover:bg-surface-base"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-[var(--spacing-lg)]">
        <ModelRegistryList
          models={models}
          onSelectModel={setSelectedModelId}
          selectedModelId={selectedModelId}
        />
      </div>

      <div className="mt-[var(--spacing-lg)]">
        <ModelMetricsComparison metrics={metrics} isLoading={metricsLoading} />
      </div>

      <div className="mt-[var(--spacing-lg)]">
        <AgreementRateCard rates={rates} isLoading={ratesLoading} />
      </div>
    </div>
  );
}
