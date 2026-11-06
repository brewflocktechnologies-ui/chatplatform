'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icons } from '@/components/icons';

interface StatsErrorAlertProps {
  message: string;
  action: React.ReactNode;
}

// Presentational shell for overview stat error boundaries. The retry wiring lives in
// StatsErrorBoundary and is passed in via `action`.
export function StatsErrorAlert({ message, action }: Readonly<StatsErrorAlertProps>) {
  return (
    <Alert variant='destructive'>
      <Icons.alertCircle className='h-4 w-4' />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className='flex flex-col items-start gap-3'>
        <span>{message}</span>
        {action}
      </AlertDescription>
    </Alert>
  );
}
