import PageContainer from '@/components/layout/page-container';
import CustomerListingPage from '@/features/customers/components/customer-listing';
import { searchParamsCache } from '@/lib/searchparams';
import type { SearchParams } from 'nuqs/server';
import { customersInfoContent } from '@/features/customers/info-content';

export const metadata = {
  title: 'Dashboard: Customers'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function CustomersPage(props: Readonly<PageProps>) {
  const searchParams = await props.searchParams;
  searchParamsCache.parse(searchParams);

  return (
    <PageContainer infoContent={customersInfoContent}>
      <CustomerListingPage />
    </PageContainer>
  );
}
