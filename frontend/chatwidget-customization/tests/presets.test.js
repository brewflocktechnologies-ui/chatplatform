import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PRESET_DIR = join(here, '..', 'public', 'clients');
const WIDGET_PRESET_DIR = join(here, '..', '..', 'chatwidget', 'public', 'clients');

beforeAll(async () => {
  await import('../src/core.js');
});

const presets = readdirSync(PRESET_DIR).filter(f => f.endsWith('.json'));

describe('bundled client presets', () => {
  it('ship at least the five known client presets', () => {
    for (const name of ['default', 'amber', 'emerald', 'google', 'phonepe']) {
      expect(presets).toContain(`${name}.json`);
    }
  });

  for (const file of presets) {
    describe(file, () => {
      const raw = readFileSync(join(PRESET_DIR, file), 'utf8');

      it('is valid JSON with a matching clientId', () => {
        const cfg = JSON.parse(raw);
        expect(typeof cfg.clientId).toBe('string');
        expect(cfg.clientId.length).toBeGreaterThan(0);
      });

      it('passes the same structural validation applied to host/editor input', () => {
        const res = globalThis.CWCore.validateWidgetConfig(JSON.parse(raw));
        expect(res.errors).toEqual([]);
        expect(res.ok).toBe(true);
      });

      it('survives a save round-trip (unwrap of a cdnConfig envelope is lossless)', () => {
        const cfg = JSON.parse(raw);
        const unwrapped = globalThis.CWCore.unwrapCdnConfig({ cdnConfig: cfg });
        expect(unwrapped).toEqual(cfg);
      });
    });
  }

  // The same presets are duplicated in chatwidget/public/clients
  // (the copy the deployed widget actually fetches). Until the duplication is
  // removed, this guards against silent drift between the two copies.
  it('stays in sync with the widget library copy of each preset', () => {
    if (!existsSync(WIDGET_PRESET_DIR)) return; // standalone checkout
    for (const file of presets) {
      const widgetCopy = join(WIDGET_PRESET_DIR, file);
      if (!existsSync(widgetCopy)) continue;
      const a = JSON.parse(readFileSync(join(PRESET_DIR, file), 'utf8'));
      const b = JSON.parse(readFileSync(widgetCopy, 'utf8'));
      expect(a, `${file} differs between chatwidget_customization and chatwidget`).toEqual(b);
    }
  });
});
