/**
 * utils/dismiss.ts
 * Lit ReactiveController for handling click-outside / pointerdown dismissal.
 * Automatically attaches pointerdown listener on host connected and detaches on disconnected.
 * Emits 'cw:close-popups' by default or calls custom onDismiss callback.
 */

import type { ReactiveController, ReactiveControllerHost } from 'lit';

export interface DismissOptions {
  /** Event to dispatch or callback to invoke on outside pointerdown. Defaults to emitting 'cw:close-popups'. */
  onDismiss?: (e: PointerEvent | MouseEvent) => void;
  /** Custom event name to emit on host element if onDismiss callback is not supplied. Defaults to 'cw:close-popups'. */
  eventName?: string;
  /** Whether the dismissal listener is active. Defaults to true. */
  enabled?: boolean | (() => boolean);
}

export class DismissController implements ReactiveController {
  private host: ReactiveControllerHost & HTMLElement;
  private options: DismissOptions;
  private listening = false;
  private rafId = 0;

  constructor(host: ReactiveControllerHost & HTMLElement, options: DismissOptions = {}) {
    this.host = host;
    this.options = options;
    host.addController(this);
  }

  private handleOutsidePointer = (e: PointerEvent | MouseEvent) => {
    const isEnabled = typeof this.options.enabled === 'function' ? this.options.enabled() : (this.options.enabled ?? true);
    if (!isEnabled) return;

    const path = e.composedPath();
    if (!path.includes(this.host)) {
      if (this.options.onDismiss) {
        this.options.onDismiss(e);
      } else {
        const eventName = this.options.eventName || 'cw:close-popups';
        this.host.dispatchEvent(new CustomEvent(eventName, { bubbles: true, composed: true }));
      }
    }
  };

  hostConnected() {
    this.rafId = requestAnimationFrame(() => {
      if (!this.listening) {
        window.addEventListener('pointerdown', this.handleOutsidePointer);
        this.listening = true;
      }
    });
  }

  hostDisconnected() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if (this.listening) {
      window.removeEventListener('pointerdown', this.handleOutsidePointer);
      this.listening = false;
    }
  }
}
