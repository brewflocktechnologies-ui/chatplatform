'use client';

import PageContainer from '@/components/layout/page-container';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icons } from '@/components/icons';
import { billingInfoContent } from '@/config/infoconfig';
import { PlanCards } from '@/features/billing/components/plan-cards';

export default function BillingPage() {
  return (
    <PageContainer
      pageTitle="Billing & Plans"
      pageDescription="Manage your subscription and usage limits (demo)"
      infoContent={billingInfoContent}
    >
      <div className="space-y-6">
        <Alert>
          <Icons.info className="h-4 w-4" />
          <AlertDescription>
            This is a demo billing page. Plans are read from the billing
            service; choosing a plan is not wired up yet.
          </AlertDescription>
        </Alert>

        <PlanCards />
      </div>
    </PageContainer>
  );
}
