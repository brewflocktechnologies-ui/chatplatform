/**
 * Direct access to the billing service's company endpoints, used only to
 * guarantee that rows created by an e2e run are removed afterwards, even when a
 * test fails half-way. The app itself reaches the service via server actions,
 * so the specs cannot see or mock those calls from the browser.
 */

export const BILLING_URL = (
  process.env.BILLING_API_URL ?? 'https://billing-service-iota.vercel.app'
).replace(/\/+$/, '');

const COMPANIES = `${BILLING_URL}/api/v1/companies`;

type CompanyRow = { id: number; name: string };

export async function isBillingReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${COMPANIES}?page=0&size=1&sort=name,asc`, {
      signal: AbortSignal.timeout(60_000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function listAll(): Promise<CompanyRow[]> {
  const rows: CompanyRow[] = [];
  for (let page = 0; ; page++) {
    const res = await fetch(`${COMPANIES}?page=${page}&size=100&sort=name,asc`, {
      signal: AbortSignal.timeout(60_000)
    });
    if (!res.ok) throw new Error(`company list failed: ${res.status}`);
    const body = (await res.json()) as { content: CompanyRow[]; totalPages: number };
    rows.push(...body.content);
    if (page + 1 >= body.totalPages) return rows;
  }
}

/** Deletes every company whose name starts with `prefix`. Never touches other rows. */
export async function deleteCompaniesWithPrefix(prefix: string): Promise<number> {
  if (!prefix) return 0;
  const doomed = (await listAll()).filter((c) => c.name.startsWith(prefix));
  for (const company of doomed) {
    await fetch(`${COMPANIES}/${company.id}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(60_000)
    });
  }
  return doomed.length;
}
