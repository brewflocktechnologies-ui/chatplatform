'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';

const CheckIcon = Icons.check;
const CloseIcon = Icons.close;

/** "May 3, 2026", the raw text when it isn't a date, or "—" when empty. */
export function formatWebsiteDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, 'MMM d, yyyy');
}

interface BooleanBadgeProps {
  readonly value: boolean;
  readonly trueLabel: string;
  readonly falseLabel: string;
}

export function BooleanBadge({ value, trueLabel, falseLabel }: Readonly<BooleanBadgeProps>) {
  return (
    <Badge variant={value ? 'default' : 'secondary'}>
      {value ? <CheckIcon className='mr-1 h-3 w-3' /> : <CloseIcon className='mr-1 h-3 w-3' />}
      {value ? trueLabel : falseLabel}
    </Badge>
  );
}

interface WebsiteConfigLinkProps {
  readonly site: {
    id: string;
    customerId?: string | null;
    companyId?: string | null;
    configId?: string | null;
    configName?: string | null;
    flavour?: string | null;
  };
}

/** The CONFIG cell: opens the site's config in the Widget Modifier. */
export function WebsiteConfigLink({ site }: Readonly<WebsiteConfigLinkProps>) {
  const label = site.configName || site.flavour;
  const query = new URLSearchParams({
    customerId: site.customerId || site.companyId || '',
    websiteId: site.id,
    ...(site.configId && { configId: site.configId })
  });
  return (
    <Link
      href={`/dashboard/widget-modifier?${query.toString()}`}
      title='Open in Widget Modifier'
      className='inline-block'
    >
      {label ? (
        <Badge variant='outline' className='hover:bg-accent cursor-pointer'>
          {label}
        </Badge>
      ) : (
        <span className='text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline'>
          None
        </span>
      )}
    </Link>
  );
}
