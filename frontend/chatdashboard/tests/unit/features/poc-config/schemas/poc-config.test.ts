import { describe, expect, it } from 'vitest';
import { pocConfigSchema } from '@/features/poc-config/schemas/poc-config';

const valid = {
  configName: 'Deploy Test',
  tenantId: 't1',
  clientId: '7',
  clientName: 'ref@example.com',
  websiteId: 'w1',
  websiteLink: 'https://example.com',
  cdnConfig: '{"theme":{"color":"red"}}'
};

const messagesFor = (input: Record<string, unknown>) => {
  const result = pocConfigSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('pocConfigSchema', () => {
  it('accepts a complete config', () => {
    expect(pocConfigSchema.safeParse(valid).success).toBe(true);
  });

  it('requires the identifying fields, trimming whitespace', () => {
    expect(
      messagesFor({
        ...valid,
        configName: '   ',
        tenantId: '',
        clientId: ' ',
        clientName: '',
        websiteId: ''
      })
    ).toEqual(
      expect.arrayContaining([
        'configName: Config name is required',
        'tenantId: Tenant ID is required',
        'clientId: Client ID is required',
        'clientName: Client name is required',
        'websiteId: Website ID is required'
      ])
    );
  });

  it('allows an empty website link but rejects a non-URL', () => {
    expect(pocConfigSchema.safeParse({ ...valid, websiteLink: '' }).success).toBe(true);
    expect(messagesFor({ ...valid, websiteLink: 'example.com' }).length).toBeGreaterThan(0);
  });

  it('accepts an empty or whitespace CDN config and any JSON object', () => {
    for (const cdnConfig of ['', '   ', '{}', '{"a":[1,2,{"b":null}]}']) {
      expect(pocConfigSchema.safeParse({ ...valid, cdnConfig }).success).toBe(true);
    }
  });

  it('rejects a CDN config that is not a JSON object', () => {
    for (const cdnConfig of ['{ not json', '[1, 2]', '"text"', '42', 'null', 'true']) {
      expect(messagesFor({ ...valid, cdnConfig })).toContain(
        'cdnConfig: Must be a valid JSON object'
      );
    }
  });
});
