import { describe, expect, it } from 'vitest';
import { formatDate } from '@/lib/format';

describe('formatDate', () => {
  it('formats a Date instance with the default options', () => {
    expect(formatDate(new Date(2024, 0, 15))).toBe('January 15, 2024');
  });

  it('formats a date string', () => {
    expect(formatDate('2024-01-15T12:00:00')).toBe('January 15, 2024');
  });

  it('formats a numeric timestamp', () => {
    expect(formatDate(new Date(2024, 5, 1).getTime())).toBe('June 1, 2024');
  });

  it('returns an empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('returns an empty string for a falsy timestamp of zero', () => {
    expect(formatDate(0)).toBe('');
  });

  it('returns an empty string when the date is invalid', () => {
    expect(formatDate('not-a-date')).toBe('');
  });

  it('lets opts override the month format', () => {
    expect(formatDate(new Date(2024, 0, 15), { month: 'short' })).toBe('Jan 15, 2024');
  });

  it('lets opts override the day format', () => {
    expect(formatDate(new Date(2024, 0, 5), { day: '2-digit' })).toBe('January 05, 2024');
  });

  it('lets opts override the year format', () => {
    expect(formatDate(new Date(2024, 0, 15), { year: '2-digit' })).toBe('January 15, 24');
  });
});
