import type { ApiResult } from './client';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors?: Record<string, string>
  ) {
    super(message);
  }
}

/** Turns a server-action result back into a thrown error React Query can handle. */
export function unwrap<T>(result: ApiResult<T>): T {
  if (!result.ok) throw new ApiError(result.message, result.status, result.fieldErrors);
  return result.data;
}
