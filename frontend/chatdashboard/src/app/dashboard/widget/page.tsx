import PageContainer from '@/components/layout/page-container';
import { KeepLastGood } from '@/components/layout/keep-last-good';
import { endpoints } from '@/config/api-endpoints';
import { billingGet, pageParams, type PageResponse } from '@/lib/billing/client';
import type { PocWidget } from '@/features/poc-widget/api/types';
import { PocWidgetCellAction } from '@/features/poc-widget/components/poc-widget-cell-action';
import { PocWidgetFormSheetTrigger } from '@/features/poc-widget/components/poc-widget-form-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

export const metadata = {
  title: 'Dashboard: Widget'
};

// Keys shown as table columns; everything else goes into the config popup.
const TABLE_KEYS = [
  'id',
  'companyId',
  'assistantId',
  'widgetName',
  'websiteUrl',
  'isActive',
  'totalImpressions',
  'totalConversationsInitiated',
  'lastActivityDate'
];

const fmt = (v: unknown) => (v ? new Date(String(v)).toLocaleString() : '—');

async function loadWidgets() {
  try {
    const page = await billingGet<PageResponse<PocWidget>>(endpoints.pocWidgets.list, pageParams(0, 100));
    return { widgets: page.content };
  } catch {
    return { error: 'Widgets API is unreachable' };
  }
}

export default async function WidgetPage() {
  const result = await loadWidgets();

  return (
    <PageContainer
      pageTitle='Widget'
      pageDescription='Chat widgets and their configuration.'
      pageHeaderAction={<PocWidgetFormSheetTrigger />}
    >
      {/* A failed refresh keeps the last table (and any open row form) and shows a banner. */}
      <KeepLastGood error={'error' in result ? result.error : undefined}>
        {'error' in result ? null : (
          <div className='rounded-lg border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Company ID</TableHead>
                  <TableHead>Assistant ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Impressions</TableHead>
                  <TableHead>Conversations</TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead className='text-right'>Config</TableHead>
                  <TableHead className='w-12' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.widgets.map((widget) => {
                  const config = Object.entries(widget).filter(([key]) => !TABLE_KEYS.includes(key));
                  return (
                    <TableRow key={widget.id}>
                      <TableCell>{widget.id}</TableCell>
                      <TableCell>{widget.companyId}</TableCell>
                      <TableCell>{widget.assistantId}</TableCell>
                      <TableCell className='font-medium'>{widget.widgetName}</TableCell>
                      <TableCell>{widget.websiteUrl}</TableCell>
                      <TableCell>
                        <Badge variant={widget.isActive ? 'default' : 'secondary'}>
                          {widget.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{widget.totalImpressions}</TableCell>
                      <TableCell>{widget.totalConversationsInitiated}</TableCell>
                      <TableCell>{fmt(widget.lastActivityDate)}</TableCell>
                      <TableCell className='text-right'>
                        <Dialog>
                          <DialogTrigger render={<Button variant='outline' size='sm' />}>
                            View config
                          </DialogTrigger>
                          <DialogContent className='sm:max-w-lg'>
                            <DialogHeader>
                              <DialogTitle>{widget.widgetName} config</DialogTitle>
                              <DialogDescription>
                                Widget appearance and behaviour settings.
                              </DialogDescription>
                            </DialogHeader>
                            <div className='max-h-[60vh] overflow-y-auto rounded-lg border'>
                              {config.map(([key, value]) => (
                                <div
                                  key={key}
                                  className='flex gap-4 border-b px-4 py-2 last:border-b-0'
                                >
                                  <span className='text-muted-foreground w-48 shrink-0 font-mono text-sm'>
                                    {key}
                                  </span>
                                  <span className='flex items-center gap-2 break-words'>
                                    {key.toLowerCase().includes('color') && (
                                      <span
                                        className='inline-block size-4 rounded border'
                                        style={{ background: String(value) }}
                                      />
                                    )}
                                    {value === null ? '—' : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                      <TableCell>
                        <PocWidgetCellAction data={widget} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </KeepLastGood>
    </PageContainer>
  );
}
