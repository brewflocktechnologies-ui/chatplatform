'use server';

// ============================================================
// Widget Config Service — Data Access Layer (Server Actions + MongoDB)
// ============================================================
// CRUD for the `configs` collection: reusable widget-customization presets
// (each holding a cdnConfig payload the customization MFE edits).
// ============================================================

import { ObjectId, type Document, type WithId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import type { WidgetConfig, WidgetConfigsResponse } from './types';

const COLLECTION = 'configs';

async function configsCollection() {
  const db = await getDb();
  return db.collection(COLLECTION);
}

function serialize(doc: WithId<Document>): WidgetConfig {
  const { _id, ...rest } = doc;
  const name = (rest.name as string) || (rest.configName as string) || 'Untitled';
  return {
    id: _id.toString(),
    ...rest,
    name,
    configName: (rest.configName as string) || name,
    cdnConfig: (rest.cdnConfig as Record<string, unknown>) ?? {}
  } as WidgetConfig;
}

export async function getWidgetConfigs(): Promise<WidgetConfigsResponse> {
  const collection = await configsCollection();
  const docs = await collection.find({}).sort({ updatedAt: -1 }).toArray();

  return {
    success: true,
    time: new Date().toISOString(),
    message: 'Configs fetched successfully',
    configs: docs.map(serialize)
  };
}

export async function getWidgetConfig(id: string): Promise<WidgetConfig | null> {
  if (!ObjectId.isValid(id)) return null;
  const collection = await configsCollection();
  const doc = await collection.findOne({ _id: new ObjectId(id) });
  return doc ? serialize(doc) : null;
}

export async function createWidgetConfig(name: string): Promise<WidgetConfig> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Config name is required');

  const collection = await configsCollection();
  const existing = await collection.findOne({
    $or: [
      { name: { $regex: `^${escapeRegex(cleanName)}$`, $options: 'i' } },
      { configName: { $regex: `^${escapeRegex(cleanName)}$`, $options: 'i' } }
    ]
  });
  if (existing) throw new Error(`A configuration named "${cleanName}" already exists`);

  const now = new Date().toISOString();
  const doc = {
    name: cleanName,
    configName: cleanName,
    // Empty cdnConfig — the customization MFE falls back to its defaults.
    cdnConfig: {},
    createdAt: now,
    updatedAt: now
  };
  const result = await collection.insertOne({ ...doc });
  return { id: result.insertedId.toString(), ...doc };
}

export async function renameWidgetConfig(id: string, name: string) {
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Config name is required');

  const collection = await configsCollection();
  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { name: cleanName, configName: cleanName, updatedAt: new Date().toISOString() } }
  );
  if (result.matchedCount === 0) throw new Error(`Config ${id} not found`);

  // Keep website links readable: sync the denormalized config name.
  const db = await getDb();
  await db
    .collection('websites')
    .updateMany({ configId: id }, { $set: { configName: cleanName, flavour: cleanName } });

  return { success: true, message: 'Config renamed successfully' };
}

export async function saveWidgetConfigCdn(id: string, cdnConfig: Record<string, unknown>) {
  const collection = await configsCollection();
  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { cdnConfig, updatedAt: new Date().toISOString() } }
  );
  if (result.matchedCount === 0) throw new Error(`Config ${id} not found`);
  return { success: true, message: 'Config saved successfully' };
}

export async function deleteWidgetConfig(id: string) {
  const collection = await configsCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) throw new Error(`Config ${id} not found`);

  // Unlink the config from any websites that referenced it.
  const db = await getDb();
  await db
    .collection('websites')
    .updateMany({ configId: id }, { $unset: { configId: '' }, $set: { configName: '' } });

  return { success: true, message: 'Config deleted successfully' };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
