import { z } from 'zod';
import { DOMAINS } from '../constants/domains.js';

const domainEnum = z.enum([
  DOMAINS.Technology,
  DOMAINS.Fintech,
  DOMAINS.Impact,
  DOMAINS.Governance,
]);

export const createApplicationSchema = z.object({
  applicantName: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  applicantEmail: z.string().email('Please enter a valid email address'),
  domain: domainEnum,
  statementOfInterest: z
    .string()
    .min(1, 'Statement of interest is required')
    .max(300, 'Statement must be 300 characters or less'),
  microTaskResponse: z.string().min(1, 'Micro-task response is required'),
  microTaskSubmissionUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  gdprConsent: z
    .boolean()
    .refine((val) => val === true, { message: 'You must accept the data processing agreement' }),
});

export type CreateApplicationDto = z.infer<typeof createApplicationSchema>;
