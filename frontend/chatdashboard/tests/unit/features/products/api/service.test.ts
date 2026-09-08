import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/constants/mock-api', () => ({
  fakeProducts: {
    getProducts: vi.fn(),
    getProductById: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn()
  }
}));

import { fakeProducts } from '@/constants/mock-api';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from '@/features/products/api/service';

const payload = {
  name: 'Widget',
  description: 'A very useful widget',
  price: 9.99,
  category: 'Electronics',
  photo_url: 'https://example.com/widget.png'
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('product service', () => {
  it('getProducts delegates to the mock api with the filters', async () => {
    const response = { success: true, products: [], total_products: 0 };
    vi.mocked(fakeProducts.getProducts).mockResolvedValue(response as never);

    const filters = { page: 2, limit: 5, search: 'widget' };
    await expect(getProducts(filters)).resolves.toBe(response);
    expect(fakeProducts.getProducts).toHaveBeenCalledWith(filters);
  });

  it('getProductById delegates to the mock api with the id', async () => {
    const response = { success: true, product: { id: 7 } };
    vi.mocked(fakeProducts.getProductById).mockResolvedValue(response as never);

    await expect(getProductById(7)).resolves.toBe(response);
    expect(fakeProducts.getProductById).toHaveBeenCalledWith(7);
  });

  it('createProduct delegates to the mock api with the payload', async () => {
    const response = { success: true, product: { id: 1, ...payload } };
    vi.mocked(fakeProducts.createProduct).mockResolvedValue(response as never);

    await expect(createProduct(payload as never)).resolves.toBe(response);
    expect(fakeProducts.createProduct).toHaveBeenCalledWith(payload);
  });

  it('updateProduct delegates to the mock api with id and payload', async () => {
    const response = { success: true, product: { id: 3, ...payload } };
    vi.mocked(fakeProducts.updateProduct).mockResolvedValue(response as never);

    await expect(updateProduct(3, payload as never)).resolves.toBe(response);
    expect(fakeProducts.updateProduct).toHaveBeenCalledWith(3, payload);
  });

  it('deleteProduct delegates to the mock api with the id', async () => {
    const response = { success: true, message: 'deleted' };
    vi.mocked(fakeProducts.deleteProduct).mockResolvedValue(response as never);

    await expect(deleteProduct(4)).resolves.toBe(response);
    expect(fakeProducts.deleteProduct).toHaveBeenCalledWith(4);
  });

  it('propagates mock api rejections', async () => {
    vi.mocked(fakeProducts.getProductById).mockRejectedValue(new Error('not found'));
    await expect(getProductById(999)).rejects.toThrow('not found');
  });
});
