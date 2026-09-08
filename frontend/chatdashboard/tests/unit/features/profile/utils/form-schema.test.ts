import { describe, it, expect } from 'vitest';
import { profileSchema } from '@/features/profile/utils/form-schema';

const validJob = {
  jobcountry: 'Germany',
  jobcity: 'Berlin',
  jobtitle: 'Engineer',
  employer: 'Acme Corp',
  startdate: '2020-01-01',
  enddate: '2022-12-31'
};

const valid = {
  firstname: 'John',
  lastname: 'Smith',
  email: 'john@example.com',
  contactno: 1234567890,
  country: 'Germany',
  city: 'Berlin',
  jobs: [validJob]
};

function messages(data: unknown): string[] {
  const result = profileSchema.safeParse(data);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

describe('profileSchema', () => {
  it('accepts a fully valid profile', () => {
    const result = profileSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contactno).toBe(1234567890);
    }
  });

  it('accepts an empty jobs array', () => {
    expect(profileSchema.safeParse({ ...valid, jobs: [] }).success).toBe(true);
  });

  it('coerces a numeric string contact number', () => {
    const result = profileSchema.safeParse({ ...valid, contactno: '9876543210' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contactno).toBe(9876543210);
    }
  });

  it('rejects a non-numeric contact number', () => {
    expect(profileSchema.safeParse({ ...valid, contactno: 'abc' }).success).toBe(false);
  });

  it('rejects short first and last names', () => {
    expect(messages({ ...valid, firstname: 'Jo' })).toContain(
      'Product Name must be at least 3 characters'
    );
    expect(messages({ ...valid, lastname: 'Li' })).toContain(
      'Product Name must be at least 3 characters'
    );
  });

  it('rejects an invalid email', () => {
    expect(profileSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false);
  });

  it('rejects empty country and city', () => {
    expect(messages({ ...valid, country: '' })).toContain('Please select a category');
    expect(messages({ ...valid, city: '' })).toContain('Please select a category');
  });

  it('validates nested job fields', () => {
    const invalidJob = {
      jobcountry: '',
      jobcity: '',
      jobtitle: 'QA',
      employer: 'X',
      startdate: '2020-01-01',
      enddate: '2022-12-31'
    };
    const result = profileSchema.safeParse({ ...valid, jobs: [invalidJob] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('jobs.0.jobcountry');
      expect(paths).toContain('jobs.0.jobcity');
      expect(paths).toContain('jobs.0.jobtitle');
      expect(paths).toContain('jobs.0.employer');
    }
  });

  it('rejects a malformed start date', () => {
    const job = { ...validJob, startdate: '01-01-2020' };
    expect(messages({ ...valid, jobs: [job] })).toContain(
      'Start date should be in the format YYYY-MM-DD'
    );
  });

  it('rejects a malformed end date', () => {
    const job = { ...validJob, enddate: '2022/12/31' };
    expect(messages({ ...valid, jobs: [job] })).toContain(
      'End date should be in the format YYYY-MM-DD'
    );
  });
});
