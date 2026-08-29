import { queryOptions } from '@tanstack/react-query';
import { getWidgetConfig, getWidgetConfigs } from './service';
import type { WidgetConfig } from './types';

export type { WidgetConfig };

export const widgetConfigKeys = {
  all: ['widget-configs'] as const,
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
