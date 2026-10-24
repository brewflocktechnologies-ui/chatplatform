'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  const list = useQuery({ ...allCustomersQueryOptions(sort), enabled });

  const inList = !!savedId && !!list.data?.some((c) => String(c.id) === savedId);
  const saved = useQuery({
    ...customerQueryOptions(savedId ?? ''),
    enabled: enabled && !!savedId && !inList
  });

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
