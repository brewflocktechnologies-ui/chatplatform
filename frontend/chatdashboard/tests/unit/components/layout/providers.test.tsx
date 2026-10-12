import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

import Providers from '@/components/layout/providers';
import QueryProvider from '@/components/layout/query-provider';
import { useThemeConfig } from '@/components/themes/active-theme';
import { useMockAuth } from '@/features/auth/mock-auth';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.doUnmock('@tanstack/react-query-devtools');
});

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

function Probe() {
  const theme = useThemeConfig();
  const auth = useMockAuth();
  const client = useQueryClient();
  return (
    <div>
      <span data-testid='theme'>{theme.activeTheme}</span>
      <span data-testid='loaded'>{String(auth.isLoaded)}</span>
      <span data-testid='client'>{client ? 'client' : 'none'}</span>
    </div>
  );
}

describe('Providers', () => {
  it('wires theme, auth and query providers around children', () => {
    render(
      <Providers activeThemeValue='claude'>
        <Probe />
      </Providers>
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('claude');
    expect(screen.getByTestId('client')).toHaveTextContent('client');
    expect(screen.getByTestId('loaded')).toHaveTextContent('true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('claude');
  });
});

describe('QueryProvider', () => {
  it('renders children with a query client and no devtools outside development', () => {
    render(
      <QueryProvider>
        <Probe2 />
      </QueryProvider>
    );
    expect(screen.getByTestId('c')).toHaveTextContent('ok');
  });

  it('lazy-loads devtools in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
    vi.doMock('@tanstack/react-query-devtools', () => ({
      ReactQueryDevtools: () => <div data-testid='devtools' />
    }));
    const { default: DevQueryProvider } = await import('@/components/layout/query-provider');
    render(
      <DevQueryProvider>
        <span>child</span>
      </DevQueryProvider>
    );
    expect(screen.getByText('child')).toBeInTheDocument();
    expect(await screen.findByTestId('devtools')).toBeInTheDocument();
  });
});

function Probe2() {
  const client = useQueryClient();
  return <span data-testid='c'>{client ? 'ok' : 'none'}</span>;
}
