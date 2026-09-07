import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { withNuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing';
import type { ColumnDef } from '@tanstack/react-table';
import { useDataTable } from '@/hooks/use-data-table';
import type { ExtendedColumnSort } from '@/types/data-table';

interface TestData {
  id: string;
  title: string;
  status: string;
  name: string;
  createdAt: string;
}

type DataTableProps = Parameters<typeof useDataTable<TestData>>[0];

const columns: ColumnDef<TestData>[] = [
  { id: 'title', accessorKey: 'title', enableColumnFilter: true },
  {
    id: 'status',
    accessorKey: 'status',
    enableColumnFilter: true,
    meta: {
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Archived', value: 'archived' }
      ]
    }
  },
  { id: 'createdAt', accessorKey: 'createdAt' },
  { accessorKey: 'name' }
];

const data: TestData[] = [
  { id: '1', title: 'First', status: 'active', name: 'Alice', createdAt: '2026-01-01' },
  { id: '2', title: 'Second', status: 'archived', name: 'Bob', createdAt: '2026-01-02' }
];

interface AdapterOptions {
  searchParams?: string;
  onUrlUpdate?: (event: UrlUpdateEvent) => void;
}

function renderDataTable(overrides: Partial<DataTableProps> = {}, adapter: AdapterOptions = {}) {
  return renderHook(
    () =>
      useDataTable<TestData>({
        columns,
        data,
        pageCount: 10,
        ...overrides
      } as DataTableProps),
    {
      wrapper: withNuqsTestingAdapter({
        searchParams: adapter.searchParams,
        onUrlUpdate: adapter.onUrlUpdate,
        hasMemory: true
      })
    }
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useDataTable', () => {
  it('returns default state when no url or initial state is provided', () => {
    const { result } = renderDataTable();
    const state = result.current.table.getState();

    expect(state.pagination).toEqual({ pageIndex: 0, pageSize: 10 });
    expect(state.sorting).toEqual([]);
    expect(state.columnFilters).toEqual([]);
    expect(state.rowSelection).toEqual({});
    expect(state.columnVisibility).toEqual({});
    expect(state.columnPinning).toEqual({});
    expect(result.current.shallow).toBe(true);
    expect(result.current.debounceMs).toBe(300);
    expect(result.current.throttleMs).toBe(50);
    expect(result.current.table.getPageCount()).toBe(10);
  });

  it('applies the provided initial state', () => {
    const sorting: ExtendedColumnSort<TestData>[] = [{ id: 'title', desc: true }];
    const { result } = renderDataTable({
      initialState: {
        rowSelection: { '1': true },
        columnVisibility: { name: false },
        columnPinning: { left: ['title'] },
        pagination: { pageIndex: 0, pageSize: 25 },
        sorting
      }
    });
    const state = result.current.table.getState();

    expect(state.rowSelection).toEqual({ '1': true });
    expect(state.columnVisibility).toEqual({ name: false });
    expect(state.columnPinning).toEqual({ left: ['title'] });
    expect(state.pagination.pageSize).toBe(25);
    expect(state.sorting).toEqual([{ id: 'title', desc: true }]);
  });

  it('falls back to defaults when initial state omits pagination page size', () => {
    const { result } = renderDataTable({
      initialState: { columnVisibility: { name: false } }
    });
    const state = result.current.table.getState();

    expect(state.pagination.pageSize).toBe(10);
    expect(state.sorting).toEqual([]);
    expect(state.rowSelection).toEqual({});
  });

  it('reads pagination and sorting from the url', () => {
    const { result } = renderDataTable(
      {},
      { searchParams: '?page=3&perPage=20&sort=[{"id":"title","desc":true}]' }
    );
    const state = result.current.table.getState();

    expect(state.pagination).toEqual({ pageIndex: 2, pageSize: 20 });
    expect(state.sorting).toEqual([{ id: 'title', desc: true }]);
  });

  it('updates pagination through updater functions', () => {
    const { result } = renderDataTable();

    act(() => {
      result.current.table.nextPage();
    });
    expect(result.current.table.getState().pagination.pageIndex).toBe(1);

    act(() => {
      result.current.table.setPageSize(50);
    });
    expect(result.current.table.getState().pagination.pageSize).toBe(50);
  });

  it('updates pagination through a direct value', () => {
    const { result } = renderDataTable();

    act(() => {
      // table.setPagination wraps values in an updater, so call the handler
      // directly to exercise the direct-value code path.
      result.current.table.options.onPaginationChange?.({ pageIndex: 3, pageSize: 20 });
    });
    expect(result.current.table.getState().pagination).toEqual({
      pageIndex: 3,
      pageSize: 20
    });
  });

  it('updates sorting through a direct value and an updater function', () => {
    const { result } = renderDataTable();

    act(() => {
      result.current.table.setSorting([{ id: 'title', desc: true }]);
    });
    expect(result.current.table.getState().sorting).toEqual([{ id: 'title', desc: true }]);

    act(() => {
      result.current.table.getColumn('title')?.toggleSorting(false);
    });
    expect(result.current.table.getState().sorting).toEqual([{ id: 'title', desc: false }]);
  });

  it('writes url updates with the configured history, shallow and scroll options', async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    const { result } = renderDataTable(
      {
        history: 'push',
        shallow: false,
        scroll: true,
        clearOnDefault: true,
        throttleMs: 100
      },
      { onUrlUpdate }
    );

    expect(result.current.shallow).toBe(false);

    act(() => {
      result.current.table.setPagination({ pageIndex: 1, pageSize: 10 });
    });

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const event = onUrlUpdate.mock.calls[0][0];
    expect(event.searchParams.get('page')).toBe('2');
    expect(event.options.history).toBe('push');
    expect(event.options.shallow).toBe(false);
    expect(event.options.scroll).toBe(true);
  });

  it('derives initial column filters from url values', () => {
    const { result } = renderDataTable(
      {},
      { searchParams: '?title=hello world&status=active,archived' }
    );

    expect(result.current.table.getState().columnFilters).toEqual([
      { id: 'title', value: ['hello', 'world'] },
      { id: 'status', value: ['active', 'archived'] }
    ]);
  });

  it('wraps a plain string filter value in an array', () => {
    const { result } = renderDataTable({}, { searchParams: '?title=hello' });

    expect(result.current.table.getState().columnFilters).toEqual([
      { id: 'title', value: ['hello'] }
    ]);
  });

  it('debounces filter changes and resets the page', async () => {
    vi.useFakeTimers();
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    const { result } = renderDataTable({}, { onUrlUpdate });

    act(() => {
      result.current.table.getColumn('title')?.setFilterValue('draft');
    });
    expect(result.current.table.getState().columnFilters).toEqual([
      { id: 'title', value: 'draft' }
    ]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(onUrlUpdate).not.toHaveBeenCalled();

    act(() => {
      result.current.table.getColumn('title')?.setFilterValue('final');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(onUrlUpdate).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(onUrlUpdate).toHaveBeenCalledTimes(1);
    const event = onUrlUpdate.mock.calls[0][0];
    expect(event.searchParams.get('title')).toBe('final');
    expect(event.searchParams.get('page')).toBe('1');
  });

  it('honors a custom debounce delay', async () => {
    vi.useFakeTimers();
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    const { result } = renderDataTable({ debounceMs: 500 }, { onUrlUpdate });

    expect(result.current.debounceMs).toBe(500);

    act(() => {
      result.current.table.getColumn('title')?.setFilterValue('slow');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(onUrlUpdate).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(onUrlUpdate).toHaveBeenCalled();
    expect(onUrlUpdate.mock.calls[0][0].searchParams.get('title')).toBe('slow');
  });

  it('accepts direct filter values and ignores non-filterable columns', async () => {
    vi.useFakeTimers();
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    const { result } = renderDataTable({}, { onUrlUpdate });

    act(() => {
      // table.setColumnFilters wraps values in an updater, so call the handler
      // directly to exercise the direct-value code path.
      result.current.table.options.onColumnFiltersChange?.([
        { id: 'title', value: 'abc' },
        { id: 'createdAt', value: 'not-filterable' }
      ]);
    });
    expect(result.current.table.getState().columnFilters).toEqual([
      { id: 'title', value: 'abc' },
      { id: 'createdAt', value: 'not-filterable' }
    ]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(onUrlUpdate).toHaveBeenCalledTimes(1);
    const event = onUrlUpdate.mock.calls[0][0];
    expect(event.searchParams.get('title')).toBe('abc');
    expect(event.searchParams.has('createdAt')).toBe(false);
  });

  it('clears removed filters from the url', async () => {
    vi.useFakeTimers();
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    const { result } = renderDataTable({}, { searchParams: '?title=hello', onUrlUpdate });

    expect(result.current.table.getState().columnFilters).toEqual([
      { id: 'title', value: ['hello'] }
    ]);

    act(() => {
      result.current.table.setColumnFilters([]);
    });
    expect(result.current.table.getState().columnFilters).toEqual([]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(onUrlUpdate).toHaveBeenCalledTimes(1);
    expect(onUrlUpdate.mock.calls[0][0].searchParams.has('title')).toBe(false);
  });

  it('disables url-driven filters when advanced filtering is enabled', async () => {
    vi.useFakeTimers();
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    const { result } = renderDataTable(
      { enableAdvancedFilter: true },
      { searchParams: '?title=hello', onUrlUpdate }
    );

    expect(result.current.table.getState().columnFilters).toEqual([]);

    act(() => {
      result.current.table.setColumnFilters([{ id: 'title', value: ['x'] }]);
    });
    expect(result.current.table.getState().columnFilters).toEqual([]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(onUrlUpdate).not.toHaveBeenCalled();
  });

  it('defaults pageCount to -1 when omitted', () => {
    const { result } = renderHook(
      () => useDataTable<TestData>({ columns, data } as unknown as DataTableProps),
      { wrapper: withNuqsTestingAdapter({}) }
    );

    expect(result.current.table.getPageCount()).toBe(-1);
  });

  it('registers a string filter parser for a filterable column without an id', () => {
    const namelessColumns: ColumnDef<TestData>[] = [
      { accessorKey: 'name', enableColumnFilter: true }
    ];
    const { result } = renderHook(
      () =>
        useDataTable<TestData>({
          columns: namelessColumns,
          data,
          pageCount: 1
        } as DataTableProps),
      { wrapper: withNuqsTestingAdapter({}) }
    );

    expect(result.current.table.getState().columnFilters).toEqual([]);
  });

  it('registers an array filter parser for an options column without an id', () => {
    const namelessOptionColumns: ColumnDef<TestData>[] = [
      {
        accessorKey: 'status',
        enableColumnFilter: true,
        meta: { options: [{ label: 'Active', value: 'active' }] }
      }
    ];
    const { result } = renderHook(
      () =>
        useDataTable<TestData>({
          columns: namelessOptionColumns,
          data,
          pageCount: 1
        } as DataTableProps),
      { wrapper: withNuqsTestingAdapter({}) }
    );

    expect(result.current.table.getState().columnFilters).toEqual([]);
  });
});
