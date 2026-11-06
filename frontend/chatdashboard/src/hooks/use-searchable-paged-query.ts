import { useMemo } from 'react';
import { useQuery, type QueryKey, type UseQueryOptions } from '@tanstack/react-query';

interface Page<T> {
  content: T[];
  totalPages: number;
}

interface Options<T, P extends Page<T>, PK extends QueryKey, AK extends QueryKey> {
  /** Trimmed search text; empty means "no search". */
  search: string;
  /** 1-based page number, as in the URL. */
  page: number;
  perPage: number;
  /** Server-side paged query (the API pages and sorts, 0-based). */
  pagedOptions: UseQueryOptions<P, Error, P, PK>;
  /** Loads every row once; used while searching because the API can't search. */
  allOptions: UseQueryOptions<T[], Error, T[], AK>;
  matches: (row: T, search: string) => boolean;
}

/**
 * Rows for a searchable, paged table: without a search the API pages for us; with one, every row is
 * loaded once and filtered/paged here. Plain useQuery (not useSuspenseQuery): the fetchers are server
 * actions, and invoking one during render when the filters change makes Next update the Router mid-render.
 */
export function useSearchablePagedQuery<
  T,
  P extends Page<T>,
  PK extends QueryKey,
  AK extends QueryKey
>({ search, page, perPage, pagedOptions, allOptions, matches }: Options<T, P, PK, AK>) {
  const paged = useQuery({ ...pagedOptions, enabled: !search });
  const all = useQuery({ ...allOptions, enabled: !!search });

  const { rows, pageCount } = useMemo(() => {
    if (!search) {
      return { rows: paged.data?.content ?? [], pageCount: paged.data?.totalPages ?? 0 };
    }
    const found = (all.data ?? []).filter((row) => matches(row, search));
    const start = (page - 1) * perPage;
    return {
      rows: found.slice(start, start + perPage),
      pageCount: Math.ceil(found.length / perPage)
    };
    // `matches` is a stable module-level function at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, paged.data, all.data, page, perPage]);

  const active = search ? all : paged;
  const searchingAll = !!search && all.isFetching && !all.data;

  return { rows, pageCount, active, searchingAll };
}
