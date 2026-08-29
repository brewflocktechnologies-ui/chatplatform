/* ==========================================================================
   CWCore — framework-free, dependency-free core logic for the customization
   app. Deliberately written as a classic script (no import/export) because
   scripts.js runs as a classic script inside the mount iframe. Attaches a
   single namespace to the global object; also loadable as an ES module for
   unit tests (importing it runs the IIFE and populates globalThis.CWCore).
   ========================================================================== */
(function (global) {
  'use strict';

  var MAX_UNWRAP_DEPTH = 20;
  var MAX_VALIDATE_DEPTH = 32;

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Configs coming back from the host/DB are sometimes wrapped in one or more
   * `cdnConfig` envelopes. Unwrap to the innermost config. Depth-capped so a
   * self-referencing payload can never loop forever.
   */
  function unwrapCdnConfig(cfg) {
    var depth = 0;
    while (
      isPlainObject(cfg) &&
      isPlainObject(cfg.cdnConfig) &&
      depth < MAX_UNWRAP_DEPTH
    ) {
      cfg = cfg.cdnConfig;
      depth++;
    }
    return cfg;
  }

  /** Escape a value for safe interpolation into HTML markup/attributes. */
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Lowercase, strip trailing slashes. Returns '' for falsy input. */
  function normalizeOrigin(origin) {
    if (!origin) return '';
    return String(origin).toLowerCase().replace(/\/+$/, '');
  }

  // Keys that must never appear in incoming config: assigning them during the
  // config→form sync (setValueByPath builds nested objects) would be a
  // prototype-pollution vector.
  var FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype'];

  // Known top-level sections and the shape each must have when present.
  var SECTION_SHAPES = {
    clientId: 'string',
    clientName: 'string',
    accentColor: 'string',
    domain: 'string',
    useWebsiteTheme: 'boolean',
    features: 'object',
    greetWindow: 'object',
    bubble: 'object',
    chatbar: 'object',
    chatWindow: 'object',
    notification: 'object',
    notifications: 'object',
    forms: 'object',
    messages: 'array'
  };

  function typeOf(value) {
    if (Array.isArray(value)) return 'array';
    if (value === null) return 'null';
    return typeof value;
  }

  function walkForbiddenKeys(value, path, errors, depth) {
    if (depth > MAX_VALIDATE_DEPTH) {
      errors.push('config exceeds maximum nesting depth at ' + (path || 'root'));
      return;
    }
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i++) {
        walkForbiddenKeys(value[i], path + '[' + i + ']', errors, depth + 1);
      }
      return;
    }
    if (!isPlainObject(value)) return;
    var keys = Object.keys(value);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      if (FORBIDDEN_KEYS.indexOf(key) !== -1) {
        errors.push('forbidden key "' + key + '" at ' + (path || 'root'));
        continue;
      }
      walkForbiddenKeys(value[key], path ? path + '.' + key : key, errors, depth + 1);
    }
  }

  /**
   * Structural validation for a widget config crossing a trust boundary
   * (postMessage from the host, the raw JSON editor). Returns
   * `{ ok: boolean, errors: string[] }`. Permissive about unknown keys
   * (config schema evolves), strict about shape and dangerous keys.
   */
  function validateWidgetConfig(cfg) {
    var errors = [];
    if (!isPlainObject(cfg)) {
      return { ok: false, errors: ['config must be a plain object, got ' + typeOf(cfg)] };
    }
    if (Object.keys(cfg).length === 0) {
      return { ok: false, errors: ['config must not be empty'] };
    }
    for (var key in SECTION_SHAPES) {
      if (!Object.prototype.hasOwnProperty.call(cfg, key)) continue;
      var expected = SECTION_SHAPES[key];
      var actual = typeOf(cfg[key]);
      if (actual !== expected) {
        errors.push('"' + key + '" must be ' + expected + ', got ' + actual);
      }
    }
    walkForbiddenKeys(cfg, '', errors, 0);
    return { ok: errors.length === 0, errors: errors };
  }

  /**
   * Cross-frame messaging trust policy.
   *
   * The mount iframe is an `srcdoc` frame, so it inherits the host page's
   * origin — `selfOrigin` (window.origin inside the frame) IS the only
   * legitimate host origin. That makes it the trust anchor: no wildcard
   * targets, no trust-on-first-use, unless the frame has an opaque origin
   * (origin === 'null', e.g. file://) in which case an explicit allowlist or
   * a first-message handshake is the fallback.
   */
  function createMessagingPolicy(opts) {
    opts = opts || {};
    var selfOrigin = normalizeOrigin(opts.selfOrigin);
    if (selfOrigin === 'null') selfOrigin = '';
    var configured = (opts.configuredOrigins || [])
      .map(normalizeOrigin)
      .filter(Boolean);
    var confirmed = selfOrigin || null;

    function isTrustedEvent(event, parentWindow) {
      if (!event || !event.data || !event.origin) return false;
      // Only the direct parent frame may talk to us — never nested frames,
      // popups, or unrelated windows.
      if (parentWindow && event.source !== parentWindow) return false;

      var origin = normalizeOrigin(event.origin);
      if (configured.length && configured.indexOf(origin) === -1) return false;
      if (confirmed && confirmed !== origin) return false;
      return true;
    }

    // Lock the trusted origin after the first validated handshake message.
    // Only relevant when selfOrigin was opaque and no allowlist matched first.
    function confirmOrigin(origin) {
      var normalized = normalizeOrigin(origin);
      if (normalized && !confirmed) confirmed = normalized;
    }

    // Strictest safe target for outbound messages. Wildcard only as a last
    // resort when the frame origin is opaque and nothing is configured.
    function targetOrigin() {
      return confirmed || configured[0] || '*';
    }

    return {
      isTrustedEvent: isTrustedEvent,
      confirmOrigin: confirmOrigin,
      targetOrigin: targetOrigin,
      _debug: function () {
        return { selfOrigin: selfOrigin, configured: configured.slice(), confirmed: confirmed };
      }
    };
  }

  /**
   * Dispatch a host → iframe message. All routing and trust/validation
   * decisions live here so they are unit-testable; DOM/store side effects are
   * injected via `actions`:
   *   updateDomain(domain), applyConfig(cfg), resetPreview(), sendConfig()
   * Returns a string describing the outcome (for tests/telemetry).
   */
  function processHostMessage(event, policy, parentWindow, actions) {
    if (!event || !event.data) return 'ignored:empty';
    if (!policy.isTrustedEvent(event, parentWindow)) return 'rejected:untrusted-origin';

    var data = event.data;

    if (data.type === 'UPDATE_PREVIEW_DOMAIN') {
      if (data.domain && typeof data.domain === 'string') {
        actions.updateDomain(data.domain);
      }
      return 'handled:domain';
    }

    if (data.type === 'LOAD_WIDGET_CONFIG') {
      policy.confirmOrigin(event.origin);
      if (data.domain && typeof data.domain === 'string') {
        actions.updateDomain(data.domain);
      }
      var cfg = unwrapCdnConfig(data.cdnConfig);
      if (!cfg) return 'ignored:no-config';
      var result = validateWidgetConfig(cfg);
      if (!result.ok) return 'rejected:invalid-config:' + result.errors.join('; ');
      actions.applyConfig(cfg);
      return 'handled:config';
    }

    if (data.type === 'RESET_WIDGET_PREVIEW') {
      actions.resetPreview();
      return 'handled:reset';
    }

    if (data.type === 'REQUEST_WIDGET_CONFIG') {
      actions.sendConfig();
      return 'handled:request';
    }

    return 'ignored:unknown-type';
  }

  global.CWCore = {
    isPlainObject: isPlainObject,
    unwrapCdnConfig: unwrapCdnConfig,
    escapeHtml: escapeHtml,
    normalizeOrigin: normalizeOrigin,
    validateWidgetConfig: validateWidgetConfig,
    createMessagingPolicy: createMessagingPolicy,
    processHostMessage: processHostMessage
  };
})(typeof window !== 'undefined' ? window : globalThis);
