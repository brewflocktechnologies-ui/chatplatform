import { queryOptions } from '@tanstack/react-query';
import { entityRoots } from '@/lib/cache/keys';
import { getWidgetConfig, getWidgetConfigs } from './service';
export type { WidgetConfig } from './types';

export const widgetConfigKeys = {
  all: entityRoots.widgetConfigs,
  list: () => [...widgetConfigKeys.all, 'list'] as const,
  detail: (id: string) => [...widgetConfigKeys.all, 'detail', id] as const
};

export const widgetConfigsQueryOptions = () =>
  queryOptions({
    queryKey: widgetConfigKeys.list(),
    queryFn: () => getWidgetConfigs()
  });

export const widgetConfigQueryOptions = (id: string) =>
  queryOptions({
    queryKey: widgetConfigKeys.detail(id),
    queryFn: () => getWidgetConfig(id)
  });
