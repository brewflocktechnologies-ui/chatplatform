/**
 * utils/transition.ts
 * Enter/leave presence controller for Lit — the Lit equivalent of Alpine's
 * `x-show` + `x-transition`. It keeps an element in the DOM during its leave
 * animation so it can fade/slide out before being removed.
 *
 * Phase machine:
 *   none   → element is not rendered
 *   enter  → element rendered with the "start" (hidden) styles
 *   open   → element rendered with the "end" (shown) styles
 *   leave  → element kept rendered while animating back to hidden, then removed
 *
 * Timing is resolved lazily from the host's config (JSON values such as
 * `animationOpeningSec` / `animationClosingSec`) via the `enterMs`/`leaveMs`
 * callbacks so it always reflects the latest config.
 */

import type { ReactiveController, ReactiveControllerHost } from 'lit';

export type EnterLeavePhase = 'none' | 'enter' | 'open' | 'leave';

export interface EnterLeaveOptions {
  /** Returns the open (enter) transition duration in milliseconds. */
  enterMs?: () => number;
  /** Returns the close (leave) transition duration in milliseconds. */
  leaveMs?: () => number;
}

export class EnterLeaveController implements ReactiveController {
  private host: ReactiveControllerHost;
  private _target = false;
  private _phase: EnterLeavePhase = 'none';
  private _timeout?: number;
  private _raf = 0;

  enterMs: () => number;
  leaveMs: () => number;

  constructor(host: ReactiveControllerHost, opts: EnterLeaveOptions = {}) {
    this.host = host;
    this.enterMs = opts.enterMs ?? (() => 300);
    this.leaveMs = opts.leaveMs ?? (() => 200);
    host.addController(this);
  }

  /** True when the element should exist in the DOM (including during leave). */
  get render(): boolean {
    return this._phase !== 'none';
  }

  get phase(): EnterLeavePhase {
    return this._phase;
  }

  /** Push the desired visible state; `open=true` animates in, `false` animates out. */
  setTarget(open: boolean) {
    if (open === this._target) return;
    this._target = open;

    if (this._timeout !== undefined) {
      window.clearTimeout(this._timeout);
      this._timeout = undefined;
    }
    if (this._raf) {
      window.cancelAnimationFrame(this._raf);
      this._raf = 0;
    }

    if (open) {
      // Render once with the hidden "enter" styles, then flip to "open" on the
      // next frame so the CSS transition actually animates.
      this._phase = 'enter';
      this.host.requestUpdate();
      this._raf = window.requestAnimationFrame(() => {
        this._raf = window.requestAnimationFrame(() => {
          this._raf = 0;
          this._phase = 'open';
          this.host.requestUpdate();
        });
      });
    } else {
      this._phase = 'leave';
      this.host.requestUpdate();
      this._timeout = window.setTimeout(() => {
        this._timeout = undefined;
        this._phase = 'none';
        this.host.requestUpdate();
      }, this.leaveMs());
    }
  }

  hostConnected() {}

  hostDisconnected() {
    if (this._timeout !== undefined) {
      window.clearTimeout(this._timeout);
      this._timeout = undefined;
    }
    if (this._raf) {
      window.cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
  }
}
