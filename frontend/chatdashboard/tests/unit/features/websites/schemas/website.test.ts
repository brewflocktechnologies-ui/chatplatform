import { describe, it, expect } from 'vitest';
import { websiteSchema } from '@/features/websites/schemas/website';

const valid = {
  protocol: 'https',
  domain: 'example.com',
  customerId: 'cust-1',
  businessCategory: 'ecommerce',
  flavour: 'default',
  isActive: true,
  isVerified: false
};

function firstMessage(data: unknown) {
  const result = websiteSchema.safeParse(data);
  return result.success ? null : result.error.issues[0].message;
}

describe('websiteSchema', () => {
  it('accepts a fully valid website', () => {
    const result = websiteSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(valid);
    }
  });

  it('accepts subdomains and hyphenated domains', () => {
    expect(websiteSchema.safeParse({ ...valid, domain: 'shop.my-site.co.uk' }).success).toBe(true);
  });

  it('rejects an empty protocol', () => {
    expect(firstMessage({ ...valid, protocol: '' })).toBe('Please select a protocol');
  });

  it('rejects a domain shorter than 3 characters', () => {
    expect(firstMessage({ ...valid, domain: 'ab' })).toBe('Domain is required');
  });

  it('rejects a domain with a protocol prefix', () => {
    expect(firstMessage({ ...valid, domain: 'https://example.com' })).toBe(
      'Enter a bare domain like example.com (no protocol or path)'
    );
  });

  it('rejects a domain without a TLD', () => {
    expect(firstMessage({ ...valid, domain: 'localhost' })).toBe(
      'Enter a bare domain like example.com (no protocol or path)'
    );
  });

  it('rejects a domain with a trailing hyphen label', () => {
    expect(websiteSchema.safeParse({ ...valid, domain: 'example-.com' }).success).toBe(false);
  });

  it('rejects an empty customerId', () => {
    expect(firstMessage({ ...valid, customerId: '' })).toBe('Please select a customer');
  });

  it('rejects an empty businessCategory', () => {
    expect(firstMessage({ ...valid, businessCategory: '' })).toBe('Please select a category');
  });

  it('rejects an empty flavour', () => {
    expect(firstMessage({ ...valid, flavour: '' })).toBe('Flavour / config name is required');
  });

  it('rejects non-boolean isActive and isVerified', () => {
    expect(websiteSchema.safeParse({ ...valid, isActive: 'yes' }).success).toBe(false);
    expect(websiteSchema.safeParse({ ...valid, isVerified: 1 }).success).toBe(false);
  });
});
