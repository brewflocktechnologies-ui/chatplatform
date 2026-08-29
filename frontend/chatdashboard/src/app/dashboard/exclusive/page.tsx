'use client';

import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import Link from 'next/link';

export default function ExclusivePage() {
  return (
    <PageContainer pageTitle='Exclusive Area'>
      <div className='space-y-6'>
        <div>
          <h1 className='flex items-center gap-2 text-3xl font-bold tracking-tight'>
            <Icons.badgeCheck className='h-7 w-7 text-green-600' />
            Exclusive Area
          </h1>
          <p className='text-muted-foreground'>
            Welcome to the exclusive area. This page is shown to every signed-in demo user.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Thank You for Checking Out the Exclusive Page</CardTitle>
            <CardDescription>
              In the original template this was gated behind the Pro plan. In demo mode it is
              always available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='text-lg'>
              Have a wonderful day!{' '}
              <Link className='underline' href='/dashboard/billing'>
                View plans
              </Link>
              .
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
