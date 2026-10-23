import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/billing/errors';
import { CompanyApiError, unwrap } from '@/features/company/api/errors';

describe('company errors', () => {
  it('re-exports the shared billing error and unwrap', () => {
    expect(CompanyApiError).toBe(ApiError);
    expect(unwrap({ ok: true, data: 5 })).toBe(5);
  });
});
