import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/products/api/service', () => ({
  getProducts: vi.fn(),
  getProductById: vi.fn()
}));

import { getProducts, getProductById } from '@/features/products/api/service';
import {
  productKeys,
  productsQueryOptions,
  productByIdOptions
} from '@/features/products/api/queries';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('productKeys', () => {
  it('exposes a stable root key', () => {
    expect(productKeys.all).toEqual(['products']);
  });

  it('builds list keys from filters', () => {
    const filters = { page: 1, categories: 'Electronics' };
    expect(productKeys.list(filters)).toEqual(['products', 'list', filters]);
  });

  it('builds detail keys from a numeric id', () => {
    expect(productKeys.detail(42)).toEqual(['products', 'detail', 42]);
  });
});

describe('productsQueryOptions', () => {
  it('uses the list key and delegates to getProducts', async () => {
    const response = { success: true, products: [] };
    vi.mocked(getProducts).mockResolvedValue(response as never);

    const filters = { search: 'widget' };
    const options = productsQueryOptions(filters);
    expect(options.queryKey).toEqual(productKeys.list(filters));

    const result = await (options.queryFn as () => unknown)();
    expect(getProducts).toHaveBeenCalledWith(filters);
    expect(result).toBe(response);
  });
});

describe('productByIdOptions', () => {
  it('uses the detail key and delegates to getProductById', async () => {
    const response = { success: true, product: { id: 7 } };
    vi.mocked(getProductById).mockResolvedValue(response as never);

    const options = productByIdOptions(7);
    expect(options.queryKey).toEqual(productKeys.detail(7));

    const result = await (options.queryFn as () => unknown)();
    expect(getProductById).toHaveBeenCalledWith(7);
    expect(result).toBe(response);
  });
});
