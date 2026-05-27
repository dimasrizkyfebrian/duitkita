export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'DATABASE_CONSTRAINT'
  | 'INTERNAL_SERVER_ERROR';

export type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
  requestId: string;
  timestamp: string;
  path: string;
};

export type ApiErrorEnvelope = {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: string[];
  };
  requestId: string;
  timestamp: string;
  path: string;
};

export class ApiEnvelopeError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
    public readonly requestId: string,
    public readonly details?: string[],
  ) {
    super(message);
    this.name = 'ApiEnvelopeError';
  }
}

export function isApiError(error: unknown): error is ApiEnvelopeError {
  return error instanceof ApiEnvelopeError;
}

export function unwrapApiData<T>(payload: T | ApiSuccessEnvelope<T>): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'success' in payload &&
    'data' in payload
  ) {
    return (payload as ApiSuccessEnvelope<T>).data;
  }
  return payload as T;
}
