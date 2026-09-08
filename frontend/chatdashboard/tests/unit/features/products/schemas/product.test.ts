import { describe, it, expect } from 'vitest';
import { productSchema } from '@/features/products/schemas/product';

function fakeFile(overrides: Partial<{ size: number; type: string }> = {}) {
  return { size: 1024, type: 'image/png', ...overrides };
}

const valid = {
  image: [fakeFile()],
  name: 'Widget',
  category: 'Electronics',
  price: 9.99,
  description: 'A very useful widget for everyone'
};

function messages(data: unknown): string[] {
  const result = productSchema.safeParse(data);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

describe('productSchema', () => {
  it('accepts a fully valid product', () => {
    expect(productSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts each allowed image mime type', () => {
    for (const type of ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']) {
      const data = { ...valid, image: [fakeFile({ type })] };
      expect(productSchema.safeParse(data).success).toBe(true);
    }
  });

  it('requires exactly one image', () => {
    expect(messages({ ...valid, image: [] })).toContain('Image is required.');
    expect(messages({ ...valid, image: undefined })).toContain('Image is required.');
    expect(messages({ ...valid, image: [fakeFile(), fakeFile()] })).toContain(
      'Image is required.'
    );
  });

  it('rejects images over 5MB', () => {
    const data = { ...valid, image: [fakeFile({ size: 5_000_001 })] };
    expect(messages(data)).toContain('Max file size is 5MB.');
  });

  it('rejects disallowed image types', () => {
    const data = { ...valid, image: [fakeFile({ type: 'image/gif' })] };
    expect(messages(data)).toContain('.jpg, .jpeg, .png and .webp files are accepted.');
  });

  it('rejects a name shorter than 2 characters', () => {
    expect(messages({ ...valid, name: 'W' })).toContain(
      'Product name must be at least 2 characters.'
    );
  });

  it('rejects an empty category', () => {
    expect(messages({ ...valid, category: '' })).toContain('Please select a category');
  });

  it('rejects a missing price', () => {
    expect(messages({ ...valid, price: undefined })).toContain('Price is required');
  });

  it('rejects a non-numeric price', () => {
    expect(messages({ ...valid, price: 'free' })).toContain('Price is required');
  });

  it('rejects a description shorter than 10 characters', () => {
    expect(messages({ ...valid, description: 'too short' })).toContain(
      'Description must be at least 10 characters.'
    );
  });
});
