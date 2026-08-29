// The `integrations` field is stored in Mongo as a JSON string,
// e.g. '{"crm":"no","analytics":"no"}'. These helpers convert between
// that string and the boolean flags the form works with.

export type IntegrationFlags = { crm: boolean; analytics: boolean };

export function parseIntegrations(raw: string | undefined): IntegrationFlags {
  try {
    const parsed = JSON.parse(raw ?? '{}') as Record<string, string>;
    return { crm: parsed.crm === 'yes', analytics: parsed.analytics === 'yes' };
  } catch {
    return { crm: false, analytics: false };
  }
}

export function stringifyIntegrations(flags: IntegrationFlags): string {
  return JSON.stringify({
    crm: flags.crm ? 'yes' : 'no',
    analytics: flags.analytics ? 'yes' : 'no'
  });
}
