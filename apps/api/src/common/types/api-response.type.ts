import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  ResponseMeta,
  PaginationMeta,
} from '@edin/shared';

export type { ApiSuccessResponse, ApiErrorResponse, ResponseMeta, PaginationMeta };

export function createSuccessResponse<T>(
  data: T,
  correlationId: string,
  pagination?: PaginationMeta,
): ApiSuccessResponse<T> {
  return {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      correlationId,
      ...(pagination && { pagination }),
    },
  };
}
