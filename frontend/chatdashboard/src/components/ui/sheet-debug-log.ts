'use client';

/**
 * TEMPORARY, development only: logs every form (Sheet) open and close with its reason, to catch
 * forms that close or reopen on their own. Remove once the cause is found.
 *
 * Logs go to the browser console under `[form]` and to `window.formDebugLog` (last 200 entries).
 * Each entry notes the last click or key press before it. Entries that nobody prompted (no input
 * in the previous 1.5s) and "UNMOUNTED while open" (the component holding the form was removed,
 * e.g. a table row re-rendered away, a page refresh, or an error box replacing the table) are
 * logged as warnings, so `console` filtered to warnings shows only the suspicious ones.
 */

import * as React from 'react';
import type { Dialog as SheetPrimitive } from '@base-ui/react/dialog';

type OnOpenChange = SheetPrimitive.Root.Props['onOpenChange'];
type ChangeDetails = Parameters<NonNullable<OnOpenChange>>[1];

type FormLogEntry = {
  at: string;
  sheet: number;
  title: string;
  event: string;
  reason?: string;
  target?: string;
  openForMs?: number;
  /** The last click or key press before this entry, e.g. `button "Cancel" 40ms before`. */
  lastInput?: string;
  path: string;
  visibility: DocumentVisibilityState;
};

declare global {
  interface Window {
    formDebugLog?: FormLogEntry[];
  }
}

const MAX_ENTRIES = 200;
/** A close more than this long after the last click or key press is treated as unprompted. */
const PROMPTED_WINDOW_MS = 1500;
let sheetSeq = 0;

let lastInput: { label: string; at: number } | null = null;
let trackingInput = false;
function trackInput() {
  if (trackingInput || typeof document === 'undefined') return;
  trackingInput = true;
  const remember = (event: Event) => {
    const what = event.type === 'keydown' ? `key ${(event as KeyboardEvent).key} on ` : '';
    lastInput = { label: what + (describeTarget(event.target) ?? 'page'), at: performance.now() };
  };
  document.addEventListener('pointerdown', remember, true);
  document.addEventListener('keydown', remember, true);
}

function describeLastInput() {
  if (!lastInput) return { text: 'none yet', ms: Infinity };
  const ms = Math.round(performance.now() - lastInput.at);
  return { text: `${lastInput.label} ${ms}ms before`, ms };
}

function describeTarget(target: EventTarget | null | undefined) {
  if (!(target instanceof HTMLElement)) {
    if (target instanceof Element) return target.tagName.toLowerCase();
    return undefined;
  }
  const label =
    target.getAttribute('aria-label') ||
    target.getAttribute('placeholder') ||
    (target.textContent ?? '').trim().slice(0, 30) ||
    target.dataset.slot;
  const tag = target.tagName.toLowerCase();
  return label ? `${tag} "${label}"` : tag;
}

/** The title of the open form, read from the DOM since Sheet itself doesn't know it. */
function openSheetTitle() {
  const titles = document.querySelectorAll('[data-slot=sheet-content][data-open] [data-slot=sheet-title]');
  return titles[titles.length - 1]?.textContent?.trim() || '(untitled)';
}

function record(entry: Omit<FormLogEntry, 'at' | 'path' | 'visibility' | 'lastInput'>) {
  const input = describeLastInput();
  const full: FormLogEntry = {
    ...entry,
    lastInput: input.text,
    at: new Date().toISOString().slice(11, 23),
    path: window.location.pathname + window.location.search,
    visibility: document.visibilityState
  };
  const log = (window.formDebugLog ??= []);
  log.push(full);
  if (log.length > MAX_ENTRIES) log.shift();
  // Flag what nobody asked for: an unmount, or an open/close with no click or key just before it.
  const unprompted = input.ms > PROMPTED_WINDOW_MS && !entry.event.startsWith('requested');
  const loud = entry.event.startsWith('UNMOUNTED') || unprompted;
  if (unprompted && !entry.event.startsWith('UNMOUNTED')) full.event += ' (UNPROMPTED: no click or key just before)';
  // oxlint-disable-next-line no-console
  console[loud ? 'warn' : 'info'](
    `%c[form]%c #${full.sheet} "${full.title}" ${full.event}`,
    'color:#a78bfa;font-weight:600',
    '',
    full
  );
}

function useSheetDebugLogDev(open: boolean | undefined, onOpenChange: OnOpenChange): OnOpenChange {
  const [sheetId] = React.useState(() => ++sheetSeq);
  React.useEffect(trackInput, []);
  const titleRef = React.useRef('(untitled)');
  const openedAtRef = React.useRef<number | null>(null);
  const lastChangeRef = React.useRef<{ reason?: string; target?: string } | null>(null);
  const wasOpenRef = React.useRef(false);

  const wrapped = React.useCallback<NonNullable<OnOpenChange>>(
    (nextOpen: boolean, details: ChangeDetails) => {
      const change = {
        reason: details?.reason,
        target: describeTarget(details?.event?.target as EventTarget | null | undefined)
      };
      lastChangeRef.current = change;
      record({
        sheet: sheetId,
        title: nextOpen ? '(opening)' : titleRef.current,
        event: `requested ${nextOpen ? 'open' : 'close'}`,
        ...change
      });
      onOpenChange?.(nextOpen, details);
    },
    [onOpenChange, sheetId]
  );

  // Controlled sheets: log the actual transitions of the `open` prop.
  React.useEffect(() => {
    if (open === undefined) return;
    if (open && !wasOpenRef.current) {
      wasOpenRef.current = true;
      openedAtRef.current = performance.now();
      lastChangeRef.current = null;
      // Log now so the entry carries the input that opened it; the title renders in the portal
      // slightly later, so it is filled in afterwards. (Timers, not animation frames: those
      // don't run in a background tab.)
      const entryIndex = (window.formDebugLog ?? []).length;
      record({ sheet: sheetId, title: '(opening)', event: 'OPENED' });
      const fillTitle = (retriesLeft: number) =>
        window.setTimeout(() => {
          const title = openSheetTitle();
          if (title === '(untitled)' && retriesLeft > 0) return fillTitle(retriesLeft - 1);
          titleRef.current = title;
          const entry = window.formDebugLog?.[entryIndex];
          if (entry?.sheet === sheetId) entry.title = title;
        }, 50);
      fillTitle(5);
    } else if (!open && wasOpenRef.current) {
      wasOpenRef.current = false;
      const change = lastChangeRef.current;
      record({
        sheet: sheetId,
        title: titleRef.current,
        event: change ? 'CLOSED' : 'CLOSED by the form or its parent (Cancel, save, or state change)',
        reason: change?.reason,
        target: change?.target,
        openForMs: openedAtRef.current ? Math.round(performance.now() - openedAtRef.current) : undefined
      });
      lastChangeRef.current = null;
    }
  }, [open, sheetId]);

  // A form that disappears while open, with no close at all.
  React.useEffect(
    () => () => {
      if (!wasOpenRef.current) return;
      record({
        sheet: sheetId,
        title: titleRef.current,
        event: 'UNMOUNTED while open (its parent component was removed)',
        openForMs: openedAtRef.current ? Math.round(performance.now() - openedAtRef.current) : undefined
      });
    },
    [sheetId]
  );

  return wrapped;
}

const passThrough = (_open: boolean | undefined, onOpenChange: OnOpenChange) => onOpenChange;

/** No-op outside development, so production builds carry none of this. */
export const useSheetDebugLog =
  process.env.NODE_ENV === 'development' ? useSheetDebugLogDev : passThrough;
