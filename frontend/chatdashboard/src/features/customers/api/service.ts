'use server';

// ============================================================
// Customer Service — Data Access Layer (Server Actions + MongoDB)
// ============================================================
// Pattern 1 from the template: this file is a server-action module, so
// every export runs on the server with direct MongoDB access. The server
// prefetch calls these directly; client components reach them as RPC.
// Queries (queries.ts) and components import from here — they never change.
// ============================================================

import { ObjectId, type Document, type Filter, type Sort, type WithId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import type { CustomerFilters, CustomersResponse, CustomerMutationPayload } from './types';

const COLLECTION = 'customers';

async function customersCollection() {
  const db = await getDb();
  return db.collection(COLLECTION);
}

function serialize(doc: WithId<Document>) {
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest } as CustomersResponse['customers'][number];
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

export async function getCustomers(filters: CustomerFilters): Promise<CustomersResponse> {
  const { page = 1, limit = 10, search, status, plan, sort } = filters;

  const query: Filter<Document> = {};
  if (search) {
    const rx = { $regex: search, $options: 'i' };
    query.$or = [{ name: rx }, { email: rx }, { country: rx }];
  }
  if (status) query.status = { $in: status.split(',') };
  if (plan) query.activePlanName = { $in: plan.split(',') };

  const collection = await customersCollection();
  const offset = (page - 1) * limit;

  const [total, docs] = await Promise.all([
    collection.countDocuments(query),
    collection.find(query).sort(buildSort(sort)).skip(offset).limit(limit).toArray()
  ]);

  return {
    success: true,
    time: new Date().toISOString(),
    message: 'Customers fetched successfully',
    total_customers: total,
    offset,
    limit,
    customers: docs.map(serialize)
  };
}

export async function createCustomer(data: CustomerMutationPayload) {
  const collection = await customersCollection();
  const now = new Date().toISOString();

  const doc = {
    ...data,
    dateAdded: now,
    createdAt: now,
    updatedAt: now
  };

  // insertOne mutates `doc` by attaching the ObjectId `_id`, which is not
  // serializable across the server-action boundary — build the response from
  // the plain fields instead.
  const result = await collection.insertOne({ ...doc });
  return {
    success: true,
    message: 'Customer created successfully',
    customer: { id: result.insertedId.toString(), ...doc }
  };
}

export async function updateCustomer(id: string, data: CustomerMutationPayload) {
  const collection = await customersCollection();

  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...data, updatedAt: new Date().toISOString() } }
  );

  if (result.matchedCount === 0) {
    throw new Error(`Customer ${id} not found`);
  }
  return { success: true, message: 'Customer updated successfully' };
}

export async function deleteCustomer(id: string) {
  const collection = await customersCollection();

  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) {
    throw new Error(`Customer ${id} not found`);
  }
  return { success: true, message: 'Customer deleted successfully' };
}
