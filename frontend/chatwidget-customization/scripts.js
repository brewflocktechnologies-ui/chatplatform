/* ==========================================================================
   WIDGET customization MAIN JS LOGIC
   Handles visual forms, raw JSON editor, Alpine store syncing & presets
   ========================================================================== */

// --- POSTMESSAGE ORIGIN VALIDATION (security) ---
// All cross-frame messaging with the host goes through the CWCore messaging
// policy (src/core.js, loaded before this script in both the standalone page
// and the federation mount). The srcdoc mount iframe inherits the host page's
// origin, so window.origin is the trust anchor; an explicit allowlist can be
// supplied via window.CW_TRUSTED_ORIGINS (set by mount.js) or ?hostOrigin=.
// A malicious framing page must not be able to inject config into the widget
// or exfiltrate the widget's config.
function getConfiguredTrustedOrigins() {
  const list = [];
  const fromGlobal = window.CW_TRUSTED_ORIGINS;
  if (Array.isArray(fromGlobal)) {
    list.push(...fromGlobal);
  } else if (typeof fromGlobal === 'string' && fromGlobal) {
    list.push(fromGlobal);
  }
  const fromQuery = new URLSearchParams(window.location.search).get('hostOrigin');
  if (fromQuery) list.push(fromQuery);
  return list.filter(Boolean);
}

const __cwMessagingPolicy = window.CWCore
  ? window.CWCore.createMessagingPolicy({
      selfOrigin: window.origin,
      configuredOrigins: getConfiguredTrustedOrigins()
    })
  : /* fail closed if core.js did not load: accept nothing, send nothing */ {
      isTrustedEvent: () => false,
      confirmOrigin: () => {},
      targetOrigin: () => null
    };
if (!window.CWCore) {
  console.error('[CW] src/core.js not loaded — cross-frame messaging disabled.');
}

function confirmTrustedOrigin(origin) {
  __cwMessagingPolicy.confirmOrigin(origin);
}

function isTrustedMessageEvent(event) {
  return __cwMessagingPolicy.isTrustedEvent(event, window.parent);
}

// Post a message to the parent using the strictest safe target origin.
function postToTrustedParent(message) {
  if (!window.parent || window.parent === window) return;
  const target = __cwMessagingPolicy.targetOrigin();
  if (!target) return;
  window.parent.postMessage(message, target);
}

// --- INLINE-HANDLER GLOBALS ---
// index.html wires some controls through inline on*="..." attributes, which
// resolve names in the GLOBAL scope. In the federation mount scripts.js runs
// as a classic script (top-level functions are global), but the standalone
// page loads it as a module (they are not) — so every function referenced by
// an inline handler must be exported to window explicitly. Function
// declarations hoist, so this block can live above the definitions.
window.toggleNotifCard = toggleNotifCard;
window.updateNotifCounter = updateNotifCounter;
window.adjustNotifStepper = adjustNotifStepper;
window.selectNotifPromptStyle = selectNotifPromptStyle;
window.selectNotifPresetIcon = selectNotifPresetIcon;
window.handleNotifIconUpload = handleNotifIconUpload;
window.triggerNotifPreviewUpdate = triggerNotifPreviewUpdate;
window.toggleFormSectionCard = toggleFormSectionCard;
window.toggleFeaturesCard = toggleFeaturesCard;

// Deep-clone plain config (JSON round-trip: tolerates Alpine proxies, unlike structuredClone)
function jsonClone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Helper to access and set nested object properties by dot-notation path
function getValueByPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, part) => {
    return acc?.[part];
  }, obj);
}

function setValueByPath(obj, path, value) {
  if (!obj || !path) return;

  // Special conversion for welcome avatars comma-separated list
  if (path === 'chatWindow.welcome.avatars' && typeof value === 'string') {
    value = value.split(',').map(url => url.trim()).filter(url => url !== '');
  }

  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }

  const lastPart = parts[parts.length - 1];
  current[lastPart] = value;
}

function createAccentGradient(hex) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
    return `linear-gradient(135deg, ${hex || '#0b5fff'}, #0284c7)`;
  }
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length !== 6) return `linear-gradient(135deg, ${hex}, ${hex})`;

  let r = Number.parseInt(c.substring(0, 2), 16) / 255;
  let g = Number.parseInt(c.substring(2, 4), 16) / 255;
  let b = Number.parseInt(c.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  let h2 = ((h * 360 + 25) % 360) / 360;
  let s2 = Math.min(1, s * 1.05);
  let l2 = Math.max(0.15, Math.min(0.85, l * 0.82));

  const q = l2 < 0.5 ? l2 * (1 + s2) : l2 + s2 - l2 * s2;
  const p = 2 * l2 - q;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  const r2 = hue2rgb(p, q, h2 + 1/3);
  const g2 = hue2rgb(p, q, h2);
  const b2 = hue2rgb(p, q, h2 - 1/3);
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
  const secondary = `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;

  return `linear-gradient(135deg, ${hex}, ${secondary})`;
}

/* ==========================================================================
   MESSAGE PRESETS (Messages tab -> chat window preview)
   ========================================================================== */
const MSG_LABELS = { welcome: 'Greeting', queueing: 'Queueing', waiting: 'Waiting', busy: 'Busy', offline: 'Offline' };
const MSG_DEFAULTS = [
  { key: 'welcome', senderType: 'AGENT', body: 'Welcome! How can we assist you today?' },
  { key: 'queueing', senderType: 'SYSTEM', body: 'You are currently in queue. An agent will be with you shortly.' },
  { key: 'waiting', senderType: 'SYSTEM', body: 'Connecting your chat request... Please stay on this page.' },
  { key: 'busy', senderType: 'SYSTEM', body: "All of our agents are currently engaged. Please hold on, and we'll connect you shortly." },
  { key: 'offline', senderType: 'SYSTEM', body: "We are currently offline. Please leave us a message and we'll get back to you soon." }
];

// Normalize config.messages into an array of { key, senderType, body }, migrating the legacy object form
function getMessagesConfig() {
  const cfg = window.cutomizationConfig;
  if (!cfg) return [];
  let arr = Array.isArray(cfg.messages) ? cfg.messages : null;
  if (!arr) {
    const legacy = cfg.messages && typeof cfg.messages === 'object' ? cfg.messages : null;
    arr = MSG_DEFAULTS.map(d => {
      const l = legacy ? legacy[d.key] : undefined;
      return { key: d.key, senderType: d.senderType, body: (l !== undefined && l !== null) ? l : d.body };
    });
    cfg.messages = arr;
  }
  MSG_DEFAULTS.forEach(d => {
    if (!arr.some(m => m?.key === d.key)) {
      arr.push({ key: d.key, senderType: d.senderType, body: d.body });
    }
  });
  return arr;
}

// Show a single selected message config at the top of the chat window preview
function applyMessagePreview(key) {
  const arr = getMessagesConfig();
  const entry = arr.find(m => m?.key === key) || arr.find(m => m?.key === 'welcome') || arr[0];
  if (!entry) return;
  window.activeMessagePreviewKey = entry.key;

  const dropdown = document.getElementById('msg-preview-select');
  if (dropdown && dropdown.value !== entry.key) dropdown.value = entry.key;

  const chatConfig = window.cutomizationConfig || {};
  const agentName = chatConfig.agentName || chatConfig.chatWindow?.agentName || 'Sarah';
  const msg = { key: 'm1', senderType: entry.senderType, body: entry.body || '', created: new Date().toISOString() };
  if (entry.senderType === 'AGENT') msg.senderName = agentName;

  // Push only the selected message into the Lit widget store and trigger a re-render.
  // (mutating cs.messages directly does not emit 'store:chat', so the chat window
  // would otherwise keep showing every hardcoded message from the config.)
  if (window.ChatWidgetLit?.updateStoreConfig) {
    window.ChatWidgetLit.updateStoreConfig({
      chat: {
        messages: [msg],
        state: 'active',
        hasSentMessage: false
      }
    });
  }

  if (window.Alpine && Alpine.store('chat')) {
    const chatStore = Alpine.store('chat');
    chatStore.messages = [msg];
    chatStore.state = 'active';
    if (chatStore.hasSentMessage !== undefined) chatStore.hasSentMessage = false;
    setTimeout(() => { try { if (chatStore.scrollDown) chatStore.scrollDown(); } catch (e) { } }, 60);
  }
}

/* ==========================================================================
   NOTIFICATION TAB MANAGEMENT & LIVE PREVIEW HELPERS
   ========================================================================== */
function toggleNotifCard(cardId) {
  const card = document.getElementById(cardId);
  if (card) {
    card.classList.toggle('active');
  }
}

function updateNotifCounter(inputEl, counterId) {
  const counterEl = document.getElementById(counterId);
  if (inputEl && counterEl) {
    const max = inputEl.getAttribute('maxlength') || 30;
    counterEl.textContent = `${inputEl.value.length}/${max}`;
  }
}

function adjustNotifStepper(inputId, delta) {
  const input = document.getElementById(inputId);
  if (input) {
    let current = Number.parseInt(input.value) || 0;
    const min = Number.parseInt(input.getAttribute('min')) || 0;
    const max = Number.parseInt(input.getAttribute('max')) || 999;
    current = Math.max(min, Math.min(max, current + delta));
    input.value = current;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function selectNotifPromptStyle(styleKey) {
  document.querySelectorAll('.notif-style-card').forEach(c => c.classList.remove('active'));
  const targetCard = document.getElementById(`style-card-${styleKey}`);
  if (targetCard) targetCard.classList.add('active');

  const radio = document.getElementById(`radio-style-${styleKey}`);
  if (radio) {
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function selectNotifPresetIcon(iconType) {
  window.customNotifUploadedIcon = null;
  document.querySelectorAll('.notif-preset-icon-box').forEach(b => b.classList.remove('active'));
  const target = document.getElementById(`notif-icon-${iconType}`);
  if (target) target.classList.add('active');
  triggerNotifPreviewUpdate();
}

function handleNotifIconUpload(fileInput) {
  if (fileInput.files?.[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      window.customNotifUploadedIcon = e.target.result;
      document.querySelectorAll('.notif-preset-icon-box').forEach(b => b.classList.remove('active'));
      triggerNotifPreviewUpdate();
    };
    reader.readAsDataURL(fileInput.files[0]);
  }
}

function applyNotifCardStyle(notifCard, enabled, style) {
  if (!notifCard) return;
  notifCard.style.opacity = enabled ? '1' : '0.3';
  notifCard.className = style === 'box1' ? 'notif-preview-card box-1' : 'notif-preview-card box-2';
}

function applyNotifOverlayPosition(overlay, position) {
  if (!overlay) return;
  const centered = position === 'center';
  overlay.style.justifyContent = centered ? 'center' : 'flex-start';
  overlay.style.paddingTop = centered ? '30px' : '60px';
}

function applyNotifIcon(imgIcon, svgIcon) {
  if (!imgIcon || !svgIcon) return;
  if (window.customNotifUploadedIcon) {
    imgIcon.src = window.customNotifUploadedIcon;
    imgIcon.style.display = 'block';
    imgIcon.style.width = '48px';
    imgIcon.style.height = '48px';
    imgIcon.style.borderRadius = '12px';
    imgIcon.style.objectFit = 'cover';
    svgIcon.style.display = 'none';
  } else {
    imgIcon.style.display = 'none';
    svgIcon.style.display = 'block';
  }
}

function triggerNotifPreviewUpdate() {
  const notifTabActive = document.querySelector('.nav-tab[data-tab="tab-notifications"]')?.classList.contains('active');
  if (!notifTabActive) return;

  const headline = document.getElementById('notif-headline-input')?.value || 'Notifications';
  const desc = document.getElementById('notif-desc-input')?.value || 'Would you like to receive notifications on latest updates?';
  const approveText = document.getElementById('notif-approve-btn-input')?.value || 'OK';
  const cancelText = document.getElementById('notif-cancel-btn-input')?.value || 'Not Yet';
  const style = document.querySelector('input[name="promptStyle"]:checked')?.value || 'box2';
  const position = document.querySelector('input[name="notifPosition"]:checked')?.value || 'top';
  const enabled = document.getElementById('notif-permission-toggle')?.checked !== false;

  const notifCard = document.getElementById('notif-preview-card');
  const titleEl = document.getElementById('notif-preview-title');
  const descEl = document.getElementById('notif-preview-desc');
  const approveBtn = document.getElementById('notif-preview-approve-btn');
  const cancelBtn = document.getElementById('notif-preview-cancel-btn');
  const imgIcon = document.getElementById('notif-preview-img-icon');
  const svgIcon = document.getElementById('notif-preview-svg-icon');
  const overlay = document.getElementById('notif-preview-overlay');

  if (titleEl) titleEl.textContent = headline;
  if (descEl) descEl.textContent = desc;
  if (approveBtn) approveBtn.textContent = approveText;
  if (cancelBtn) cancelBtn.textContent = cancelText;

  applyNotifCardStyle(notifCard, enabled, style);
  applyNotifOverlayPosition(overlay, position);
  applyNotifIcon(imgIcon, svgIcon);
}

// Fill the Messages-tab textareas from the config messages array
function syncMessageTextareas() {
  const arr = getMessagesConfig();
  document.querySelectorAll('.msg-textarea[data-msg-key]').forEach(ta => {
    const entry = arr.find(m => m && m.key === ta.dataset.msgKey);
    if (!entry) return;
    ta.value = entry.body || '';
    const body = ta.closest('.msg-accordion-body');
    const counter = body ? body.querySelector('.msg-char-counter .current-count') : null;
    if (counter) counter.textContent = ta.value.length;
  });
}

// Populate the preview dropdown and wire up switching
function setupMessagePreviewControls() {
  const dropdown = document.getElementById('msg-preview-select');
  if (!dropdown) return;
  const arr = getMessagesConfig();
  // Message keys/labels originate from config (a trust boundary) — escape them.
  const esc = window.CWCore ? window.CWCore.escapeHtml : encodeURIComponent;
  dropdown.innerHTML = arr.map(m => {
    const label = MSG_LABELS[m.key] || m.key;
    return '<option value="' + esc(m.key) + '">' + esc(label) + '</option>';
  }).join('');
  dropdown.addEventListener('change', () => {
    applyMessagePreview(dropdown.value);
    // Ensure chat window panel is open when user changes dropdown selection
    if (window.ChatWidgetLit?.chatStore) {
      const cs = window.ChatWidgetLit.chatStore.get();
      if (cs) cs.panelOpen = true;
      const widgetEmbed = document.querySelector('cw-widget-root');
      if (widgetEmbed) widgetEmbed.panelOpen = true;
    }
    if (window.Alpine && Alpine.store('chat')) {
      const widgetContainer = document.getElementById('zotly-widget-embed');
      if (widgetContainer?._x_dataStack?.[0]) {
        widgetContainer._x_dataStack[0].openContactWidget = true;
      }
      Alpine.store('chat').panelOpen = true;
    }
  });
  applyMessagePreview(window.activeMessagePreviewKey || 'welcome');
}

// Parse CSS padding/margin shorthand strings to numeric top, right, bottom, left components
function parsePaddingString(str) {
  if (!str || typeof str !== 'string') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  // Remove px/em/% units and get numeric components
  const parts = str.trim().split(/\s+/).map(p => {
    const val = Number.parseFloat(p);
    return Number.isNaN(val) ? 0 : val;
  });
  if (parts.length === 1) {
    return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  }
  if (parts.length === 2) {
    return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
  }
  if (parts.length === 3) {
    return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
  }
  if (parts.length >= 4) {
    return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
  }
  return { top: 0, right: 0, bottom: 0, left: 0 };
}

function formatPaddingString(top, right, bottom, left) {
  return `${top || 0}px ${right || 0}px ${bottom || 0}px ${left || 0}px`;
}

// Parse rgba(r,g,b,a) or hex colors with opacity to hex color and float opacity
function parseCardBg(bgStr) {
  if (!bgStr || typeof bgStr !== 'string') {
    return { color: '#ffffff', opacity: 0.12 };
  }
  const clean = bgStr.trim().toLowerCase();
  if (clean === 'transparent') {
    return { color: '#ffffff', opacity: 0 };
  }
  const rgbaMatch = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/.exec(clean);
  if (rgbaMatch) {
    const r = Number.parseInt(rgbaMatch[1]).toString(16).padStart(2, '0');
    const g = Number.parseInt(rgbaMatch[2]).toString(16).padStart(2, '0');
    const b = Number.parseInt(rgbaMatch[3]).toString(16).padStart(2, '0');
    const opacity = Number.parseFloat(rgbaMatch[4]);
    return { color: `#${r}${g}${b}`, opacity };
  }
  const rgbMatch = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/.exec(clean);
  if (rgbMatch) {
    const r = Number.parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = Number.parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = Number.parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return { color: `#${r}${g}${b}`, opacity: 1 };
  }
  if (clean.startsWith('#')) {
    if (clean.length === 9) {
      const opacity = Number.parseInt(clean.substring(7, 9), 16) / 255;
      return { color: clean.substring(0, 7), opacity: Number.parseFloat(opacity.toFixed(2)) };
    }
    return { color: clean, opacity: 1 };
  }
  return { color: '#ffffff', opacity: 0.12 };
}

function formatCardBg(hexColor, opacity) {
  const r = Number.parseInt(hexColor.slice(1, 3), 16);
  const g = Number.parseInt(hexColor.slice(3, 5), 16);
  const b = Number.parseInt(hexColor.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Parse any shadow string (like "0 12px 28px -6px rgba(0, 0, 0, 0.15), 0 8px 14px -4px rgba(...)") to extract color and opacity.
// Returns { color: '#000000', opacity: 0.15 }
function parseShadowColor(shadowStr) {
  if (!shadowStr || typeof shadowStr !== 'string') {
    return { color: '#000000', opacity: 0.15 };
  }
  const clean = shadowStr.toLowerCase();

  // Look for rgba(...) first
  const rgbaMatch = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/.exec(clean);
  if (rgbaMatch) {
    const r = Number.parseInt(rgbaMatch[1]).toString(16).padStart(2, '0');
    const g = Number.parseInt(rgbaMatch[2]).toString(16).padStart(2, '0');
    const b = Number.parseInt(rgbaMatch[3]).toString(16).padStart(2, '0');
    const opacity = Number.parseFloat(rgbaMatch[4]);
    return { color: `#${r}${g}${b}`, opacity };
  }

  // Look for rgb(...)
  const rgbMatch = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/.exec(clean);
  if (rgbMatch) {
    const r = Number.parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = Number.parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = Number.parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return { color: `#${r}${g}${b}`, opacity: 1.0 };
  }

  // Look for hex color
  const hexMatch = /#[0-9a-fA-F]+/.exec(clean);
  if (hexMatch) {
    return { color: hexMatch[0], opacity: 1.0 };
  }

  return { color: '#000000', opacity: 0.15 };
}

function updateShadowColor(shadowStr, newHexColor, newOpacity) {
  const r = Number.parseInt(newHexColor.slice(1, 3), 16);
  const g = Number.parseInt(newHexColor.slice(3, 5), 16);
  const b = Number.parseInt(newHexColor.slice(5, 7), 16);
  const newRgba = `rgba(${r}, ${g}, ${b}, ${newOpacity})`;

  if (!shadowStr || typeof shadowStr !== 'string') {
    return `0 8px 16px ${newRgba}`;
  }
  // Match rgba(...), rgb(...), hex values, or transparent
  const colorRegex = /rgba\([^)]+\)|rgb\([^)]+\)|#[0-9a-fA-F]{3,8}|transparent/g;
  if (colorRegex.test(shadowStr)) {
    return shadowStr.replace(colorRegex, newRgba);
  }
  // If no color was found, append it at the end
  return `${shadowStr.trim()} ${newRgba}`;
}

// Helper to extract hex or rgb/rgba color tokens from a gradient string
function extractColors(str) {
  const hexPattern = /#[0-9a-fA-F]{3,8}/g;
  const rgbPattern = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+)?\)/g;
  let matches = [];

  let match;
  hexPattern.lastIndex = 0;
  rgbPattern.lastIndex = 0;

  while ((match = hexPattern.exec(str)) !== null) {
    matches.push({ index: match.index, val: match[0] });
  }
  while ((match = rgbPattern.exec(str)) !== null) {
    const hexVal = parseCardBg(match[0]).color;
    matches.push({ index: match.index, val: hexVal });
  }
  matches.sort((a, b) => a.index - b.index);
  return matches.map(m => m.val);
}

// Helper to parse background values (gradient or solid color)
function parseBgGradient(bgStr) {
  const result = {
    type: 'solid',
    angle: 135,
    color1: '#059669',
    color2: '#0d9488'
  };
  if (!bgStr || typeof bgStr !== 'string') return result;

  const clean = bgStr.trim();
  if (clean.includes('linear-gradient')) {
    result.type = 'linear';
    const angleMatch = /(\d{1,4})deg/.exec(clean);
    if (angleMatch) {
      result.angle = Number.parseInt(angleMatch[1]);
    }
    const colors = extractColors(clean);
    if (colors.length >= 2) {
      result.color1 = colors[0];
      result.color2 = colors[1];
    } else if (colors.length === 1) {
      result.color1 = colors[0];
      result.color2 = colors[0];
    }
  } else if (clean.includes('radial-gradient')) {
    result.type = 'radial';
    const colors = extractColors(clean);
    if (colors.length >= 2) {
      result.color1 = colors[0];
      result.color2 = colors[1];
    } else if (colors.length === 1) {
      result.color1 = colors[0];
      result.color2 = colors[0];
    }
  } else {
    result.type = 'solid';
    const parsed = parseCardBg(clean);
    result.color1 = parsed.color;
    result.color2 = parsed.color;
  }
  return result;
}

// Helper to format background values into gradient or solid color string
function formatBgGradient(type, angle, color1, color2) {
  if (type === 'solid') {
    return color1;
  } else if (type === 'linear') {
    return `linear-gradient(${angle}deg, ${color1}, ${color2})`;
  } else if (type === 'radial') {
    return `radial-gradient(circle, ${color1}, ${color2})`;
  }
  return color1;
}

// Which welcome-background controls are shown for each background type (radial is the fallback)
const WELCOME_BG_VISIBILITY = {
  solid: { angle: 'none', solid: 'block', grad: 'none' },
  linear: { angle: 'block', solid: 'none', grad: 'flex' },
  radial: { angle: 'none', solid: 'none', grad: 'flex' }
};

function setWelcomeBgVisibility(type) {
  const show = WELCOME_BG_VISIBILITY[type] || WELCOME_BG_VISIBILITY.radial;
  const groups = [
    ['welcome-bg-angle-group', show.angle],
    ['welcome-bg-solid-group', show.solid],
    ['welcome-bg-gradient-colors', show.grad]
  ];
  for (const [id, display] of groups) {
    const el = document.getElementById(id);
    if (el) el.style.display = display;
  }
}

// Setup welcome screen background gradient panel listeners
function setupWelcomeBgPickerListeners() {
  const typeSelect = document.getElementById('welcome-bg-type');
  const angleInput = document.getElementById('welcome-bg-angle');

  const solidPick = document.getElementById('welcome-bg-solid-pick');
  const solidText = document.getElementById('welcome-bg-solid-text');

  const startPick = document.getElementById('welcome-bg-grad-start-pick');
  const startText = document.getElementById('welcome-bg-grad-start-text');
  const endPick = document.getElementById('welcome-bg-grad-end-pick');
  const endText = document.getElementById('welcome-bg-grad-end-text');

  const hiddenInput = document.getElementById('welcome-bg-gradient-hidden');

  if (!typeSelect || !hiddenInput) return;

  const updateWelcomeBg = () => {
    const type = typeSelect.value;
    const angle = Number.parseInt(angleInput.value || 135);
    const color1 = type === 'solid' ? solidText.value : startText.value;
    const color2 = type === 'solid' ? solidText.value : endText.value;

    const formatted = formatBgGradient(type, angle, color1, color2);
    hiddenInput.value = formatted;

    // Dispatch events to trigger the visual-form change handler
    hiddenInput.dispatchEvent(new Event('input'));
    hiddenInput.dispatchEvent(new Event('change'));
  };

  const updateVisibility = () => setWelcomeBgVisibility(typeSelect.value);

  document.getElementById('feature-voice-master')?.addEventListener('change', updateFeatureNestedState);
  document.getElementById('feature-video-master')?.addEventListener('change', updateFeatureNestedState);
  updateFeatureNestedState();

  // Attach change listeners
  typeSelect.addEventListener('change', () => {
    updateVisibility();
    updateWelcomeBg();
  });

  angleInput.addEventListener('input', updateWelcomeBg);

  // Sync picks with texts
  const syncAndChange = (pick, text) => {
    pick.addEventListener('input', () => {
      text.value = pick.value;
      updateWelcomeBg();
    });
    text.addEventListener('input', () => {
      const hex = text.value;
      if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
        pick.value = hex;
      }
      updateWelcomeBg();
    });
  };

  if (solidPick && solidText) syncAndChange(solidPick, solidText);
  if (startPick && startText) syncAndChange(startPick, startText);
  if (endPick && endText) syncAndChange(endPick, endText);

  // Initialize visibility
  updateVisibility();
}

// Parse border shorthand [width]px [style] [color] into width, style, hexColor, and opacity
function parseCardBorder(borderStr) {
  if (!borderStr || typeof borderStr !== 'string') {
    return { width: 1, style: 'solid', color: '#ffffff', opacity: 0.22 };
  }
  const clean = borderStr.trim();
  const widthMatch = /^(\d+)px/.exec(clean);
  const width = widthMatch ? Number.parseInt(widthMatch[1]) : 1;

  const styles = ['solid', 'dashed', 'dotted', 'none', 'double'];
  let style = 'solid';
  for (const s of styles) {
    if (clean.includes(s)) {
      style = s;
      break;
    }
  }

  let color = '#ffffff';
  let opacity = 0.22;
  const rgbaMatch = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/.exec(clean);
  if (rgbaMatch) {
    const r = Number.parseInt(rgbaMatch[1]).toString(16).padStart(2, '0');
    const g = Number.parseInt(rgbaMatch[2]).toString(16).padStart(2, '0');
    const b = Number.parseInt(rgbaMatch[3]).toString(16).padStart(2, '0');
    color = `#${r}${g}${b}`;
    opacity = Number.parseFloat(rgbaMatch[4]);
  } else {
    const hexMatch = /#[0-9a-fA-F]+/.exec(clean);
    if (hexMatch) {
      color = hexMatch[0];
      opacity = 1;
    }
  }

  return { width, style, color, opacity };
}

function formatCardBorder(width, style, hexColor, opacity) {
  if (style === 'none') return 'none';
  const r = Number.parseInt(hexColor.slice(1, 3), 16);
  const g = Number.parseInt(hexColor.slice(3, 5), 16);
  const b = Number.parseInt(hexColor.slice(5, 7), 16);
  return `${width || 1}px ${style || 'solid'} rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Global customization State
window.cutomizationConfig = {};


// Main Initialization
function buildAccordionChevron() {
  const chevron = document.createElement('span');
  chevron.className = 'accordion-chevron-wrapper';
  chevron.innerHTML = `
      <svg class="accordion-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.25s ease;">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;
  return chevron;
}

function setupAccordionSection(section, idx) {
  if (section.querySelector('.accordion-collapse-wrapper')) return;

  const header = section.querySelector('.accordion-header');
  const content = section.querySelector('.accordion-content');
  if (!header?.parentNode || content?.parentNode !== header.parentNode) return;

  header.style.cursor = 'pointer';

  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'accordion-collapse-wrapper';

  const innerWrapper = document.createElement('div');
  innerWrapper.style.minHeight = '0';

  // Insert wrapper and move content inside
  header.parentNode.insertBefore(wrapper, content);
  wrapper.appendChild(innerWrapper);
  innerWrapper.appendChild(content);

  // Add chevron
  header.appendChild(buildAccordionChevron());

  // Expand first section by default
  if (idx === 0) {
    section.classList.add('active');
  }

  header.addEventListener('click', (e) => {
    // Prevent toggle if clicking on forms or other interactive nodes inside header
    if (e.target.closest('input, select, button, label')) return;
    section.classList.toggle('active');
  });
}

// Setup collapsible accordions dynamically
function setupAccordionSections() {
  document.querySelectorAll('.accordion-section').forEach(setupAccordionSection);
}

// Setup Sub-Section Accordion toggles for Greet Form Cards
function setupSubSectionToggles() {
  document.querySelectorAll('.form-section-card').forEach(card => {
    const header = card.querySelector('.form-section-header');
    if (!header) return;

    header.addEventListener('click', (e) => {
      if (e.target.closest('input, select, button, label, .color-picker-wrapper')) return;
      card.classList.toggle('active');
    });
  });
}

// Insert text at the textarea cursor and notify listeners
function insertTextAtCursor(textarea, text) {
  const start = textarea.selectionStart || textarea.value.length;
  const end = textarea.selectionEnd || textarea.value.length;
  textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  textarea.focus();
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function setupMessageCardCounter(card, textarea) {
  const counterEl = card.querySelector('.msg-char-counter .current-count');
  if (!textarea || !counterEl) return;
  const updateCount = () => {
    counterEl.textContent = textarea.value.length;
  };
  textarea.addEventListener('input', updateCount);
  updateCount();
}

function bindMessageToolButton(card, selector, textarea, action) {
  const btn = card.querySelector(selector);
  if (!btn || !textarea) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    action();
  });
}

const MSG_EMOJIS = ['😊', '👋', '💬', '⏳', '✨', '👍'];

function pickRandomEmoji() {
  const [n] = crypto.getRandomValues(new Uint32Array(1));
  return MSG_EMOJIS[n % MSG_EMOJIS.length];
}

function setupMessageAccordionCard(card) {
  const header = card.querySelector('.msg-accordion-header');
  if (!header) return;

  header.addEventListener('click', (e) => {
    if (e.target.closest('input, textarea, button, label, .msg-tool-btn')) return;
    card.classList.toggle('active');
  });

  const textarea = card.querySelector('.msg-textarea');
  setupMessageCardCounter(card, textarea);

  // Emoji, variable tag and formatting / type button handlers
  bindMessageToolButton(card, '.msg-tool-emoji', textarea, () => insertTextAtCursor(textarea, pickRandomEmoji()));
  bindMessageToolButton(card, '.msg-tool-variable', textarea, () => insertTextAtCursor(textarea, '{agent_name}'));
  bindMessageToolButton(card, '.msg-tool-type', textarea, () => textarea.focus());
}

// Setup Accordion toggles & interactive tools for Message Tab Cards
function setupMessageAccordionCards() {
  document.querySelectorAll('.msg-accordion-card').forEach(setupMessageAccordionCard);
}

// Setup Sidebar Toggle FAB
function setupSidebarToggle() {
  const layout = document.querySelector('.customization-layout');
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  if (toggleBtn && layout) {
    const toggleText = toggleBtn.querySelector('.sidebar-toggle-text');
    toggleBtn.addEventListener('click', () => {
      const collapsed = layout.classList.toggle('sidebar-collapsed');
      if (collapsed) {
        toggleText.textContent = 'Show Editor';
        toggleBtn.classList.add('collapsed');
      } else {
        toggleText.textContent = 'Hide Editor';
        toggleBtn.classList.remove('collapsed');
      }
    });
  }
}

// Viewport Toggles (Desktop vs Mobile)
function setupViewportToggles() {
  const previewArea = document.querySelector('.preview-panel');
  const desktopBtn = document.getElementById('viewport-desktop-btn');
  const mobileBtn = document.getElementById('viewport-mobile-btn');

  if (desktopBtn && mobileBtn && previewArea) {
    desktopBtn.addEventListener('click', () => {
      previewArea.classList.remove('mode-mobile');
      desktopBtn.classList.add('active');
      mobileBtn.classList.remove('active');
      // Set desktop zoom to 100%
      if (typeof window.updatePreviewZoom === 'function') {
        window.updatePreviewZoom(1.0);
      }
      // Re-trigger store update to correctly calculate styles
      updateAlpineStores(window.cutomizationConfig);
    });

    mobileBtn.addEventListener('click', () => {
      previewArea.classList.add('mode-mobile');
      mobileBtn.classList.add('active');
      desktopBtn.classList.remove('active');
      // Set mobile zoom multiplier to 1.0 (auto-fit)
      if (typeof window.updatePreviewZoom === 'function') {
        window.updatePreviewZoom(1.0);
      }
      // Re-trigger store update to correctly calculate styles
      updateAlpineStores(window.cutomizationConfig);
    });
  }
}

// Setup visual / JSON editor tab switches
function setupEditorTabSwitch() {
  const tabFormBtn = document.getElementById('tab-form-btn');
  const tabJsonBtn = document.getElementById('tab-json-btn');
  const visualEditorSection = document.getElementById('visual-editor-section');
  const jsonEditorSection = document.getElementById('json-editor-section');

  if (tabFormBtn && tabJsonBtn && visualEditorSection && jsonEditorSection) {
    tabFormBtn.addEventListener('click', () => {
      tabFormBtn.classList.add('active');
      tabJsonBtn.classList.remove('active');
      visualEditorSection.style.display = 'block';
      jsonEditorSection.style.display = 'none';
    });

    tabJsonBtn.addEventListener('click', () => {
      tabJsonBtn.classList.add('active');
      tabFormBtn.classList.remove('active');
      jsonEditorSection.style.display = 'block';
      visualEditorSection.style.display = 'none';
    });
  }
}

const NOTIF_PREVIEW_HTML = `
            <div class="notif-preview-overlay" id="notif-preview-overlay">
              <div class="notif-preview-card box-2" id="notif-preview-card">
                <div class="notif-preview-icon-wrapper">
                  <img id="notif-preview-img-icon" src="" style="display:none;" />
                  <div id="notif-preview-svg-icon">
                    <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#94a3b8" stroke-width="1.3">
                      <rect x="4" y="2" width="10" height="20" rx="1"></rect>
                      <path d="M14 10h6a1 1 0 0 1 1 1v11H14"></path>
                      <path d="M7 6h1M10 6h1M7 10h1M10 10h1M7 14h1M10 14h1M7 18h1M10 18h1"></path>
                    </svg>
                  </div>
                </div>
                <div class="notif-preview-content">
                  <h3 class="notif-preview-title" id="notif-preview-title">Notifications Head</h3>
                  <p class="notif-preview-desc" id="notif-preview-desc">Would you like to receive notifications on latest updates?</p>
                  <div class="notif-preview-actions">
                    <button type="button" class="notif-btn-cancel" id="notif-preview-cancel-btn">Not Yet</button>
                    <button type="button" class="notif-btn-ok" id="notif-preview-approve-btn">OK</button>
                  </div>
                </div>
              </div>
            </div>
          `;

function showFormsTabPreview(widgetEmbed) {
  // Show chat widget overlay on Forms tab and render the real pre-chat/post-chat form state
  if (widgetEmbed) {
    widgetEmbed.style.display = 'block';
  }
  const postchatToggle = document.getElementById('postchat-form-toggle');
  showFormInLivePreview(postchatToggle?.checked ? 'postchat' : 'prechat');
}

function showNotificationsTabPreview(widgetEmbed, previewContent) {
  // Hide chat widget overlay on Notifications tab
  if (widgetEmbed) {
    widgetEmbed.style.display = 'none';
  }
  // Render Notification prompt preview inside preview area
  if (previewContent) {
    previewContent.innerHTML = NOTIF_PREVIEW_HTML;
    triggerNotifPreviewUpdate();
  }
}

function showDefaultTabPreview(widgetEmbed, previewContent, originalHostHtml) {
  // Show chat widget overlay on all other tabs
  if (widgetEmbed) {
    widgetEmbed.style.display = 'block';
  }
  // Restore normal host website content on all other tabs
  if (previewContent && originalHostHtml) {
    previewContent.innerHTML = originalHostHtml;
  }
}

function setPanelOpenForAlpine(open, state) {
  if (!(window.Alpine && Alpine.store('chat'))) return;
  const widgetContainer = document.getElementById('zotly-widget-embed');
  if (widgetContainer?._x_dataStack?.[0]) {
    widgetContainer._x_dataStack[0].openContactWidget = open;
  }
  Alpine.store('chat').panelOpen = open;
  if (state) Alpine.store('chat').state = state;
}

// Display chat window (active chat view) at first ONLY on Messages and Features tabs
function openChatPanelForTab(tabName) {
  if (window.ChatWidgetLit?.chatStore) {
    const cs = window.ChatWidgetLit.chatStore.get();
    if (cs) {
      cs.panelOpen = true;
      cs.state = 'active';
    }
    const rootEl = document.querySelector('cw-widget-root');
    if (rootEl) rootEl.panelOpen = true;
  }
  setPanelOpenForAlpine(true, 'active');
  if (tabName === 'tab-messages') {
    applyMessagePreview(window.activeMessagePreviewKey || 'welcome');
  }
}

// Normal tabs (Appearance, Layout, Snippet, Share): work as normal with bubble/chatbar
function closeChatPanelForNormalTab() {
  if (window.ChatWidgetLit?.chatStore) {
    const cs = window.ChatWidgetLit.chatStore.get();
    if (cs) cs.panelOpen = false;
    const rootEl = document.querySelector('cw-widget-root');
    if (rootEl) rootEl.panelOpen = false;
  }
  setPanelOpenForAlpine(false);
  const cfg = window.cutomizationConfig;
  if (window.Alpine && Alpine.store('bubble') && cfg?.bubble) {
    Alpine.store('bubble').hideOnOpen = cfg.bubble.hideOnOpen !== false;
  }
  if (window.Alpine && Alpine.store('chatbar') && cfg?.chatbar) {
    Alpine.store('chatbar').hideOnOpen = cfg.chatbar.hideOnOpen !== false;
  }
}

function syncChatPanelForTab(tabName) {
  if (tabName === 'tab-messages' || tabName === 'tab-features') {
    openChatPanelForTab(tabName);
  } else if (tabName !== 'tab-forms' && tabName !== 'tab-notifications') {
    closeChatPanelForNormalTab();
  }
}

function activateNavTab(tab) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
  tab.classList.add('active');
  const targetTab = document.getElementById(tab.dataset.tab);
  if (targetTab) targetTab.classList.add('active');
}

// --- TOP TAB NAVIGATION ---
function setupTopTabNavigation() {
  // Variable to cache the original host website mockup HTML
  let originalHostWebsiteHTML = '';

  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activateNavTab(tab);
      const tabName = tab.dataset.tab;

      const widgetEmbed = document.getElementById('zotly-widget-embed') || document.querySelector('cw-widget-root');
      const previewContent = document.getElementById('preview-scrollable-content');

      // Store original host page content if not already cached
      if (previewContent && !originalHostWebsiteHTML && !previewContent.querySelector('.phone-preview-card-container')) {
        originalHostWebsiteHTML = previewContent.innerHTML;
      }

      if (tabName === 'tab-forms') {
        showFormsTabPreview(widgetEmbed);
      } else if (tabName === 'tab-notifications') {
        showNotificationsTabPreview(widgetEmbed, previewContent);
      } else {
        showDefaultTabPreview(widgetEmbed, previewContent, originalHostWebsiteHTML);
      }

      // Handle visibility of minimal message preview dropdown inside preview container
      const msgDropdownBar = document.getElementById('preview-msg-dropdown-bar');
      if (msgDropdownBar) {
        msgDropdownBar.style.display = tabName === 'tab-messages' ? 'flex' : 'none';
      }

      syncChatPanelForTab(tabName);
    });
  });
}

function setupSaveAndResetButtons() {
  // --- SAVE CONFIG BUTTON ---
  document.getElementById('btn-save-config')?.addEventListener('click', () => {
    let cfg = window.cutomizationConfig;
    while (cfg?.cdnConfig && typeof cfg.cdnConfig === 'object' && !Array.isArray(cfg.cdnConfig)) {
      cfg = cfg.cdnConfig;
    }
    postToTrustedParent({
      type: 'SAVE_WIDGET_CONFIG',
      cdnConfig: cfg
    });
  });

  // --- RESET BUTTON IN HEADER ---
  document.getElementById('btn-reset-chat-header')?.addEventListener('click', refreshWidgetPreview);

  // --- RETRIGGER BUTTONS ---
}

// Briefly show "Copied!" on a button label
function flashCopied(el) {
  const oldText = el.textContent;
  el.textContent = 'Copied!';
  setTimeout(() => { el.textContent = oldText; }, 2000);
}

// --- COPY SNIPPET BUTTON ---
function setupCopySnippetButton() {
  document.getElementById('btn-copy-snippet')?.addEventListener('click', () => {
    const ta = document.getElementById('code-snippet-text');
    if (!ta) return;
    ta.select();
    document.execCommand('copy');
    const target = document.querySelector('#btn-copy-snippet .btn-copy-label') || document.getElementById('btn-copy-snippet');
    if (target) flashCopied(target);
  });
}

// --- COPY SHARE LINK BUTTON ---
function setupCopyShareButton() {
  document.getElementById('btn-copy-share')?.addEventListener('click', () => {
    const shareUrl = document.getElementById('share-link-input')?.value || 'https://brewflocktechnologies-ui.github.io/ai-widgets-websites/clientwebsites/site-amber.html';
    const btnText = document.querySelector('#btn-copy-share .btn-copy-text');
    const flash = () => {
      if (btnText) flashCopied(btnText);
    };
    navigator.clipboard.writeText(shareUrl).then(flash).catch(() => {
      const inp = document.getElementById('share-link-input');
      if (inp) {
        inp.select();
        document.execCommand('copy');
      }
      flash();
    });
  });
}

function setupPreviewZoom() {
  const previewArea = document.querySelector('.preview-panel');
  // --- PREVIEW ZOOM & AUTO-RESPONSIVE FIT CONTROLS ---
  let userZoomLevel = 1.0;
  const zoomOutBtn = document.getElementById('btn-zoom-out');
  const zoomInBtn = document.getElementById('btn-zoom-in');
  const zoomText = document.getElementById('zoom-level-text');
  const previewWrapper = document.getElementById('preview-viewport-wrapper');
  const previewContainer = document.querySelector('.preview-viewport-container');

  function calculateAndApplyPreviewScale() {
    if (!previewContainer || !previewWrapper || !previewArea) return;

    const isMobile = previewArea.classList.contains('mode-mobile');

    if (isMobile) {
      // Container available space minus safety padding
      const paddingX = 32;
      const paddingY = 32;

      const containerW = previewContainer.clientWidth - paddingX;
      const containerH = previewContainer.clientHeight - paddingY;

      if (containerW > 0 && containerH > 0) {
        const targetW = 391; // 375px phone + 16px frame border
        const targetH = 736; // 720px phone + 16px frame border

        const scaleX = containerW / targetW;
        const scaleY = containerH / targetH;

        // Auto-fit scale factor for 100% visible mobile phone frame
        const autoFitScale = Math.min(scaleX, scaleY);
        const finalScale = autoFitScale * userZoomLevel;

        previewWrapper.style.zoom = finalScale;
      }
    } else {
      // Desktop View: Container fills 100% preview panel, widget renders crisp at 1:1 scale
      previewWrapper.style.zoom = userZoomLevel;
    }

    if (zoomText) {
      zoomText.textContent = `${Math.round(userZoomLevel * 100)}%`;
    }
  }

  function updateZoom(newZoomMultiplier) {
    if (newZoomMultiplier !== undefined) {
      userZoomLevel = Math.min(2.0, Math.max(0.3, newZoomMultiplier));
    }
    calculateAndApplyPreviewScale();
  }

  window.updatePreviewZoom = updateZoom;

  zoomOutBtn?.addEventListener('click', () => {
    updateZoom(userZoomLevel - 0.1);
  });

  zoomInBtn?.addEventListener('click', () => {
    updateZoom(userZoomLevel + 0.1);
  });

  zoomText?.addEventListener('click', () => {
    updateZoom(1.0); // Reset to 100% auto-fit
  });

  // Watch for preview container size changes (screen resize / sidebar toggle)
  if (previewContainer) {
    const resizeObserver = new ResizeObserver(() => {
      calculateAndApplyPreviewScale();
    });
    resizeObserver.observe(previewContainer);
  }

  window.addEventListener('resize', () => {
    calculateAndApplyPreviewScale();
  });

  // Initial auto-scale calculation
  setTimeout(calculateAndApplyPreviewScale, 100);
}

function setupApplyJsonButton() {
  // --- APPLY JSON BUTTON ---
  document.getElementById('btn-apply-json')?.addEventListener('click', () => {
    const ta = document.getElementById('raw-json-textarea');
    if (!ta) return;
    try {
      const parsed = JSON.parse(ta.value);
      // Structural validation before the config reaches global state (and,
      // via the host, the database).
      const check = window.CWCore
        ? window.CWCore.validateWidgetConfig(parsed)
        : { ok: true, errors: [] };
      if (!check.ok) {
        alert('Invalid config: ' + check.errors.join('; '));
        return;
      }
      window.cutomizationConfig = parsed;
      syncConfigToVisualForm(window.cutomizationConfig);
      updateAlpineStores(window.cutomizationConfig);
      const js = document.getElementById('json-status');
      if (js) {
        js.className = 'json-status valid';
        js.textContent = '✓ JSON changes applied successfully.';
      }
    } catch (e) {
      alert('Invalid JSON: ' + e.message);
    }
  });
}

function signalMfeReady() {
  // --- SIGNAL HOST THAT MFE IS FULLY READY TO RECEIVE CONFIG ---
  // The host listens for this and immediately pushes the MongoDB config via LOAD_WIDGET_CONFIG.
  // This avoids all timing races on page load / website switch.
  if (window.parent && window.parent !== window) {
    postToTrustedParent({ type: 'MFE_READY' });
  }
}

// The settings markup pairs a visible `.setting-title` with controls in the same
// `.setting-row`, but never links them, so screen readers announce bare "combo box" /
// "edit text". Give every unnamed control an accessible name from its row title.
const CONTROL_KIND_SUFFIX = {
  color: 'color picker',
  range: 'slider',
  number: 'value',
  file: 'file'
};

function hasAccessibleName(el) {
  if (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby') || el.title) return true;
  // A wrapping <label> only names the control when it carries text (toggle switches don't).
  if (el.closest('label')?.textContent.trim()) return true;
  return !!(el.id && el.ownerDocument.querySelector(`label[for="${CSS.escape(el.id)}"]`));
}

function humanizePath(path) {
  const last = (path || '').split('.').pop() || '';
  return last.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

const cleanText = (node) => node?.textContent.trim().replace(/\s+/g, ' ') || '';

// The visible title for a control: `.setting-title` in its row, otherwise the leading
// heading-like block of the nearest ancestor that has one before the control.
function findControlTitle(el) {
  const row = el.closest('.setting-row');
  const rowTitle = cleanText(row?.querySelector('.setting-title'));
  if (rowTitle) return { title: rowTitle, scope: row };
  for (let node = el.parentElement, depth = 0; node && depth < 6; node = node.parentElement, depth++) {
    const lead = node.firstElementChild;
    if (!lead || lead.contains(el)) continue;
    const text = cleanText(lead.firstElementChild || lead);
    if (text && text.length <= 80) return { title: text, scope: node };
  }
  return { title: '', scope: el.parentElement };
}

function labelUnnamedControls(root = document) {
  const controls = [...root.querySelectorAll('input, select, textarea')].filter(
    (el) => !['hidden', 'button', 'submit', 'reset', 'image'].includes(el.type) && !hasAccessibleName(el)
  );
  const groups = new Map();
  controls.forEach((el) => {
    const { title, scope } = findControlTitle(el);
    if (!groups.has(scope)) groups.set(scope, { title, els: [] });
    groups.get(scope).els.push(el);
  });

  groups.forEach(({ title, els }) => {
    const used = new Map();
    els.forEach((el, i) => {
      const base = title || humanizePath(el.dataset.path) || el.placeholder || 'Setting';
      let detail = CONTROL_KIND_SUFFIX[el.type] || '';
      if (el.classList.contains('color-picker-text')) detail = 'hex value';
      else if (el.tagName === 'TEXTAREA') detail = '';
      // Several controls share one title: tell them apart.
      if (!detail && els.length > 1 && el.type !== 'checkbox') detail = el.placeholder || `field ${i + 1}`;
      const label = detail ? `${base} (${detail})` : base;
      const n = (used.get(label) || 0) + 1;
      used.set(label, n);
      // Identical siblings (e.g. top/right/bottom/left) get a position number.
      el.setAttribute('aria-label', n > 1 ? `${label} ${n}` : label);
    });
  });
}

async function initCustomizationApp() {
  labelUnnamedControls();

  // 1. Setup collapsible accordions dynamically
  setupAccordionSections();
  setupSubSectionToggles();
  setupMessageAccordionCards();

  // 2. Setup Sidebar Toggle FAB
  setupSidebarToggle();
  setupViewportToggles();

  // 3. Setup Welcome background gradient picker event listeners
  setupWelcomeBgPickerListeners();

  // Setup tab switches
  setupEditorTabSwitch();

  // Load customization config if not already initialized from mount options
  if (!window.cutomizationConfig || Array.isArray(window.cutomizationConfig) || Object.keys(window.cutomizationConfig).length === 0) {
    await loadDefaultConfig();
  } else {
    syncConfigToVisualForm(window.cutomizationConfig);
  }

  // Boot the chat widget preview
  await bootstrapWidgetPreview();

  // Watch for visual form input changes
  setupFormEventListeners();

  // Messages-tab preview dropdown (switch which message shows in the chat window)
  setupMessagePreviewControls();

  // Watch for raw JSON changes
  setupJsonEditorEventListeners();

  // Setup auxiliary buttons
  document.getElementById('btn-format-json')?.addEventListener('click', formatRawJson);

  // Host Page Theme controls
  setupHostPageThemeControls();

  // Initialize Sticky Section Breadcrumb Tracker
  initStickyBreadcrumbTracker();

  setupTopTabNavigation();
  setupSaveAndResetButtons();
  setupCopySnippetButton();
  setupCopyShareButton();
  setupPreviewZoom();
  setupApplyJsonButton();
  signalMfeReady();
}

function updateAddressBarDomain(domain) {
  if (!domain || typeof domain !== 'string') return;
  const addressSpan = document.querySelector('#preview-address-bar-domain, .chrome-address-bar span');
  if (addressSpan) {
    addressSpan.textContent = domain;
  }
}
window.updateAddressBarDomain = updateAddressBarDomain;

// --- GLOBAL FORM MODIFICATION DETECTOR ---
// Notify host page ONLY when user explicitly modifies any input/setting in the customization form
let isHydratingForm = true;
setTimeout(() => { isHydratingForm = false; }, 1500);

function getCurrentCdnConfig() {
  let cfg = window.cutomizationConfig;
  while (cfg?.cdnConfig && typeof cfg.cdnConfig === 'object' && !Array.isArray(cfg.cdnConfig)) {
    cfg = cfg.cdnConfig;
  }
  return cfg;
}

document.addEventListener('input', (e) => {
  if (!isHydratingForm && e?.isTrusted) {
    postToTrustedParent({ type: 'WIDGET_CONFIG_CHANGED', cdnConfig: getCurrentCdnConfig() });
  }
});
document.addEventListener('change', (e) => {
  if (!isHydratingForm && e?.isTrusted) {
    postToTrustedParent({ type: 'WIDGET_CONFIG_CHANGED', cdnConfig: getCurrentCdnConfig() });
  }
});

// --- POSTMESSAGE LISTENER: receive config from host page ---
// Handled message types (routing, trust and validation live in CWCore so they
// are unit-tested; only the DOM/store side effects are defined here):
//   LOAD_WIDGET_CONFIG     – host pushes cdnConfig fetched from MongoDB + domain
//   UPDATE_PREVIEW_DOMAIN  – host pushes updated website domain URL
//   RESET_WIDGET_PREVIEW   – host asks iframe to reset the preview
//   REQUEST_WIDGET_CONFIG  – host asks iframe to report its current config
const __cwHostMessageActions = {
  updateDomain(domain) {
    updateAddressBarDomain(domain);
  },
  applyConfig(cfg) {
    isHydratingForm = true;
    setTimeout(() => { isHydratingForm = false; }, 800);

    if (cfg.domain) {
      updateAddressBarDomain(cfg.domain);
    }

    window.cutomizationConfig = cfg;
    // A partial preview-sync failure must not kill the message listener.
    try {
      syncConfigToVisualForm(cfg);
      updateAlpineStores(cfg);
      if (window.ChatWidgetLit?.injectStoreConfig) {
        window.ChatWidgetLit.injectStoreConfig(cfg);
      }
    } catch (err) {
      console.warn('[CW] Preview sync failed for host config:', err);
    }
  },
  resetPreview() {
    if (typeof refreshWidgetPreview === 'function') {
      refreshWidgetPreview();
    }
  },
  // HOST toolbar "Save CDN Config" button requests current config from iframe
  sendConfig() {
    const cfg = window.CWCore
      ? window.CWCore.unwrapCdnConfig(window.cutomizationConfig)
      : window.cutomizationConfig;
    postToTrustedParent({
      type: 'SAVE_WIDGET_CONFIG',
      cdnConfig: cfg
    });
  }
};

window.addEventListener('message', (event) => {
  if (!event?.data || !window.CWCore) return;
  const outcome = window.CWCore.processHostMessage(
    event, __cwMessagingPolicy, window.parent, __cwHostMessageActions
  );
  if (outcome?.startsWith('rejected:')) {
    console.warn('[CW] Host message rejected (' + outcome + ') from origin:', event.origin);
  }
});

function ensureLitPointerEvents(widgetRoot) {
  if (!widgetRoot) return;

  const applyStyles = () => {
    if (widgetRoot.shadowRoot) {
      const styleId = 'cw-preview-pointer-events-fix';
      if (!widgetRoot.shadowRoot.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          :host { pointer-events: none !important; }
          cw-widget-layout { pointer-events: none !important; }
        `;
        widgetRoot.shadowRoot.appendChild(style);
      }

      const layout = widgetRoot.shadowRoot.querySelector('cw-widget-layout');
      if (layout?.shadowRoot && !layout.shadowRoot.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          :host { pointer-events: none !important; }
          cw-bubble, cw-chatbar, cw-greet-window, cw-welcome-card, cw-chat-panel {
            pointer-events: auto !important;
          }
        `;
        layout.shadowRoot.appendChild(style);
      }
    }
  };

  applyStyles();
  setTimeout(applyStyles, 100);
  setTimeout(applyStyles, 500);
}

// Bootstrap modular widget manually using Lit Web Component
function mountPreviewWidgetRoot(targetContainer) {
  // Remove any auto-mounted widget root elements attached directly to document.body
  document.querySelectorAll('body > cw-widget-root').forEach(el => el.remove());

  let widgetRoot = targetContainer.querySelector('cw-widget-root');

  if (window.ChatWidgetLit?.mountChatWidgetWithToken) {
    widgetRoot = window.ChatWidgetLit.mountChatWidgetWithToken(window.cutomizationConfig || {}, targetContainer);
  } else if (!widgetRoot) {
    widgetRoot = document.createElement('cw-widget-root');
    targetContainer.appendChild(widgetRoot);
  }

  ensureLitPointerEvents(widgetRoot);

  // Ensure widget container is hidden if starting on Forms or Notifications tab, otherwise shown
  const isFormsActive = document.querySelector('.nav-tab[data-tab="tab-forms"]')?.classList.contains('active');
  const isNotifActive = document.querySelector('.nav-tab[data-tab="tab-notifications"]')?.classList.contains('active');
  if (widgetRoot) {
    widgetRoot.style.display = (isFormsActive || isNotifActive) ? 'none' : 'block';
  }
  return widgetRoot;
}

// Fallback Alpine widget, used if window.ZotlyChatWindowHTML exists
async function mountAlpineFallbackWidget(targetContainer) {
  if (!window.ZotlyChatWindowHTML) return;
  let widgetContainer = document.getElementById('zotly-widget-embed');
  if (!widgetContainer) {
    widgetContainer = document.createElement('div');
    widgetContainer.id = 'zotly-widget-embed';
    widgetContainer.setAttribute('x-data', '{ openContactWidget: false }');
    widgetContainer.setAttribute('@toggle-contact-widget.window', 'openContactWidget = !openContactWidget; $store.chat.panelOpen = openContactWidget; if (openContactWidget) { $store.chat.unreadCount = 0; }');
    widgetContainer.setAttribute('@close-contact-widget.window', 'openContactWidget = false; $store.chat.panelOpen = false;');
    widgetContainer.innerHTML = window.ZotlyChatWindowHTML + window.ZotlyWelcomeHTML + window.ZotlyBubbleHTML + window.ZotlyChatbarHTML;
    targetContainer.appendChild(widgetContainer);
  }
  if (window.Alpine && window.ZotlyInitStores) {
    await window.ZotlyInitStores();
    window.Alpine.initTree(widgetContainer);
  }
}

// Open the chat window panel (Lit store, Lit root and Alpine fallback)
function openPreviewChatPanel(widgetRoot) {
  const cs = window.ChatWidgetLit?.chatStore?.get();
  if (cs) {
    cs.panelOpen = true;
    cs.state = 'active';
  }
  if (widgetRoot) {
    widgetRoot.panelOpen = true;
  }
  if (window.Alpine && Alpine.store('chat')) {
    const widgetContainer = document.getElementById('zotly-widget-embed');
    if (widgetContainer?._x_dataStack?.[0]) {
      widgetContainer._x_dataStack[0].openContactWidget = true;
    }
    Alpine.store('chat').panelOpen = true;
    Alpine.store('chat').state = 'active';
  }
}

async function bootstrapWidgetPreview() {
  const viewportWrapper = document.getElementById('preview-viewport-wrapper');
  const targetContainer = viewportWrapper || document.body;

  const widgetRoot = mountPreviewWidgetRoot(targetContainer);
  await mountAlpineFallbackWidget(targetContainer);

  // Update stores with active customization config
  updateAlpineStores(window.cutomizationConfig);

  // Auto open chat window active panel if starting on Messages or Features tab
  const activeTabName = document.querySelector('.nav-tab.active')?.dataset.tab;
  if (activeTabName === 'tab-messages' || activeTabName === 'tab-features') {
    openPreviewChatPanel(widgetRoot);
  }

  // Ensure the chat-window preview shows only the selected greeting message,
  // not every message seeded from the config (covers initial load + remounts).
  applyMessagePreview(window.activeMessagePreviewKey || 'welcome');
}

// Default config loader (replaces preset-based loader)
// Fetch the default preset, falling back to a minimal structure when it can't be loaded
async function fetchDefaultConfig(defaultClient) {
  try {
    const presetBase = (window.__CUSTOMIZATION_ASSET_BASE__ || '') + 'clients/';
    const res = await fetch(`${presetBase}${defaultClient}.json`);
    if (!res.ok) throw new Error("Failed to load default config");
    return await res.json();
  } catch (err) {
    console.warn("Could not load default config, using minimal structure: ", err);
    return {
      name: "Brewflock",
      configname: "Brewflock",
      clientId: defaultClient || "friday",
      clientName: "Brewflock",
      agentName: "Support Agent",
      features: {},
      messages: [],
      greetWindow: { enabled: true, title: "Need help?", description: "Chat with us!", useWebsiteTheme: true },
      bubble: { useWebsiteTheme: true, width: 55, height: 55 },
      chatWindow: { useWebsiteTheme: true },
      chatbar: { enabled: false }
    };
  }
}

async function loadDefaultConfig() {
  const cfg = window.cutomizationConfig;
  // Config already supplied via mount options from MongoDB — preserve it
  const hasSuppliedConfig = cfg && !Array.isArray(cfg) && Object.keys(cfg).length > 0;
  if (!hasSuppliedConfig) {
    window.cutomizationConfig = await fetchDefaultConfig('default');
  }

  // Apply Mock Host theme variables from accent color
  const accent = window.cutomizationConfig?.accentColor;
  if (accent) {
    document.documentElement.style.setProperty('--primary-color', accent);
    document.documentElement.style.setProperty('--secondary-color', accent);
    const hostPrimaryInput = document.getElementById('host-primary-color');
    const hostSecondaryInput = document.getElementById('host-secondary-color');
    if (hostPrimaryInput) hostPrimaryInput.value = accent;
    if (hostSecondaryInput) hostSecondaryInput.value = accent;
  }

  // Update raw JSON textarea
  const jsonTextarea = document.getElementById('raw-json-textarea');
  if (jsonTextarea) {
    jsonTextarea.value = JSON.stringify(window.cutomizationConfig, null, 2);
  }

  // Reset welcome card display tracker
  window.lastWelcomeEnabled = undefined;

  // Populate Visual Form Controls
  syncConfigToVisualForm(window.cutomizationConfig);

  // Sync to Alpine Stores
  if (window.Alpine) {
    updateAlpineStores(window.cutomizationConfig);
  }
}

// Reset a data-path control whose config value is missing
function clearInput(input) {
  if (input.type === 'checkbox') {
    input.checked = false;
  } else {
    input.value = '';
  }
}

// Sync both color input and text input inside wrapper
function setColorInput(input, val) {
  input.value = val;
  const textInput = input.parentElement.querySelector('.color-picker-text');
  if (textInput) textInput.value = val;
}

function setNumberInput(input, val) {
  const num = val === null ? Number.NaN : Number.parseFloat(val);
  input.value = Number.isNaN(num) ? '' : num;
}

function setTextInput(input, val) {
  input.value = val;
  // Update range labels if present
  if (input.type === 'range') {
    const valSpan = input.parentElement.querySelector('.range-val');
    if (valSpan) valSpan.textContent = val + (input.dataset.unit || '');
  }
}

// Write one config value into its data-path form control
function syncInputFromConfig(input, config) {
  const path = input.dataset.path;
  const val = getValueByPath(config, path);

  if (val === undefined) {
    clearInput(input);
  } else if (path === 'chatWindow.welcome.avatars' && Array.isArray(val)) {
    // Special presentation for welcome avatars list
    input.value = val.join(', ');
  } else if (input.type === 'checkbox') {
    input.checked = !!val;
  } else if (input.type === 'color') {
    setColorInput(input, val);
  } else if (input.type === 'number') {
    setNumberInput(input, val);
  } else {
    setTextInput(input, val);
  }
}

function setElValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

// Fill in the sections a config may be missing, so the form always has something to bind to
function ensureConfigDefaults(config) {
  if (!config.features) {
    config.features = defaultFeatures();
  }
  if (!config.chatWindow) {
    config.chatWindow = {};
  }
  config.chatWindow.features = config.features;

  if (!config.notification) {
    config.notification = {
      enabled: true,
      icon: "building",
      iconUrl: "",
      headline: "Notifications Head",
      description: "Would you like to receive notifications on latest updates?",
      approveText: "OK",
      cancelText: "Not Yet",
      delayValue: 5,
      delayUnit: "Seconds",
      promptStyle: "box2",
      animationStyle: "drop-in",
      position: "top",
      repromptDelay: 1
    };
  }
}

const NOTIF_COUNTERS = [
  ['notif-headline-input', 'headline-counter'],
  ['notif-desc-input', 'desc-counter'],
  ['notif-approve-btn-input', 'approve-counter'],
  ['notif-cancel-btn-input', 'cancel-counter']
];

// Sync notification character counters & style radio options
function syncNotificationControls(config) {
  NOTIF_COUNTERS.forEach(([inputId, counterId]) => {
    const input = document.getElementById(inputId);
    if (input) updateNotifCounter(input, counterId);
  });

  if (config.notification) {
    selectNotifPromptStyle(config.notification.promptStyle || 'box2');

    const animRadio = document.querySelector(`input[name="notifAnimation"][value="${config.notification.animationStyle || 'drop-in'}"]`);
    if (animRadio) animRadio.checked = true;
    const posRadio = document.querySelector(`input[name="notifPosition"][value="${config.notification.position || 'top'}"]`);
    if (posRadio) posRadio.checked = true;
  }
}

// Sync Share by Link URL
function syncShareLink(config) {
  const presetName = config.clientId || 'default';
  const shareUrl = `https://brewflocktechnologies-ui.github.io/ai-widgets-websites/clientwebsites/site-${presetName}.html`;
  setElValue('share-link-input', shareUrl);
  const shareText = document.getElementById('share-link-url-text');
  if (shareText) shareText.textContent = shareUrl;
}

// Sync padding-grids
function syncPaddingGridsFromConfig(config) {
  document.querySelectorAll('.padding-grid[data-padding-path]').forEach(grid => {
    const parsed = parsePaddingString(getValueByPath(config, grid.dataset.paddingPath));
    ['top', 'right', 'bottom', 'left'].forEach(side => {
      const input = grid.querySelector(`[data-pad="${side}"]`);
      if (input) input.value = parsed[side];
    });
  });
}

// Show a color + opacity pair (picker, text box, opacity slider and its % label)
function setColorOpacityControls(pick, text, opacityInput, opacityLabel, parsed) {
  if (pick) pick.value = parsed.color;
  if (text) text.value = parsed.color;
  if (opacityInput) {
    opacityInput.value = parsed.opacity;
    setOpacityLabel(opacityLabel, parsed.opacity);
  }
}

// Sync welcome card background picker & opacity
function syncWelcomeCardBgFromConfig(config) {
  const parsed = parseCardBg(getValueByPath(config, 'chatWindow.welcome.cardBg'));
  setColorOpacityControls(
    document.getElementById('welcome-card-bg-color-pick'),
    document.getElementById('welcome-card-bg-color-text'),
    document.getElementById('welcome-card-bg-opacity'),
    document.getElementById('welcome-card-bg-opacity-label'),
    parsed
  );
}

// Sync welcome card border details
function syncWelcomeCardBorderFromConfig(config) {
  const parsed = parseCardBorder(getValueByPath(config, 'chatWindow.welcome.cardBorder'));
  setElValue('welcome-card-border-width', parsed.width);
  setElValue('welcome-card-border-style', parsed.style);
  setColorOpacityControls(
    document.getElementById('welcome-card-border-color-pick'),
    document.getElementById('welcome-card-border-color-text'),
    document.getElementById('welcome-card-border-opacity'),
    document.getElementById('welcome-card-border-opacity-label'),
    parsed
  );
}

// Sync welcome background gradient & solid picker
function syncWelcomeGradientFromConfig(config) {
  const gradVal = getValueByPath(config, 'chatWindow.welcome.bgGradient');
  if (!gradVal) return;

  const parsed = parseBgGradient(gradVal);
  setElValue('welcome-bg-gradient-hidden', gradVal);

  const typeSelect = document.getElementById('welcome-bg-type');
  if (!typeSelect) return;
  typeSelect.value = parsed.type;

  // Update custom component visibility
  setWelcomeBgVisibility(parsed.type);

  if (parsed.type === 'solid') {
    setElValue('welcome-bg-solid-pick', parsed.color1);
    setElValue('welcome-bg-solid-text', parsed.color1);
  } else {
    setElValue('welcome-bg-angle', parsed.angle);
    setElValue('welcome-bg-grad-start-pick', parsed.color1);
    setElValue('welcome-bg-grad-start-text', parsed.color1);
    setElValue('welcome-bg-grad-end-pick', parsed.color2);
    setElValue('welcome-bg-grad-end-text', parsed.color2);
  }
}

// Sync the start / end gradient stop colors of a launcher (bubble or chatbar)
function syncGradientStopsFromConfig(config, section) {
  const stops = getValueByPath(config, `${section}.gradientStops`);
  if (!stops || !Array.isArray(stops)) return;

  [['start', 0], ['end', 1]].forEach(([edge, index]) => {
    if (!stops[index]) return;
    const color = stops[index].color;
    setElValue(`${section}-grad-${edge}-pick`, color);
    setElValue(`${section}-grad-${edge}-text`, color);
  });
}

// Sync all shadow-editor-wrapper fields
function syncShadowEditorsFromConfig(config) {
  document.querySelectorAll('.shadow-editor-wrapper[data-shadow-path]').forEach(wrapper => {
    const parsed = parseShadowColor(getValueByPath(config, wrapper.dataset.shadowPath));
    setColorOpacityControls(
      wrapper.querySelector('.shadow-color-pick'),
      wrapper.querySelector('.shadow-color-text'),
      wrapper.querySelector('.shadow-opacity'),
      wrapper.querySelector('.shadow-opacity-label'),
      parsed
    );
  });
}

// Sync Launcher Style Segmented Buttons
function syncLauncherButtonsFromConfig(config) {
  const chatbarBtn = document.getElementById('launcher-chatbar-btn');
  const bubbleBtn = document.getElementById('launcher-bubble-btn');
  if (!chatbarBtn || !bubbleBtn) return;
  const chatbarEnabled = !!getValueByPath(config, 'chatbar.enabled');
  chatbarBtn.classList.toggle('active', chatbarEnabled);
  bubbleBtn.classList.toggle('active', !chatbarEnabled);
}

// Populate visual controls from active config object
function syncConfigToVisualForm(config) {
  if (!config) return;

  // Sync raw JSON textarea
  const jsonTextarea = document.getElementById('raw-json-textarea');
  if (jsonTextarea) {
    jsonTextarea.value = JSON.stringify(config, null, 2);
  }

  ensureConfigDefaults(config);

  document.querySelectorAll('[data-path]').forEach(input => syncInputFromConfig(input, config));

  syncNotificationControls(config);
  triggerNotifPreviewUpdate();
  syncShareLink(config);
  syncPaddingGridsFromConfig(config);
  syncWelcomeCardBgFromConfig(config);
  syncWelcomeCardBorderFromConfig(config);
  syncWelcomeGradientFromConfig(config);
  syncGradientStopsFromConfig(config, 'bubble');
  syncGradientStopsFromConfig(config, 'chatbar');
  syncShadowEditorsFromConfig(config);
  syncLauncherButtonsFromConfig(config);

  // Sync Messages-tab textareas from the config messages array
  syncMessageTextareas();

  updateColorPickerStates();
  updateDisabledAccordionStates();
}

// Smoothly scroll to the top Theme Synchronization toggle card and flash pulse highlight
function scrollToThemeSyncToggle(target) {
  let topBanner = null;
  if (typeof target === 'string') {
    topBanner = document.querySelector(target);
  } else if (target?.querySelector) {
    topBanner = target;
  } else {
    topBanner = document.querySelector('.top-theme-banner-card');
  }
  if (topBanner) {
    topBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    topBanner.classList.remove('highlight-pulse');
    topBanner.getBoundingClientRect(); // Force reflow
    topBanner.classList.add('highlight-pulse');
    setTimeout(() => {
      topBanner.classList.remove('highlight-pulse');
    }, 2000);
  }
}

// Disable color inputs and show warning hint text if theme sync is enabled
// Disable/dim a single color control pair and (optionally) its hint
function applyControlState(pick, text, hint, disabled, bannerSelector) {
  if (!pick && !text) return;
  if (pick) pick.disabled = disabled;
  if (text) text.disabled = disabled;
  const wrapper = pick?.parentElement || text?.parentElement;
  if (wrapper) {
    wrapper.style.opacity = disabled ? '0.4' : '1';
    wrapper.style.pointerEvents = disabled ? 'none' : '';
  }
  if (hint) styleGreetThemeHint(hint, disabled, bannerSelector || '.top-theme-banner-card');
}

function disablePlainControl(el, disabled) {
  if (el) el.disabled = disabled;
}

function findByPath(path) {
  return {
    pick: document.querySelector('input[type="color"][data-path="' + path + '"]'),
    text: document.querySelector('input.color-picker-text[data-path="' + path + '"]')
  };
}

function syncBubbleThemeControls(toggle) {
  const on = toggle.checked;
  const banner = '#bubble-theme-banner';
  applyControlState(document.getElementById('bubble-bg-color-pick'), document.getElementById('bubble-bg-color'), document.getElementById('bubble-bg-color-hint'), on, banner);
  applyControlState(document.getElementById('bubble-grad-start-pick'), document.getElementById('bubble-grad-start-text'), null, on, banner);
  applyControlState(document.getElementById('bubble-grad-end-pick'), document.getElementById('bubble-grad-end-text'), null, on, banner);
  const ringPair = findByPath('bubble.outlineRing.color');
  applyControlState(ringPair.pick, ringPair.text, null, on, banner);
  disablePlainControl(document.querySelector('select[data-path="bubble.gradientType"]'), on);
  disablePlainControl(document.querySelector('input[data-path="bubble.gradientAngle"]'), on);
}

function syncChatbarThemeControls(toggle) {
  const on = toggle.checked;
  const banner = '#chatbar-theme-banner';
  applyControlState(document.getElementById('chatbar-bg-color-pick'), document.getElementById('chatbar-bg-color'), document.getElementById('chatbar-bg-color-hint'), on, banner);
  applyControlState(document.getElementById('chatbar-grad-start-pick'), document.getElementById('chatbar-grad-start-text'), null, on, banner);
  applyControlState(document.getElementById('chatbar-grad-end-pick'), document.getElementById('chatbar-grad-end-text'), null, on, banner);
  disablePlainControl(document.querySelector('input[data-path="chatbar.gradientEnabled"]'), on);
  disablePlainControl(document.querySelector('select[data-path="chatbar.gradientType"]'), on);
  disablePlainControl(document.querySelector('input[data-path="chatbar.gradientAngle"]'), on);
}

function styleGreetThemeWrapper(wrapper, on, banner) {
  wrapper.style.opacity = on ? '0.5' : '1';
  wrapper.style.cursor = on ? 'pointer' : 'default';
  wrapper.title = on ? 'Click to go to Theme Synchronization toggle' : '';
  wrapper.onclick = on ? (e) => { e.stopPropagation(); scrollToThemeSyncToggle(banner); } : null;
}

function styleGreetThemeHint(hint, on, banner) {
  hint.style.display = on ? 'inline-flex' : 'none';
  hint.style.cursor = on ? 'pointer' : '';
  hint.title = on ? 'Click to go to Theme Synchronization toggle' : '';
  hint.onclick = on ? (e) => { e.stopPropagation(); scrollToThemeSyncToggle(banner); } : null;
}

// Apply the theme-sync lock to one greet-window colour control (pick, text and optional hint)
function applyGreetThemeTarget(t, on, banner) {
  if (!t.pick && !t.text) return;
  if (t.pick) t.pick.disabled = on;
  if (t.text) t.text.disabled = on;
  const wrapper = t.pick?.parentElement || t.text?.parentElement;
  if (wrapper) styleGreetThemeWrapper(wrapper, on, banner);
  if (t.hint) styleGreetThemeHint(t.hint, on, banner);
}

function syncGreetThemeControls(toggle) {
  const on = toggle.checked;
  const banner = '#greet-theme-banner';
  const greetTargets = [
    { pick: document.getElementById('greet-icon-color-pick'), text: document.getElementById('greet-icon-color'), hint: document.getElementById('greet-icon-color-hint') },
    { pick: document.getElementById('greet-ib-btn-pick'), text: document.getElementById('greet-ib-btn'), hint: document.getElementById('greet-ib-btn-hint') },
    { pick: document.getElementById('greet-ib-btnicon-pick'), text: document.getElementById('greet-ib-btnicon'), hint: document.getElementById('greet-ib-btnicon-hint') }
  ];
  greetTargets.forEach(t => applyGreetThemeTarget(t, on, banner));
}

// Chat window colors overridden by the website theme regardless of preview theme (light-mode values are forced)
const CHAT_WINDOW_THEMED_PATHS = [
  'chatWindow.visitorBubbleBg', 'chatWindow.visitorBubbleColor',
  'chatWindow.headerBg', 'chatWindow.headerTextColor',
  'chatWindow.headerAvatarBg', 'chatWindow.headerAvatarColor',
  'chatWindow.agentAvatarBg', 'chatWindow.agentAvatarColor',
  'chatWindow.inputFocusBorderColor', 'chatWindow.sendButtonBgActive',
  'chatWindow.poweredByColor', 'chatWindow.endChatConfirmBg',
  'chatWindow.endChatConfirmTextColor'
];

function syncChatWindowThemeControls(toggle, isDark) {
  const on = toggle.checked;
  const banner = '#config-theme-banner';
  applyControlState(document.getElementById('config-accent-color-pick'), document.getElementById('config-accent-color'), document.getElementById('config-accent-color-hint'), on, banner);

  CHAT_WINDOW_THEMED_PATHS.forEach(path => {
    const pair = findByPath(path);
    applyControlState(pair.pick, pair.text, null, on, banner);
  });

  // Overridden only while the preview host is in dark mode
  const darkOnlyOverriddenPaths = [
    'chatWindow.bodyBg', 'chatWindow.inputBg',
    'chatWindow.agentBubbleBg', 'chatWindow.agentBubbleColor', 'chatWindow.agentBubbleBorderColor',
    'chatWindow.footerBg', 'chatWindow.footerTextColor',
    'chatWindow.inputTextColor', 'chatWindow.inputBorderColor',
    'chatWindow.attachButtonBg', 'chatWindow.attachButtonColor',
    'chatWindow.emojiButtonColor', 'chatWindow.modalCardBg', 'chatWindow.modalMessageColor',
    'chatWindow.endChatCancelBg', 'chatWindow.endChatCancelTextColor', 'chatWindow.endChatCancelBorderColor'
  ];
  const darkOn = on && isDark;
  darkOnlyOverriddenPaths.forEach(path => {
    const pair = findByPath(path);
    applyControlState(pair.pick, pair.text, null, darkOn, banner);
  });
}

function syncWelcomeThemeControls(toggle) {
  const on = toggle.checked;
  const banner = '#welcome-theme-banner';

  // The whole background editor (type/angle/colors) feeds welcome.bgGradient which is forced by theme sync
  const bgEditorIds = [
    'welcome-bg-type', 'welcome-bg-angle',
    'welcome-bg-solid-pick', 'welcome-bg-solid-text',
    'welcome-bg-grad-start-pick', 'welcome-bg-grad-start-text',
    'welcome-bg-grad-end-pick', 'welcome-bg-grad-end-text'
  ];
  const hiddenBg = document.getElementById('welcome-bg-gradient-hidden');
  const editorCard = hiddenBg ? hiddenBg.closest('.gradient-editor-card') : null;
  if (editorCard) {
    editorCard.style.opacity = on ? '0.45' : '1';
    editorCard.style.pointerEvents = on ? 'none' : '';
  }
  bgEditorIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = on;
  });

  const iconPair = findByPath('chatWindow.welcome.buttonIconColor');
  applyControlState(iconPair.pick, iconPair.text, null, on, banner);
}

function updateColorPickerStates() {
  const previewPanel = document.querySelector('.preview-panel');
  const isDark = document.documentElement.classList.contains('dark') || previewPanel?.classList.contains('dark-mode');

  // ---------- Global Theme & Accent Sync ----------
  const globalUseTheme = document.getElementById('global-use-theme');
  const isGlobalOn = globalUseTheme ? globalUseTheme.checked : (window.cutomizationConfig?.useWebsiteTheme !== false);
  const globalBanner = '#global-theme-banner';
  applyControlState(document.getElementById('global-accent-color-pick'), document.getElementById('global-accent-color'), document.getElementById('global-accent-color-hint'), isGlobalOn, globalBanner);

  const bubbleUseTheme = document.getElementById('bubble-use-theme');
  if (bubbleUseTheme) syncBubbleThemeControls(bubbleUseTheme);

  const chatbarUseTheme = document.getElementById('chatbar-use-theme');
  if (chatbarUseTheme) syncChatbarThemeControls(chatbarUseTheme);

  const greetUseTheme = document.getElementById('greet-use-theme');
  if (greetUseTheme) syncGreetThemeControls(greetUseTheme);

  const chatUseTheme = document.getElementById('config-use-theme');
  if (chatUseTheme) syncChatWindowThemeControls(chatUseTheme, isDark);

  const welcomeUseTheme = document.getElementById('welcome-use-theme');
  if (welcomeUseTheme) syncWelcomeThemeControls(welcomeUseTheme);
}

// ---------- Form event listeners helpers ----------

// Mirror the active config into the raw JSON editor
function writeConfigToJsonEditor() {
  const jsonTextarea = document.getElementById('raw-json-textarea');
  if (jsonTextarea) {
    jsonTextarea.value = JSON.stringify(window.cutomizationConfig, null, 2);
  }
}

// Mirror the config into the JSON editor and refresh the preview stores
function pushConfigUpdate() {
  writeConfigToJsonEditor();
  updateAlpineStores(window.cutomizationConfig);
}

// Keep a color picker in sync with a typed hex value
function syncPickFromHex(hex, pick) {
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    pick.value = hex;
  }
}

function setOpacityLabel(label, opacity) {
  if (label) {
    label.textContent = Math.round(opacity * 100) + '%';
  }
}

function addInputAndChangeListeners(el, handler) {
  el.addEventListener('input', handler);
  el.addEventListener('change', handler);
}

// Messages-tab textareas write into the config.messages array
function bindMessageTextareas() {
  document.querySelectorAll('.msg-textarea[data-msg-key]').forEach(input => {
    const handleMsgInput = () => {
      const key = input.dataset.msgKey;
      const entry = getMessagesConfig().find(m => m?.key === key);
      if (entry) entry.body = input.value;
      writeConfigToJsonEditor();
      if (window.activeMessagePreviewKey === key) {
        applyMessagePreview(key);
      }
    };
    addInputAndChangeListeners(input, handleMsgInput);
  });
}

function readNumberInputValue(input) {
  if (input.value === '') return undefined;
  const num = Number.parseFloat(input.value);
  return input.dataset.unit ? (num + input.dataset.unit) : num;
}

function readRangeInputValue(input) {
  const val = Number.parseFloat(input.value);
  // Update slider value labels
  const valSpan = input.parentElement.querySelector('.range-val');
  if (valSpan) valSpan.textContent = val + (input.dataset.unit || '');
  return val;
}

// Coerce boolean-looking string values from selects to real booleans
function coerceBooleanString(val) {
  if (val === 'true') return true;
  if (val === 'false') return false;
  return val;
}

function readInputValue(input) {
  if (input.type === 'checkbox') return input.checked;
  if (input.type === 'number') return readNumberInputValue(input);
  if (input.type === 'range') return readRangeInputValue(input);
  return coerceBooleanString(input.value);
}

// Sync the color picker and its text box
function syncColorPairFromInput(input, val) {
  if (input.type === 'color') {
    const textInput = input.parentElement.querySelector('.color-picker-text');
    if (textInput) textInput.value = val;
  }
  if (input.classList.contains('color-picker-text')) {
    const colorInput = input.parentElement.querySelector('input[type="color"]');
    if (colorInput) colorInput.value = val;
  }
}

// Root level Website Theme synchronization
function applyWebsiteThemeSync(val) {
  const cfg = window.cutomizationConfig;
  const enabled = !!val;
  setValueByPath(cfg, 'useWebsiteTheme', enabled);
  setValueByPath(cfg, 'bubble.useWebsiteTheme', enabled);
  setValueByPath(cfg, 'greetWindow.useWebsiteTheme', enabled);
  setValueByPath(cfg, 'chatbar.useWebsiteTheme', enabled);
  setValueByPath(cfg, 'chatWindow.useWebsiteTheme', enabled);
  if (cfg.chatWindow) {
    if (!cfg.chatWindow.welcome) cfg.chatWindow.welcome = {};
    cfg.chatWindow.welcome.useWebsiteTheme = enabled;
  }
}

const ACCENT_COLOR_PATHS = [
  'accentColor',
  'chatWindow.accentColor',
  'chatWindow.headerBg',
  'chatWindow.visitorBubbleBg',
  'chatWindow.agentAvatarBg',
  'chatWindow.inputFocusBorderColor',
  'chatWindow.sendButtonBgActive',
  'chatWindow.poweredByColor',
  'chatWindow.endChatConfirmBg',
  'greetWindow.iconColor'
];

// Root level Accent Color synchronization
function applyAccentColorSync(color) {
  const cfg = window.cutomizationConfig;
  ACCENT_COLOR_PATHS.forEach(path => setValueByPath(cfg, path, color));
  if (cfg.greetWindow?.inputBox) {
    cfg.greetWindow.inputBox.buttonColor = color;
  }
  setValueByPath(cfg, 'bubble.backgroundColor', color);
  setValueByPath(cfg, 'chatbar.bgColor', color);

  if (cfg.chatWindow?.welcome) {
    cfg.chatWindow.welcome.bgGradient = createAccentGradient(color);
    cfg.chatWindow.welcome.buttonIconColor = color;
  }

  const accentPick = document.getElementById('global-accent-color-pick');
  const accentText = document.getElementById('global-accent-color');
  if (accentPick && accentPick.value !== color) accentPick.value = color;
  if (accentText && accentText.value !== color) accentText.value = color;
}

// Client Name & Agent Name live at root level; mirror them across their inputs
function syncRootName(rootKey, val, sourceInput) {
  const cfg = window.cutomizationConfig;
  cfg[rootKey] = val;
  if (cfg.chatWindow) {
    delete cfg.chatWindow[rootKey];
  }
  document.querySelectorAll(`[data-path="${rootKey}"], [data-path="chatWindow.${rootKey}"]`).forEach(inp => {
    if (inp !== sourceInput && inp.value !== val) inp.value = val;
  });
}

// Paths whose edits also fan out to other parts of the config
function applyLinkedPathSync(path, val, input) {
  if (path === 'useWebsiteTheme') applyWebsiteThemeSync(val);
  if (path === 'accentColor') applyAccentColorSync(val);
  if (path === 'clientName' || path === 'chatWindow.clientName') syncRootName('clientName', val, input);
  if (path === 'agentName' || path === 'chatWindow.agentName') syncRootName('agentName', val, input);
}

// Fields the widget ignores while their component follows the website theme, per component
const THEME_OVERRIDE_PATHS = {
  bubble: new Set([
    'bubble.backgroundColor',
    'bubble.gradientType',
    'bubble.gradientAngle',
    'bubble.outlineRing.color'
  ]),
  chatbar: new Set([
    'chatbar.bgColor',
    'chatbar.gradientEnabled',
    'chatbar.gradientType',
    'chatbar.gradientAngle'
  ]),
  greetWindow: new Set([
    'greetWindow.iconColor',
    'greetWindow.inputBox.buttonColor',
    'greetWindow.inputBox.buttonIconColor'
  ]),
  chatWindow: new Set(CHAT_WINDOW_THEMED_PATHS)
};

// Editing one of those fields means the user wants that color, so stop the component following the website theme
function releaseWebsiteThemeForSection(section) {
  const target = window.cutomizationConfig?.[section];
  if (target?.useWebsiteTheme === true) target.useWebsiteTheme = false;
}

function releaseWebsiteThemeForPath(path) {
  const section = path.split('.')[0];
  if (THEME_OVERRIDE_PATHS[section]?.has(path)) releaseWebsiteThemeForSection(section);
}

function handleDataPathInput(input) {
  const path = input.dataset.path;
  const val = readInputValue(input);

  syncColorPairFromInput(input, val);
  setValueByPath(window.cutomizationConfig, path, val);
  applyLinkedPathSync(path, val, input);
  releaseWebsiteThemeForPath(path);

  // Update JSON textarea & Alpine / Lit stores
  pushConfigUpdate();
  updateColorPickerStates();
  updateDisabledAccordionStates();
  if (typeof updateFeatureNestedState === 'function') updateFeatureNestedState();

  // Automatically re-trigger preview if appearance delay or animation speed is modified
  if (path.startsWith('greetWindow.')) {
    retriggerGreetCard();
  }
}

function bindDataPathInputs() {
  document.querySelectorAll('[data-path]').forEach(input => {
    addInputAndChangeListeners(input, () => handleDataPathInput(input));
  });
}

// Listen to padding-grids changes
function bindPaddingGrids() {
  document.querySelectorAll('.padding-grid[data-padding-path]').forEach(grid => {
    const path = grid.dataset.paddingPath;
    const readSide = side => Number.parseFloat(grid.querySelector(`[data-pad="${side}"]`)?.value || 0);
    const handlePadInput = () => {
      const formatted = formatPaddingString(readSide('top'), readSide('right'), readSide('bottom'), readSide('left'));
      setValueByPath(window.cutomizationConfig, path, formatted);
      pushConfigUpdate();
    };
    grid.querySelectorAll('input').forEach(input => addInputAndChangeListeners(input, handlePadInput));
  });
}

// Listen to welcome card background editor changes
function bindWelcomeCardBgEditor() {
  const pick = document.getElementById('welcome-card-bg-color-pick');
  const text = document.getElementById('welcome-card-bg-color-text');
  const opacityInput = document.getElementById('welcome-card-bg-opacity');
  const opacityLabel = document.getElementById('welcome-card-bg-opacity-label');

  const handleChange = () => {
    if (!pick || !text || !opacityInput) return;
    syncPickFromHex(text.value, pick);
    const opacity = Number.parseFloat(opacityInput.value);
    setOpacityLabel(opacityLabel, opacity);
    setValueByPath(window.cutomizationConfig, 'chatWindow.welcome.cardBg', formatCardBg(pick.value, opacity));
    pushConfigUpdate();
  };

  pick?.addEventListener('input', () => {
    text.value = pick.value;
    handleChange();
  });
  text?.addEventListener('input', handleChange);
  opacityInput?.addEventListener('input', handleChange);
}

// Listen to welcome card border editor changes
function bindWelcomeCardBorderEditor() {
  const widthInput = document.getElementById('welcome-card-border-width');
  const styleSelect = document.getElementById('welcome-card-border-style');
  const pick = document.getElementById('welcome-card-border-color-pick');
  const text = document.getElementById('welcome-card-border-color-text');
  const opacityInput = document.getElementById('welcome-card-border-opacity');
  const opacityLabel = document.getElementById('welcome-card-border-opacity-label');

  const handleChange = () => {
    if (!widthInput || !styleSelect || !pick || !text || !opacityInput) return;
    syncPickFromHex(text.value, pick);
    const opacity = Number.parseFloat(opacityInput.value);
    setOpacityLabel(opacityLabel, opacity);
    const borderVal = formatCardBorder(
      Number.parseInt(widthInput.value || 0),
      styleSelect.value,
      pick.value,
      opacity
    );
    setValueByPath(window.cutomizationConfig, 'chatWindow.welcome.cardBorder', borderVal);
    pushConfigUpdate();
  };

  widthInput?.addEventListener('input', handleChange);
  styleSelect?.addEventListener('change', handleChange);
  pick?.addEventListener('input', () => {
    text.value = pick.value;
    handleChange();
  });
  text?.addEventListener('input', handleChange);
  opacityInput?.addEventListener('input', handleChange);
}

function bindShadowEditor(wrapper) {
  const path = wrapper.dataset.shadowPath;
  const pickInput = wrapper.querySelector('.shadow-color-pick');
  const textInput = wrapper.querySelector('.shadow-color-text');
  const opacityInput = wrapper.querySelector('.shadow-opacity');
  const opacityLabel = wrapper.querySelector('.shadow-opacity-label');

  const handleShadowChange = () => {
    if (!pickInput || !textInput || !opacityInput) return;
    syncPickFromHex(textInput.value, pickInput);
    const opacity = Number.parseFloat(opacityInput.value);
    setOpacityLabel(opacityLabel, opacity);

    const currentVal = getValueByPath(window.cutomizationConfig, path) || '';
    setValueByPath(window.cutomizationConfig, path, updateShadowColor(currentVal, pickInput.value, opacity));
    pushConfigUpdate();
  };

  pickInput?.addEventListener('input', () => {
    textInput.value = pickInput.value;
    handleShadowChange();
  });
  textInput?.addEventListener('input', handleShadowChange);
  opacityInput?.addEventListener('input', handleShadowChange);
}

// Listen to Launcher Style Segmented Buttons
function bindLauncherStyleButtons() {
  const chatbarBtn = document.getElementById('launcher-chatbar-btn');
  const bubbleBtn = document.getElementById('launcher-bubble-btn');
  const hiddenCheckbox = document.getElementById('master-chatbar-enabled');
  if (!chatbarBtn || !bubbleBtn || !hiddenCheckbox) return;

  const bindLauncherButton = (btn, otherBtn, chatbarEnabled) => {
    btn.addEventListener('click', () => {
      if (hiddenCheckbox.checked === chatbarEnabled) return;
      hiddenCheckbox.checked = chatbarEnabled;
      // Dispatch change event to trigger form listener and update state
      hiddenCheckbox.dispatchEvent(new Event('change'));
      btn.classList.add('active');
      otherBtn.classList.remove('active');
    });
  };
  bindLauncherButton(chatbarBtn, bubbleBtn, true);
  bindLauncherButton(bubbleBtn, chatbarBtn, false);
}

// Form Event Listeners (Sync form input edits back to config and Alpine)
function setupFormEventListeners() {
  bindMessageTextareas();
  bindDataPathInputs();
  bindPaddingGrids();
  bindWelcomeCardBgEditor();
  bindWelcomeCardBorderEditor();
  document.querySelectorAll('.shadow-editor-wrapper[data-shadow-path]').forEach(bindShadowEditor);
  bindLauncherStyleButtons();
}

// JSON Textarea Editor Listeners (Validate and sync raw edits)
function setupJsonEditorEventListeners() {
  const jsonTextarea = document.getElementById('raw-json-textarea');
  const jsonStatus = document.getElementById('json-status');

  if (!jsonTextarea || !jsonStatus) return;

  jsonTextarea.addEventListener('input', () => {
    try {
      const parsed = JSON.parse(jsonTextarea.value);

      // Structural validation before the config reaches global state.
      const check = window.CWCore
        ? window.CWCore.validateWidgetConfig(parsed)
        : { ok: true, errors: [] };
      if (!check.ok) {
        jsonTextarea.classList.add('invalid');
        jsonStatus.className = 'json-status invalid';
        jsonStatus.textContent = '✗ Invalid config: ' + check.errors.join('; ');
        return;
      }

      // Mark as valid
      jsonTextarea.classList.remove('invalid');
      jsonStatus.className = 'json-status valid';
      jsonStatus.textContent = '✓ Valid JSON config. Live updates active.';

      window.cutomizationConfig = parsed;

      // Update Visual Form Inputs without interrupting active focus if possible
      syncConfigToVisualForm(window.cutomizationConfig);

      // Update Alpine Stores
      updateAlpineStores(window.cutomizationConfig);
    } catch (err) {
      // Mark as invalid (err.message must never be interpolated as HTML)
      jsonTextarea.classList.add('invalid');
      jsonStatus.className = 'json-status invalid';
      jsonStatus.textContent = '✗ Invalid JSON format: ' + err.message;
    }
  });
}

function ensureSection(parent, key) {
  if (!parent[key]) parent[key] = {};
  return parent[key];
}

const ACCENT_CHATWINDOW_KEYS = [
  'accentColor',
  'headerBg',
  'visitorBubbleBg',
  'agentAvatarBg',
  'inputFocusBorderColor',
  'sendButtonBgActive',
  'poweredByColor',
  'endChatConfirmBg'
];

// Sync root accentColor across sub-component state objects
function propagateAccentColor(config) {
  const accent = config.accentColor;
  const chatWindow = ensureSection(config, 'chatWindow');
  ACCENT_CHATWINDOW_KEYS.forEach(key => { chatWindow[key] = accent; });
  const greetWindow = ensureSection(config, 'greetWindow');
  greetWindow.iconColor = accent;
  ensureSection(greetWindow, 'inputBox').buttonColor = accent;
  ensureSection(config, 'bubble').backgroundColor = accent;
}

// Sync root useWebsiteTheme across sub-component state objects
function propagateWebsiteTheme(config) {
  ['bubble', 'greetWindow', 'chatbar', 'chatWindow'].forEach(key => ensureSection(config, key));
  ['bubble', 'greetWindow', 'chatbar', 'chatWindow'].forEach(key => {
    config[key].useWebsiteTheme = config.useWebsiteTheme;
  });
}

// Last root accent / website-theme values copied into each config object
const rootThemeSyncState = new WeakMap();

// Copy the root accent / website theme into the component colors when a config is first seen or the
// root value changes. Re-copying on every update would overwrite colors edited per component.
function syncRootThemeIntoConfig(config) {
  const seen = rootThemeSyncState.get(config) || {};
  if (config.accentColor && seen.accentColor !== config.accentColor) propagateAccentColor(config);
  if (config.useWebsiteTheme !== undefined && seen.useWebsiteTheme !== config.useWebsiteTheme) propagateWebsiteTheme(config);
  rootThemeSyncState.set(config, { accentColor: config.accentColor, useWebsiteTheme: config.useWebsiteTheme });
}

// In customization mode the greet card is always shown
function revealLitGreetWindow() {
  if (!window.ChatWidgetLit.greetWindowStore) return;
  const gw = window.ChatWidgetLit.greetWindowStore.get();
  if (gw?.enabled) {
    gw.visible = true;
    gw.dismissed = false;
    if (gw.inputBox) gw.inputBox.visible = true;
  }
}

// Sync Lit Web Component Stores if available
function syncLitStores(config) {
  if (!window.ChatWidgetLit?.injectStoreConfig) return;
  window.ChatWidgetLit.injectStoreConfig(config);
  const widgetRoot = document.querySelector('#preview-viewport-wrapper cw-widget-root');
  if (widgetRoot) {
    ensureLitPointerEvents(widgetRoot);
  }
  revealLitGreetWindow();
  if (window.ChatWidgetLit.chatStore) {
    const isMobileView = document.querySelector('.preview-panel')?.classList.contains('mode-mobile');
    window.ChatWidgetLit.chatStore.get().isMobile = !!isMobileView;
  }
}

// 1. Update Bubble Trigger Store
function updateBubbleStore(config, theme) {
  if (!(Alpine.store('bubble') && config.bubble)) return;
  const bubbleConfig = jsonClone(config.bubble);
  if (bubbleConfig.useWebsiteTheme === true) {
    bubbleConfig.backgroundColor = theme.primary;
    bubbleConfig.gradientType = 'none';
    if (bubbleConfig.outlineRing) { bubbleConfig.outlineRing.color = theme.secondary; }
  }
  Object.assign(Alpine.store('bubble'), bubbleConfig);
}

function applyWebsiteThemeToGreetInputBox(inputBox, primary) {
  if (inputBox.layout === 'separated') {
    inputBox.buttonIconColor = primary;
  } else {
    inputBox.buttonColor = primary;
  }
}

// 2. Update Greet Window Store
function updateGreetWindowStore(config, theme) {
  if (!(Alpine.store('greetWindow') && config.greetWindow)) return;
  const greetWindowConfig = jsonClone(config.greetWindow);
  if (greetWindowConfig.inputBox) {
    greetWindowConfig.inputBox = { ...Alpine.store('greetWindow').inputBox, ...greetWindowConfig.inputBox };
    // Always force input box to be visible in customization mode
    greetWindowConfig.inputBox.visible = true;
  }

  // Always force greet card to be visible and active in customization mode
  greetWindowConfig.visible = true;
  greetWindowConfig.dismissed = false;

  if (greetWindowConfig.useWebsiteTheme === true) {
    greetWindowConfig.iconColor = theme.primary;
    if (greetWindowConfig.inputBox) {
      applyWebsiteThemeToGreetInputBox(greetWindowConfig.inputBox, theme.primary);
    }
  }
  Object.assign(Alpine.store('greetWindow'), greetWindowConfig);
}

function isOffsetSet(value) {
  return value !== undefined && value !== null && value !== '';
}

// 3. Update Chatbar Store
function updateChatbarStore(config) {
  if (!(Alpine.store('chatbar') && config.chatbar)) return;
  const chatbarConfig = jsonClone(config.chatbar);

  // Copy the correct offset fields to offsetRight and offsetBottom dynamically
  const prefix = chatbarConfig.layout === 'card' ? 'card' : 'bar';
  ['Right', 'Bottom'].forEach(side => {
    const value = chatbarConfig[`${prefix}Offset${side}`];
    if (isOffsetSet(value)) {
      chatbarConfig[`offset${side}`] = value;
    }
  });

  Object.assign(Alpine.store('chatbar'), chatbarConfig);
}

// Overrides applied to the chat window when the preview host is in dark mode
const DARK_HOST_THEME_OVERRIDES = {
  bodyBg: 'var(--cw-bg)',
  inputBg: 'var(--cw-surface)',
  agentBubbleBg: 'var(--cw-surface)',
  agentBubbleColor: 'var(--cw-ink)',
  agentBubbleBorderColor: 'var(--cw-border)',
  footerBg: 'var(--cw-bg)',
  footerTextColor: 'var(--cw-muted)',
  inputTextColor: 'var(--cw-ink)',
  inputBorderColor: 'var(--cw-border)',
  attachButtonBg: 'var(--cw-surface)',
  attachButtonColor: 'var(--cw-muted)',
  emojiButtonColor: 'var(--cw-muted)',
  modalCardBg: 'var(--cw-surface)',
  modalMessageColor: 'var(--cw-ink)',
  endChatCancelBg: 'var(--cw-surface)',
  endChatCancelTextColor: 'var(--cw-muted)',
  endChatCancelBorderColor: 'var(--cw-border)'
};

// Force the chat window to the host website theme colors
function applyWebsiteThemeToChatWindow(chatConfig, theme, isDark) {
  Object.assign(chatConfig, {
    accentColor: theme.primary,
    visitorBubbleBg: theme.primary,
    visitorBubbleColor: '#ffffff',
    headerBg: theme.primary,
    headerTextColor: '#ffffff',
    headerAvatarBg: 'rgba(255,255,255,0.2)',
    headerAvatarColor: '#ffffff',
    agentAvatarBg: theme.primary,
    agentAvatarColor: '#ffffff',
    inputFocusBorderColor: theme.primary,
    inputFocusShadow: `0 0 0 2px ${theme.primary}26`,
    sendButtonBgActive: theme.primary,
    poweredByColor: theme.primary,
    endChatConfirmBg: theme.primary,
    endChatConfirmTextColor: '#ffffff'
  });
  if (isDark) {
    Object.assign(chatConfig, DARK_HOST_THEME_OVERRIDES);
  }
}

// Welcome dashboard gradient + button icon follow the website theme or the accent color
function applyWelcomeTheme(chatConfig, config, theme) {
  const welcomeObj = chatConfig.welcome || Alpine.store('chatWindow')?.welcome;
  if (!welcomeObj) return;
  const welcomeUseTheme = welcomeObj.useWebsiteTheme !== undefined ? welcomeObj.useWebsiteTheme : chatConfig.useWebsiteTheme;
  const activeAccent = config.accentColor || chatConfig.accentColor || '#0b5fff';
  if (welcomeUseTheme === true) {
    const secondaryColor = (theme.secondary && theme.secondary !== theme.primary) ? theme.secondary : theme.primary;
    welcomeObj.bgGradient = `linear-gradient(135deg, ${theme.primary}, ${secondaryColor})`;
    welcomeObj.buttonIconColor = theme.primary;
  } else {
    welcomeObj.bgGradient = createAccentGradient(activeAccent);
    welcomeObj.buttonIconColor = activeAccent;
  }
  chatConfig.welcome = welcomeObj;
}

function defaultFeatures() {
  return {
    voiceCallMaster: false,
    voiceCallAgents: false,
    voiceCallVisitors: false,
    videoCallMaster: false,
    videoCallAgents: false,
    videoCallVisitors: false,
    disableVisitorCamera: false,
    closeChatVisitor: false,
    averageQueueTime: 1,
    chatAcceptanceTime: 5
  };
}

// Sync Chat general info (names and welcome / active view)
function syncChatInfoStore(chatConfig) {
  const chatStore = Alpine.store('chat');
  if (!chatStore) return;
  if (chatConfig.clientName) chatStore.clientName = chatConfig.clientName;
  if (chatConfig.agentName) {
    chatStore.agentName = chatConfig.agentName;
    if (chatStore.messages?.[0]?.senderType === 'AGENT') { chatStore.messages[0].senderName = chatConfig.agentName; }
  }

  // Dynamically switch active view to welcome or active based on checkbox toggle if user hasn't sent messages
  if (!chatStore.hasSentMessage && chatConfig.welcome) {
    const targetState = (chatConfig.welcome.enabled === true) ? 'welcome' : 'active';
    if (window.lastWelcomeEnabled === undefined || window.lastWelcomeEnabled !== chatConfig.welcome.enabled) {
      window.lastWelcomeEnabled = chatConfig.welcome.enabled;
      chatStore.state = targetState;
    }
  }
}

// 4. Update Chat Window & Welcome Store
function updateChatWindowStore(config, theme) {
  if (!(Alpine.store('chatWindow') && config.chatWindow)) return;
  const chatConfig = jsonClone(config.chatWindow);
  const isDark = document.documentElement.classList.contains('dark') || document.querySelector('.preview-panel').classList.contains('dark-mode');

  if (chatConfig.useWebsiteTheme === true) {
    applyWebsiteThemeToChatWindow(chatConfig, theme, isDark);
  }

  applyWelcomeTheme(chatConfig, config, theme);

  if (isDark && chatConfig.dark && Object.keys(chatConfig.dark).length > 0) {
    Object.assign(chatConfig, chatConfig.dark);
  }

  // Sync features at both top-level and chatWindow level
  if (!config.features) {
    config.features = chatConfig.features || defaultFeatures();
  }
  chatConfig.features = config.features;
  if (Alpine.store('features')) {
    Object.assign(Alpine.store('features'), config.features);
  }

  Object.assign(Alpine.store('chatWindow'), chatConfig);
  if (Alpine.store('chatcontactv2')) {
    Object.assign(Alpine.store('chatcontactv2'), chatConfig);
  }

  syncChatInfoStore(chatConfig);
}

// Dynamic updates of the active widget stores (Lit & Alpine)
function updateAlpineStores(config) {
  if (!config) return;

  syncRootThemeIntoConfig(config);
  syncLitStores(config);

  if (!window.Alpine) return;
  const theme = window.ZotlyUtils ? window.ZotlyUtils.getParentTheme() : { primary: '#0b5fff', secondary: '#8b5cf6' };

  updateBubbleStore(config, theme);
  updateGreetWindowStore(config, theme);
  updateChatbarStore(config);
  updateChatWindowStore(config, theme);
}

// Copy the listed keys from source to target when they are defined
function copyDefinedKeys(target, source, keys) {
  keys.forEach(key => {
    if (source[key] !== undefined) target[key] = source[key];
  });
}

function emitGreetStore(gwStore) {
  if (typeof gwStore.emit === 'function') gwStore.emit('store:greetWindow');
}

// Delay (ms) between the greet card appearing and its input box appearing
function remainingInputDelayMs(greetDelaySec, inputDelaySec) {
  return Math.max(0, (inputDelaySec - greetDelaySec) * 1000);
}

// Sync latest delay and animation configuration into the Lit greet-window store
function syncGreetStoreFromConfig(gw, greetConfig) {
  if (!greetConfig) return;
  copyDefinedKeys(gw, greetConfig, ['openingTimeAfterInitialLoadSec', 'animationOpeningSec', 'animationClosingSec']);
  if (gw.inputBox && greetConfig.inputBox) {
    copyDefinedKeys(gw.inputBox, greetConfig.inputBox, ['openingTimeAfterInitialLoadSec', 'animationOpeningSec']);
  }
}

// Show the greet card (and then the input box) after their configured delays
function scheduleLitGreetReveal(gwStore, gw, greetDelaySec, inputDelaySec) {
  window._retriggerGreetTimer = setTimeout(() => {
    const currentGw = gwStore.get();
    if (currentGw) {
      currentGw.visible = true;
      currentGw.dismissed = false;
      emitGreetStore(gwStore);
    }

    // Trigger input card reveal delay countdown
    if (gw.inputBox?.enabled) {
      window._retriggerInputTimer = setTimeout(() => {
        const curGw = gwStore.get();
        if (curGw?.inputBox) {
          curGw.inputBox.visible = true;
          emitGreetStore(gwStore);
        }
      }, remainingInputDelayMs(greetDelaySec, inputDelaySec));
    }
  }, Math.max(50, greetDelaySec * 1000));
}

// Lit Web Component widget re-triggering
function retriggerLitGreetCard(config, greetDelaySec, inputDelaySec) {
  const gwStore = window.ChatWidgetLit?.greetWindowStore;
  const gw = gwStore?.get();
  if (!gw) return;

  syncGreetStoreFromConfig(gw, config.greetWindow);

  // Reset visibility state
  gw.visible = false;
  gw.dismissed = false;
  if (gw.inputBox) gw.inputBox.visible = false;
  emitGreetStore(gwStore);

  // Clear existing timers
  if (window._retriggerGreetTimer) clearTimeout(window._retriggerGreetTimer);
  if (window._retriggerInputTimer) clearTimeout(window._retriggerInputTimer);

  scheduleLitGreetReveal(gwStore, gw, greetDelaySec, inputDelaySec);
}

// Alpine fallback widget re-triggering
function retriggerAlpineGreetCard(greetDelaySec, inputDelaySec) {
  const greetStore = window.Alpine && Alpine.store('greetWindow');
  if (!greetStore) return;

  greetStore.visible = false;
  greetStore.dismissed = false;
  if (greetStore.inputBox) greetStore.inputBox.visible = false;

  setTimeout(() => {
    greetStore.visible = true;
    if (greetStore.inputBox?.enabled) {
      setTimeout(() => {
        greetStore.inputBox.visible = true;
      }, remainingInputDelayMs(greetDelaySec, inputDelaySec));
    }
  }, Math.max(50, greetDelaySec * 1000));
}

// Retrigger entrance transition & appearance delay for greeting card
function retriggerGreetCard() {
  const config = window.cutomizationConfig || {};

  // Parse configured appearance delay and input reveal delay in seconds
  const greetDelaySec = Math.max(0, Number.parseFloat(config.greetWindow?.openingTimeAfterInitialLoadSec ?? 2));
  const inputDelaySec = Math.max(0, Number.parseFloat(config.greetWindow?.inputBox?.openingTimeAfterInitialLoadSec ?? 4));

  retriggerLitGreetCard(config, greetDelaySec, inputDelaySec);
  retriggerAlpineGreetCard(greetDelaySec, inputDelaySec);
}

// Reset/restart conversation session simulation
function restartChatSession() {
  const welcomeEnabled = window.cutomizationConfig?.chatWindow?.welcome?.enabled;
  if (window.ChatWidgetLit?.chatStore) {
    const cs = window.ChatWidgetLit.chatStore.get();
    if (cs) {
      cs.state = welcomeEnabled ? 'welcome' : 'active';
      cs.hasSentMessage = false;
      cs.panelOpen = false;
    }
    const rootEl = document.querySelector('cw-widget-root');
    if (rootEl) rootEl.panelOpen = false;
  }
  if (window.Alpine && Alpine.store('chat')) {
    const chatStore = Alpine.store('chat');
    chatStore.state = welcomeEnabled ? 'welcome' : 'active';
    chatStore.hasSentMessage = false;
    chatStore.panelOpen = false;
  }
  applyMessagePreview(window.activeMessagePreviewKey || 'welcome');
  window.dispatchEvent(new CustomEvent('close-contact-widget'));
  retriggerGreetCard();
}

// Full refresh of the preview widget from the current (updated) form config
async function refreshWidgetPreview() {
  // Remove existing widget instances so the widget remounts fresh from current config
  document.querySelectorAll('cw-widget-root').forEach(el => el.remove());
  const zotly = document.getElementById('zotly-widget-embed');
  if (zotly) zotly.remove();

  // Ensure stores reflect the latest visual-form data before remount
  if (window.Alpine) updateAlpineStores(window.cutomizationConfig);

  await bootstrapWidgetPreview();
}

// Format the code in JSON Textarea editor
function formatRawJson() {
  const jsonTextarea = document.getElementById('raw-json-textarea');
  if (!jsonTextarea) return;
  try {
    const formatted = JSON.stringify(JSON.parse(jsonTextarea.value), null, 2);
    jsonTextarea.value = formatted;
  } catch (e) {
    console.debug('[CW] raw JSON format failed:', e);
    alert("Cannot format. Please fix the JSON syntax first.");
  }
}

// Setup inputs for `--primary-color` and `--secondary-color` on Host website mockup
function setupHostPageThemeControls() {
  const hostPrimaryInput = document.getElementById('host-primary-color');
  const hostSecondaryInput = document.getElementById('host-secondary-color');
  const previewArea = document.querySelector('.preview-panel');
  const hostDarkModeToggle = document.getElementById('host-dark-mode');

  const updateHostColors = () => {
    if (hostPrimaryInput) document.documentElement.style.setProperty('--primary-color', hostPrimaryInput.value);
    if (hostSecondaryInput) document.documentElement.style.setProperty('--secondary-color', hostSecondaryInput.value);

    // Re-evaluate theme and update Alpine stores
    updateAlpineStores(window.cutomizationConfig);
    updateColorPickerStates();
  };

  if (hostPrimaryInput) {
    hostPrimaryInput.addEventListener('input', updateHostColors);
    hostPrimaryInput.addEventListener('change', updateHostColors);
  }
  if (hostSecondaryInput) {
    hostSecondaryInput.addEventListener('input', updateHostColors);
    hostSecondaryInput.addEventListener('change', updateHostColors);
  }

  // Dark Mode Toggle inside Mock Page
  if (hostDarkModeToggle) {
    hostDarkModeToggle.addEventListener('change', () => {
      if (hostDarkModeToggle.checked) {
        previewArea.classList.add('dark-mode');
      } else {
        previewArea.classList.remove('dark-mode');
      }
      // Notify widget stores about background mode change
      updateAlpineStores(window.cutomizationConfig);
      updateColorPickerStates();
    });
  }
}

const BREADCRUMB_SECTIONS = '.accordion-section, .features-card, .section-card, .form-section-card';

function titleText(root, selector) {
  return root.querySelector(selector)?.textContent?.trim();
}

function isNearPanelTop(el, panelTop, maxTop, minBottom) {
  const rect = el.getBoundingClientRect();
  return rect.top - panelTop <= maxTop && rect.bottom - panelTop > minBottom;
}

// Main/sub breadcrumb titles contributed by one visible section ({} when it has none)
function breadcrumbForSection(sec, panelTop) {
  if (sec.classList.contains('accordion-section')) {
    const mainTitle = titleText(sec, '.accordion-title');
    const result = { main: mainTitle ? mainTitle.replace(/^[^\w\s]+/, '').trim() : undefined }; // Strip emoji
    // Check for sub section card inside accordion
    sec.querySelectorAll('.form-section-card').forEach(sub => {
      if (!isNearPanelTop(sub, panelTop, 180, 50)) return;
      const subTitle = titleText(sub, '.form-section-title');
      if (subTitle) result.sub = subTitle;
    });
    return result;
  }
  if (sec.classList.contains('features-card')) {
    return { main: titleText(sec, '.features-card-title'), sub: titleText(sec, '.feature-name') };
  }
  if (sec.classList.contains('section-card')) {
    return { main: titleText(sec, '.section-card-header') };
  }
  return {};
}

function applyBreadcrumbTitles(mainTitleEl, subTitleEl, currentMain, currentSub) {
  if (!currentMain) return;
  if (mainTitleEl.textContent !== currentMain) mainTitleEl.textContent = currentMain;
  if (currentSub && subTitleEl.textContent !== currentSub) subTitleEl.textContent = currentSub;
  subTitleEl.style.display = currentSub ? 'inline' : 'none';
  const sep = document.querySelector('.indicator-separator');
  if (sep) sep.style.display = currentSub ? 'inline' : 'none';
}

// Live Sticky Header Breadcrumb Tracker on Settings Panel Scroll
function initStickyBreadcrumbTracker() {
  const panel = document.getElementById('settings-panel');
  if (!panel) return;

  const mainTitleEl = document.getElementById('breadcrumb-main-title');
  const subTitleEl = document.getElementById('breadcrumb-sub-title');
  if (!mainTitleEl || !subTitleEl) return;

  let ticking = false;

  function updateBreadcrumbs() {
    const activeTab = document.querySelector('.tab-content.active');
    if (!activeTab) return;

    // Get all sections and cards in active tab
    const sections = activeTab.querySelectorAll(BREADCRUMB_SECTIONS);
    if (!sections.length) return;

    const panelTop = panel.getBoundingClientRect().top;
    let currentMain = '';
    let currentSub = '';

    sections.forEach(sec => {
      // Check if section top is near top of panel
      if (!isNearPanelTop(sec, panelTop, 140, 40)) return;
      const titles = breadcrumbForSection(sec, panelTop);
      if (titles.main) currentMain = titles.main;
      if (titles.sub) currentSub = titles.sub;
    });

    document.getElementById('sticky-appearance-breadcrumb')?.classList.toggle('is-scrolled', panel.scrollTop > 30);

    applyBreadcrumbTitles(mainTitleEl, subTitleEl, currentMain, currentSub);
  }

  panel.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateBreadcrumbs();
        ticking = false;
      });
      ticking = true;
    }
  });

  // Run initial check
  updateBreadcrumbs();
}

// Custom handler for visual color-picker stops updating bubble/chatbar configuration arrays
window.setGradientStop = function (section, index, color) {
  if (!window.cutomizationConfig[section]) {
    window.cutomizationConfig[section] = {};
  }
  if (section === 'bubble' || section === 'chatbar') releaseWebsiteThemeForSection(section);
  if (!window.cutomizationConfig[section].gradientStops) {
    window.cutomizationConfig[section].gradientStops = [
      { color: '#0b5fff', pos: 0 },
      { color: '#22D3EE', pos: 100 }
    ];
  }
  if (window.cutomizationConfig[section].gradientStops[index]) {
    window.cutomizationConfig[section].gradientStops[index].color = color;
  }

  // Keep the UI color inputs and text boxes in sync
  const suffix = index === 0 ? 'start' : 'end';
  const pickEl = document.getElementById(`${section}-grad-${suffix}-pick`);
  const textEl = document.getElementById(`${section}-grad-${suffix}-text`);
  if (pickEl) pickEl.value = color;
  if (textEl) textEl.value = color;

  // Sync to JSON editor
  const jsonTextarea = document.getElementById('raw-json-textarea');
  if (jsonTextarea) {
    jsonTextarea.value = JSON.stringify(window.cutomizationConfig, null, 2);
  }

  // Update Alpine
  updateAlpineStores(window.cutomizationConfig);
};

// Toggle media field groups (Lucide vs Custom Image vs SVG) dynamically
function updateGreetMediaFieldsVisibility() {
  const mediaSelect = document.getElementById('greet-media-type-select') || document.querySelector('[data-path="greetWindow.iconType"]');
  if (!mediaSelect) return;
  const currentType = mediaSelect.value || 'lucide';

  const lucideGroup = document.querySelector('.media-group-lucide');
  const imageGroup = document.querySelector('.media-group-image');
  const svgGroup = document.querySelector('.media-group-customSvg');

  if (lucideGroup) lucideGroup.style.display = (currentType === 'lucide') ? 'flex' : 'none';
  if (imageGroup) imageGroup.style.display = (currentType === 'image') ? 'flex' : 'none';
  if (svgGroup) svgGroup.style.display = (currentType === 'customSvg') ? 'flex' : 'none';
}

// Enable/Disable Accordion sections dynamically based on toggles
// Enable/disable an accordion section; a disabled section can also be force-closed
function setAccordionEnabled(el, enabled, closeWhenDisabled = true) {
  if (!el) return;
  el.classList.toggle('disabled', !enabled);
  if (!enabled && closeWhenDisabled) el.classList.remove('active');
}

function updateDisabledAccordionStates() {
  const config = window.cutomizationConfig;
  if (!config) return;

  // Update Greet Card header media visibility (Icon vs Custom Image vs SVG)
  updateGreetMediaFieldsVisibility();

  // 1. Greet Card Popup (Section 2) -> Enabled if greetWindow.enabled is true
  setAccordionEnabled(document.getElementById('accordion-greet-card'), !!getValueByPath(config, 'greetWindow.enabled'));

  // 2. Greet Card Quick Input Box (sub-section inside Section 2) -> Enabled if greetWindow.inputBox.enabled is true
  setAccordionEnabled(document.getElementById('sub-section-greet-input'), !!getValueByPath(config, 'greetWindow.inputBox.enabled'), false);

  // 3. Chatbar Trigger (Section 4) vs Bubble Trigger (Section 3)
  // - If chatbar.enabled is true: Chatbar trigger is enabled, Bubble trigger is disabled.
  // - If chatbar.enabled is false: Bubble trigger is enabled, Chatbar trigger is disabled.
  const chatbarEnabled = !!getValueByPath(config, 'chatbar.enabled');
  setAccordionEnabled(document.getElementById('accordion-chatbar-trigger'), chatbarEnabled);
  setAccordionEnabled(document.getElementById('accordion-bubble-trigger'), !chatbarEnabled);

  // 4. Welcome Dashboard (Section 6) -> Enabled if chatWindow.welcome.enabled is true
  setAccordionEnabled(document.getElementById('accordion-welcome-dashboard'), !!getValueByPath(config, 'chatWindow.welcome.enabled'));

  // 5. Dynamic Launcher Offsets toggling
  const bubbleOffsets = document.getElementById('layout-bubble-offsets');
  const chatbarOffsets = document.getElementById('layout-chatbar-offsets');
  if (bubbleOffsets && chatbarOffsets) {
    chatbarOffsets.style.display = chatbarEnabled ? 'block' : 'none';
    bubbleOffsets.style.display = chatbarEnabled ? 'none' : 'block';
  }
}

/* ==========================================================================
   FORMS COMPONENT & PREVIEW INTERACTIVITY
   ========================================================================== */

// Helper to toggle form section accordion cards
function toggleFormSectionCard(cardId) {
  toggleNotifCard(cardId);
}

// Helper to toggle Key Features card
function toggleFeaturesCard(cardId) {
  const card = document.getElementById(cardId);
  if (card) {
    card.classList.toggle('collapsed');
  }
}

// Update nested options state for Key Features
function updateFeatureNestedState() {
  const voiceMaster = document.getElementById('feature-voice-master');
  const voiceNested = document.getElementById('voice-nested-options');
  if (voiceMaster && voiceNested) {
    voiceNested.style.opacity = voiceMaster.checked ? '1' : '0.4';
    voiceNested.style.pointerEvents = voiceMaster.checked ? 'auto' : 'none';
  }

  const videoMaster = document.getElementById('feature-video-master');
  const videoNested = document.getElementById('video-nested-options');
  if (videoMaster && videoNested) {
    videoNested.style.opacity = videoMaster.checked ? '1' : '0.4';
    videoNested.style.pointerEvents = videoMaster.checked ? 'auto' : 'none';
  }
}

function isFormsTabActive() {
  return document.querySelector('.nav-tab[data-tab="tab-forms"]')?.classList.contains('active');
}

// Try to dynamically fetch forms.html if data-include is present
async function loadFormsInclude(formsContainer) {
  const includeFile = formsContainer.dataset.include;
  if (!includeFile) return;
  try {
    const response = await fetch(includeFile);
    if (response.ok) {
      formsContainer.innerHTML = await response.text();
    }
  } catch (err) {
    // Expected offline/standalone fallback — the embedded template is used.
    console.debug('[CW] forms include not loaded:', err);
  }
}

// Bind a "n/65" character counter to an input and refresh the ticket preview as it changes
function bindCharCounter(input, counter, onChange) {
  if (!input || !counter) return;
  const update = () => {
    counter.textContent = `${input.value.length}/65`;
    onChange();
  };
  input.addEventListener('input', update);
  input.addEventListener('focus', onChange);
  update();
}

// Bind character counters & live preview
function bindTicketFormCounters() {
  const headingInput = document.getElementById('ticket-form-heading-input');
  const subheadingInput = document.getElementById('ticket-form-subheading-input');

  const triggerTicketPreview = () => {
    if (isFormsTabActive() && window.FormsPreview) {
      window.FormsPreview.renderTicketPreview('preview-scrollable-content', headingInput?.value, subheadingInput?.value);
    }
  };

  bindCharCounter(headingInput, document.getElementById('heading-char-count'), triggerTicketPreview);
  bindCharCounter(subheadingInput, document.getElementById('subheading-char-count'), triggerTicketPreview);
}

// Lit widget: open the panel on the pre-chat / post-chat form
function showLitFormPreview(formType) {
  if (!window.ChatWidgetLit?.chatStore) return;
  const rootEl = document.querySelector('cw-widget-root');
  const isPostchat = formType === 'postchat';
  const cs = window.ChatWidgetLit.chatStore.get();
  if (cs) {
    cs.panelOpen = true;
    cs.state = isPostchat ? 'postchat' : 'prechat';
    if (rootEl) {
      if (isPostchat) rootEl.postchatEnabled = true;
      else rootEl.prechatEnabled = true;
    }
  }
  if (rootEl) {
    rootEl.panelOpen = true;
    if (typeof rootEl.requestUpdate === 'function') rootEl.requestUpdate();
  }
}

// Alpine fallback widget: open the panel on the pre-chat / post-chat form
function showAlpineFormPreview(formType) {
  if (!(window.Alpine && Alpine.store('chat'))) return;
  const widgetContainer = document.getElementById('zotly-widget-embed');
  if (widgetContainer?._x_dataStack?.[0]) {
    widgetContainer._x_dataStack[0].openContactWidget = true;
  }
  Alpine.store('chat').panelOpen = true;
  Alpine.store('chat').state = (formType === 'postchat') ? 'postchat' : 'prechat';
}

// Trigger Pre-Chat / Post-Chat form live preview on Lit Web Component
function showFormInLivePreview(formType) {
  const widgetEmbed = document.getElementById('zotly-widget-embed') || document.querySelector('cw-widget-root');
  if (widgetEmbed) {
    widgetEmbed.style.display = 'block';
  }
  showLitFormPreview(formType);
  showAlpineFormPreview(formType);
}

// Post chat form toggle select visibility & preview trigger
function bindPostchatToggle(postchatToggle) {
  const postchatSelectContainer = document.getElementById('postchat-select-container');
  if (!postchatToggle || !postchatSelectContainer) return;
  postchatToggle.addEventListener('change', () => {
    postchatSelectContainer.style.display = postchatToggle.checked ? 'block' : 'none';
    if (window.cutomizationConfig) {
      window.cutomizationConfig.postchatEnabled = postchatToggle.checked;
    }
    if (isFormsTabActive()) {
      window.showFormInLivePreview(postchatToggle.checked ? 'postchat' : 'prechat');
    }
  });
}

// Pre chat form toggle select visibility & preview trigger
function bindPrechatToggle(prechatToggle, postchatToggle) {
  const prechatSelectContainer = document.getElementById('prechat-select-container');
  if (!prechatToggle || !prechatSelectContainer) return;
  prechatToggle.addEventListener('change', () => {
    prechatSelectContainer.style.opacity = prechatToggle.checked ? '1' : '0.5';
    prechatSelectContainer.style.pointerEvents = prechatToggle.checked ? 'auto' : 'none';
    if (window.cutomizationConfig) {
      window.cutomizationConfig.prechatEnabled = prechatToggle.checked;
    }
    if (isFormsTabActive()) {
      const showPostchat = !prechatToggle.checked && postchatToggle?.checked;
      window.showFormInLivePreview(showPostchat ? 'postchat' : 'prechat');
    }
  });
}

// Form builder modal logic
function bindFormBuilderModal() {
  const modal = document.getElementById('modal-form-builder');
  if (!modal) return;
  const closeModal = () => { modal.style.display = 'none'; };
  document.getElementById('btn-open-form-builder')?.addEventListener('click', () => { modal.style.display = 'flex'; });
  document.getElementById('btn-close-form-builder')?.addEventListener('click', closeModal);
  document.getElementById('btn-cancel-form-builder')?.addEventListener('click', closeModal);
  document.getElementById('btn-save-custom-form')?.addEventListener('click', () => {
    const formName = document.getElementById('new-form-name')?.value || 'Custom Form';
    const prechatSelect = document.getElementById('prechat-form-select');
    if (prechatSelect) {
      const opt = document.createElement('option');
      opt.value = `custom-${Date.now()}`;
      opt.textContent = formName;
      opt.selected = true;
      prechatSelect.appendChild(opt);
    }
    closeModal();
    alert(`Form "${formName}" created and assigned to Pre-chat selection!`);
  });
}

// Global initialization for imported forms component
async function loadAndInitFormsComponent() {
  const formsContainer = document.getElementById('tab-forms');
  if (!formsContainer) return;

  await loadFormsInclude(formsContainer);
  bindTicketFormCounters();
  window.showFormInLivePreview = showFormInLivePreview;

  const postchatToggle = document.getElementById('postchat-form-toggle');
  bindPostchatToggle(postchatToggle);
  bindPrechatToggle(document.getElementById('prechat-form-toggle'), postchatToggle);

  // Initial render if forms tab is active on page load
  if (isFormsTabActive()) {
    window.showFormInLivePreview(postchatToggle?.checked ? 'postchat' : 'prechat');
  }

  bindFormBuilderModal();
}

// Auto-run initialization based on DOM ready state
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initCustomizationApp();
    loadAndInitFormsComponent();
  });
} else {
  // DOM is already ready (e.g. inside Next.js / React) — run immediately
  initCustomizationApp();
  loadAndInitFormsComponent();
}

/* ==========================================================================
   MODULE FEDERATION EXPLICIT INIT EXPORTS
   ========================================================================== */

/**
 * Full initialization entry point.
 * Can be called explicitly from Next.js AFTER remote HTML is committed to DOM:
 *   await window.__initCustomizationApp?.();
 */
window.__initCustomizationApp = async function () {
  await initCustomizationApp();
  if (typeof loadAndInitFormsComponent === 'function') {
    await loadAndInitFormsComponent();
  }
};

/**
 * Lightweight entry — ONLY bootstraps the widget preview into
 * #preview-viewport-wrapper. Safe to call multiple times.
 *
 * Use this when the full init has already run but the widget is missing:
 *   await window.__initWidgetPreviewOnly?.();
 */
window.__initWidgetPreviewOnly = async function () {
  if (typeof bootstrapWidgetPreview === 'function') {
    await bootstrapWidgetPreview();
  }
};

