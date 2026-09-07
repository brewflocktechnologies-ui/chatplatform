import { describe, it, expect } from 'vitest';
import {
  parseIntegrations,
  stringifyIntegrations
} from '@/features/customers/lib/integrations';

describe('parseIntegrations', () => {
  it('parses yes/yes into true flags', () => {
    expect(parseIntegrations('{"crm":"yes","analytics":"yes"}')).toEqual({
      crm: true,
      analytics: true
    });
  });

  it('parses no/no into false flags', () => {
    expect(parseIntegrations('{"crm":"no","analytics":"no"}')).toEqual({
      crm: false,
      analytics: false
    });
  });

  it('parses mixed values', () => {
    expect(parseIntegrations('{"crm":"yes","analytics":"no"}')).toEqual({
      crm: true,
      analytics: false
    });
  });

  it('treats undefined as an empty object', () => {
    expect(parseIntegrations(undefined)).toEqual({ crm: false, analytics: false });
  });

  it('treats missing keys as false', () => {
    expect(parseIntegrations('{}')).toEqual({ crm: false, analytics: false });
  });

  it('falls back to false flags on invalid JSON', () => {
    expect(parseIntegrations('not-json')).toEqual({ crm: false, analytics: false });
  });

  it('treats unexpected values as false', () => {
    expect(parseIntegrations('{"crm":"true","analytics":1}')).toEqual({
      crm: false,
      analytics: false
    });
  });
});

describe('stringifyIntegrations', () => {
  it('serializes true flags to yes', () => {
    expect(stringifyIntegrations({ crm: true, analytics: true })).toBe(
      '{"crm":"yes","analytics":"yes"}'
    );
  });

  it('serializes false flags to no', () => {
    expect(stringifyIntegrations({ crm: false, analytics: false })).toBe(
      '{"crm":"no","analytics":"no"}'
    );
  });

  it('round-trips through parseIntegrations', () => {
    const flags = { crm: true, analytics: false };
    expect(parseIntegrations(stringifyIntegrations(flags))).toEqual(flags);
  });
});
