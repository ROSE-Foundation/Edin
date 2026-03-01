export interface PaginationMeta {
  cursor: string | null;
  hasMore: boolean;
  total: number;
}

export interface ResponseMeta {
  timestamp: string;
  correlationId: string;
  pagination?: PaginationMeta;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta: ResponseMeta;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  status: number;
  correlationId: string;
  timestamp: string;
  details?: ApiErrorDetail[];
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
}
