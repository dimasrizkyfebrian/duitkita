import type { ApiEnvelope } from '@/types/api'

/** The request reached the server and it answered with a non-2xx status. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly envelope: ApiEnvelope<unknown> | null,
  ) {
    super(envelope?.error ?? `request failed with status ${status}`)
    this.name = 'ApiError'
  }
}

/** The request never got an answer — offline, DNS, CORS, server unreachable. */
export class NetworkError extends Error {
  constructor() {
    super('network request failed')
    this.name = 'NetworkError'
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

function isFormData(body: unknown): body is FormData {
  return body instanceof FormData
}

const baseURL = import.meta.env.VITE_API_BASE_URL

/**
 * Minimal fetch wrapper for the DuitKita API. Unwraps the backend's
 * `{success, message, data, error}` envelope and raises ApiError/NetworkError
 * so callers never have to inspect raw Response objects.
 *
 * No auth header here — see `http.ts` for the authenticated variant.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options

  // FormData (file uploads) must keep its own multipart boundary — letting
  // the browser set Content-Type itself, not forcing application/json.
  const formData = isFormData(body)

  let response: Response
  try {
    response = await fetch(`${baseURL}${path}`, {
      method,
      headers:
        body === undefined || formData
          ? headers
          : { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : formData ? body : JSON.stringify(body),
    })
  } catch {
    throw new NetworkError()
  }

  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<T> | null

  if (!response.ok) {
    throw new ApiError(response.status, envelope)
  }

  return envelope?.data as T
}
