import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

import { DEPENDENTS, affectedEntities, invalidateEntity } from '@/lib/cache/invalidation';
import { entityRoots, type Entity } from '@/lib/cache/keys';
import { CACHE_TIERS, cachePolicy } from '@/lib/cache/policy';
import { customerKeys } from '@/features/customers/api/queries';
import { pocWebsiteKeys } from '@/features/poc-website/api/queries';
import { websiteKeys } from '@/features/websites/api/queries';
import { widgetConfigKeys } from '@/features/widget-modifier/api/queries';

describe('cachePolicy', () => {
  it('orders tiers from least to most cached', () => {
    expect(CACHE_TIERS.live.staleTime).toBeLessThan(CACHE_TIERS.list.staleTime);
    expect(CACHE_TIERS.list.staleTime).toBeLessThan(CACHE_TIERS.reference.staleTime);
    expect(cachePolicy('reference')).toEqual({ staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 });
  });
});

describe('entityRoots', () => {
  it('is what the feature key factories build on', () => {
    expect(customerKeys.all).toBe(entityRoots.customers);
    expect(websiteKeys.all).toBe(entityRoots.websites);
    expect(pocWebsiteKeys.all).toBe(entityRoots.pocWebsites);
    expect(widgetConfigKeys.all).toBe(entityRoots.widgetConfigs);
  });

  it('keeps the MongoDB websites and billing-API websites caches apart', () => {
    expect(entityRoots.websites).not.toEqual(entityRoots.pocWebsites);
  });

  it('has an invalidation entry for every entity', () => {
    expect(Object.keys(DEPENDENTS).toSorted()).toEqual(Object.keys(entityRoots).toSorted());
  });
});

describe('affectedEntities', () => {
  it('includes the entity itself', () => {
    expect(affectedEntities('plans')).toEqual(['plans']);
  });

  it('follows dependents', () => {
    expect(affectedEntities('widgetConfigs')).toEqual(['widgetConfigs', 'websites']);
  });
});


const seed = (client: QueryClient) => {
  const keys: Record<Entity, readonly unknown[]> = {
    plans: [...entityRoots.plans, 'list', { page: 0 }],
    customers: [...entityRoots.customers, 'all', null],
    companies: [...entityRoots.companies, 'list', { page: 0 }],
    websites: [...entityRoots.websites, 'list', { page: 1 }],
    pocWebsites: [...entityRoots.pocWebsites],
    widgetConfigs: [...entityRoots.widgetConfigs, 'list'],
    products: [...entityRoots.products, 'list', {}]
  };
  for (const key of Object.values(keys)) client.setQueryData(key, ['x']);
  return keys;
};

describe('invalidateEntity', () => {
  it('marks the entity and its dependents stale, and nothing else', async () => {
    const client = new QueryClient();
    const keys = seed(client);

    await invalidateEntity('widgetConfigs', client);

    const stale = (e: Entity) => client.getQueryState(keys[e])?.isInvalidated;
    expect(stale('widgetConfigs')).toBe(true);
    expect(stale('websites')).toBe(true);
    expect(stale('pocWebsites')).toBe(false);
    expect(stale('customers')).toBe(false);
  });

  it('invalidates every key under the entity root', async () => {
    const client = new QueryClient();
    client.setQueryData([...entityRoots.pocWebsites], []);

    await invalidateEntity('pocWebsites', client);

    expect(client.getQueryState([...entityRoots.pocWebsites])?.isInvalidated).toBe(true);
  });
});
