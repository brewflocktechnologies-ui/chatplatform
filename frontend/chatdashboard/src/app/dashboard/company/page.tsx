import PageContainer from '@/components/layout/page-container';
import CompanyListing from '@/features/company/components/company-listing';
import { searchParamsCache } from '@/lib/searchparams';
import type { SearchParams } from 'nuqs/server';

export const metadata = {
  title: 'Dashboard: Company'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function CompanyPage(props: PageProps) {
  const searchParams = await props.searchParams;
  searchParamsCache.parse(searchParams);

  return (
    <PageContainer>
      <CompanyListing />
    </PageContainer>
  );
}
