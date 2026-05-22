export type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
  requestId?: string;
  timestamp?: string;
  path?: string;
};

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
