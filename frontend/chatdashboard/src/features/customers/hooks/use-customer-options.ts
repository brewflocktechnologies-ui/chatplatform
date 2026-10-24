'use client';

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { allCustomersQueryOptions, customerQueryOptions } from '../api/queries';
import type { CustomerSort } from '../api/types';
import { toCustomerOption } from '../lib/customer-options';

type Options = {
  sort: CustomerSort;
  /** The customer already stored on the record being edited, if any. */
  savedId?: string | null;
  /** The name stored alongside it; used when the customer can't be looked up. */
  savedName?: string | null;
  enabled: boolean;
};

/**
 * Options for a customer dropdown. The full list takes many seconds to load (and can fail), so
 * the saved customer is looked up on its own to get its label right away.
 */
export function useCustomerOptions({ sort, savedId, savedName, enabled }: Options) {
  const listOptions = allCustomersQueryOptions(sort);
  const isInList = (customers: { id: number }[] | undefined) =>
    !!savedId && !!customers?.some((c) => String(c.id) === savedId);

  // Declared before the list on purpose: Next runs a page's server actions one at a time, so
  // whichever query starts first is served first, and the list walk takes many seconds.
  const cachedList = useQueryClient().getQueryData(listOptions.queryKey);
  const saved = useQuery({
    ...customerQueryOptions(savedId ?? ''),
    enabled: enabled && !!savedId && !isInList(cachedList)
  });
  const list = useQuery({ ...listOptions, enabled });

  const inList = isInList(list.data);

  const options = useMemo(() => {
    const all = (list.data ?? []).map(toCustomerOption);
    if (savedId && !inList) {
      const label = saved.data?.email || savedName;
      // With no label to show, leave it out rather than present the raw id as a name.
      if (label) all.unshift({ value: savedId, label });
    }
    return all;
  }, [list.data, inList, savedId, savedName, saved.data]);

  return { options, isLoading: list.isLoading, isError: list.isError };
}
