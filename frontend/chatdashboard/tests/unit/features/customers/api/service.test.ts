import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn()
}));

import { getDb } from '@/lib/mongodb';
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer
} from '@/features/customers/api/service';

const ID = '507f1f77bcf86cd799439011';

function makeCollection() {
  const cursor = {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([])
  };
  return {
    cursor,
    countDocuments: vi.fn().mockResolvedValue(0),
    find: vi.fn().mockReturnValue(cursor),
    insertOne: vi.fn().mockResolvedValue({ insertedId: new ObjectId(ID) }),
    updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 })
  };
}

let col: ReturnType<typeof makeCollection>;

beforeEach(() => {
  vi.clearAllMocks();
  col = makeCollection();
  vi.mocked(getDb).mockResolvedValue({
    collection: vi.fn().mockReturnValue(col)
  } as never);
});

const payload = {
  name: 'Acme',
  email: 'acme@example.com',
  country: 'Germany',
  activePlanName: 'pro',
  status: 'active',
  integrations: '{"crm":"yes","analytics":"no"}'
};

describe('getCustomers', () => {
  it('fetches with default pagination and default sort', async () => {
    const result = await getCustomers({});

    expect(col.countDocuments).toHaveBeenCalledWith({});
    expect(col.find).toHaveBeenCalledWith({});
    expect(col.cursor.sort).toHaveBeenCalledWith({ dateAdded: -1 });
    expect(col.cursor.skip).toHaveBeenCalledWith(0);
    expect(col.cursor.limit).toHaveBeenCalledWith(10);
    expect(result.success).toBe(true);
    expect(result.message).toBe('Customers fetched successfully');
    expect(result.total_customers).toBe(0);
    expect(result.offset).toBe(0);
    expect(result.limit).toBe(10);
    expect(result.customers).toEqual([]);
  });

  it('builds a search + status + plan query and computes the offset', async () => {
    col.countDocuments.mockResolvedValue(42);
    await getCustomers({
      page: 3,
      limit: 5,
      search: 'acme',
      status: 'active,churned',
      plan: 'pro'
    });

    const rx = { $regex: 'acme', $options: 'i' };
    expect(col.countDocuments).toHaveBeenCalledWith({
      $or: [{ name: rx }, { email: rx }, { country: rx }],
      status: { $in: ['active', 'churned'] },
      activePlanName: { $in: ['pro'] }
    });
    expect(col.cursor.skip).toHaveBeenCalledWith(10);
    expect(col.cursor.limit).toHaveBeenCalledWith(5);
  });

  it('applies a parsed sort param with asc and desc directions', async () => {
    await getCustomers({
      sort: JSON.stringify([
        { id: 'name', desc: true },
        { id: 'email', desc: false }
      ])
    });
    expect(col.cursor.sort).toHaveBeenCalledWith({ name: -1, email: 1 });
  });

  it('falls back to the default sort for an empty sort array', async () => {
    await getCustomers({ sort: '[]' });
    expect(col.cursor.sort).toHaveBeenCalledWith({ dateAdded: -1 });
  });

  it('falls back to the default sort for invalid sort JSON', async () => {
    await getCustomers({ sort: 'not-json' });
    expect(col.cursor.sort).toHaveBeenCalledWith({ dateAdded: -1 });
  });

  it('serializes _id into a string id', async () => {
    col.cursor.toArray.mockResolvedValue([{ _id: new ObjectId(ID), name: 'Acme' }]);
    const result = await getCustomers({});
    expect(result.customers).toEqual([{ id: ID, name: 'Acme' }]);
  });
});

describe('createCustomer', () => {
  it('inserts the payload with timestamps and returns the new customer', async () => {
    const result = await createCustomer(payload);

    expect(col.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        ...payload,
        dateAdded: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      })
    );
    expect(result.success).toBe(true);
    expect(result.message).toBe('Customer created successfully');
    expect(result.customer.id).toBe(ID);
    expect(result.customer.name).toBe('Acme');
  });
});

describe('updateCustomer', () => {
  it('updates the matching document', async () => {
    const result = await updateCustomer(ID, payload);

    expect(col.updateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(ID) },
      { $set: expect.objectContaining({ ...payload, updatedAt: expect.any(String) }) }
    );
    expect(result).toEqual({ success: true, message: 'Customer updated successfully' });
  });

  it('throws when no document matches', async () => {
    col.updateOne.mockResolvedValue({ matchedCount: 0 });
    await expect(updateCustomer(ID, payload)).rejects.toThrow(`Customer ${ID} not found`);
  });
});

describe('deleteCustomer', () => {
  it('deletes the matching document', async () => {
    const result = await deleteCustomer(ID);
    expect(col.deleteOne).toHaveBeenCalledWith({ _id: new ObjectId(ID) });
    expect(result).toEqual({ success: true, message: 'Customer deleted successfully' });
  });

  it('throws when nothing was deleted', async () => {
    col.deleteOne.mockResolvedValue({ deletedCount: 0 });
    await expect(deleteCustomer(ID)).rejects.toThrow(`Customer ${ID} not found`);
  });
});
