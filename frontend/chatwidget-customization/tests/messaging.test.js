import { describe, it, expect, beforeAll, vi } from 'vitest';

beforeAll(async () => {
  await import('../src/core.js');
});

const core = () => globalThis.CWCore;

const HOST = 'https://host.example.com';
const ATTACKER = 'https://evil.example.net';

// Minimal stand-ins for window references used by the policy.
const parentWindow = { id: 'parent' };
const strangerWindow = { id: 'stranger' };

function msg(origin, data, source = parentWindow) {
  return { origin, data, source };
}

describe('createMessagingPolicy — trust decisions', () => {
  it('trusts only the frame own origin when it is the anchor (srcdoc mount)', () => {
    const policy = core().createMessagingPolicy({ selfOrigin: HOST });
    expect(policy.isTrustedEvent(msg(HOST, { type: 'X' }), parentWindow)).toBe(true);
    expect(policy.isTrustedEvent(msg(ATTACKER, { type: 'X' }), parentWindow)).toBe(false);
  });

  it('rejects messages whose source is not the direct parent window', () => {
    const policy = core().createMessagingPolicy({ selfOrigin: HOST });
    const fromStranger = msg(HOST, { type: 'X' }, strangerWindow);
    expect(policy.isTrustedEvent(fromStranger, parentWindow)).toBe(false);
  });

  it('rejects events with missing data or origin', () => {
    const policy = core().createMessagingPolicy({ selfOrigin: HOST });
    expect(policy.isTrustedEvent(null, parentWindow)).toBe(false);
    expect(policy.isTrustedEvent(msg(HOST, null), parentWindow)).toBe(false);
    expect(policy.isTrustedEvent(msg('', { type: 'X' }), parentWindow)).toBe(false);
  });

  it('enforces a configured allowlist on top of the origin anchor', () => {
    const policy = core().createMessagingPolicy({
      selfOrigin: HOST,
      configuredOrigins: [ATTACKER] // misconfigured allowlist ≠ anchor
    });
    // Neither passes: attacker fails the anchor, host fails the allowlist.
    expect(policy.isTrustedEvent(msg(HOST, { type: 'X' }), parentWindow)).toBe(false);
    expect(policy.isTrustedEvent(msg(ATTACKER, { type: 'X' }), parentWindow)).toBe(false);
  });

  it('normalizes origins (case, trailing slash) before comparing', () => {
    const policy = core().createMessagingPolicy({ selfOrigin: 'HTTPS://Host.Example.COM/' });
    expect(policy.isTrustedEvent(msg(HOST, { type: 'X' }), parentWindow)).toBe(true);
  });

  it('with an opaque self origin, locks onto the first allowlisted origin (handshake)', () => {
    const policy = core().createMessagingPolicy({
      selfOrigin: 'null', // e.g. file:// or sandboxed frame
      configuredOrigins: [HOST]
    });
    expect(policy.isTrustedEvent(msg(HOST, { type: 'X' }), parentWindow)).toBe(true);
    policy.confirmOrigin(HOST);
    // After the handshake, even a hypothetical second allowlisted origin is out.
    expect(policy.targetOrigin()).toBe(HOST);
    expect(policy.isTrustedEvent(msg(ATTACKER, { type: 'X' }), parentWindow)).toBe(false);
  });

  it('never reports wildcard target once any origin is known', () => {
    const anchored = core().createMessagingPolicy({ selfOrigin: HOST });
    expect(anchored.targetOrigin()).toBe(HOST);

    const configured = core().createMessagingPolicy({
      selfOrigin: 'null',
      configuredOrigins: [HOST]
    });
    expect(configured.targetOrigin()).toBe(HOST);
  });
});

describe('processHostMessage — routing and validation', () => {
  function makeActions() {
    return {
      updateDomain: vi.fn(),
      applyConfig: vi.fn(),
      resetPreview: vi.fn(),
      sendConfig: vi.fn()
    };
  }

  function trustedPolicy() {
    return core().createMessagingPolicy({ selfOrigin: HOST });
  }

  it('rejects every message type from an untrusted origin', () => {
    const actions = makeActions();
    const policy = trustedPolicy();
    for (const type of ['LOAD_WIDGET_CONFIG', 'UPDATE_PREVIEW_DOMAIN', 'RESET_WIDGET_PREVIEW', 'REQUEST_WIDGET_CONFIG']) {
      const outcome = core().processHostMessage(
        msg(ATTACKER, { type, cdnConfig: { clientId: 'x' }, domain: 'evil.dev' }),
        policy, parentWindow, actions
      );
      expect(outcome).toBe('rejected:untrusted-origin');
    }
    expect(actions.updateDomain).not.toHaveBeenCalled();
    expect(actions.applyConfig).not.toHaveBeenCalled();
    expect(actions.resetPreview).not.toHaveBeenCalled();
    expect(actions.sendConfig).not.toHaveBeenCalled();
  });

  it('applies a valid LOAD_WIDGET_CONFIG after unwrapping envelopes', () => {
    const actions = makeActions();
    const inner = { clientId: 'amber', bubble: { size: 56 } };
    const outcome = core().processHostMessage(
      msg(HOST, { type: 'LOAD_WIDGET_CONFIG', domain: 'amber.dev', cdnConfig: { cdnConfig: inner } }),
      trustedPolicy(), parentWindow, actions
    );
    expect(outcome).toBe('handled:config');
    expect(actions.updateDomain).toHaveBeenCalledWith('amber.dev');
    expect(actions.applyConfig).toHaveBeenCalledWith(inner);
  });

  it('rejects a LOAD_WIDGET_CONFIG whose payload fails validation', () => {
    const actions = makeActions();
    const outcome = core().processHostMessage(
      msg(HOST, { type: 'LOAD_WIDGET_CONFIG', cdnConfig: { clientId: 42, bubble: 'nope' } }),
      trustedPolicy(), parentWindow, actions
    );
    expect(outcome).toMatch(/^rejected:invalid-config:/);
    expect(actions.applyConfig).not.toHaveBeenCalled();
  });

  it('rejects a prototype-pollution payload from the host', () => {
    const actions = makeActions();
    const payload = JSON.parse('{"clientId":"x","chatWindow":{"__proto__":{"polluted":true}}}');
    const outcome = core().processHostMessage(
      msg(HOST, { type: 'LOAD_WIDGET_CONFIG', cdnConfig: payload }),
      trustedPolicy(), parentWindow, actions
    );
    expect(outcome).toMatch(/^rejected:invalid-config:/);
    expect(actions.applyConfig).not.toHaveBeenCalled();
  });

  it('ignores LOAD_WIDGET_CONFIG with no config but still applies its domain', () => {
    const actions = makeActions();
    const outcome = core().processHostMessage(
      msg(HOST, { type: 'LOAD_WIDGET_CONFIG', domain: 'only.dev' }),
      trustedPolicy(), parentWindow, actions
    );
    expect(outcome).toBe('ignored:no-config');
    expect(actions.updateDomain).toHaveBeenCalledWith('only.dev');
    expect(actions.applyConfig).not.toHaveBeenCalled();
  });

  it('routes UPDATE_PREVIEW_DOMAIN and ignores non-string domains', () => {
    const actions = makeActions();
    core().processHostMessage(
      msg(HOST, { type: 'UPDATE_PREVIEW_DOMAIN', domain: 'site.dev' }),
      trustedPolicy(), parentWindow, actions
    );
    expect(actions.updateDomain).toHaveBeenCalledWith('site.dev');

    const actions2 = makeActions();
    core().processHostMessage(
      msg(HOST, { type: 'UPDATE_PREVIEW_DOMAIN', domain: { evil: true } }),
      trustedPolicy(), parentWindow, actions2
    );
    expect(actions2.updateDomain).not.toHaveBeenCalled();
  });

  it('routes RESET_WIDGET_PREVIEW and REQUEST_WIDGET_CONFIG', () => {
    const actions = makeActions();
    const policy = trustedPolicy();
    expect(core().processHostMessage(msg(HOST, { type: 'RESET_WIDGET_PREVIEW' }), policy, parentWindow, actions))
      .toBe('handled:reset');
    expect(core().processHostMessage(msg(HOST, { type: 'REQUEST_WIDGET_CONFIG' }), policy, parentWindow, actions))
      .toBe('handled:request');
    expect(actions.resetPreview).toHaveBeenCalledTimes(1);
    expect(actions.sendConfig).toHaveBeenCalledTimes(1);
  });

  it('ignores unknown message types without touching any action', () => {
    const actions = makeActions();
    const outcome = core().processHostMessage(
      msg(HOST, { type: 'SOMETHING_ELSE' }), trustedPolicy(), parentWindow, actions
    );
    expect(outcome).toBe('ignored:unknown-type');
    expect(Object.values(actions).every(fn => fn.mock.calls.length === 0)).toBe(true);
  });
});
