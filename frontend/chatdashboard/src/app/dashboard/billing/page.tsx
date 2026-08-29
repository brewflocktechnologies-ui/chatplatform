'use client';

import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { billingInfoContent } from '@/config/infoconfig';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    description: 'For trying things out.',
    features: ['1 workspace', 'Up to 5 members', 'Community support']
  },
  {
    name: 'Pro',
    price: '$29',
    description: 'For growing teams.',
    features: ['Unlimited workspaces', 'Unlimited members', 'Priority support', 'Exclusive area access'],
    highlighted: true
  },
  {
    name: 'Team',
    price: '$99',
    description: 'For larger organizations.',
    features: ['Everything in Pro', 'SSO', 'Audit logs', 'Dedicated manager']
  }
];

export default function BillingPage() {
  return (
    <PageContainer
      pageTitle='Billing & Plans'
      pageDescription='Manage your subscription and usage limits (demo)'
      infoContent={billingInfoContent}
    >
      <div className='space-y-6'>
        <Alert>
          <Icons.info className='h-4 w-4' />
          <AlertDescription>
            This is a demo billing page. Plan management is not connected to a real provider.
          </AlertDescription>
        </Alert>

        <div className='grid gap-4 md:grid-cols-3'>
          {PLANS.map((plan) => (
            <Card key={plan.name} className={plan.highlighted ? 'border-primary' : ''}>
              <CardHeader>
                <CardTitle className='flex items-center justify-between'>
                  {plan.name}
                  {plan.highlighted && (
                    <span className='text-xs font-normal text-primary'>Popular</span>
                  )}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className='pt-2 text-3xl font-bold'>
                  {plan.price}
                  <span className='text-muted-foreground text-sm font-normal'>/mo</span>
                </div>
              </CardHeader>
              <CardContent className='space-y-4'>
                <ul className='space-y-2 text-sm'>
                  {plan.features.map((feature) => (
                    <li key={feature} className='flex items-center gap-2'>
                      <Icons.check className='text-primary size-4' />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className='w-full' variant={plan.highlighted ? 'default' : 'outline'}>
                  Choose {plan.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
