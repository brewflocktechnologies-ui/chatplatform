import { MongoClient, ObjectId, type Db } from 'mongodb';

/**
 * Direct MongoDB access for seeding and cleaning test data.
 *
 * The app's server actions (src/features/{customers,websites,widget-modifier}/api/service.ts)
 * read/write the `customers`, `websites`, and `configs` collections of the
 * database named in MONGODB_URI. Seeded documents mirror the exact shape those
 * services produce so the UI renders them like real rows.
 *
 * Every seeded document carries a run-unique E2E name prefix; cleanup deletes
 * by tracked id AND sweeps by prefix so crashed runs never leave residue.
 */

export const E2E_PREFIX = 'E2E-PW';

export function uniqueName(label: string): string {
  return `${E2E_PREFIX} ${label} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function uniqueDomain(): string {
  return `${uniqueName('site').toLowerCase().replace(/\s+/g, '-')}.example.test`;
}

export function hasDb(): boolean {
  return !!process.env.MONGODB_URI;
}

export interface SeededCustomer {
  id: string;
  name: string;
  email: string;
  country: string;
  activePlanName: string;
  status: string;
}

export interface SeededWebsite {
  id: string;
  domain: string;
  customerName: string;
}

export class TestDb {
  private client: MongoClient | null = null;
  private inserted: { collection: string; id: ObjectId }[] = [];
  private namedDeletions: { collection: string; field: string; value: string }[] = [];

  /** Register rows the APP will create (e.g. via a form) for cleanup by field value. */
  trackCustomerName(name: string): void {
    this.namedDeletions.push({ collection: 'customers', field: 'name', value: name });
  }

  trackWebsiteDomain(domain: string): void {
    this.namedDeletions.push({ collection: 'websites', field: 'domain', value: domain });
  }

  private async db(): Promise<Db> {
    if (!this.client) {
      this.client = await new MongoClient(process.env.MONGODB_URI as string, {
        serverSelectionTimeoutMS: 15_000
      }).connect();
    }
    return this.client.db();
  }

  async seedCustomer(overrides: Partial<Record<string, unknown>> = {}): Promise<SeededCustomer> {
    const now = new Date().toISOString();
    const doc = {
      name: uniqueName('Customer'),
      email: `e2e-${Date.now().toString(36)}@example.test`,
      country: 'india',
      activePlanName: 'Free',
      status: 'active',
      integrations: '{"crm":"no","analytics":"no"}',
      dateAdded: now,
      createdAt: now,
      updatedAt: now,
      ...overrides
    };
    const db = await this.db();
    const result = await db.collection('customers').insertOne({ ...doc });
    this.inserted.push({ collection: 'customers', id: result.insertedId });
    return {
      id: result.insertedId.toString(),
      name: doc.name as string,
      email: doc.email as string,
      country: doc.country as string,
      activePlanName: doc.activePlanName as string,
      status: doc.status as string
    };
  }

  async seedWebsite(
    customer: SeededCustomer,
    overrides: Partial<Record<string, unknown>> = {}
  ): Promise<SeededWebsite> {
    const now = new Date().toISOString();
    const doc = {
      protocol: 'HTTPS',
      domain: uniqueDomain(),
      companyId: '',
      customerId: customer.id,
      customerName: customer.name,
      flavour: 'Orange',
      businessCategory: 'Saas',
      dateAdded: now,
      isActive: true,
      isVerified: false,
      createdAt: now,
      updatedAt: now,
      ...overrides
    };
    const db = await this.db();
    const result = await db.collection('websites').insertOne({ ...doc });
    this.inserted.push({ collection: 'websites', id: result.insertedId });
    return {
      id: result.insertedId.toString(),
      domain: doc.domain as string,
      customerName: doc.customerName as string
    };
  }

  /** Delete everything this instance created, plus any stale prefixed leftovers. */
  async cleanup(): Promise<void> {
    if (!this.client && this.inserted.length === 0) {
      // Nothing seeded and no connection opened — still sweep stale rows if we can.
      if (!hasDb()) return;
    }
    const db = await this.db();
    for (const { collection, id } of this.inserted) {
      await db
        .collection(collection)
        .deleteOne({ _id: id })
        .catch(() => {});
    }
    this.inserted = [];
    for (const { collection, field, value } of this.namedDeletions) {
      await db
        .collection(collection)
        .deleteMany({ [field]: value })
        .catch(() => {});
    }
    this.namedDeletions = [];
    const stale = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const prefixRx = { $regex: `^${E2E_PREFIX}` };
    await db
      .collection('customers')
      .deleteMany({ name: prefixRx, createdAt: { $lt: stale } })
      .catch(() => {});
    await db
      .collection('websites')
      .deleteMany({ customerName: prefixRx, createdAt: { $lt: stale } })
      .catch(() => {});
  }

  async close(): Promise<void> {
    await this.client?.close();
    this.client = null;
  }
}
