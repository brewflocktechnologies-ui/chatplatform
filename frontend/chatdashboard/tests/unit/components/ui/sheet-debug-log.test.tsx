import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// The logger only exists in development, so load Sheet fresh with NODE_ENV stubbed.
async function loadSheet() {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', 'development');
  return import('@/components/ui/sheet');
}

beforeEach(() => {
  window.formDebugLog = [];
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const events = () => (window.formDebugLog ?? []).map((e) => e.event);
const openedTitle = () => window.formDebugLog?.find((e) => e.event.startsWith('OPENED'))?.title;

describe('sheet debug log (development)', () => {
  it('records opening, the close request with its reason, and the close', async () => {
    const { Sheet, SheetContent, SheetTitle, SheetDescription } = await loadSheet();
    const onOpenChange = vi.fn();
    const ui = (open: boolean) => (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side='center'>
          <SheetTitle>Edit Website</SheetTitle>
          <SheetDescription>form</SheetDescription>
        </SheetContent>
      </Sheet>
    );
    const { rerender } = render(ui(true));
    await waitFor(() => expect(openedTitle()).toBe('Edit Website'));

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
    rerender(ui(false));

    const request = window.formDebugLog?.find((e) => e.event === 'requested close');
    expect(request?.reason).toBe('escape-key');
    const closed = window.formDebugLog?.find((e) => e.event.startsWith('CLOSED'));
    expect(closed?.reason).toBe('escape-key');
    // The Escape key press just before means this close was prompted.
    expect(closed?.event).toBe('CLOSED');
    expect(closed?.lastInput).toMatch(/^key Escape on /);
  });

  it('flags a close the sheet itself did not request', async () => {
    const { Sheet, SheetContent, SheetTitle, SheetDescription } = await loadSheet();
    const { rerender } = render(
      <Sheet open onOpenChange={() => {}}>
        <SheetContent>
          <SheetTitle>New Customer</SheetTitle>
          <SheetDescription>form</SheetDescription>
        </SheetContent>
      </Sheet>
    );
    await waitFor(() => expect(events().some((e) => e.startsWith('OPENED'))).toBe(true));

    rerender(
      <Sheet open={false} onOpenChange={() => {}}>
        <SheetContent>
          <SheetTitle>New Customer</SheetTitle>
          <SheetDescription>form</SheetDescription>
        </SheetContent>
      </Sheet>
    );

    expect(events().some((e) => e.startsWith('CLOSED by the form or its parent'))).toBe(true);
  });

  it('warns when an open form is unmounted without closing', async () => {
    const { Sheet, SheetContent, SheetTitle, SheetDescription } = await loadSheet();
    const { unmount } = render(
      <Sheet open onOpenChange={() => {}}>
        <SheetContent>
          <SheetTitle>Edit Company</SheetTitle>
          <SheetDescription>form</SheetDescription>
        </SheetContent>
      </Sheet>
    );
    await waitFor(() => expect(openedTitle()).toBe('Edit Company'));

    act(() => unmount());

    const entry = window.formDebugLog?.find((e) => e.event.startsWith('UNMOUNTED'));
    expect(entry?.title).toBe('Edit Company');
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('sheet debug log (other environments)', () => {
  it('records nothing outside development', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    const { Sheet, SheetContent, SheetTitle, SheetDescription } = await import('@/components/ui/sheet');
    render(
      <Sheet open onOpenChange={() => {}}>
        <SheetContent>
          <SheetTitle>Anything</SheetTitle>
          <SheetDescription>form</SheetDescription>
        </SheetContent>
      </Sheet>
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(window.formDebugLog).toEqual([]);
  });
});
