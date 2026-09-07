import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pokemonOptions } from '@/features/react-query-demo/api/queries';
import type { Pokemon } from '@/features/react-query-demo/api/queries';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const pikachu: Pokemon = {
  id: 25,
  name: 'pikachu',
  sprites: { front_shiny: 'shiny.png', front_default: 'default.png' },
  types: [{ type: { name: 'electric' } }],
  stats: [{ base_stat: 35, stat: { name: 'hp' } }],
  height: 4,
  weight: 60
};

describe('pokemonOptions', () => {
  it('defaults the query key to pokemon id 25', () => {
    expect(pokemonOptions().queryKey).toEqual(['pokemon', 25]);
  });

  it('builds the query key from an explicit id', () => {
    expect(pokemonOptions(1).queryKey).toEqual(['pokemon', 1]);
  });

  it('fetches and returns the pokemon on success', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(pikachu)
    });

    const options = pokemonOptions();
    const result = await (options.queryFn as () => Promise<Pokemon>)();

    expect(fetchMock).toHaveBeenCalledWith('https://pokeapi.co/api/v2/pokemon/25');
    expect(result).toEqual(pikachu);
  });

  it('fetches the endpoint for an explicit id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ...pikachu, id: 1, name: 'bulbasaur' })
    });

    const options = pokemonOptions(1);
    await (options.queryFn as () => Promise<Pokemon>)();

    expect(fetchMock).toHaveBeenCalledWith('https://pokeapi.co/api/v2/pokemon/1');
  });

  it('throws when the response is not ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: vi.fn() });

    const options = pokemonOptions(9999);
    await expect((options.queryFn as () => Promise<Pokemon>)()).rejects.toThrow(
      'Failed to fetch pokemon'
    );
  });

  it('propagates network errors', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    const options = pokemonOptions();
    await expect((options.queryFn as () => Promise<Pokemon>)()).rejects.toThrow('network down');
  });
});
