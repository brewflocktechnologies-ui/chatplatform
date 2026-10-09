import { describe, it, expect } from 'vitest';
import { PlanApiError, unwrap } from '@/features/billing/api/errors';

describe('unwrap', () => {
  it('returns the data of a successful result', () => {
    expect(unwrap({ ok: true, data: { id: 1 } })).toEqual({ id: 1 });
  });

  it('throws a PlanApiError carrying status and field errors', () => {
    try {
      unwrap({
        ok: false,
        status: 400,
        message: 'Validation Failed',
        fieldErrors: { name: 'Plan name is required' }
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PlanApiError);
      const apiError = error as PlanApiError;
      expect(apiError.message).toBe('Validation Failed');
      expect(apiError.status).toBe(400);
      expect(apiError.fieldErrors).toEqual({ name: 'Plan name is required' });
    }
  });
});
