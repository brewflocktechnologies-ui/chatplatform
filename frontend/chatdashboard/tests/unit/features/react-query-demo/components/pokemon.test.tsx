import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense } from 'react';

import { PokemonInfo } from '@/features/react-query-demo/components/pokemon-info';
import { PokemonSkeleton } from '@/features/react-query-demo/components/pokemon-skeleton';

const pokemon = (id: number, name: string) => ({
  id,
  name,
  sprites: { front_shiny: `http://img/${id}.png`, front_default: '' },
  types: [{ type: { name: 'electric' } }, { type: { name: 'flying' } }],
  stats: [
    { base_stat: 35, stat: { name: 'hp' } },
    { base_stat: 200, stat: { name: 'attack' } }
  ],
  height: 4,
  weight: 60
});

function renderInfo() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Suspense fallback={<div>loading</div>}>
        <PokemonInfo />
      </Suspense>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const id = Number(url.split('/').pop());
      return { ok: true, json: async () => pokemon(id, id === 25 ? 'pikachu' : 'bulbasaur') };
    })
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PokemonInfo', () => {
  it('renders the default pokemon with types, size and stats', async () => {
    renderInfo();

    expect(await screen.findByText('pikachu')).toBeInTheDocument();
    expect(screen.getByText('electric')).toBeInTheDocument();
    expect(screen.getByText('flying')).toBeInTheDocument();
    expect(screen.getByText(/Height: 0\.4m/)).toBeInTheDocument();
    expect(screen.getByText(/Weight: 6kg/)).toBeInTheDocument();
    expect(screen.getByAltText('pikachu')).toHaveAttribute('src', 'http://img/25.png');
    expect(screen.getByText('hp')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('https://pokeapi.co/api/v2/pokemon/25');
  });

  it('switches pokemon when a different id is picked', async () => {
    renderInfo();
    await screen.findByText('pikachu');

    fireEvent.click(screen.getByRole('button', { name: '#1' }));

    expect(await screen.findByText('bulbasaur')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('https://pokeapi.co/api/v2/pokemon/1');
  });
});

describe('PokemonSkeleton', () => {
  it('renders the selector and card placeholders', () => {
    const { container } = render(<PokemonSkeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
    expect(container.querySelectorAll('.bg-muted').length).toBeGreaterThan(20);
  });
});
