// ============================================================
// MongoDB client — server-side only
// ============================================================
// Reads MONGODB_URI from the environment (.env.local). The client is
// cached on globalThis so hot reloads in dev don't exhaust the Atlas
// connection pool.
// ============================================================

import { MongoClient, type Db } from 'mongodb';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to .env.local (see env.example.txt).');
  }

  if (!globalThis._mongoClientPromise) {
    globalThis._mongoClientPromise = new MongoClient(uri, {
      serverSelectionTimeoutMS: 15000
    }).connect();
  }
  return globalThis._mongoClientPromise;
}

// Uses the database named in the connection string (e.g. zotly_sb).
export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db();
}
