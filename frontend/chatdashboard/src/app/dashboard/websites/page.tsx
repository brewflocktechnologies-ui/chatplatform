import PageContainer from '@/components/layout/page-container';
import WebsiteListingPage from '@/features/websites/components/website-listing';
import { searchParamsCache } from '@/lib/searchparams';
import type { SearchParams } from 'nuqs/server';
import { websitesInfoContent } from '@/features/websites/info-content';

export const metadata = {
  title: 'Dashboard: Websites'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function WebsitesPage(props: Readonly<PageProps>) {
  const searchParams = await props.searchParams;
  searchParamsCache.parse(searchParams);

  return (
    <PageContainer infoContent={websitesInfoContent}>
      <WebsiteListingPage />
    </PageContainer>
  );
}
