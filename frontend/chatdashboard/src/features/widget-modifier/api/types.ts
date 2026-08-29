export type WidgetConfig = {
  id: string;
  name: string;
  configName: string;
  cdnConfig: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type WidgetConfigsResponse = {
  success: boolean;
  time: string;
  message: string;
  configs: WidgetConfig[];
};
