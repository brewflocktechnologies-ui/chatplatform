import PageContainer from '@/components/layout/page-container';
import WebsiteListingPage from '@/features/websites/components/website-listing';
import { searchParamsCache } from '@/lib/searchparams';
import type { SearchParams } from 'nuqs/server';
import { websitesInfoContent } from '@/features/websites/info-content';
import { WebsiteFormSheetTrigger } from '@/features/websites/components/website-form-sheet';

export const metadata = {
  title: 'Dashboard: Websites'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function WebsitesPage(props: PageProps) {
  const searchParams = await props.searchParams;
  searchParamsCache.parse(searchParams);

  return (
    <PageContainer
      pageTitle='Websites'
      pageDescription='Manage websites running the chat widget, stored in MongoDB.'
      infoContent={websitesInfoContent}
      pageHeaderAction={<WebsiteFormSheetTrigger />}
    >
      <WebsiteListingPage />
    </PageContainer>
  );
}
