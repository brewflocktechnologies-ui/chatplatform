import type { SearchParams } from 'nuqs/server';
import PageContainer from '@/components/layout/page-container';
import { KeepLastGood } from '@/components/layout/keep-last-good';
import { searchParamsCache } from '@/lib/searchparams';
import { endpoints, origins } from '@/config/api-endpoints';
import { PocWebsiteFormSheetTrigger } from '@/features/poc-website/components/poc-website-form-sheet';
import { PocWebsiteTable, type PocWebsite } from './poc-website-table';

export const metadata = {
  title: 'Dashboard: POC Website'
};

// Only these are sent to the API; an unknown sort field makes it error out.
const SORT_FIELDS = ['domain', 'dateAdded'];

type PageProps = { searchParams: Promise<SearchParams> };

/** `sort` arrives from the table as a JSON array like [{"id":"domain","desc":false}]. */
function toSortParam(raw: string | null) {
  try {
    const [first] = JSON.parse(raw ?? '[]') as { id: string; desc: boolean }[];
    return first && SORT_FIELDS.includes(first.id)
      ? `${first.id},${first.desc ? 'desc' : 'asc'}`
      : undefined;
  } catch {
    return undefined;
  }
}

async function loadWebsites(page: number, size: number, sort?: string) {
  const params = new URLSearchParams({
    page: String(Math.max(0, page - 1)),
    size: String(Math.min(100, Math.max(1, size)))
  });
  if (sort) params.set('sort', sort);

  try {
    const res = await fetch(`${origins.pocWebsites()}${endpoints.pocWebsites.list}?${params}`, {
      cache: 'no-store'
    });
    if (!res.ok) return { error: `Websites API responded with ${res.status}` };
    const data: { content: PocWebsite[]; totalPages: number } = await res.json();
    return { websites: data.content, pageCount: data.totalPages };
  } catch {
    return { error: 'Websites API is unreachable' };
  }
}

export default async function PocWebsitePage(props: PageProps) {
  searchParamsCache.parse(await props.searchParams);
  const result = await loadWebsites(
    searchParamsCache.get('page'),
    searchParamsCache.get('perPage'),
    toSortParam(searchParamsCache.get('sort'))
  );

  return (
    <PageContainer
      pageTitle='POC Website'
      pageDescription='Websites registered with the billing service.'
      pageHeaderAction={<PocWebsiteFormSheetTrigger />}
    >
      {/* A failed refresh keeps the last table (and any open row form) and shows a banner. */}
      <KeepLastGood error={'error' in result ? result.error : undefined}>
        {'error' in result ? null : (
          <PocWebsiteTable websites={result.websites} pageCount={result.pageCount} />
        )}
      </KeepLastGood>
    </PageContainer>
  );
}
