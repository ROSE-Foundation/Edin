'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createApplicationSchema } from '@edin/shared';
import type { CreateApplicationDto, Domain } from '@edin/shared';
import { DomainSelector } from './domain-selector';
import { GdprConsent } from './gdpr-consent';
import { ApplicationConfirmation } from './application-confirmation';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'test' ? 'http://localhost:3001' : undefined);

function getApiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error('Application service is not configured. Set NEXT_PUBLIC_API_URL.');
  }

  return API_BASE_URL;
}

export function ApplicationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateApplicationDto>({
    resolver: zodResolver(createApplicationSchema),
    mode: 'onBlur',
    defaultValues: {
      applicantName: '',
      applicantEmail: '',
      domain: '' as Domain,
      statementOfInterest: '',
      microTaskResponse: '',
      microTaskSubmissionUrl: '',
      gdprConsent: false,
    },
  });

  const selectedDomain = watch('domain');
  const statementValue = watch('statementOfInterest');

  const onSubmit = async (data: CreateApplicationDto) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/admission/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error?.message || 'Failed to submit application');
      }

      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="px-[var(--spacing-lg)] py-[var(--spacing-3xl)]">
        <ApplicationConfirmation />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mx-auto max-w-[600px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]"
    >
      <div className="space-y-[var(--spacing-lg)]">
        {/* Name */}
        <div>
          <label
            htmlFor="applicantName"
            className="mb-[var(--spacing-sm)] block font-sans text-[13px] font-medium text-text-secondary"
          >
            Full Name
          </label>
          <input
            {...register('applicantName')}
            id="applicantName"
            type="text"
            autoComplete="name"
            className={`w-full rounded-[var(--radius-md)] border bg-surface-raised px-[var(--spacing-md)] py-[12px] font-sans text-[14px] text-text-primary transition-[border-color,box-shadow] duration-[var(--transition-fast)] focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none ${
              errors.applicantName ? 'border-semantic-error' : 'border-surface-subtle-input'
            }`}
            aria-describedby={errors.applicantName ? 'applicantName-error' : undefined}
            aria-invalid={errors.applicantName ? 'true' : undefined}
          />
          {errors.applicantName && (
            <p
              id="applicantName-error"
              className="mt-[var(--spacing-xs)] font-sans text-[13px] text-semantic-error"
              role="alert"
            >
              {errors.applicantName.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="applicantEmail"
            className="mb-[var(--spacing-sm)] block font-sans text-[13px] font-medium text-text-secondary"
          >
            Email Address
          </label>
          <input
            {...register('applicantEmail')}
            id="applicantEmail"
            type="email"
            autoComplete="email"
            className={`w-full rounded-[var(--radius-md)] border bg-surface-raised px-[var(--spacing-md)] py-[12px] font-sans text-[14px] text-text-primary transition-[border-color,box-shadow] duration-[var(--transition-fast)] focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none ${
              errors.applicantEmail ? 'border-semantic-error' : 'border-surface-subtle-input'
            }`}
            aria-describedby={errors.applicantEmail ? 'applicantEmail-error' : undefined}
            aria-invalid={errors.applicantEmail ? 'true' : undefined}
          />
          {errors.applicantEmail && (
            <p
              id="applicantEmail-error"
              className="mt-[var(--spacing-xs)] font-sans text-[13px] text-semantic-error"
              role="alert"
            >
              {errors.applicantEmail.message}
            </p>
          )}
        </div>

        {/* Domain Selector with micro-task preview */}
        <Controller
          control={control}
          name="domain"
          render={({ field, fieldState }) => (
            <DomainSelector
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error}
              name="domain"
              inputRef={field.ref}
            />
          )}
        />

        {/* Statement of Interest */}
        <div>
          <label
            htmlFor="statementOfInterest"
            className="mb-[var(--spacing-sm)] block font-sans text-[13px] font-medium text-text-secondary"
          >
            Statement of Interest
          </label>
          <textarea
            {...register('statementOfInterest')}
            id="statementOfInterest"
            rows={3}
            maxLength={300}
            className={`w-full resize-none rounded-[var(--radius-md)] border bg-surface-raised px-[var(--spacing-md)] py-[12px] font-sans text-[14px] text-text-primary transition-[border-color,box-shadow] duration-[var(--transition-fast)] focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none ${
              errors.statementOfInterest ? 'border-semantic-error' : 'border-surface-subtle-input'
            }`}
            aria-describedby={
              errors.statementOfInterest ? 'statementOfInterest-error' : 'statementOfInterest-hint'
            }
            aria-invalid={errors.statementOfInterest ? 'true' : undefined}
          />
          <div className="mt-[var(--spacing-xs)] flex justify-between">
            {errors.statementOfInterest ? (
              <p
                id="statementOfInterest-error"
                className="font-sans text-[13px] text-semantic-error"
                role="alert"
              >
                {errors.statementOfInterest.message}
              </p>
            ) : (
              <span
                id="statementOfInterest-hint"
                className="font-sans text-[12px] text-text-secondary"
              >
                Brief description of why you want to join
              </span>
            )}
            <span className="font-sans text-[12px] text-text-secondary">
              {statementValue?.length || 0}/300
            </span>
          </div>
        </div>

        {/* Micro-task response (shown only when domain is selected) */}
        {selectedDomain && (
          <div className="space-y-[var(--spacing-lg)]">
            <div>
              <label
                htmlFor="microTaskResponse"
                className="mb-[var(--spacing-sm)] block font-sans text-[13px] font-medium text-text-secondary"
              >
                Your Response
              </label>
              <textarea
                {...register('microTaskResponse')}
                id="microTaskResponse"
                rows={6}
                className={`w-full rounded-[var(--radius-md)] border bg-surface-raised px-[var(--spacing-md)] py-[12px] font-sans text-[14px] text-text-primary transition-[border-color,box-shadow] duration-[var(--transition-fast)] focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none ${
                  errors.microTaskResponse ? 'border-semantic-error' : 'border-surface-subtle-input'
                }`}
                aria-describedby={errors.microTaskResponse ? 'microTaskResponse-error' : undefined}
                aria-invalid={errors.microTaskResponse ? 'true' : undefined}
              />
              {errors.microTaskResponse && (
                <p
                  id="microTaskResponse-error"
                  className="mt-[var(--spacing-xs)] font-sans text-[13px] text-semantic-error"
                  role="alert"
                >
                  {errors.microTaskResponse.message}
                </p>
              )}
            </div>

            {/* Submission URL (optional) */}
            <div>
              <label
                htmlFor="microTaskSubmissionUrl"
                className="mb-[var(--spacing-sm)] block font-sans text-[13px] font-medium text-text-secondary"
              >
                Submission URL{' '}
                <span className="font-normal text-text-secondary/70">(optional)</span>
              </label>
              <input
                {...register('microTaskSubmissionUrl')}
                id="microTaskSubmissionUrl"
                type="url"
                placeholder="https://github.com/..."
                className={`w-full rounded-[var(--radius-md)] border bg-surface-raised px-[var(--spacing-md)] py-[12px] font-sans text-[14px] text-text-primary transition-[border-color,box-shadow] duration-[var(--transition-fast)] focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus:outline-none ${
                  errors.microTaskSubmissionUrl
                    ? 'border-semantic-error'
                    : 'border-surface-subtle-input'
                }`}
                aria-describedby={
                  errors.microTaskSubmissionUrl ? 'microTaskSubmissionUrl-error' : undefined
                }
                aria-invalid={errors.microTaskSubmissionUrl ? 'true' : undefined}
              />
              {errors.microTaskSubmissionUrl && (
                <p
                  id="microTaskSubmissionUrl-error"
                  className="mt-[var(--spacing-xs)] font-sans text-[13px] text-semantic-error"
                  role="alert"
                >
                  {errors.microTaskSubmissionUrl.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* GDPR Consent */}
        <div className="pt-[var(--spacing-md)]">
          <Controller
            control={control}
            name="gdprConsent"
            render={({ field, fieldState }) => (
              <GdprConsent
                checked={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error}
                name="gdprConsent"
                inputRef={field.ref}
              />
            )}
          />
        </div>

        {/* Submit Error */}
        {submitError && (
          <div
            className="rounded-[var(--radius-md)] border border-semantic-error/30 bg-semantic-error/5 p-[var(--spacing-md)]"
            role="alert"
          >
            <p className="font-sans text-[14px] text-semantic-error">{submitError}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-[var(--radius-md)] bg-accent-primary px-[var(--spacing-lg)] py-[12px] font-sans text-[14px] font-medium text-white transition-[background-color,opacity] duration-[var(--transition-fast)] hover:bg-accent-primary/90 focus:ring-2 focus:ring-accent-primary/20 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </div>
    </form>
  );
}
