import type { SearchParams } from 'nuqs/server';
import PageContainer from '@/components/layout/page-container';
import { searchParamsCache } from '@/lib/searchparams';
import { loadConfigs } from '@/features/poc-config/api/queries';
import { PocConfigFormSheetTrigger } from '@/features/poc-config/components/poc-config-form-sheet';
import { PocConfigTable } from './poc-config-table';

export const metadata = {
  title: 'Dashboard: POC Config'
};

type PageProps = { searchParams: Promise<SearchParams> };

/** `sort` arrives from the table as a JSON array like [{"id":"configName","desc":false}]. */
function toSort(raw: string | null) {
  try {
    const [first] = JSON.parse(raw ?? '[]') as { id: string; desc: boolean }[];
    return first
      ? {
          field: first.id,
          dir: first.desc ? ('desc' as const) : ('asc' as const)
        }
      : undefined;
  } catch {
    return undefined;
  }
}

export default async function PocConfigPage(props: PageProps) {
  searchParamsCache.parse(await props.searchParams);
  const result = await loadConfigs(
    searchParamsCache.get('page'),
    searchParamsCache.get('perPage'),
    toSort(searchParamsCache.get('sort'))
  );

  return (
    <PageContainer
      pageTitle='POC Config'
      pageDescription='Widget configs registered with the billing service.'
      pageHeaderAction={<PocConfigFormSheetTrigger />}
    >
      {'error' in result ? (
        <div className='text-destructive rounded-lg border p-6 text-sm'>{result.error}</div>
      ) : (
        <PocConfigTable configs={result.configs} pageCount={result.pageCount} />
      )}
    </PageContainer>
  );
}
