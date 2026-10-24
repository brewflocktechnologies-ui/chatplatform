import type { QueryClient } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { entityRoots, type Entity } from './keys';

/**
 * Entities whose cached data goes stale when the key entity changes, beyond the entity itself.
 * Add an edge when one entity's data embeds or is derived from another's.
 */
export const DEPENDENTS: Record<Entity, readonly Entity[]> = {
  plans: [],
  customers: [],
  companies: [],
  websites: [],
  pocWebsites: [],
  // Websites carry the config they use, so renaming or deleting a config changes them.
  widgetConfigs: ['websites'],
  products: []
};

/** `entity` plus everything that depends on it, transitively. */
export function affectedEntities(entity: Entity): Entity[] {
  const seen = new Set<Entity>();
  const visit = (e: Entity) => {
    if (seen.has(e)) return;
    seen.add(e);
    DEPENDENTS[e].forEach(visit);
  };
  visit(entity);
  return [...seen];
}

/** Call from a mutation's `onSuccess`; defaults to the shared client. */
export function invalidateEntity(
  entity: Entity,
  queryClient: QueryClient = getQueryClient()
): Promise<unknown> {
  return Promise.all(
    affectedEntities(entity).map((e) => queryClient.invalidateQueries({ queryKey: entityRoots[e] }))
  );
}
