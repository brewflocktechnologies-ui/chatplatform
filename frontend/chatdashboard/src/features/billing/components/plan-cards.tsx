'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import { activePlansQueryOptions } from '../api/queries';

const PLAN_COUNT = 4;

type Cycle = 'monthly' | 'annual';

export function PlanCards() {
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const { data, isPending, isError, refetch } = useQuery(
    activePlansQueryOptions(PLAN_COUNT),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {data
            ? `Showing ${data.content.length} of ${data.totalElements} active plans`
            : ' '}
        </p>
        <div
          className="bg-muted inline-flex rounded-md p-1"
          role="group"
          aria-label="Billing cycle"
        >
          {(['monthly', 'annual'] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={cycle === value ? 'default' : 'ghost'}
              aria-pressed={cycle === value}
              onClick={() => setCycle(value)}
              className="capitalize"
            >
              {value}
            </Button>
          ))}
        </div>
      </div>

      {isError ? (
        <Alert variant="destructive">
          <Icons.info className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            Couldn&apos;t load plans.
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          {isPending
            ? Array.from({ length: PLAN_COUNT }, (_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))
            : data.content.map((plan) => {
                const price =
                  cycle === 'monthly'
                    ? plan.amountMonthly
                    : plan.amountAnnually;
                return (
                  <Card key={plan.id}>
                    <CardHeader>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription>
                        {plan.description ?? 'No description'}
                      </CardDescription>
                      <div className="pt-2 text-3xl font-bold">
                        {plan.freePlan ? 'Free' : `$${price.toLocaleString()}`}
                        {!plan.freePlan && (
                          <span className="text-muted-foreground text-sm font-normal">
                            /{cycle === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full" variant="outline">
                        Choose {plan.name}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
        </div>
      )}
    </div>
  );
}
