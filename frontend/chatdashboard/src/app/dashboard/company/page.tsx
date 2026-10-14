import PageContainer from '@/components/layout/page-container';

export const metadata = {
  title: 'Dashboard: Company'
};

export default function CompanyPage() {
  return (
    <PageContainer
      pageTitle='Company'
      pageDescription='Manage your company details.'
    >
      <div className='text-muted-foreground text-sm'>Coming soon.</div>
    </PageContainer>
  );
}
