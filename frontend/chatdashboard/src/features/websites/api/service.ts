'use server';

// ============================================================
// Website Service — Data Access Layer (Server Actions + MongoDB)
// ============================================================
// Same pattern as the customers feature: every export runs on the server
// with direct MongoDB access; the server prefetch calls these directly and
// client components reach them as RPC.
// ============================================================

import { ObjectId, type Document, type Filter, type Sort, type WithId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import type { WebsiteFilters, WebsitesResponse, WebsiteMutationPayload } from './types';

const COLLECTION = 'websites';

async function websitesCollection() {
  const db = await getDb();
  return db.collection(COLLECTION);
}

function serialize(doc: WithId<Document>) {
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest } as WebsitesResponse['websites'][number];
}

function buildSort(sortParam?: string): Sort {
  if (sortParam) {
    try {
      const parsed = JSON.parse(sortParam) as { id: string; desc: boolean }[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Object.fromEntries(parsed.map((s) => [s.id, s.desc ? -1 : 1])) as Sort;
      }
    } catch {
      // fall through to default sort
    }
  }
  return { dateAdded: -1 };
}

export async function getWebsites(filters: WebsiteFilters): Promise<WebsitesResponse> {
  const { page = 1, limit = 10, search, category, customerId, sort } = filters;

  const query: Filter<Document> = {};
  if (search) {
    const rx = { $regex: search, $options: 'i' };
    query.$or = [{ domain: rx }, { customerName: rx }];
  }
  if (category) query.businessCategory = { $in: category.split(',') };
  if (customerId) {
    // Legacy documents may only carry companyId — match either.
    query.$and = [{ $or: [{ customerId }, { companyId: customerId }] }];
  }

  const collection = await websitesCollection();
  const offset = (page - 1) * limit;

  const [total, docs] = await Promise.all([
    collection.countDocuments(query),
    collection.find(query).sort(buildSort(sort)).skip(offset).limit(limit).toArray()
  ]);

  return {
    success: true,
    time: new Date().toISOString(),
    message: 'Websites fetched successfully',
    total_websites: total,
    offset,
    limit,
    websites: docs.map(serialize)
  };
}

export async function createWebsite(data: WebsiteMutationPayload) {
  const collection = await websitesCollection();
  const now = new Date().toISOString();

  const doc = {
    ...data,
    dateAdded: now,
    createdAt: now,
    updatedAt: now
  };

  // insertOne mutates its argument by attaching the ObjectId `_id`, which is
  // not serializable across the server-action boundary — pass a copy.
  const result = await collection.insertOne({ ...doc });
  return {
    success: true,
    message: 'Website created successfully',
    website: { id: result.insertedId.toString(), ...doc }
  };
}

export async function updateWebsite(id: string, data: WebsiteMutationPayload) {
  const collection = await websitesCollection();

  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...data, updatedAt: new Date().toISOString() } }
  );

  if (result.matchedCount === 0) {
    throw new Error(`Website ${id} not found`);
  }
  return { success: true, message: 'Website updated successfully' };
}

export async function deleteWebsite(id: string) {
  const collection = await websitesCollection();

  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) {
    throw new Error(`Website ${id} not found`);
  }
  return { success: true, message: 'Website deleted successfully' };
}
