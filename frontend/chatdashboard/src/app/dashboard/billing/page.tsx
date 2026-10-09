import PageContainer from '@/components/layout/page-container';
import { billingInfoContent } from '@/config/infoconfig';
import PlanListing from '@/features/billing/components/plan-listing';
import { PlanFormSheetTrigger } from '@/features/billing/components/plan-form-sheet';

export const metadata = {
  title: 'Dashboard: Billing'
};

export default function BillingPage() {
  return (
    <PageContainer
      pageTitle='Billing & Plans'
      pageDescription='Create, price and manage subscription plans'
      infoContent={billingInfoContent}
      pageHeaderAction={<PlanFormSheetTrigger />}
    >
      <PlanListing />
    </PageContainer>
  );
}
