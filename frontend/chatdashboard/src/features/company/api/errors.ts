import type { CompanyResult } from './types';

export class CompanyApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors?: Record<string, string>
  ) {
    super(message);
  }
}

/** Turns a server-action result back into a thrown error React Query can handle. */
export function unwrap<T>(result: CompanyResult<T>): T {
  if (!result.ok) {
    throw new CompanyApiError(result.message, result.status, result.fieldErrors);
  }
  return result.data;
}
