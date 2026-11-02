/**
 * TEMPORARY: in-memory stand-in for the billing service. Delete this file (and the two
 * `isBillingMock()` lines in `client.ts`) when it is no longer needed.
 *
 * Set `IS_MOCK=true` and every billing-backed tab (plans, companies, customers, POC websites,
 * widget configs, widgets) reads and writes the data below instead of calling the service.
 * Create / edit / delete all work, but nothing is persisted: a server restart resets the data.
 * MongoDB-backed features (websites, ...) are not touched.
 */

import type { Plan } from '@/features/billing/api/types';
import type { Company } from '@/features/company/api/types';
import type { Customer } from '@/features/customers/api/types';
import type { PocConfig } from '@/features/poc-config/api/types';
import type { PocWebsite } from '@/features/poc-website/api/types';
import type { PocWidget } from '@/features/poc-widget/api/types';
import type { ApiResult } from './client';

export const isBillingMock = () => process.env.IS_MOCK === 'true';

type Row = { id: number | string } & Record<string, any>;
type Table = { rows: Row[]; numeric: boolean };

const NOW = '2026-01-15T10:00:00.000Z';
const CITIES = [
  ['Bengaluru', 'Karnataka', 'India', '560001'],
  ['Mumbai', 'Maharashtra', 'India', '400001'],
  ['Austin', 'Texas', 'United States', '73301'],
  ['London', 'England', 'United Kingdom', 'EC1A 1BB'],
  ['Berlin', 'Berlin', 'Germany', '10115']
];
const NAMES = [
  'Acme',
  'Globex',
  'Initech',
  'Umbrella',
  'Hooli',
  'Stark',
  'Wayne',
  'Wonka',
  'Soylent',
  'Vandelay'
];

const plans = (): Plan[] =>
  [
    ['Free', 0, 0, true, false, true],
    ['Starter', 19, 190, false, true, true],
    ['Growth', 49, 490, false, false, true],
    ['Business', 99, 990, false, false, true],
    ['Enterprise', 299, 2990, false, false, true],
    ['Legacy', 29, 290, false, false, false]
  ].map(([name, m, a, free, def, active], i) => ({
    id: i + 1,
    name: name as string,
    description: `${name} plan`,
    amountMonthly: m as number,
    amountAnnually: a as number,
    freePlan: free as boolean,
    defaultPlan: def as boolean,
    active: active as boolean,
    custom: false,
    smartChatModule: null,
    managedAccountsModule: null,
    companyIds: [],
    planProductPrice: null,
    createdDate: NOW,
    modifiedDate: NOW,
    createdByUserId: 1,
    modifiedByUserId: 1
  }));

const companies = (): Company[] =>
  NAMES.map((name, i) => {
    const [city, state, country, postalCode] = CITIES[i % CITIES.length];
    return {
      id: i + 1,
      name: `${name} Corp`,
      superCompany: null,
      companyDetails: {
        contactEmail: `hello@${name.toLowerCase()}.com`,
        contactPhone: `+1-555-01${String(i).padStart(2, '0')}`,
        website: `https://www.${name.toLowerCase()}.com`,
        industry: ['Fintech', 'Retail', 'SaaS', 'Health'][i % 4],
        employeeCount: 20 + i * 35
      },
      headquarters: { streetAddress: `${10 + i} Main Street`, city, state, postalCode, country },
      customPlanIds: [],
      customerIds: [i + 1]
    };
  });

const customers = (): Customer[] =>
  NAMES.map((name, i) => {
    const [city, state, country, postalCode] = CITIES[i % CITIES.length];
    return {
      id: i + 1,
      externalId: `cus_${1000 + i}`,
      email: `billing@${name.toLowerCase()}.com`,
      activePlan:
        i % 3 === 0
          ? null
          : {
              id: (i % 5) + 1,
              name: ['Free', 'Starter', 'Growth', 'Business', 'Enterprise'][i % 5]
            },
      billingAddress: {
        line1: `${10 + i} Main Street`,
        line2: null,
        city,
        state,
        postalCode,
        country
      },
      creditCard: i % 2 ? { brand: 'visa', numberLastFourDigits: String(4242 + i) } : null,
      invoices: []
    };
  });

const websites = (): PocWebsite[] =>
  NAMES.slice(0, 8).map((name, i) => ({
    id: `site-${i + 1}`,
    protocol: 'HTTPS',
    domain: `${name.toLowerCase()}.example.com`,
    companyId: String(i + 1),
    customerId: String(i + 1),
    customerName: `${name} Corp`,
    flavour: ['Orange', 'Blue', 'Green'][i % 3],
    businessCategory: ['Retail', 'SaaS', 'Fintech', 'Health'][i % 4],
    dateAdded: `2025-0${(i % 9) + 1}-10T09:00:00.000Z`,
    isActive: i % 4 !== 3,
    isVerified: i % 2 === 0,
    configName: i < 4 ? `${name} config` : null,
    configId: i < 4 ? `cfg-${i + 1}` : null
  }));

const configs = (): PocConfig[] =>
  NAMES.slice(0, 4).map((name, i) => ({
    id: `cfg-${i + 1}`,
    configName: `${name} config`,
    clientId: String(i + 1),
    clientName: `${name} Corp`,
    websiteId: `site-${i + 1}`,
    websiteLink: `https://${name.toLowerCase()}.example.com`,
    tenantId: `tenant-${i + 1}`,
    cdnConfig: JSON.stringify({ theme: i % 2 ? 'dark' : 'light', primaryColor: '#0b5fff' }),
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: 'me',
    updatedBy: 'me',
    version: 0,
    new: false
  }));

const widgets = (): PocWidget[] =>
  NAMES.slice(0, 5).map((name, i) => ({
    id: i + 1,
    companyId: i + 1,
    assistantId: i + 1,
    widgetName: `${name} widget`,
    websiteUrl: `https://${name.toLowerCase()}.example.com`,
    position: (['BOTTOM_RIGHT', 'BOTTOM_LEFT', 'TOP_RIGHT', 'TOP_LEFT', 'CENTER'] as const)[i],
    theme: (['LIGHT', 'DARK', 'CUSTOM'] as const)[i % 3],
    primaryColor: '#0b5fff',
    greetingMessage: 'Hi! How can we help?',
    offlineMessage: 'We are offline right now.',
    showAgentName: true,
    showTypingIndicator: true,
    enableFileUpload: i % 2 === 0,
    maxFileSizeMb: 5,
    enableSoundNotification: false,
    autoPopup: i % 2 === 1,
    popupDelaySeconds: 5,
    isActive: true,
    totalImpressions: 1000 * (i + 1),
    totalConversationsInitiated: 100 * (i + 1),
    lastActivityDate: NOW,
    createdDate: NOW,
    modifiedDate: NOW
  }));

const seed = (): Record<string, Table> => ({
  plans: { rows: plans(), numeric: true },
  companies: { rows: companies(), numeric: true },
  customers: { rows: customers(), numeric: true },
  websites: { rows: websites(), numeric: false },
  configs: { rows: configs(), numeric: false },
  widgets: { rows: widgets(), numeric: true }
});

// Next can load this module more than once (per route bundle); globalThis keeps one copy of the data.
const g = globalThis as typeof globalThis & { __billingMock?: Record<string, Table> };
const db = () => (g.__billingMock ??= seed());

/** [url prefix, table name] */
const ROUTES: Array<[string, string]> = [
  ['/api/plans', 'plans'],
  ['/api/v1/companies', 'companies'],
  ['/api/customers', 'customers'],
  ['/api/v1/websites', 'websites'],
  ['/api/v1/widget-configs', 'configs'],
  ['/api/chat-assistant/widgets', 'widgets']
];

const pick = (obj: any, path: string) => path.split('.').reduce((v, k) => v?.[k], obj);

function sortRows(rows: Row[], sort: string | null) {
  if (!sort) return rows;
  const [field, dir] = sort.split(',');
  const sign = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const x = pick(a, field) ?? '';
    const y = pick(b, field) ?? '';
    if (x === y) return 0;
    return (x > y ? 1 : -1) * sign;
  });
}

/** Fields the server owns, per table, filled in when a row is created or updated. */
function stamp(table: string, row: Row, isNew: boolean): Row {
  if (table === 'plans' || table === 'widgets') {
    row.modifiedDate = new Date().toISOString();
    if (isNew) {
      row.createdDate = row.modifiedDate;
      if (table === 'widgets')
        Object.assign(row, {
          totalImpressions: 0,
          totalConversationsInitiated: 0,
          lastActivityDate: null
        });
    }
  }
  if (table === 'configs') {
    row.updatedAt = new Date().toISOString();
    if (isNew) row.createdAt = row.updatedAt;
    row.new = false;
  }
  if (table === 'websites' && isNew) row.dateAdded = new Date().toISOString();
  return row;
}

const ok = <T>(data: T): ApiResult<T> => ({ ok: true, data });
const fail = (status: number, message: string): ApiResult<never> => ({
  ok: false,
  status,
  message
});

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

function listRows<T>(table: Table, rest: string, query?: URLSearchParams): ApiResult<T> {
  const rows = sortRows(table.rows, query?.get('sort') ?? null).filter(
    (r) => rest !== 'active' || r.active
  );
  const size = Number(query?.get('size')) || 10;
  const page = Number(query?.get('page')) || 0;
  return ok({
    content: rows.slice(page * size, page * size + size),
    totalElements: rows.length,
    totalPages: Math.max(1, Math.ceil(rows.length / size)),
    number: page,
    size
  } as T);
}

function createRow<T>(name: string, table: Table, input: Row): ApiResult<T> {
  const ids = table.rows.map((r) => Number(String(r.id).replace(/\D/g, '')) || 0);
  const next = Math.max(0, ...ids) + 1;
  const row = stamp(name, { ...input, id: table.numeric ? next : `mock-${next}` }, true);
  if (name === 'customers')
    Object.assign(row, { activePlan: null, creditCard: null, invoices: [] });
  table.rows.push(row);
  return ok(row as T);
}

function updateRow<T>(name: string, table: Table, index: number, input: Row): ApiResult<T> {
  const current = table.rows[index];
  // Customers merge (omitted fields keep their value); everything else is a full replace.
  const merged: Row = { ...current, ...input };
  if (name === 'customers') {
    merged.billingAddress = { ...current.billingAddress, ...input.billingAddress };
  }
  if (name === 'configs') merged.version = (current.version ?? 0) + 1;
  table.rows[index] = stamp(name, { ...merged, id: current.id }, false);
  return ok(table.rows[index] as T);
}

function rowRequest<T>(
  method: Method,
  name: string,
  table: Table,
  index: number,
  input: Row
): ApiResult<T> {
  if (method === 'GET') return ok(table.rows[index] as T);
  if (method === 'DELETE') {
    table.rows.splice(index, 1);
    return ok(null as T);
  }
  if (method === 'PUT') return updateRow<T>(name, table, index, input);
  return fail(405, 'Method not allowed');
}

export function mockBillingRequest<T>(
  method: Method,
  path: string,
  {
    query,
    body,
    notFoundMessage
  }: { query?: URLSearchParams; body?: unknown; notFoundMessage?: string } = {}
): ApiResult<T> {
  const route = ROUTES.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`));
  if (!route) return fail(404, notFoundMessage ?? `No mock for ${path}`);

  const [prefix, name] = route;
  const table = db()[name];
  const rest = path.slice(prefix.length).replace(/^\//, '');
  const input = (body ?? {}) as Row;

  // Collection: list, "active" plans, create.
  if (!rest || (name === 'plans' && rest === 'active')) {
    if (method === 'GET') return listRows<T>(table, rest, query);
    if (method === 'POST') return createRow<T>(name, table, input);
    return fail(405, 'Method not allowed');
  }

  // Single row: read, update, delete.
  const index = table.rows.findIndex((r) => String(r.id) === decodeURIComponent(rest));
  if (index < 0) return fail(404, notFoundMessage ?? 'Not found');
  return rowRequest<T>(method, name, table, index, input);
}
