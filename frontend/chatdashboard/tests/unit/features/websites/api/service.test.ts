import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn()
}));

import { getDb } from '@/lib/mongodb';
import {
  getWebsites,
  createWebsite,
  updateWebsite,
  deleteWebsite
} from '@/features/websites/api/service';

const ID = '507f1f77bcf86cd799439012';

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
  protocol: 'https',
  domain: 'example.com',
  customerId: 'cust-1',
  customerName: 'Acme',
  companyId: 'cust-1',
  businessCategory: 'ecommerce',
  flavour: 'default',
  configName: 'default',
  isActive: true,
  isVerified: false
};

describe('getWebsites', () => {
  it('fetches with default pagination and default sort', async () => {
    const result = await getWebsites({});

    expect(col.countDocuments).toHaveBeenCalledWith({});
    expect(col.find).toHaveBeenCalledWith({});
    expect(col.cursor.sort).toHaveBeenCalledWith({ dateAdded: -1 });
    expect(col.cursor.skip).toHaveBeenCalledWith(0);
    expect(col.cursor.limit).toHaveBeenCalledWith(10);
    expect(result.success).toBe(true);
    expect(result.message).toBe('Websites fetched successfully');
    expect(result.total_websites).toBe(0);
    expect(result.websites).toEqual([]);
  });

  it('builds search, category and customerId filters', async () => {
    await getWebsites({
      page: 2,
      limit: 4,
      search: 'acme',
      category: 'ecommerce,saas',
      customerId: 'cust-9'
    });

    const rx = { $regex: 'acme', $options: 'i' };
    expect(col.countDocuments).toHaveBeenCalledWith({
      $or: [{ domain: rx }, { customerName: rx }],
      businessCategory: { $in: ['ecommerce', 'saas'] },
      $and: [{ $or: [{ customerId: 'cust-9' }, { companyId: 'cust-9' }] }]
    });
    expect(col.cursor.skip).toHaveBeenCalledWith(4);
    expect(col.cursor.limit).toHaveBeenCalledWith(4);
  });

  it('applies a parsed sort param with asc and desc directions', async () => {
    await getWebsites({
      sort: JSON.stringify([
        { id: 'domain', desc: false },
        { id: 'dateAdded', desc: true }
      ])
    });
    expect(col.cursor.sort).toHaveBeenCalledWith({ domain: 1, dateAdded: -1 });
  });

  it('falls back to the default sort for an empty sort array', async () => {
    await getWebsites({ sort: '[]' });
    expect(col.cursor.sort).toHaveBeenCalledWith({ dateAdded: -1 });
  });

  it('falls back to the default sort for invalid sort JSON', async () => {
    await getWebsites({ sort: '{{nope' });
    expect(col.cursor.sort).toHaveBeenCalledWith({ dateAdded: -1 });
  });

  it('serializes _id into a string id', async () => {
    col.cursor.toArray.mockResolvedValue([{ _id: new ObjectId(ID), domain: 'example.com' }]);
    const result = await getWebsites({});
    expect(result.websites).toEqual([{ id: ID, domain: 'example.com' }]);
  });
});

describe('createWebsite', () => {
  it('inserts the payload with timestamps and returns the new website', async () => {
    const result = await createWebsite(payload);

    expect(col.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        ...payload,
        dateAdded: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      })
    );
    expect(result.success).toBe(true);
    expect(result.message).toBe('Website created successfully');
    expect(result.website.id).toBe(ID);
    expect(result.website.domain).toBe('example.com');
  });
});

describe('updateWebsite', () => {
  it('updates the matching document', async () => {
    const result = await updateWebsite(ID, payload);

    expect(col.updateOne).toHaveBeenCalledWith(
      { _id: new ObjectId(ID) },
      { $set: expect.objectContaining({ ...payload, updatedAt: expect.any(String) }) }
    );
    expect(result).toEqual({ success: true, message: 'Website updated successfully' });
  });

  it('throws when no document matches', async () => {
    col.updateOne.mockResolvedValue({ matchedCount: 0 });
    await expect(updateWebsite(ID, payload)).rejects.toThrow(`Website ${ID} not found`);
  });
});

describe('deleteWebsite', () => {
  it('deletes the matching document', async () => {
    const result = await deleteWebsite(ID);
    expect(col.deleteOne).toHaveBeenCalledWith({ _id: new ObjectId(ID) });
    expect(result).toEqual({ success: true, message: 'Website deleted successfully' });
  });

  it('throws when nothing was deleted', async () => {
    col.deleteOne.mockResolvedValue({ deletedCount: 0 });
    await expect(deleteWebsite(ID)).rejects.toThrow(`Website ${ID} not found`);
  });
});
