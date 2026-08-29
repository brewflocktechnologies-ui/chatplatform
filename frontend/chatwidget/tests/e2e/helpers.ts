import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CLIENTS_DIR = fileURLToPath(new URL('../../public/clients/', import.meta.url));

/**
 * Shared e2e helpers. These drive the widget ONLY through the public
 * integration surface: a <script src="dist/chat-widget.js" data-client-id>
 * tag plus the fetched client JSON. No injectStoreConfig, no getDebugInfo,
 * no root-property pokes.
 */

const HARNESS_PAGE = '/tests/e2e/harness/host.html';

export interface BootOptions {
  /** data-client-id to pass to the widget script tag. Default 'amber'. */
  client?: string;
  /** Fulfil the fetched client JSON with this object instead of the real file. */
  config?: Record<string, unknown>;
  /** Fulfil the fetch with this JSON body verbatim (e.g. malformed input). */
  configBody?: string;
  /** Fulfil the fetch with this HTTP status (e.g. 404). */
  configStatus?: number;
  /** Stall the fetch for this many ms before responding. */
  configDelayMs?: number;
  /** Load the host page with the .dark class on <html> (dark host theme). */
  dark?: boolean;
}

export function loadClientConfig(id: string): Record<string, unknown> {
  return JSON.parse(readFileSync(`${CLIENTS_DIR}${id}.json`, 'utf8')) as Record<string, unknown>;
}

/**
 * Navigates to the harness page and waits for exactly one widget root to mount.
 * When `config`/`configBody`/`configStatus` are given the client config fetch is
 * intercepted, so the whole getClientId -> fetchClientConfig -> mount pipeline
 * still runs against the routed payload.
 */
export async function bootWidget(page: Page, options: BootOptions = {}): Promise<void> {
  const client = options.client ?? 'amber';

  if (options.config !== undefined || options.configBody !== undefined || options.configStatus !== undefined) {
    await page.route(`**/public/clients/${client}.json`, async (route) => {
      if (options.configDelayMs) {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, options.configDelayMs));
      }
      if (options.configBody !== undefined) {
        return route.fulfill({
          status: options.configStatus ?? 200,
          contentType: 'application/json',
          body: options.configBody,
        });
      }
      return route.fulfill({
        status: options.configStatus ?? 200,
        contentType: 'application/json',
        body: options.config === undefined ? '{}' : JSON.stringify(options.config),
      });
    });
  }

  await page.goto(`${HARNESS_PAGE}?client=${client}${options.dark ? '&dark=1' : ''}`);
  await expect(page.locator('cw-widget-root')).toHaveCount(1, { timeout: 20_000 });
}

/**
 * Waits for the trigger surface the client actually uses (bubble or chatbar)
 * and opens the panel the same way a visitor would: by clicking it.
 */
export async function openWidget(page: Page): Promise<void> {
  const bubble = page.locator('.bubble-wrapper');
  const chatbar = page.locator('.chatbar-wrapper');

  await expect(bubble.or(chatbar).first()).toBeVisible({ timeout: 20_000 });
  const isBubble = (await bubble.count()) > 0;
  await (isBubble ? bubble.click() : chatbar.click());
  await expect(page.locator('.zotly-widget-panel-wrapper')).toBeVisible();
}

/** Convenience locators used across specs. */
export const locators = {
  root: 'cw-widget-root',
  panel: '.zotly-widget-panel-wrapper',
  dialog: '.panel',
  headerTitle: '.panel-header .title-text',
  visitorBubble: '.bubble-row.from-visitor .bubble',
  agentBubble: '.bubble-row.from-agent .bubble',
  composer: 'cw-composer textarea',
  prechatName: 'cw-chat-form input[placeholder="John Doe"]',
  prechatEmail: 'cw-chat-form input[placeholder="john@example.com"]',
};

/**
 * Clicks the welcome card CTA. The header is hidden on the welcome screen
 * (by design), so callers reach the header brand by starting the chat first.
 */
export async function startConversation(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: 'Start Conversation' })).toBeVisible();
  await page.getByRole('button', { name: 'Start Conversation' }).click();
}