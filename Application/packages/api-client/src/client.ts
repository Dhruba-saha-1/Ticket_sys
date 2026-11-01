import type { ApiError, ErrorCode } from '@ticketing/shared';

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export interface ApiClientOptions {
  /** e.g. http://localhost:4000/api/v1 */
  baseUrl: string;
  getAccessToken?: () => string | null | undefined;
  /** Called once on a 401. Return true if a new access token was obtained and the request should be retried. */
  onUnauthorized?: () => Promise<boolean>;
  fetch?: typeof fetch;
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type RequestFn = <T>(method: HttpMethod, path: string, body?: unknown) => Promise<T>;

export function createRequest(options: ApiClientOptions): RequestFn {
  const fetchImpl = options.fetch ?? fetch;

  const send = async <T>(method: HttpMethod, path: string, body: unknown, canRetry: boolean): Promise<T> => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = options.getAccessToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetchImpl(`${options.baseUrl}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 401 && canRetry && options.onUnauthorized && (await options.onUnauthorized())) {
      return send<T>(method, path, body, false);
    }

    if (res.status === 204) return undefined as T;

    const data: unknown = await res.json().catch(() => undefined);
    if (!res.ok) {
      const error = (data as ApiError | undefined)?.error;
      throw new ApiClientError(
        res.status,
        error?.code ?? 'INTERNAL_ERROR',
        error?.message ?? res.statusText,
        error?.details,
      );
    }
    return data as T;
  };

  return (method, path, body) => send(method, path, body, true);
}
