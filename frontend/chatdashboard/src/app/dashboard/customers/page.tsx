import PageContainer from '@/components/layout/page-container';
import CustomerListingPage from '@/features/customers/components/customer-listing';
import { searchParamsCache } from '@/lib/searchparams';
import type { SearchParams } from 'nuqs/server';
import { customersInfoContent } from '@/features/customers/info-content';
import { CustomerFormSheetTrigger } from '@/features/customers/components/customer-form-sheet';

export const metadata = {
  title: 'Dashboard: Customers'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function CustomersPage(props: PageProps) {
  const searchParams = await props.searchParams;
  searchParamsCache.parse(searchParams);

  return (
    <PageContainer
      infoContent={customersInfoContent}
    >
      <CustomerListingPage />
    </PageContainer>
  );
}
