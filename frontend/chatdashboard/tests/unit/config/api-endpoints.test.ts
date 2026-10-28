import { afterEach, describe, expect, it, vi } from 'vitest';
import { chatSocketUrl, endpoints, origins } from '@/config/api-endpoints';

afterEach(() => vi.unstubAllEnvs());

describe('origins', () => {
  it('uses BILLING_API_URL and trims trailing slashes', () => {
    vi.stubEnv('BILLING_API_URL', 'https://billing.example.test//');
    expect(origins.billing()).toBe('https://billing.example.test');
  });

  it('falls back to a dev deployment outside production', () => {
    vi.stubEnv('BILLING_API_URL', '');
    vi.stubEnv('NODE_ENV', 'development');
    expect(origins.billing()).toBe('https://billing-service-eta.vercel.app');
  });

  it('refuses to guess the billing origin in production', () => {
    vi.stubEnv('BILLING_API_URL', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => origins.billing()).toThrow('BILLING_API_URL is not set');
  });

  it('lets the customers and website origins be overridden', () => {
    expect(origins.customers()).toBe('https://billing-service-iota.vercel.app');
    vi.stubEnv('CUSTOMERS_API_URL', 'https://customers.test');
    vi.stubEnv('POC_WEBSITES_API_URL', 'https://websites.test');
    expect(origins.customers()).toBe('https://customers.test');
    expect(origins.pocWebsites()).toBe('https://websites.test');
  });
});

describe('endpoints', () => {
  it('truncates numeric ids and encodes opaque ones', () => {
    expect(endpoints.plans.item(7.9)).toBe('/api/plans/7');
    expect(endpoints.companies.item(3)).toBe('/api/v1/companies/3');
    expect(endpoints.pocWidgets.item(2)).toBe('/api/chat-assistant/widgets/2');
    expect(endpoints.pocWebsites.item('a/b?c')).toBe('/api/v1/websites/a%2Fb%3Fc');
    expect(endpoints.pocConfigs.item('x y')).toBe('/api/v1/widget-configs/x%20y');
  });
});

describe('chatSocketUrl', () => {
  it('prefers NEXT_PUBLIC_CHAT_WS_URL', () => {
    expect(chatSocketUrl()).toBe('ws://localhost:8000/connection/websocket');
    vi.stubEnv('NEXT_PUBLIC_CHAT_WS_URL', 'wss://chat.test');
    expect(chatSocketUrl()).toBe('wss://chat.test');
  });
});
