'use client';

import { useState } from 'react';
import {
  useEditorApplications,
  useActiveEditors,
  useEditorCriteria,
  useReviewEditorApplication,
  useRevokeEditor,
  useUpdateEditorCriteria,
} from '../../../../../hooks/use-editor-admin';
import { ApplicationReviewCard } from '../../../../../components/features/publication/editor-eligibility/application-review-card';
import { CriteriaForm } from '../../../../../components/features/publication/editor-eligibility/criteria-form';
import { DOMAIN_COLORS } from '../../../../../components/features/publication/domain-colors';
import { useToast } from '../../../../../components/ui/toast';

const TABS = [
  { id: 'pending', label: 'Pending Applications' },
  { id: 'editors', label: 'Active Editors' },
  { id: 'criteria', label: 'Eligibility Criteria' },
] as const;

export default function AdminEditorManagementPage() {
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [revokeTarget, setRevokeTarget] = useState<{ contributorId: string; name: string } | null>(
    null,
  );
  const [revokeReason, setRevokeReason] = useState('');
  const [savingDomain, setSavingDomain] = useState<string | null>(null);
  const { toast } = useToast();

  const { applications, isLoading: appsLoading } = useEditorApplications({ status: 'PENDING' });
  const { editors, isLoading: editorsLoading } = useActiveEditors();
  const { criteria, isLoading: criteriaLoading } = useEditorCriteria();
  const reviewMutation = useReviewEditorApplication();
  const revokeMutation = useRevokeEditor();
  const updateCriteriaMutation = useUpdateEditorCriteria();

  function handleReview(applicationId: string, decision: string, reviewNotes?: string) {
    reviewMutation.mutate(
      { applicationId, decision, reviewNotes },
      {
        onSuccess: () => toast({ title: `Application ${decision.toLowerCase()}` }),
        onError: (err) => toast({ title: err.message, variant: 'error' }),
      },
    );
  }

  function handleRevoke() {
    if (!revokeTarget || revokeReason.length < 10) return;
    revokeMutation.mutate(
      { contributorId: revokeTarget.contributorId, reason: revokeReason },
      {
        onSuccess: () => {
          toast({ title: 'Editor status revoked' });
          setRevokeTarget(null);
          setRevokeReason('');
        },
        onError: (err) => toast({ title: err.message, variant: 'error' }),
      },
    );
  }

  function handleUpdateCriteria(
    domain: string,
    data: {
      minContributionCount?: number;
      minGovernanceWeight?: number;
      maxConcurrentAssignments?: number;
    },
  ) {
    setSavingDomain(domain);
    updateCriteriaMutation.mutate(
      { domain, data },
      {
        onSuccess: () => {
          toast({ title: `Criteria updated for ${domain}` });
          setSavingDomain(null);
        },
        onError: (err) => {
          toast({ title: err.message, variant: 'error' });
          setSavingDomain(null);
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-[960px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <h1 className="mb-[var(--spacing-xl)] font-serif text-[2rem] font-bold text-brand-primary">
        Editor Management
      </h1>

      {/* Tabs */}
      <div className="mb-[var(--spacing-lg)] flex gap-[var(--spacing-xs)] border-b border-surface-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] transition-colors"
            style={{
              color:
                activeTab === tab.id
                  ? 'var(--color-brand-accent, #C4956A)'
                  : 'var(--color-brand-secondary, #6B7B8D)',
              borderBottom:
                activeTab === tab.id
                  ? '2px solid var(--color-brand-accent, #C4956A)'
                  : '2px solid transparent',
              fontWeight: activeTab === tab.id ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pending Applications */}
      {activeTab === 'pending' && (
        <div>
          {appsLoading ? (
            <div className="space-y-[var(--spacing-md)]">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[120px] animate-pulse rounded-[var(--radius-md)] bg-surface-sunken"
                />
              ))}
            </div>
          ) : applications.length === 0 ? (
            <p className="py-[var(--spacing-4xl)] text-center font-sans text-[15px] text-brand-secondary">
              No pending applications
            </p>
          ) : (
            <div className="space-y-[var(--spacing-md)]">
              {applications.map((app) => (
                <ApplicationReviewCard
                  key={app.id}
                  application={app}
                  onReview={handleReview}
                  isSubmitting={reviewMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active Editors */}
      {activeTab === 'editors' && (
        <div>
          {editorsLoading ? (
            <div className="space-y-[var(--spacing-md)]">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[80px] animate-pulse rounded-[var(--radius-md)] bg-surface-sunken"
                />
              ))}
            </div>
          ) : editors.length === 0 ? (
            <p className="py-[var(--spacing-4xl)] text-center font-sans text-[15px] text-brand-secondary">
              No active editors
            </p>
          ) : (
            <div className="space-y-[var(--spacing-sm)]">
              {editors.map((editor) => {
                const domainColor = DOMAIN_COLORS[editor.domain] ?? '#6B7B8D';
                return (
                  <div
                    key={editor.id}
                    className="flex items-center justify-between rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]"
                  >
                    <div className="flex items-center gap-[var(--spacing-sm)]">
                      {editor.contributorAvatarUrl && (
                        <img
                          src={editor.contributorAvatarUrl}
                          alt=""
                          className="h-[32px] w-[32px] rounded-full"
                        />
                      )}
                      <div>
                        <span className="font-sans text-[15px] font-medium text-brand-primary">
                          {editor.contributorName}
                        </span>
                        <div className="flex items-center gap-[var(--spacing-sm)] font-sans text-[12px] text-brand-secondary">
                          <span
                            className="rounded-full px-[var(--spacing-xs)] py-[1px] text-[11px] font-medium text-surface-raised"
                            style={{ backgroundColor: domainColor }}
                          >
                            {editor.domain}
                          </span>
                          <span>{editor.activeAssignmentCount} active</span>
                          <span>{editor.totalReviews} reviews</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setRevokeTarget({
                          contributorId: editor.contributorId,
                          name: editor.contributorName,
                        })
                      }
                      className="rounded-[var(--radius-md)] border border-[#A85A5A] px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[13px] text-[#A85A5A] transition-colors hover:bg-[#F0E4E4]"
                    >
                      Revoke
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Revoke dialog */}
          {revokeTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="w-full max-w-[420px] rounded-[var(--radius-md)] bg-surface-raised p-[var(--spacing-xl)]">
                <h3 className="font-sans text-[17px] font-semibold text-brand-primary">
                  Revoke Editor Status
                </h3>
                <p className="mt-[var(--spacing-sm)] font-sans text-[14px] text-brand-secondary">
                  Revoke editor status from <strong>{revokeTarget.name}</strong>?
                </p>
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  rows={3}
                  placeholder="Reason for revocation (min. 10 characters)..."
                  className="mt-[var(--spacing-md)] w-full resize-none rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary outline-none focus:border-brand-accent"
                />
                <div className="mt-[var(--spacing-md)] flex justify-end gap-[var(--spacing-sm)]">
                  <button
                    onClick={() => {
                      setRevokeTarget(null);
                      setRevokeReason('');
                    }}
                    className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-secondary transition-colors hover:bg-surface-sunken"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRevoke}
                    disabled={revokeReason.length < 10 || revokeMutation.isPending}
                    className="rounded-[var(--radius-md)] bg-[#A85A5A] px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-surface-raised transition-colors hover:opacity-90 disabled:opacity-50"
                  >
                    {revokeMutation.isPending ? 'Revoking...' : 'Confirm Revoke'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Eligibility Criteria */}
      {activeTab === 'criteria' && (
        <div>
          {criteriaLoading ? (
            <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[280px] animate-pulse rounded-[var(--radius-md)] bg-surface-sunken"
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2">
              {criteria.map((c) => (
                <CriteriaForm
                  key={`${c.domain}-${c.updatedAt}`}
                  criteria={c}
                  onSave={handleUpdateCriteria}
                  isSaving={savingDomain === c.domain}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
