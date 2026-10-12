import { expect, test } from '../support/fixtures';
import { DashboardShell } from '../support/pages/dashboard-shell';

/**
 * Smaller dashboard surfaces that don't warrant their own spec: settings,
 * exclusive area, workspaces + team, icon gallery, the React Query demo,
 * 404 handling, and the legacy/alias redirects.
 */

test.describe('Settings and theme persistence', () => {
  test('theme selector changes the active theme and persists across reloads', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page.getByRole('heading', { name: 'Settings' }).first()).toBeVisible();
    await expect(page.getByText('Appearance')).toBeVisible();

    const html = page.locator('html');
    await page.locator('#theme-selector').click();
    await page.getByRole('option', { name: 'Supabase' }).click();

    await expect(html).toHaveAttribute('data-theme', 'supabase');
    await expect(page.locator('#theme-selector')).toContainText('Supabase');
    // Persisted through the `active_theme` cookie.
    await expect
      .poll(
        async () => (await page.context().cookies()).find((c) => c.name === 'active_theme')?.value
      )
      .toBe('supabase');

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'supabase');
    await expect(page.locator('#theme-selector')).toContainText('Supabase');
  });

  test('light/dark mode survives a reload and client-side navigation', async ({ page }) => {
    await page.goto('/dashboard/overview');
    const html = page.locator('html');
    const wasDark = (await html.getAttribute('class'))?.includes('dark') ?? false;

    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await (wasDark ? expect(html).not.toHaveClass(/dark/) : expect(html).toHaveClass(/dark/));

    await page.reload();
    await (wasDark ? expect(html).not.toHaveClass(/dark/) : expect(html).toHaveClass(/dark/));

    const shell = new DashboardShell(page);
    await shell.navigateTo('Customers', '/dashboard/customers');
    await (wasDark ? expect(html).not.toHaveClass(/dark/) : expect(html).toHaveClass(/dark/));
  });

  test('Ctrl+Shift+D toggles light/dark from the keyboard', async ({ page }) => {
    await page.goto('/dashboard/overview');
    const html = page.locator('html');
    const wasDark = (await html.getAttribute('class'))?.includes('dark') ?? false;

    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('Control+Shift+D');
    await (wasDark ? expect(html).not.toHaveClass(/dark/) : expect(html).toHaveClass(/dark/));
  });
});

test.describe('Exclusive area', () => {
  test('renders for any signed-in user and links to billing', async ({ page }) => {
    await page.goto('/dashboard/exclusive');
    await expect(page.getByRole('heading', { name: 'Exclusive Area' }).first()).toBeVisible();
    await expect(page.getByText('Thank You for Checking Out the Exclusive Page')).toBeVisible();

    await page.getByRole('link', { name: 'View plans' }).click();
    await page.waitForURL('**/dashboard/billing', { waitUntil: 'commit' });
  });
});

test.describe('Workspaces', () => {
  test('lists the demo workspace and the create-workspace card', async ({ page }) => {
    await page.goto('/dashboard/workspaces');
    await expect(page.getByRole('heading', { name: 'Workspaces' }).first()).toBeVisible();

    await expect(page.getByText('Demo Workspace', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Admin · 5 members')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.getByText('New Workspace', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create workspace' })).toBeVisible();
  });

  test('team page lists members with roles', async ({ page }) => {
    await page.goto('/dashboard/workspaces/team');
    await expect(page.getByRole('heading', { name: 'Team Management' }).first()).toBeVisible();
    await expect(page.getByText('Members', { exact: true })).toBeVisible();

    for (const [name, email] of [
      ['Demo User', 'demo@example.com'],
      ['Alice Smith', 'alice@example.com'],
      ['Bob Jones', 'bob@example.com']
    ]) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
      await expect(page.getByText(email, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText('Admin', { exact: true })).toBeVisible();
    await expect(page.getByText('Member', { exact: true })).toHaveCount(2);
  });
});

test.describe('Icons gallery', () => {
  test('search filters the gallery and shows an empty state', async ({ page }) => {
    await page.goto('/dashboard/elements/icons');
    const search = page.getByPlaceholder('Search icons...');
    await expect(search).toBeVisible();

    const tiles = page.locator('div.grid > div.rounded-lg.border');
    await expect(tiles.first()).toBeVisible();
    const total = await tiles.count();
    expect(total).toBeGreaterThan(20);

    await search.fill('dashboard');
    await expect(tiles.first()).toContainText(/dashboard/i);
    expect(await tiles.count()).toBeLessThan(total);

    await search.fill('zzz-no-such-icon');
    await expect(page.getByText('No icons found matching "zzz-no-such-icon"')).toBeVisible();

    await expect(page.getByRole('link', { name: /Tabler Icons/ })).toHaveAttribute(
      'href',
      'https://tabler.io/icons'
    );
  });
});

test.describe('React Query demo', () => {
  // PokeAPI is a public third-party API. Browser requests are stubbed so the
  // client-side switching is deterministic; the server-side prefetch of #25
  // either succeeds (real "pikachu") or falls back to a stubbed client fetch,
  // and both resolve to the same name.
  const POKEMON: Record<string, { name: string; types: string[] }> = {
    '25': { name: 'pikachu', types: ['electric'] },
    '1': { name: 'bulbasaur', types: ['grass', 'poison'] },
    '4': { name: 'charmander', types: ['fire'] }
  };
  const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  test.beforeEach(async ({ page }) => {
    await page.route('https://pokeapi.co/api/v2/pokemon/*', async (route) => {
      const id = new URL(route.request().url()).pathname.split('/').pop()!;
      const p = POKEMON[id] ?? { name: `pokemon-${id}`, types: ['normal'] };
      await route.fulfill({
        json: {
          id: Number(id),
          name: p.name,
          sprites: { front_shiny: PIXEL, front_default: PIXEL },
          types: p.types.map((name) => ({ type: { name } })),
          stats: [
            { base_stat: 45, stat: { name: 'hp' } },
            { base_stat: 49, stat: { name: 'attack' } }
          ],
          height: 7,
          weight: 69
        }
      });
    });
  });

  test('shows the default pokemon and switches on selection', async ({ page }) => {
    await page.goto('/dashboard/react-query');
    await expect(page.getByRole('heading', { name: 'React Query' }).first()).toBeVisible();
    await expect(page.getByText('Pick a Pokemon')).toBeVisible();
    await expect(page.locator('[data-slot="card-title"]', { hasText: /^pikachu$/i })).toBeVisible({
      timeout: 30_000
    });

    await page.getByRole('button', { name: '#1', exact: true }).click();
    await expect(page.locator('[data-slot="card-title"]', { hasText: /^bulbasaur$/i })).toBeVisible(
      { timeout: 30_000 }
    );
    await expect(page.getByText('grass', { exact: true })).toBeVisible();
    await expect(page.getByText('Data from PokeAPI')).toBeVisible();

    await page.getByRole('button', { name: '#4', exact: true }).click();
    await expect(
      page.locator('[data-slot="card-title"]', { hasText: /^charmander$/i })
    ).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('Not found and aliases', () => {
  test('unknown dashboard route renders the 404 page with a way home', async ({ page }) => {
    await page.goto('/dashboard/this-route-does-not-exist');
    await expect(page.getByText("Something's missing")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('404', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Back to Home' }).click();
    await expect(page).toHaveURL(/\/dashboard\/overview$/, { timeout: 60_000 });
  });

  test('"Go back" on the 404 page returns to the previous page', async ({ page }) => {
    await page.goto('/dashboard/overview');
    await page.goto('/dashboard/this-route-does-not-exist');
    await expect(page.getByText("Something's missing")).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Go back' }).click();
    await expect(page).toHaveURL(/\/dashboard\/overview$/);
  });

  test('unknown top-level route also renders the 404 page', async ({ page }) => {
    await page.goto('/definitely-not-a-page');
    await expect(page.getByText("Something's missing")).toBeVisible({ timeout: 60_000 });
  });
});

test.describe('Signed-out aliases and sign-up', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('/auth/sign-up renders the mock sign-in form', async ({ page }) => {
    await page.goto('/auth/sign-up');
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
    await expect(page.getByText('Demo mode — no password required')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login (Demo)' })).toBeVisible();
  });

  test('/sign-up redirects to /auth/sign-up', async ({ page }) => {
    await page.goto('/sign-up');
    await page.waitForURL('**/auth/sign-up');
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
  });

  test('/auth redirects to /auth/sign-in', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForURL('**/auth/sign-in');
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
  });

  test('signing in from the sign-up page lands on the overview', async ({ page }) => {
    await page.goto('/auth/sign-up');
    await page.getByLabel('Name').fill('Signup QA');
    await page.getByRole('button', { name: 'Login (Demo)' }).click();
    await page.waitForURL('**/dashboard/overview');
    await expect(page.getByRole('button', { name: /Signup QA/ })).toBeVisible();
  });
});
