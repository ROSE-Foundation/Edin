import { z } from 'zod';
import { domainEnum } from './contributor.schema.js';

/**
 * Validates contributor roster query parameters.
 * Used for GET /api/v1/contributors endpoint.
 */
export const rosterQuerySchema = z.object({
  domain: domainEnum.optional(),
  search: z.string().max(100).optional(),
  cursor: z.string().min(1).max(256).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type RosterQueryParams = z.infer<typeof rosterQuerySchema>;
