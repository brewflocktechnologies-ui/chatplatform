'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { DEFAULT_PLAN_FILTERS, PLAN_PAGE_SIZE, plansQueryOptions } from '../api/queries';
import type { Plan, PlanStatusFilter } from '../api/types';
import { PlanFormSheet } from './plan-form-sheet';
import { PlanActiveSwitch, PlanDeleteModal, PlanRowActions } from './plan-row-actions';

const FILTERS: { value: PlanStatusFilter; label: string }[] = [
  { value: 'all', label: 'All plans' },
  { value: 'active', label: 'Active only' }
];

const money = (n: number) => `$${n.toLocaleString()}`;

/** Percent saved by paying annually vs. twelve monthly payments. */
function annualSavings(plan: Plan) {
  const yearly = plan.amountMonthly * 12;
  if (plan.freePlan || yearly <= 0) return null;
  const pct = Math.round((1 - plan.amountAnnually / yearly) * 100);
  return pct > 0 ? pct : null;
}

function StatTile({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className='gap-2 py-4'>
      <CardHeader className='flex flex-row items-center justify-between gap-2 px-4'>
        <CardTitle className='text-muted-foreground text-sm font-medium'>{label}</CardTitle>
        <Icon className='text-muted-foreground h-4 w-4' />
      </CardHeader>
      <CardContent className='px-4'>
        <div className='text-2xl font-semibold tabular-nums'>{value}</div>
      </CardContent>
    </Card>
  );
}

export function PlanAdmin() {
  const [page, setPage] = useState(DEFAULT_PLAN_FILTERS.page);
  const [status, setStatus] = useState<PlanStatusFilter>(DEFAULT_PLAN_FILTERS.status);
  // Edit/delete targets are snapshots taken on click. The nonce remounts the form
  // per open so it starts from fresh data and a refetch can't reset it mid-edit.
  const [edit, setEdit] = useState<{ plan: Plan; nonce: number } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isPending, isError, isFetching, refetch } = useQuery(
    plansQueryOptions({ page, size: PLAN_PAGE_SIZE, status })
  );

  const plans = data?.content ?? [];
  const paid = plans.filter((p) => !p.freePlan);
  const avgMonthly = paid.length
    ? Math.round(paid.reduce((s, p) => s + p.amountMonthly, 0) / paid.length)
    : 0;
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
        <StatTile
          label={status === 'active' ? 'Active plans' : 'Total plans'}
          value={data ? data.totalElements.toLocaleString() : '—'}
          icon={Icons.billing}
        />
        <StatTile
          label='Active on this page'
          value={data ? String(plans.filter((p) => p.active).length) : '—'}
          icon={Icons.circleCheck}
        />
        <StatTile
          label='Free on this page'
          value={data ? String(plans.filter((p) => p.freePlan).length) : '—'}
          icon={Icons.sparkles}
        />
        <StatTile
          label='Avg. monthly (paid)'
          value={data ? money(avgMonthly) : '—'}
          icon={Icons.trendingUp}
        />
      </div>

      <Card className='gap-0 py-0'>
        <div className='flex flex-wrap items-center justify-between gap-2 border-b p-3'>
          <div
            className='bg-muted inline-flex rounded-md p-1'
            role='group'
            aria-label='Plan status filter'
          >
            {FILTERS.map((f) => (
              <Button
                key={f.value}
                size='sm'
                variant={status === f.value ? 'default' : 'ghost'}
                aria-pressed={status === f.value}
                onClick={() => {
                  setStatus(f.value);
                  setPage(0);
                }}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <Button size='sm' variant='ghost' onClick={() => refetch()} disabled={isFetching}>
            <Icons.refresh className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {isError ? (
          <Alert variant='destructive' className='m-3 w-auto'>
            <Icons.info className='h-4 w-4' />
            <AlertDescription className='flex items-center justify-between gap-4'>
              Couldn&apos;t load plans.
              <Button size='sm' variant='outline' onClick={() => refetch()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead className='text-right'>Monthly</TableHead>
                <TableHead className='text-right'>Annual</TableHead>
                <TableHead>Annual saving</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className='w-10' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className='h-8 w-full' />
                    </TableCell>
                  </TableRow>
                ))
              ) : plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className='text-muted-foreground h-24 text-center'>
                    No plans found.
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => {
                  const saving = annualSavings(plan);
                  return (
                    <TableRow key={plan.id}>
                      <TableCell className='max-w-72'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <span className='truncate font-medium'>{plan.name}</span>
                          {plan.freePlan && <Badge variant='secondary'>Free</Badge>}
                          {plan.defaultPlan && <Badge variant='outline'>Default</Badge>}
                          {plan.custom && <Badge variant='outline'>Custom</Badge>}
                        </div>
                        <p className='text-muted-foreground truncate text-xs'>
                          {plan.description ?? `ID ${plan.id}`}
                        </p>
                      </TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {plan.freePlan ? '—' : money(plan.amountMonthly)}
                      </TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {plan.freePlan ? '—' : money(plan.amountAnnually)}
                      </TableCell>
                      <TableCell>
                        {saving ? (
                          <Badge variant='secondary'>Save {saving}%</Badge>
                        ) : (
                          <span className='text-muted-foreground'>—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <PlanActiveSwitch plan={plan} />
                      </TableCell>
                      <TableCell>
                        <PlanRowActions
                          plan={plan}
                          onEdit={(p) => {
                            setEdit({ plan: p, nonce: Date.now() });
                            setEditOpen(true);
                          }}
                          onDelete={(p) => {
                            setDeleteTarget(p);
                            setDeleteOpen(true);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}

        <div className='flex items-center justify-between border-t p-3'>
          <p className='text-muted-foreground text-sm'>
            {totalPages > 0 ? `Page ${page + 1} of ${totalPages.toLocaleString()}` : ' '}
          </p>
          <div className='flex gap-2'>
            <Button
              size='sm'
              variant='outline'
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              aria-label='Previous page'
            >
              <Icons.chevronLeft className='h-4 w-4' />
            </Button>
            <Button
              size='sm'
              variant='outline'
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label='Next page'
            >
              <Icons.chevronRight className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </Card>

      {edit && (
        <PlanFormSheet
          key={edit.nonce}
          plan={edit.plan}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
      <PlanDeleteModal plan={deleteTarget} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}
