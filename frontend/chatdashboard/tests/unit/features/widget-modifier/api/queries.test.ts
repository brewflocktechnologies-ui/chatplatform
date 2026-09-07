import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/widget-modifier/api/service', () => ({
  getWidgetConfigs: vi.fn(),
  getWidgetConfig: vi.fn()
}));

import { getWidgetConfigs, getWidgetConfig } from '@/features/widget-modifier/api/service';
import {
  widgetConfigKeys,
  widgetConfigsQueryOptions,
  widgetConfigQueryOptions
} from '@/features/widget-modifier/api/queries';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('widgetConfigKeys', () => {
  it('exposes a stable root key', () => {
    expect(widgetConfigKeys.all).toEqual(['widget-configs']);
  });

  it('builds the list key', () => {
    expect(widgetConfigKeys.list()).toEqual(['widget-configs', 'list']);
  });

  it('builds detail keys from an id', () => {
    expect(widgetConfigKeys.detail('cfg-1')).toEqual(['widget-configs', 'detail', 'cfg-1']);
  });
});

describe('widgetConfigsQueryOptions', () => {
  it('uses the list key and delegates to getWidgetConfigs', async () => {
    const response = { success: true, configs: [] };
    vi.mocked(getWidgetConfigs).mockResolvedValue(response as never);

    const options = widgetConfigsQueryOptions();
    expect(options.queryKey).toEqual(widgetConfigKeys.list());

    const result = await (options.queryFn as () => unknown)();
    expect(getWidgetConfigs).toHaveBeenCalledWith();
    expect(result).toBe(response);
  });
});

describe('widgetConfigQueryOptions', () => {
  it('uses the detail key and delegates to getWidgetConfig', async () => {
    const config = { id: 'cfg-1', name: 'Alpha', configName: 'Alpha', cdnConfig: {} };
    vi.mocked(getWidgetConfig).mockResolvedValue(config as never);

    const options = widgetConfigQueryOptions('cfg-1');
    expect(options.queryKey).toEqual(widgetConfigKeys.detail('cfg-1'));

    const result = await (options.queryFn as () => unknown)();
    expect(getWidgetConfig).toHaveBeenCalledWith('cfg-1');
    expect(result).toBe(config);
  });
});
