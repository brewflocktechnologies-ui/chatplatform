import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />
}));
vi.mock('@/features/products/components/product-tables/cell-action', () => ({
  CellAction: ({ data }: { data: { id: number } }) => <div data-testid='cell-action'>{data.id}</div>
}));
vi.mock('@/components/ui/table/data-table-column-header', () => ({
  DataTableColumnHeader: ({ title }: { title: string }) => <span>{title}</span>
}));

import { columns } from '@/features/products/components/product-tables/columns';
import { CATEGORY_OPTIONS } from '@/features/products/components/product-tables/options';
import type { Product } from '@/features/products/api/types';

afterEach(cleanup);

const row: Product = {
  id: 7,
  name: 'Lamp',
  category: 'active',
  price: 12.5,
  description: 'A lamp',
  photo_url: 'http://x/img.png',
  created_at: '',
  updated_at: ''
};

const col = (key: string) =>
  columns.find((c) => c.id === key || (c as { accessorKey?: string }).accessorKey === key)!;

function renderCell(key: string, data: Product = row) {
  const c = col(key) as ColumnDef<Product> & { accessorKey: keyof Product };
  const node = (c.cell as (ctx: unknown) => React.ReactNode)({
    row: { original: data, getValue: (k: keyof Product) => data[k] },
    cell: { getValue: () => data[c.accessorKey] }
  });
  return render(<>{node}</>);
}

function renderHeader(key: string) {
  const header = col(key).header as unknown;
  if (typeof header === 'string') return render(<>{header}</>);
  return render(<>{(header as (ctx: unknown) => React.ReactNode)({ column: {} })}</>);
}

describe('products columns', () => {
  it.each([
    ['photo_url', 'IMAGE'],
    ['name', 'Name'],
    ['category', 'Category'],
    ['price', 'PRICE'],
    ['description', 'DESCRIPTION'],
    ['actions', 'ACTIONS']
  ])('renders the %s header', (key, text) => {
    renderHeader(key);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('renders the product image with the name as alt text', () => {
    renderCell('photo_url');
    expect(screen.getByRole('img')).toHaveAttribute('src', 'http://x/img.png');
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Lamp');
  });

  it('renders the name cell', () => {
    renderCell('name');
    expect(screen.getByText('Lamp')).toBeInTheDocument();
  });

  it('renders the category badge for active and other categories', () => {
    renderCell('category');
    expect(screen.getByText('active')).toBeInTheDocument();
    cleanup();
    renderCell('category', { ...row, category: 'Toys' });
    expect(screen.getByText('Toys')).toBeInTheDocument();
  });

  it('renders the row actions', () => {
    renderCell('actions');
    expect(screen.getByTestId('cell-action')).toHaveTextContent('7');
  });

  it('exposes the category filter options', () => {
    expect(CATEGORY_OPTIONS.map((o) => o.value)).toContain('Electronics');
  });
});
