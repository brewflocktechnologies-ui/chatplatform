'use client';

import { StatsErrorBoundary } from '@/features/overview/components/stats-error-boundary';

export default function PieStatsError({
  error,
  reset
}: Readonly<{ error: Error; reset: () => void }>) {
  return <StatsErrorBoundary error={error} reset={reset} subject='pie statistics' />;
}
