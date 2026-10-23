/**
 * Server-side HTTP client for the billing service. Every feature that talks to
 * it (plans, companies, widgets, ...) goes through here, so the base URL,
 * timeout, error mapping and any future auth/tracing headers live in one place.
 *
 * Import this only from server actions or server components: it reads a
 * server-only env var and must never ship to the browser.
 */

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; fieldErrors?: Record<string, string> };

/** Spring Data `Page` envelope returned by every paged billing endpoint. */
export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type SortDirection = 'asc' | 'desc';
export type SortParam<F extends string = string> = { field: F; dir: SortDirection };

const DEV_FALLBACK_URL = 'https://billing-service-eta.vercel.app';
// The service runs on serverless hosting; a cold start can take well over 10s.
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_PAGE_SIZE = 100;

/** Read per call so a missing variable fails the request, not the module import. */
function baseUrl() {
  const url = process.env.BILLING_API_URL;
  if (url) return url.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('BILLING_API_URL is not set');
  }
  return DEV_FALLBACK_URL;
}

/** Clamps client-supplied paging, since server actions take arbitrary input. */
export function pageParams(page: number, size: number, defaultSize = 10) {
  return new URLSearchParams({
    page: String(Math.max(0, Math.trunc(page) || 0)),
    size: String(Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(size) || defaultSize)))
  });
}

/**
 * Builds the `sort=field,dir` value. An unknown field makes the API return
 * 500, so anything outside `allowed` falls back to `fallback` (or no sort).
 */
export function sortParam<F extends string>(
  sort: SortParam<F> | undefined,
  allowed: readonly F[],
  { fallback, defaultDir = 'asc' }: { fallback?: SortParam<F>; defaultDir?: SortDirection } = {}
) {
  const chosen = sort && allowed.includes(sort.field) ? sort : fallback;
  if (!chosen) return undefined;
  const dir = chosen.dir === 'asc' || chosen.dir === 'desc' ? chosen.dir : defaultDir;
  return `${chosen.field},${dir}`;
}

type RequestOptions = {
  /** Overrides BILLING_API_URL for resources hosted on a different deployment. */
  origin?: string;
  query?: URLSearchParams;
  body?: unknown;
  /** The service maps many failures to 404, so each resource words it for itself. */
  notFoundMessage?: string;
};

/** Never throws: failures come back as data, because server actions redact thrown messages in production. */
export async function billingRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  { origin, query, body, notFoundMessage }: RequestOptions = {}
): Promise<ApiResult<T>> {
  const qs = query?.size ? `?${query}` : '';

  let res: Response;
  try {
    res = await fetch(`${origin?.replace(/\/+$/, '') ?? baseUrl()}${path}${qs}`, {
      method,
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ...(body !== undefined && {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
    });
  } catch {
    return { ok: false, status: 0, message: 'Billing service is unreachable' };
  }

  const data = await res.json().catch(() => null);
  if (res.ok) return { ok: true, data: data as T };

  return {
    ok: false,
    status: res.status,
    message:
      res.status === 404 && notFoundMessage
        ? notFoundMessage
        : (data?.error ?? data?.message ?? `Billing API responded with ${res.status}`),
    fieldErrors: data?.fieldErrors
  };
}

/** For reads consumed by React Query: failures throw so the query enters its error state. */
export async function billingGet<T>(path: string, query?: URLSearchParams): Promise<T> {
  const result = await billingRequest<T>('GET', path, { query });
  if (!result.ok) throw new Error(`Billing API responded with ${result.status}`);
  return result.data;
}
