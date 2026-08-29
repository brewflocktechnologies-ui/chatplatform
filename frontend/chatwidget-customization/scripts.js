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

// Helper to access and set nested object properties by dot-notation path
function getValueByPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, part) => {
    return acc && acc[part] !== undefined ? acc[part] : undefined;
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

  let r = parseInt(c.substring(0, 2), 16) / 255;
  let g = parseInt(c.substring(2, 4), 16) / 255;
  let b = parseInt(c.substring(4, 6), 16) / 255;

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
    if (!arr.some(m => m && m.key === d.key)) {
      arr.push({ key: d.key, senderType: d.senderType, body: d.body });
    }
  });
  return arr;
}

// Show a single selected message config at the top of the chat window preview
function applyMessagePreview(key) {
  const arr = getMessagesConfig();
  const entry = arr.find(m => m && m.key === key) || arr.find(m => m && m.key === 'welcome') || arr[0];
  if (!entry) return;
  window.activeMessagePreviewKey = entry.key;

  const dropdown = document.getElementById('msg-preview-select');
  if (dropdown && dropdown.value !== entry.key) dropdown.value = entry.key;

  const chatConfig = window.cutomizationConfig || {};
  const agentName = chatConfig.agentName || (chatConfig.chatWindow && chatConfig.chatWindow.agentName) || 'Sarah';
  const msg = { key: 'm1', senderType: entry.senderType, body: entry.body || '', created: new Date().toISOString() };
  if (entry.senderType === 'AGENT') msg.senderName = agentName;

  // Push only the selected message into the Lit widget store and trigger a re-render.
  // (mutating cs.messages directly does not emit 'store:chat', so the chat window
  // would otherwise keep showing every hardcoded message from the config.)
  if (window.ChatWidgetLit && window.ChatWidgetLit.updateStoreConfig) {
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
    let current = parseInt(input.value) || 0;
    const min = parseInt(input.getAttribute('min')) || 0;
    const max = parseInt(input.getAttribute('max')) || 999;
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
  if (fileInput.files && fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      window.customNotifUploadedIcon = e.target.result;
      document.querySelectorAll('.notif-preset-icon-box').forEach(b => b.classList.remove('active'));
      triggerNotifPreviewUpdate();
    };
    reader.readAsDataURL(fileInput.files[0]);
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

  if (notifCard) {
    if (!enabled) {
      notifCard.style.opacity = '0.3';
    } else {
      notifCard.style.opacity = '1';
    }

    if (style === 'box1') {
      notifCard.className = 'notif-preview-card box-1';
    } else {
      notifCard.className = 'notif-preview-card box-2';
    }
  }

  if (overlay) {
    if (position === 'center') {
      overlay.style.justifyContent = 'center';
      overlay.style.paddingTop = '30px';
    } else {
      overlay.style.justifyContent = 'flex-start';
      overlay.style.paddingTop = '60px';
    }
  }

  if (window.customNotifUploadedIcon && imgIcon && svgIcon) {
    imgIcon.src = window.customNotifUploadedIcon;
    imgIcon.style.display = 'block';
    imgIcon.style.width = '48px';
    imgIcon.style.height = '48px';
    imgIcon.style.borderRadius = '12px';
    imgIcon.style.objectFit = 'cover';
    svgIcon.style.display = 'none';
  } else if (imgIcon && svgIcon) {
    imgIcon.style.display = 'none';
    svgIcon.style.display = 'block';
  }
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
    if (window.ChatWidgetLit && window.ChatWidgetLit.chatStore) {
      const cs = window.ChatWidgetLit.chatStore.get();
      if (cs) cs.panelOpen = true;
      const widgetEmbed = document.querySelector('cw-widget-root');
      if (widgetEmbed) widgetEmbed.panelOpen = true;
    }
    if (window.Alpine && Alpine.store('chat')) {
      const widgetContainer = document.getElementById('zotly-widget-embed');
      if (widgetContainer && widgetContainer._x_dataStack && widgetContainer._x_dataStack[0]) {
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
    const val = parseFloat(p);
    return isNaN(val) ? 0 : val;
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
  const rgbaMatch = clean.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0');
    const opacity = parseFloat(rgbaMatch[4]);
    return { color: `#${r}${g}${b}`, opacity };
  }
  const rgbMatch = clean.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return { color: `#${r}${g}${b}`, opacity: 1 };
  }
  if (clean.startsWith('#')) {
    if (clean.length === 9) {
      const opacity = parseInt(clean.substring(7, 9), 16) / 255;
      return { color: clean.substring(0, 7), opacity: parseFloat(opacity.toFixed(2)) };
    }
    return { color: clean, opacity: 1 };
  }
  return { color: '#ffffff', opacity: 0.12 };
}

function formatCardBg(hexColor, opacity) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
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
  const rgbaMatch = clean.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0');
    const opacity = parseFloat(rgbaMatch[4]);
    return { color: `#${r}${g}${b}`, opacity };
  }

  // Look for rgb(...)
  const rgbMatch = clean.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return { color: `#${r}${g}${b}`, opacity: 1.0 };
  }

  // Look for hex color
  const hexMatch = clean.match(/#[0-9a-fA-F]+/);
  if (hexMatch) {
    return { color: hexMatch[0], opacity: 1.0 };
  }

  return { color: '#000000', opacity: 0.15 };
}

function updateShadowColor(shadowStr, newHexColor, newOpacity) {
  const r = parseInt(newHexColor.slice(1, 3), 16);
  const g = parseInt(newHexColor.slice(3, 5), 16);
  const b = parseInt(newHexColor.slice(5, 7), 16);
  const newRgba = `rgba(${r}, ${g}, ${b}, ${newOpacity})`;

  if (!shadowStr || typeof shadowStr !== 'string') {
    return `0 8px 16px ${newRgba}`;
  }
  // Match rgba(...), rgb(...), hex values, or transparent
  const colorRegex = /rgba\([^\)]+\)|rgb\([^\)]+\)|#[0-9a-fA-F]{3,8}|transparent/g;
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
    const angleMatch = clean.match(/(\d+)deg/);
    if (angleMatch) {
      result.angle = parseInt(angleMatch[1]);
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
    const angle = parseInt(angleInput.value || 135);
    const color1 = type === 'solid' ? solidText.value : startText.value;
    const color2 = type === 'solid' ? solidText.value : endText.value;

    const formatted = formatBgGradient(type, angle, color1, color2);
    hiddenInput.value = formatted;

    // Dispatch events to trigger the visual-form change handler
    hiddenInput.dispatchEvent(new Event('input'));
    hiddenInput.dispatchEvent(new Event('change'));
  };

  // Toggle visibility helper
  const updateVisibility = () => {
    const type = typeSelect.value;
    const angleGroup = document.getElementById('welcome-bg-angle-group');
    const solidGroup = document.getElementById('welcome-bg-solid-group');
    const gradGroup = document.getElementById('welcome-bg-gradient-colors');

    if (type === 'solid') {
      if (angleGroup) angleGroup.style.display = 'none';
      if (solidGroup) solidGroup.style.display = 'block';
      if (gradGroup) gradGroup.style.display = 'none';
    } else if (type === 'linear') {
      if (angleGroup) angleGroup.style.display = 'block';
      if (solidGroup) solidGroup.style.display = 'none';
      if (gradGroup) gradGroup.style.display = 'flex';
    } else {
      // Radial
      if (angleGroup) angleGroup.style.display = 'none';
      if (solidGroup) solidGroup.style.display = 'none';
      if (gradGroup) gradGroup.style.display = 'flex';
    }
  };

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
  const widthMatch = clean.match(/^(\d+)px/);
  const width = widthMatch ? parseInt(widthMatch[1]) : 1;

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
  const rgbaMatch = clean.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0');
    color = `#${r}${g}${b}`;
    opacity = parseFloat(rgbaMatch[4]);
  } else {
    const hexMatch = clean.match(/#[0-9a-fA-F]+/);
    if (hexMatch) {
      color = hexMatch[0];
      opacity = 1;
    }
  }

  return { width, style, color, opacity };
}

function formatCardBorder(width, style, hexColor, opacity) {
  if (style === 'none') return 'none';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return `${width || 1}px ${style || 'solid'} rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Global customization State
window.cutomizationConfig = {};


// Main Initialization
async function initCustomizationApp() {
  // 1. Setup collapsible accordions dynamically
  document.querySelectorAll('.accordion-section').forEach((section, idx) => {
    if (section.querySelector('.accordion-collapse-wrapper')) return;

    const header = section.querySelector('.accordion-header');
    const content = section.querySelector('.accordion-content');
    if (!header || !content || content.parentNode !== header.parentNode) return;

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
    const chevron = document.createElement('span');
    chevron.className = 'accordion-chevron-wrapper';
    chevron.innerHTML = `
      <svg class="accordion-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.25s ease;">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;
    header.appendChild(chevron);

    // Expand first section by default
    if (idx === 0) {
      section.classList.add('active');
    }

    header.addEventListener('click', (e) => {
      // Prevent toggle if clicking on forms or other interactive nodes inside header
      if (e.target.closest('input, select, button, label')) return;

      const isActive = section.classList.contains('active');
      if (isActive) {
        section.classList.remove('active');
      } else {
        section.classList.add('active');
      }
    });
  });

  // Setup Sub-Section Accordion toggles for Greet Form Cards
  document.querySelectorAll('.form-section-card').forEach(card => {
    const header = card.querySelector('.form-section-header');
    if (!header) return;

    header.addEventListener('click', (e) => {
      if (e.target.closest('input, select, button, label, .color-picker-wrapper')) return;
      card.classList.toggle('active');
    });
  });

  // Setup Accordion toggles & interactive tools for Message Tab Cards
  document.querySelectorAll('.msg-accordion-card').forEach(card => {
    const header = card.querySelector('.msg-accordion-header');
    if (!header) return;

    header.addEventListener('click', (e) => {
      if (e.target.closest('input, textarea, button, label, .msg-tool-btn')) return;
      card.classList.toggle('active');
    });

    const textarea = card.querySelector('.msg-textarea');
    const counterEl = card.querySelector('.msg-char-counter .current-count');

    if (textarea && counterEl) {
      const updateCount = () => {
        counterEl.textContent = textarea.value.length;
      };
      textarea.addEventListener('input', updateCount);
      updateCount();
    }

    // Emoji button handler
    const emojiBtn = card.querySelector('.msg-tool-emoji');
    if (emojiBtn && textarea) {
      emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const emojis = ['😊', '👋', '💬', '⏳', '✨', '👍'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        const start = textarea.selectionStart || textarea.value.length;
        const end = textarea.selectionEnd || textarea.value.length;
        textarea.value = textarea.value.substring(0, start) + randomEmoji + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + randomEmoji.length;
        textarea.focus();
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }

    // Variable tag handler
    const varBtn = card.querySelector('.msg-tool-variable');
    if (varBtn && textarea) {
      varBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const variableTag = '{agent_name}';
        const start = textarea.selectionStart || textarea.value.length;
        const end = textarea.selectionEnd || textarea.value.length;
        textarea.value = textarea.value.substring(0, start) + variableTag + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + variableTag.length;
        textarea.focus();
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }

    // Formatting / Type button handler
    const typeBtn = card.querySelector('.msg-tool-type');
    if (typeBtn && textarea) {
      typeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        textarea.focus();
      });
    }
  });

  // 2. Setup Sidebar Toggle FAB
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

  // Viewport Toggles (Desktop vs Mobile)
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

  // 3. Setup Welcome background gradient picker event listeners
  setupWelcomeBgPickerListeners();

  // Setup tab switches
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

  // Variable to cache the original host website mockup HTML
  let originalHostWebsiteHTML = '';

  // --- TOP TAB NAVIGATION ---
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
      tab.classList.add('active');
      const targetTab = document.getElementById(tab.dataset.tab);
      if (targetTab) targetTab.classList.add('active');

      const widgetEmbed = document.getElementById('zotly-widget-embed') || document.querySelector('cw-widget-root');
      const previewContent = document.getElementById('preview-scrollable-content');

      // Store original host page content if not already cached
      if (previewContent && !originalHostWebsiteHTML && !previewContent.querySelector('.phone-preview-card-container')) {
        originalHostWebsiteHTML = previewContent.innerHTML;
      }

      if (tab.dataset.tab === 'tab-forms') {
        // Show chat widget overlay on Forms tab and render the real pre-chat/post-chat form state
        if (widgetEmbed) {
          widgetEmbed.style.display = 'block';
        }
        const postchatToggle = document.getElementById('postchat-form-toggle');
        if (postchatToggle && postchatToggle.checked) {
          showFormInLivePreview('postchat');
        } else {
          showFormInLivePreview('prechat');
        }
      } else if (tab.dataset.tab === 'tab-notifications') {
        // Hide chat widget overlay on Notifications tab
        if (widgetEmbed) {
          widgetEmbed.style.display = 'none';
        }
        // Render Notification prompt preview inside preview area
        if (previewContent) {
          previewContent.innerHTML = `
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
          triggerNotifPreviewUpdate();
        }
      } else {
        // Show chat widget overlay on all other tabs
        if (widgetEmbed) {
          widgetEmbed.style.display = 'block';
        }
        // Restore normal host website content on all other tabs
        if (previewContent && originalHostWebsiteHTML) {
          previewContent.innerHTML = originalHostWebsiteHTML;
        }
      }

      // Handle visibility of minimal message preview dropdown inside preview container
      const msgDropdownBar = document.getElementById('preview-msg-dropdown-bar');
      if (msgDropdownBar) {
        if (tab.dataset.tab === 'tab-messages') {
          msgDropdownBar.style.display = 'flex';
        } else {
          msgDropdownBar.style.display = 'none';
        }
      }

      // Display chat window (active chat view) at first ONLY on Messages and Features tabs
      if (tab.dataset.tab === 'tab-messages' || tab.dataset.tab === 'tab-features') {
        if (window.ChatWidgetLit && window.ChatWidgetLit.chatStore) {
          const cs = window.ChatWidgetLit.chatStore.get();
          if (cs) {
            cs.panelOpen = true;
            cs.state = 'active';
          }
          const rootEl = document.querySelector('cw-widget-root');
          if (rootEl) rootEl.panelOpen = true;
        }
        if (window.Alpine && Alpine.store('chat')) {
          const widgetContainer = document.getElementById('zotly-widget-embed');
          if (widgetContainer && widgetContainer._x_dataStack && widgetContainer._x_dataStack[0]) {
            widgetContainer._x_dataStack[0].openContactWidget = true;
          }
          Alpine.store('chat').panelOpen = true;
          Alpine.store('chat').state = 'active';
        }
        if (tab.dataset.tab === 'tab-messages') {
          applyMessagePreview(window.activeMessagePreviewKey || 'welcome');
        }
      } else if (tab.dataset.tab !== 'tab-forms' && tab.dataset.tab !== 'tab-notifications') {
        // Normal tabs (Appearance, Layout, Snippet, Share): work as normal with bubble/chatbar
        if (window.ChatWidgetLit && window.ChatWidgetLit.chatStore) {
          const cs = window.ChatWidgetLit.chatStore.get();
          if (cs) cs.panelOpen = false;
          const rootEl = document.querySelector('cw-widget-root');
          if (rootEl) rootEl.panelOpen = false;
        }
        if (window.Alpine && Alpine.store('chat')) {
          const widgetContainer = document.getElementById('zotly-widget-embed');
          if (widgetContainer && widgetContainer._x_dataStack && widgetContainer._x_dataStack[0]) {
            widgetContainer._x_dataStack[0].openContactWidget = false;
          }
          Alpine.store('chat').panelOpen = false;
        }
        if (window.Alpine && Alpine.store('bubble') && window.cutomizationConfig?.bubble) {
          Alpine.store('bubble').hideOnOpen = window.cutomizationConfig.bubble.hideOnOpen !== false;
        }
        if (window.Alpine && Alpine.store('chatbar') && window.cutomizationConfig?.chatbar) {
          Alpine.store('chatbar').hideOnOpen = window.cutomizationConfig.chatbar.hideOnOpen !== false;
        }
      }
    });
  });

  // --- SAVE CONFIG BUTTON ---
  document.getElementById('btn-save-config')?.addEventListener('click', () => {
    let cfg = window.cutomizationConfig;
    while (cfg && cfg.cdnConfig && typeof cfg.cdnConfig === 'object' && !Array.isArray(cfg.cdnConfig)) {
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


  // --- COPY SNIPPET BUTTON ---
  document.getElementById('btn-copy-snippet')?.addEventListener('click', () => {
    const ta = document.getElementById('code-snippet-text');
    if (ta) {
      ta.select();
      document.execCommand('copy');
      const label = document.querySelector('#btn-copy-snippet .btn-copy-label');
      const btn = document.getElementById('btn-copy-snippet');
      if (label) {
        const oldText = label.textContent;
        label.textContent = 'Copied!';
        setTimeout(() => { label.textContent = oldText; }, 2000);
      } else if (btn) {
        const oldText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = oldText; }, 2000);
      }
    }
  });

  // --- COPY SHARE LINK BUTTON ---
  document.getElementById('btn-copy-share')?.addEventListener('click', () => {
    const shareUrl = document.getElementById('share-link-input')?.value || 'https://brewflocktechnologies-ui.github.io/ai-widgets-websites/clientwebsites/site-amber.html';
    const btnText = document.querySelector('#btn-copy-share .btn-copy-text');
    navigator.clipboard.writeText(shareUrl).then(() => {
      if (btnText) {
        const oldText = btnText.textContent;
        btnText.textContent = 'Copied!';
        setTimeout(() => { btnText.textContent = oldText; }, 2000);
      }
    }).catch(() => {
      const inp = document.getElementById('share-link-input');
      if (inp) {
        inp.select();
        document.execCommand('copy');
      }
      if (btnText) {
        const oldText = btnText.textContent;
        btnText.textContent = 'Copied!';
        setTimeout(() => { btnText.textContent = oldText; }, 2000);
      }
    });
  });

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

  // --- SIGNAL HOST THAT MFE IS FULLY READY TO RECEIVE CONFIG ---
  // The host listens for this and immediately pushes the MongoDB config via LOAD_WIDGET_CONFIG.
  // This avoids all timing races on page load / website switch.
  if (window.parent && window.parent !== window) {
    postToTrustedParent({ type: 'MFE_READY' });
  }
};

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
  while (cfg && cfg.cdnConfig && typeof cfg.cdnConfig === 'object' && !Array.isArray(cfg.cdnConfig)) {
    cfg = cfg.cdnConfig;
  }
  return cfg;
}

document.addEventListener('input', (e) => {
  if (!isHydratingForm && e && e.isTrusted) {
    postToTrustedParent({ type: 'WIDGET_CONFIG_CHANGED', cdnConfig: getCurrentCdnConfig() });
  }
});
document.addEventListener('change', (e) => {
  if (!isHydratingForm && e && e.isTrusted) {
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
      if (window.ChatWidgetLit && window.ChatWidgetLit.injectStoreConfig) {
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
  if (!event || !event.data || !window.CWCore) return;
  const outcome = window.CWCore.processHostMessage(
    event, __cwMessagingPolicy, window.parent, __cwHostMessageActions
  );
  if (outcome && outcome.indexOf('rejected:') === 0) {
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
      if (layout && layout.shadowRoot && !layout.shadowRoot.getElementById(styleId)) {
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
async function bootstrapWidgetPreview() {
  const viewportWrapper = document.getElementById('preview-viewport-wrapper');
  const targetContainer = viewportWrapper || document.body;

  // Remove any auto-mounted widget root elements attached directly to document.body
  document.querySelectorAll('body > cw-widget-root').forEach(el => el.remove());

  let widgetRoot = targetContainer.querySelector('cw-widget-root');

  if (window.ChatWidgetLit && window.ChatWidgetLit.mountChatWidgetWithToken) {
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

  // Also support fallback Alpine Widget if window.ZotlyChatWindowHTML exists
  if (window.ZotlyChatWindowHTML) {
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

  // Update stores with active customization config
  updateAlpineStores(window.cutomizationConfig);

  // Auto open chat window active panel if starting on Messages or Features tab
  const activeTabName = document.querySelector('.nav-tab.active')?.dataset.tab;
  if (activeTabName === 'tab-messages' || activeTabName === 'tab-features') {
    if (window.ChatWidgetLit && window.ChatWidgetLit.chatStore) {
      const cs = window.ChatWidgetLit.chatStore.get();
      if (cs) {
        cs.panelOpen = true;
        cs.state = 'active';
      }
    }
    if (widgetRoot) {
      widgetRoot.panelOpen = true;
    }
    if (window.Alpine && Alpine.store('chat')) {
      const widgetContainer = document.getElementById('zotly-widget-embed');
      if (widgetContainer && widgetContainer._x_dataStack && widgetContainer._x_dataStack[0]) {
        widgetContainer._x_dataStack[0].openContactWidget = true;
      }
      Alpine.store('chat').panelOpen = true;
      Alpine.store('chat').state = 'active';
    }
  }

  // Ensure the chat-window preview shows only the selected greeting message,
  // not every message seeded from the config (covers initial load + remounts).
  applyMessagePreview(window.activeMessagePreviewKey || 'welcome');
}

// Default config loader (replaces preset-based loader)
async function loadDefaultConfig() {
  if (window.cutomizationConfig && !Array.isArray(window.cutomizationConfig) && Object.keys(window.cutomizationConfig).length > 0) {
    // Config already supplied via mount options from MongoDB — preserve it
  } else {
    const defaultClient = 'default';
    try {
      const presetBase = (window.__CUSTOMIZATION_ASSET_BASE__ || '') + 'clients/';
      const res = await fetch(`${presetBase}${defaultClient}.json`);
      if (res.ok) {
        window.cutomizationConfig = await res.json();
      } else {
        throw new Error("Failed to load default config");
      }
    } catch (err) {
      console.warn("Could not load default config, using minimal structure: ", err);
      window.cutomizationConfig = {
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

// Populate visual controls from active config object
function syncConfigToVisualForm(config) {
  if (!config) return;

  // Sync raw JSON textarea
  const jsonTextarea = document.getElementById('raw-json-textarea');
  if (jsonTextarea) {
    jsonTextarea.value = JSON.stringify(config, null, 2);
  }

  if (!config.features) {
    config.features = {
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

  document.querySelectorAll('[data-path]').forEach(input => {
    const path = input.dataset.path;
    let val = getValueByPath(config, path);

    if (val === undefined) {
      // Set empty/default
      if (input.type === 'checkbox') {
        input.checked = false;
      } else {
        input.value = '';
      }
      return;
    }

    // Special presentation for welcome avatars list
    if (path === 'chatWindow.welcome.avatars' && Array.isArray(val)) {
      input.value = val.join(', ');
      return;
    }

    if (input.type === 'checkbox') {
      input.checked = !!val;
    } else if (input.type === 'color') {
      // Sync both color input and text input inside wrapper
      input.value = val;
      const textInput = input.parentElement.querySelector('.color-picker-text');
      if (textInput) textInput.value = val;
    } else if (input.type === 'number') {
      if (val !== undefined && val !== null) {
        const num = parseFloat(val);
        input.value = isNaN(num) ? '' : num;
      } else {
        input.value = '';
      }
    } else {
      input.value = val;

      // Update range labels if present
      if (input.type === 'range') {
        const valSpan = input.parentElement.querySelector('.range-val');
        if (valSpan) valSpan.textContent = val + (input.dataset.unit || '');
      }
    }
  });

  // Sync notification character counters & style radio options
  const notifHeadline = document.getElementById('notif-headline-input');
  if (notifHeadline) updateNotifCounter(notifHeadline, 'headline-counter');
  const notifDesc = document.getElementById('notif-desc-input');
  if (notifDesc) updateNotifCounter(notifDesc, 'desc-counter');
  const notifApprove = document.getElementById('notif-approve-btn-input');
  if (notifApprove) updateNotifCounter(notifApprove, 'approve-counter');
  const notifCancel = document.getElementById('notif-cancel-btn-input');
  if (notifCancel) updateNotifCounter(notifCancel, 'cancel-counter');

  if (config.notification) {
    const styleKey = config.notification.promptStyle || 'box2';
    selectNotifPromptStyle(styleKey);

    const animRadio = document.querySelector(`input[name="notifAnimation"][value="${config.notification.animationStyle || 'drop-in'}"]`);
    if (animRadio) animRadio.checked = true;
    const posRadio = document.querySelector(`input[name="notifPosition"][value="${config.notification.position || 'top'}"]`);
    if (posRadio) posRadio.checked = true;
  }

  triggerNotifPreviewUpdate();

  // Sync Share by Link URL
  const presetName = config.clientId || 'default';
  const shareUrl = `https://brewflocktechnologies-ui.github.io/ai-widgets-websites/clientwebsites/site-${presetName}.html`;
  const shareInput = document.getElementById('share-link-input');
  const shareText = document.getElementById('share-link-url-text');
  if (shareInput) shareInput.value = shareUrl;
  if (shareText) shareText.textContent = shareUrl;

  // Sync padding-grids
  document.querySelectorAll('.padding-grid[data-padding-path]').forEach(grid => {
    const path = grid.dataset.paddingPath;
    const val = getValueByPath(config, path);
    const parsed = parsePaddingString(val);
    const topInput = grid.querySelector('[data-pad="top"]');
    const rightInput = grid.querySelector('[data-pad="right"]');
    const bottomInput = grid.querySelector('[data-pad="bottom"]');
    const leftInput = grid.querySelector('[data-pad="left"]');
    if (topInput) topInput.value = parsed.top;
    if (rightInput) rightInput.value = parsed.right;
    if (bottomInput) bottomInput.value = parsed.bottom;
    if (leftInput) leftInput.value = parsed.left;
  });

  // Sync welcome card background picker & opacity
  const welcomeBgVal = getValueByPath(config, 'chatWindow.welcome.cardBg');
  const welcomeBgParsed = parseCardBg(welcomeBgVal);
  const bgPick = document.getElementById('welcome-card-bg-color-pick');
  const bgText = document.getElementById('welcome-card-bg-color-text');
  const bgOpacity = document.getElementById('welcome-card-bg-opacity');
  const bgOpacityLabel = document.getElementById('welcome-card-bg-opacity-label');
  if (bgPick) bgPick.value = welcomeBgParsed.color;
  if (bgText) bgText.value = welcomeBgParsed.color;
  if (bgOpacity) {
    bgOpacity.value = welcomeBgParsed.opacity;
    if (bgOpacityLabel) bgOpacityLabel.textContent = Math.round(welcomeBgParsed.opacity * 100) + '%';
  }

  // Sync welcome card border details
  const welcomeBorderVal = getValueByPath(config, 'chatWindow.welcome.cardBorder');
  const welcomeBorderParsed = parseCardBorder(welcomeBorderVal);
  const borderW = document.getElementById('welcome-card-border-width');
  const borderS = document.getElementById('welcome-card-border-style');
  const borderPick = document.getElementById('welcome-card-border-color-pick');
  const borderText = document.getElementById('welcome-card-border-color-text');
  const borderOpacity = document.getElementById('welcome-card-border-opacity');
  const borderOpacityLabel = document.getElementById('welcome-card-border-opacity-label');
  if (borderW) borderW.value = welcomeBorderParsed.width;
  if (borderS) borderS.value = welcomeBorderParsed.style;
  if (borderPick) borderPick.value = welcomeBorderParsed.color;
  if (borderText) borderText.value = welcomeBorderParsed.color;
  if (borderOpacity) {
    borderOpacity.value = welcomeBorderParsed.opacity;
    if (borderOpacityLabel) borderOpacityLabel.textContent = Math.round(welcomeBorderParsed.opacity * 100) + '%';
  }

  // Sync welcome background gradient & solid picker
  const welcomeGradVal = getValueByPath(config, 'chatWindow.welcome.bgGradient');
  if (welcomeGradVal) {
    const welcomeBgParsed = parseBgGradient(welcomeGradVal);
    const typeSelect = document.getElementById('welcome-bg-type');
    const angleInput = document.getElementById('welcome-bg-angle');

    const solidPick = document.getElementById('welcome-bg-solid-pick');
    const solidText = document.getElementById('welcome-bg-solid-text');

    const startPick = document.getElementById('welcome-bg-grad-start-pick');
    const startText = document.getElementById('welcome-bg-grad-start-text');
    const endPick = document.getElementById('welcome-bg-grad-end-pick');
    const endText = document.getElementById('welcome-bg-grad-end-text');

    const hiddenInput = document.getElementById('welcome-bg-gradient-hidden');

    if (hiddenInput) hiddenInput.value = welcomeGradVal;
    if (typeSelect) {
      typeSelect.value = welcomeBgParsed.type;

      // Update custom component visibility
      const angleGroup = document.getElementById('welcome-bg-angle-group');
      const solidGroup = document.getElementById('welcome-bg-solid-group');
      const gradGroup = document.getElementById('welcome-bg-gradient-colors');

      if (welcomeBgParsed.type === 'solid') {
        if (angleGroup) angleGroup.style.display = 'none';
        if (solidGroup) solidGroup.style.display = 'block';
        if (gradGroup) gradGroup.style.display = 'none';

        if (solidPick) solidPick.value = welcomeBgParsed.color1;
        if (solidText) solidText.value = welcomeBgParsed.color1;
      } else {
        if (angleGroup) angleGroup.style.display = welcomeBgParsed.type === 'linear' ? 'block' : 'none';
        if (solidGroup) solidGroup.style.display = 'none';
        if (gradGroup) gradGroup.style.display = 'flex';

        if (angleInput) angleInput.value = welcomeBgParsed.angle;
        if (startPick) startPick.value = welcomeBgParsed.color1;
        if (startText) startText.value = welcomeBgParsed.color1;
        if (endPick) endPick.value = welcomeBgParsed.color2;
        if (endText) endText.value = welcomeBgParsed.color2;
      }
    }
  }

  // Sync bubble gradient stops
  const bubbleGradStops = getValueByPath(config, 'bubble.gradientStops');
  if (bubbleGradStops && Array.isArray(bubbleGradStops)) {
    const bubbleStartPick = document.getElementById('bubble-grad-start-pick');
    const bubbleStartText = document.getElementById('bubble-grad-start-text');
    const bubbleEndPick = document.getElementById('bubble-grad-end-pick');
    const bubbleEndText = document.getElementById('bubble-grad-end-text');

    if (bubbleGradStops[0]) {
      const c = bubbleGradStops[0].color;
      if (bubbleStartPick) bubbleStartPick.value = c;
      if (bubbleStartText) bubbleStartText.value = c;
    }
    if (bubbleGradStops[1]) {
      const c = bubbleGradStops[1].color;
      if (bubbleEndPick) bubbleEndPick.value = c;
      if (bubbleEndText) bubbleEndText.value = c;
    }
  }

  // Sync chatbar gradient stops
  const chatbarGradStops = getValueByPath(config, 'chatbar.gradientStops');
  if (chatbarGradStops && Array.isArray(chatbarGradStops)) {
    const chatbarStartPick = document.getElementById('chatbar-grad-start-pick');
    const chatbarStartText = document.getElementById('chatbar-grad-start-text');
    const chatbarEndPick = document.getElementById('chatbar-grad-end-pick');
    const chatbarEndText = document.getElementById('chatbar-grad-end-text');

    if (chatbarGradStops[0]) {
      const c = chatbarGradStops[0].color;
      if (chatbarStartPick) chatbarStartPick.value = c;
      if (chatbarStartText) chatbarStartText.value = c;
    }
    if (chatbarGradStops[1]) {
      const c = chatbarGradStops[1].color;
      if (chatbarEndPick) chatbarEndPick.value = c;
      if (chatbarEndText) chatbarEndText.value = c;
    }
  }

  // Sync all shadow-editor-wrapper fields
  document.querySelectorAll('.shadow-editor-wrapper[data-shadow-path]').forEach(wrapper => {
    const path = wrapper.dataset.shadowPath;
    const val = getValueByPath(config, path);
    const parsed = parseShadowColor(val);
    const pickInput = wrapper.querySelector('.shadow-color-pick');
    const textInput = wrapper.querySelector('.shadow-color-text');
    const opacityInput = wrapper.querySelector('.shadow-opacity');
    const opacityLabel = wrapper.querySelector('.shadow-opacity-label');

    if (pickInput) pickInput.value = parsed.color;
    if (textInput) textInput.value = parsed.color;
    if (opacityInput) {
      opacityInput.value = parsed.opacity;
      if (opacityLabel) opacityLabel.textContent = Math.round(parsed.opacity * 100) + '%';
    }
  });

  // Sync Launcher Style Segmented Buttons
  const chatbarVal = !!getValueByPath(config, 'chatbar.enabled');
  const chatbarBtn = document.getElementById('launcher-chatbar-btn');
  const bubbleBtn = document.getElementById('launcher-bubble-btn');
  if (chatbarBtn && bubbleBtn) {
    if (chatbarVal) {
      chatbarBtn.classList.add('active');
      bubbleBtn.classList.remove('active');
    } else {
      bubbleBtn.classList.add('active');
      chatbarBtn.classList.remove('active');
    }
  }

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
  } else if (target && target.querySelector) {
    topBanner = target;
  } else {
    topBanner = document.querySelector('.top-theme-banner-card');
  }
  if (topBanner) {
    topBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    topBanner.classList.remove('highlight-pulse');
    void topBanner.offsetWidth; // Force reflow
    topBanner.classList.add('highlight-pulse');
    setTimeout(() => {
      topBanner.classList.remove('highlight-pulse');
    }, 2000);
  }
}

// Disable color inputs and show warning hint text if theme sync is enabled
function updateColorPickerStates() {
  const previewPanel = document.querySelector('.preview-panel');
  const isDark = document.documentElement.classList.contains('dark') || (previewPanel && previewPanel.classList.contains('dark-mode'));

  // Disable/dim a single color control pair and (optionally) its hint
  function applyControlState(pick, text, hint, disabled, bannerSelector) {
    if (!pick && !text) return;
    if (pick) pick.disabled = disabled;
    if (text) text.disabled = disabled;
    const wrapper = (pick && pick.parentElement) || (text && text.parentElement);
    if (wrapper) {
      wrapper.style.opacity = disabled ? '0.4' : '1';
      wrapper.style.pointerEvents = disabled ? 'none' : '';
    }
    if (hint) {
      hint.style.display = disabled ? 'inline-flex' : 'none';
      if (disabled) {
        hint.style.cursor = 'pointer';
        hint.title = 'Click to go to Theme Synchronization toggle';
        hint.onclick = (e) => {
          e.stopPropagation();
          scrollToThemeSyncToggle(bannerSelector || '.top-theme-banner-card');
        };
      } else {
        hint.style.cursor = '';
        hint.title = '';
        hint.onclick = null;
      }
    }
  }

  function findByPath(path) {
    return {
      pick: document.querySelector('input[type="color"][data-path="' + path + '"]'),
      text: document.querySelector('input.color-picker-text[data-path="' + path + '"]')
    };
  }

  function disablePlainControl(el, disabled) {
    if (el) el.disabled = disabled;
  }

  // ---------- Global Theme & Accent Sync ----------
  const globalUseTheme = document.getElementById('global-use-theme');
  const isGlobalOn = globalUseTheme ? globalUseTheme.checked : (window.cutomizationConfig?.useWebsiteTheme !== false);
  const globalBanner = '#global-theme-banner';
  applyControlState(document.getElementById('global-accent-color-pick'), document.getElementById('global-accent-color'), document.getElementById('global-accent-color-hint'), isGlobalOn, globalBanner);

  const on = isGlobalOn;
  const bubbleUseTheme = document.getElementById('bubble-use-theme');
  if (bubbleUseTheme) {
    const on = bubbleUseTheme.checked;
    const banner = '#bubble-theme-banner';
    applyControlState(document.getElementById('bubble-bg-color-pick'), document.getElementById('bubble-bg-color'), document.getElementById('bubble-bg-color-hint'), on, banner);
    applyControlState(document.getElementById('bubble-grad-start-pick'), document.getElementById('bubble-grad-start-text'), null, on, banner);
    applyControlState(document.getElementById('bubble-grad-end-pick'), document.getElementById('bubble-grad-end-text'), null, on, banner);
    const ringPair = findByPath('bubble.outlineRing.color');
    applyControlState(ringPair.pick, ringPair.text, null, on, banner);
    disablePlainControl(document.querySelector('select[data-path="bubble.gradientType"]'), on);
    disablePlainControl(document.querySelector('input[data-path="bubble.gradientAngle"]'), on);
  }

  // ---------- Chatbar theme sync ----------
  const chatbarUseTheme = document.getElementById('chatbar-use-theme');
  if (chatbarUseTheme) {
    const on = chatbarUseTheme.checked;
    const banner = '#chatbar-theme-banner';
    applyControlState(document.getElementById('chatbar-bg-color-pick'), document.getElementById('chatbar-bg-color'), document.getElementById('chatbar-bg-color-hint'), on, banner);
    applyControlState(document.getElementById('chatbar-grad-start-pick'), document.getElementById('chatbar-grad-start-text'), null, on, banner);
    applyControlState(document.getElementById('chatbar-grad-end-pick'), document.getElementById('chatbar-grad-end-text'), null, on, banner);
    disablePlainControl(document.querySelector('input[data-path="chatbar.gradientEnabled"]'), on);
    disablePlainControl(document.querySelector('select[data-path="chatbar.gradientType"]'), on);
    disablePlainControl(document.querySelector('input[data-path="chatbar.gradientAngle"]'), on);
  }

  // ---------- Greet window theme sync (Icon Color, Submit Button, Button Icon) ----------
  const greetUseTheme = document.getElementById('greet-use-theme');
  if (greetUseTheme) {
    const on = greetUseTheme.checked;
    const banner = '#greet-theme-banner';
    const greetTargets = [
      { pick: document.getElementById('greet-icon-color-pick'), text: document.getElementById('greet-icon-color'), hint: document.getElementById('greet-icon-color-hint') },
      { pick: document.getElementById('greet-ib-btn-pick'), text: document.getElementById('greet-ib-btn'), hint: document.getElementById('greet-ib-btn-hint') },
      { pick: document.getElementById('greet-ib-btnicon-pick'), text: document.getElementById('greet-ib-btnicon'), hint: document.getElementById('greet-ib-btnicon-hint') }
    ];
    greetTargets.forEach(t => {
      if (!t.pick && !t.text) return;
      if (t.pick) t.pick.disabled = on;
      if (t.text) t.text.disabled = on;
      const wrapper = (t.pick && t.pick.parentElement) || (t.text && t.text.parentElement);
      if (wrapper) {
        wrapper.style.opacity = on ? '0.5' : '1';
        wrapper.style.cursor = on ? 'pointer' : 'default';
        wrapper.title = on ? 'Click to go to Theme Synchronization toggle' : '';
        wrapper.onclick = on ? (e) => { e.stopPropagation(); scrollToThemeSyncToggle(banner); } : null;
      }
      if (t.hint) {
        t.hint.style.display = on ? 'inline-flex' : 'none';
        if (on) {
          t.hint.style.cursor = 'pointer';
          t.hint.title = 'Click to go to Theme Synchronization toggle';
          t.hint.onclick = (e) => { e.stopPropagation(); scrollToThemeSyncToggle(banner); };
        } else {
          t.hint.style.cursor = '';
          t.hint.title = '';
          t.hint.onclick = null;
        }
      }
    });
  }

  // ---------- Chat Window theme sync ----------
  const chatUseTheme = document.getElementById('config-use-theme');
  if (chatUseTheme) {
    const on = chatUseTheme.checked;
    const banner = '#config-theme-banner';
    applyControlState(document.getElementById('config-accent-color-pick'), document.getElementById('config-accent-color'), document.getElementById('config-accent-color-hint'), on, banner);

    // Overridden regardless of preview theme (light-mode values are forced)
    const alwaysOverriddenPaths = [
      'chatWindow.visitorBubbleBg', 'chatWindow.visitorBubbleColor',
      'chatWindow.headerBg', 'chatWindow.headerTextColor',
      'chatWindow.headerAvatarBg', 'chatWindow.headerAvatarColor',
      'chatWindow.agentAvatarBg', 'chatWindow.agentAvatarColor',
      'chatWindow.inputFocusBorderColor', 'chatWindow.sendButtonBgActive',
      'chatWindow.poweredByColor', 'chatWindow.endChatConfirmBg',
      'chatWindow.endChatConfirmTextColor'
    ];
    alwaysOverriddenPaths.forEach(path => {
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

  // ---------- Welcome Dashboard theme sync (bg gradient editor + button icon color) ----------
  const welcomeUseTheme = document.getElementById('welcome-use-theme');
  if (welcomeUseTheme) {
    const on = welcomeUseTheme.checked;
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
}

// Form Event Listeners (Sync form input edits back to config and Alpine)
function setupFormEventListeners() {
  // Messages-tab textareas write into the config.messages array
  document.querySelectorAll('.msg-textarea[data-msg-key]').forEach(input => {
    const handleMsgInput = () => {
      const key = input.dataset.msgKey;
      const entry = getMessagesConfig().find(m => m && m.key === key);
      if (entry) entry.body = input.value;
      const jsonTextarea = document.getElementById('raw-json-textarea');
      if (jsonTextarea) jsonTextarea.value = JSON.stringify(window.cutomizationConfig, null, 2);
      if (window.activeMessagePreviewKey === key) {
        applyMessagePreview(key);
      }
    };
    input.addEventListener('input', handleMsgInput);
    input.addEventListener('change', handleMsgInput);
  });

  document.querySelectorAll('[data-path]').forEach(input => {
    const handleInput = () => {
      const path = input.dataset.path;
      let val;

      if (input.type === 'checkbox') {
        val = input.checked;
      } else if (input.type === 'number') {
        if (input.value === '') {
          val = undefined;
        } else {
          const num = parseFloat(input.value);
          val = input.dataset.unit ? (num + input.dataset.unit) : num;
        }
      } else if (input.type === 'range') {
        val = parseFloat(input.value);
        // Update slider value labels
        const valSpan = input.parentElement.querySelector('.range-val');
        if (valSpan) valSpan.textContent = val + (input.dataset.unit || '');
      } else {
        val = input.value;
        // Coerce boolean-looking string values from selects to real booleans
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
      }

      // Sync color inputs
      if (input.type === 'color') {
        const textInput = input.parentElement.querySelector('.color-picker-text');
        if (textInput) textInput.value = val;
      }
      if (input.classList.contains('color-picker-text')) {
        const colorInput = input.parentElement.querySelector('input[type="color"]');
        if (colorInput) colorInput.value = val;
      }

      // Update state
      setValueByPath(window.cutomizationConfig, path, val);

      // Handle root level Website Theme & Accent Color synchronization
      if (path === 'useWebsiteTheme') {
        const enabled = !!val;
        setValueByPath(window.cutomizationConfig, 'useWebsiteTheme', enabled);
        setValueByPath(window.cutomizationConfig, 'bubble.useWebsiteTheme', enabled);
        setValueByPath(window.cutomizationConfig, 'greetWindow.useWebsiteTheme', enabled);
        setValueByPath(window.cutomizationConfig, 'chatbar.useWebsiteTheme', enabled);
        setValueByPath(window.cutomizationConfig, 'chatWindow.useWebsiteTheme', enabled);
        if (window.cutomizationConfig.chatWindow) {
          if (!window.cutomizationConfig.chatWindow.welcome) window.cutomizationConfig.chatWindow.welcome = {};
          window.cutomizationConfig.chatWindow.welcome.useWebsiteTheme = enabled;
        }
      }
      if (path === 'accentColor') {
        const color = val;
        setValueByPath(window.cutomizationConfig, 'accentColor', color);
        setValueByPath(window.cutomizationConfig, 'chatWindow.accentColor', color);
        setValueByPath(window.cutomizationConfig, 'chatWindow.headerBg', color);
        setValueByPath(window.cutomizationConfig, 'chatWindow.visitorBubbleBg', color);
        setValueByPath(window.cutomizationConfig, 'chatWindow.agentAvatarBg', color);
        setValueByPath(window.cutomizationConfig, 'chatWindow.inputFocusBorderColor', color);
        setValueByPath(window.cutomizationConfig, 'chatWindow.sendButtonBgActive', color);
        setValueByPath(window.cutomizationConfig, 'chatWindow.poweredByColor', color);
        setValueByPath(window.cutomizationConfig, 'chatWindow.endChatConfirmBg', color);
        setValueByPath(window.cutomizationConfig, 'greetWindow.iconColor', color);
        if (window.cutomizationConfig.greetWindow && window.cutomizationConfig.greetWindow.inputBox) {
          window.cutomizationConfig.greetWindow.inputBox.buttonColor = color;
        }
        setValueByPath(window.cutomizationConfig, 'bubble.backgroundColor', color);
        setValueByPath(window.cutomizationConfig, 'chatbar.bgColor', color);

        if (window.cutomizationConfig.chatWindow && window.cutomizationConfig.chatWindow.welcome) {
          window.cutomizationConfig.chatWindow.welcome.bgGradient = createAccentGradient(color);
          window.cutomizationConfig.chatWindow.welcome.buttonIconColor = color;
        }

        const accentPick = document.getElementById('global-accent-color-pick');
        const accentText = document.getElementById('global-accent-color');
        if (accentPick && accentPick.value !== color) accentPick.value = color;
        if (accentText && accentText.value !== color) accentText.value = color;
      }

      // Handle Client Name & Agent Name synchronization at root level
      if (path === 'clientName' || path === 'chatWindow.clientName') {
        window.cutomizationConfig.clientName = val;
        if (window.cutomizationConfig.chatWindow) {
          delete window.cutomizationConfig.chatWindow.clientName;
        }
        document.querySelectorAll('[data-path="clientName"], [data-path="chatWindow.clientName"]').forEach(inp => {
          if (inp !== input && inp.value !== val) inp.value = val;
        });
      }
      if (path === 'agentName' || path === 'chatWindow.agentName') {
        window.cutomizationConfig.agentName = val;
        if (window.cutomizationConfig.chatWindow) {
          delete window.cutomizationConfig.chatWindow.agentName;
        }
        document.querySelectorAll('[data-path="agentName"], [data-path="chatWindow.agentName"]').forEach(inp => {
          if (inp !== input && inp.value !== val) inp.value = val;
        });
      }

      // Update JSON textarea
      const jsonTextarea = document.getElementById('raw-json-textarea');
      if (jsonTextarea) {
        jsonTextarea.value = JSON.stringify(window.cutomizationConfig, null, 2);
      }

      // Update Alpine & Lit Stores
      updateAlpineStores(window.cutomizationConfig);
      updateColorPickerStates();
      updateDisabledAccordionStates();
      if (typeof updateFeatureNestedState === 'function') updateFeatureNestedState();

      // Automatically re-trigger preview if appearance delay or animation speed is modified
      if (path.startsWith('greetWindow.')) {
        retriggerGreetCard();
      }
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('change', handleInput);
  });

  // Listen to padding-grids changes
  document.querySelectorAll('.padding-grid[data-padding-path]').forEach(grid => {
    const path = grid.dataset.paddingPath;
    const inputs = grid.querySelectorAll('input');
    const handlePadInput = () => {
      const top = parseFloat(grid.querySelector('[data-pad="top"]')?.value || 0);
      const right = parseFloat(grid.querySelector('[data-pad="right"]')?.value || 0);
      const bottom = parseFloat(grid.querySelector('[data-pad="bottom"]')?.value || 0);
      const left = parseFloat(grid.querySelector('[data-pad="left"]')?.value || 0);
      const formatted = formatPaddingString(top, right, bottom, left);

      setValueByPath(window.cutomizationConfig, path, formatted);

      // Update JSON textarea
      const jsonTextarea = document.getElementById('raw-json-textarea');
      if (jsonTextarea) {
        jsonTextarea.value = JSON.stringify(window.cutomizationConfig, null, 2);
      }

      // Update Alpine Stores
      updateAlpineStores(window.cutomizationConfig);
    };
    inputs.forEach(input => {
      input.addEventListener('input', handlePadInput);
      input.addEventListener('change', handlePadInput);
    });
  });

  // Listen to welcome card background editor changes
  const welcomeCardBgPick = document.getElementById('welcome-card-bg-color-pick');
  const welcomeCardBgText = document.getElementById('welcome-card-bg-color-text');
  const welcomeCardBgOpacity = document.getElementById('welcome-card-bg-opacity');
  const welcomeCardBgOpacityLabel = document.getElementById('welcome-card-bg-opacity-label');

  const handleWelcomeBgChange = () => {
    if (!welcomeCardBgPick || !welcomeCardBgText || !welcomeCardBgOpacity) return;
    const hex = welcomeCardBgText.value;
    // Keep hex color in picker in sync
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      welcomeCardBgPick.value = hex;
    }
    const opacity = parseFloat(welcomeCardBgOpacity.value);
    if (welcomeCardBgOpacityLabel) {
      welcomeCardBgOpacityLabel.textContent = Math.round(opacity * 100) + '%';
    }
    const rgba = formatCardBg(welcomeCardBgPick.value, opacity);
    setValueByPath(window.cutomizationConfig, 'chatWindow.welcome.cardBg', rgba);

    // Update JSON textarea
    const jsonTextarea = document.getElementById('raw-json-textarea');
    if (jsonTextarea) {
      jsonTextarea.value = JSON.stringify(window.cutomizationConfig, null, 2);
    }
    updateAlpineStores(window.cutomizationConfig);
  };

  if (welcomeCardBgPick) {
    welcomeCardBgPick.addEventListener('input', () => {
      welcomeCardBgText.value = welcomeCardBgPick.value;
      handleWelcomeBgChange();
    });
  }
  if (welcomeCardBgText) {
    welcomeCardBgText.addEventListener('input', handleWelcomeBgChange);
  }
  if (welcomeCardBgOpacity) {
    welcomeCardBgOpacity.addEventListener('input', handleWelcomeBgChange);
  }

  // Listen to welcome card border editor changes
  const welcomeBorderWidth = document.getElementById('welcome-card-border-width');
  const welcomeBorderStyle = document.getElementById('welcome-card-border-style');
  const welcomeBorderPick = document.getElementById('welcome-card-border-color-pick');
  const welcomeBorderText = document.getElementById('welcome-card-border-color-text');
  const welcomeBorderOpacity = document.getElementById('welcome-card-border-opacity');
  const welcomeBorderOpacityLabel = document.getElementById('welcome-card-border-opacity-label');

  const handleWelcomeBorderChange = () => {
    if (!welcomeBorderWidth || !welcomeBorderStyle || !welcomeBorderPick || !welcomeBorderText || !welcomeBorderOpacity) return;
    const hex = welcomeBorderText.value;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      welcomeBorderPick.value = hex;
    }
    const opacity = parseFloat(welcomeBorderOpacity.value);
    if (welcomeBorderOpacityLabel) {
      welcomeBorderOpacityLabel.textContent = Math.round(opacity * 100) + '%';
    }
    const borderVal = formatCardBorder(
      parseInt(welcomeBorderWidth.value || 0),
      welcomeBorderStyle.value,
      welcomeBorderPick.value,
      opacity
    );
    setValueByPath(window.cutomizationConfig, 'chatWindow.welcome.cardBorder', borderVal);

    // Update JSON textarea
    const jsonTextarea = document.getElementById('raw-json-textarea');
    if (jsonTextarea) {
      jsonTextarea.value = JSON.stringify(window.cutomizationConfig, null, 2);
    }
    updateAlpineStores(window.cutomizationConfig);
  };

  if (welcomeBorderWidth) welcomeBorderWidth.addEventListener('input', handleWelcomeBorderChange);
  if (welcomeBorderStyle) welcomeBorderStyle.addEventListener('change', handleWelcomeBorderChange);
  if (welcomeBorderPick) {
    welcomeBorderPick.addEventListener('input', () => {
      welcomeBorderText.value = welcomeBorderPick.value;
      handleWelcomeBorderChange();
    });
  }
  if (welcomeBorderText) welcomeBorderText.addEventListener('input', handleWelcomeBorderChange);
  if (welcomeBorderOpacity) welcomeBorderOpacity.addEventListener('input', handleWelcomeBorderChange);

  // Listen to all shadow-editor-wrapper changes
  document.querySelectorAll('.shadow-editor-wrapper[data-shadow-path]').forEach(wrapper => {
    const path = wrapper.dataset.shadowPath;
    const pickInput = wrapper.querySelector('.shadow-color-pick');
    const textInput = wrapper.querySelector('.shadow-color-text');
    const opacityInput = wrapper.querySelector('.shadow-opacity');
    const opacityLabel = wrapper.querySelector('.shadow-opacity-label');

    const handleShadowChange = () => {
      if (!pickInput || !textInput || !opacityInput) return;
      const hex = textInput.value;
      if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
        pickInput.value = hex;
      }
      const opacity = parseFloat(opacityInput.value);
      if (opacityLabel) {
        opacityLabel.textContent = Math.round(opacity * 100) + '%';
      }

      const currentVal = getValueByPath(window.cutomizationConfig, path) || '';
      const updated = updateShadowColor(currentVal, pickInput.value, opacity);
      setValueByPath(window.cutomizationConfig, path, updated);

      // Update JSON textarea
      const jsonTextarea = document.getElementById('raw-json-textarea');
      if (jsonTextarea) {
        jsonTextarea.value = JSON.stringify(window.cutomizationConfig, null, 2);
      }
      updateAlpineStores(window.cutomizationConfig);
    };

    if (pickInput) {
      pickInput.addEventListener('input', () => {
        textInput.value = pickInput.value;
        handleShadowChange();
      });
    }
    if (textInput) {
      textInput.addEventListener('input', handleShadowChange);
    }
    if (opacityInput) {
      opacityInput.addEventListener('input', handleShadowChange);
    }
  });

  // Listen to Launcher Style Segmented Buttons
  const chatbarBtn = document.getElementById('launcher-chatbar-btn');
  const bubbleBtn = document.getElementById('launcher-bubble-btn');
  const hiddenCheckbox = document.getElementById('master-chatbar-enabled');

  if (chatbarBtn && bubbleBtn && hiddenCheckbox) {
    chatbarBtn.addEventListener('click', () => {
      if (hiddenCheckbox.checked !== true) {
        hiddenCheckbox.checked = true;
        // Dispatch change event to trigger form listener and update state
        hiddenCheckbox.dispatchEvent(new Event('change'));

        chatbarBtn.classList.add('active');
        bubbleBtn.classList.remove('active');
      }
    });

    bubbleBtn.addEventListener('click', () => {
      if (hiddenCheckbox.checked !== false) {
        hiddenCheckbox.checked = false;
        hiddenCheckbox.dispatchEvent(new Event('change'));

        bubbleBtn.classList.add('active');
        chatbarBtn.classList.remove('active');
      }
    });
  }
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

// Dynamic updates of the active widget stores (Lit & Alpine)
function updateAlpineStores(config) {
  if (!config) return;

  // Sync root accentColor & useWebsiteTheme across sub-component state objects
  if (config) {
    if (config.accentColor) {
      if (!config.chatWindow) config.chatWindow = {};
      config.chatWindow.accentColor = config.accentColor;
      config.chatWindow.headerBg = config.accentColor;
      config.chatWindow.visitorBubbleBg = config.accentColor;
      config.chatWindow.agentAvatarBg = config.accentColor;
      config.chatWindow.inputFocusBorderColor = config.accentColor;
      config.chatWindow.sendButtonBgActive = config.accentColor;
      config.chatWindow.poweredByColor = config.accentColor;
      config.chatWindow.endChatConfirmBg = config.accentColor;
      if (!config.greetWindow) config.greetWindow = {};
      config.greetWindow.iconColor = config.accentColor;
      if (!config.greetWindow.inputBox) config.greetWindow.inputBox = {};
      config.greetWindow.inputBox.buttonColor = config.accentColor;
      if (!config.bubble) config.bubble = {};
      config.bubble.backgroundColor = config.accentColor;
    }
    if (config.useWebsiteTheme !== undefined) {
      if (!config.bubble) config.bubble = {};
      if (!config.greetWindow) config.greetWindow = {};
      if (!config.chatbar) config.chatbar = {};
      if (!config.chatWindow) config.chatWindow = {};
      config.bubble.useWebsiteTheme = config.useWebsiteTheme;
      config.greetWindow.useWebsiteTheme = config.useWebsiteTheme;
      config.chatbar.useWebsiteTheme = config.useWebsiteTheme;
      config.chatWindow.useWebsiteTheme = config.useWebsiteTheme;
    }
  }

  // Sync Lit Web Component Stores if available
  if (window.ChatWidgetLit && window.ChatWidgetLit.injectStoreConfig) {
    window.ChatWidgetLit.injectStoreConfig(config);
    const widgetRoot = document.querySelector('#preview-viewport-wrapper cw-widget-root');
    if (widgetRoot) {
      ensureLitPointerEvents(widgetRoot);
    }
    if (window.ChatWidgetLit.greetWindowStore) {
      const gw = window.ChatWidgetLit.greetWindowStore.get();
      if (gw && gw.enabled) {
        gw.visible = true;
        gw.dismissed = false;
        if (gw.inputBox) gw.inputBox.visible = true;
      }
    }
    if (window.ChatWidgetLit.chatStore) {
      const isMobileView = document.querySelector('.preview-panel')?.classList.contains('mode-mobile');
      window.ChatWidgetLit.chatStore.get().isMobile = !!isMobileView;
    }
  }

  if (!window.Alpine) return;
  const theme = window.ZotlyUtils ? window.ZotlyUtils.getParentTheme() : { primary: '#0b5fff', secondary: '#8b5cf6' };

  // 1. Update Bubble Trigger Store
  if (Alpine.store('bubble') && config.bubble) {
    let bubbleConfig = JSON.parse(JSON.stringify(config.bubble));
    if (bubbleConfig.useWebsiteTheme === true) {
      bubbleConfig.backgroundColor = theme.primary;
      bubbleConfig.gradientType = 'none';
      if (bubbleConfig.outlineRing) { bubbleConfig.outlineRing.color = theme.secondary; }
    }
    Object.assign(Alpine.store('bubble'), bubbleConfig);
  }

  // 2. Update Greet Window Store
  if (Alpine.store('greetWindow') && config.greetWindow) {
    let greetWindowConfig = JSON.parse(JSON.stringify(config.greetWindow));
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
        if (greetWindowConfig.inputBox.layout === 'separated') {
          greetWindowConfig.inputBox.buttonIconColor = theme.primary;
        } else {
          greetWindowConfig.inputBox.buttonColor = theme.primary;
        }
      }
    }
    Object.assign(Alpine.store('greetWindow'), greetWindowConfig);
  }

  // 3. Update Chatbar Store
  if (Alpine.store('chatbar') && config.chatbar) {
    let chatbarConfig = JSON.parse(JSON.stringify(config.chatbar));

    // Copy the correct offset fields to offsetRight and offsetBottom dynamically
    if (chatbarConfig.layout === 'card') {
      if (chatbarConfig.cardOffsetRight !== undefined && chatbarConfig.cardOffsetRight !== null && chatbarConfig.cardOffsetRight !== '') {
        chatbarConfig.offsetRight = chatbarConfig.cardOffsetRight;
      }
      if (chatbarConfig.cardOffsetBottom !== undefined && chatbarConfig.cardOffsetBottom !== null && chatbarConfig.cardOffsetBottom !== '') {
        chatbarConfig.offsetBottom = chatbarConfig.cardOffsetBottom;
      }
    } else {
      if (chatbarConfig.barOffsetRight !== undefined && chatbarConfig.barOffsetRight !== null && chatbarConfig.barOffsetRight !== '') {
        chatbarConfig.offsetRight = chatbarConfig.barOffsetRight;
      }
      if (chatbarConfig.barOffsetBottom !== undefined && chatbarConfig.barOffsetBottom !== null && chatbarConfig.barOffsetBottom !== '') {
        chatbarConfig.offsetBottom = chatbarConfig.barOffsetBottom;
      }
    }

    Object.assign(Alpine.store('chatbar'), chatbarConfig);
  }

  // 4. Update Chat Window & Welcome Store
  if (Alpine.store('chatWindow') && config.chatWindow) {
    let chatConfig = JSON.parse(JSON.stringify(config.chatWindow));
    const isDark = document.documentElement.classList.contains('dark') || document.querySelector('.preview-panel').classList.contains('dark-mode');

    if (chatConfig.useWebsiteTheme === true) {
      chatConfig.accentColor = theme.primary;
      chatConfig.visitorBubbleBg = theme.primary;
      chatConfig.visitorBubbleColor = '#ffffff';
      chatConfig.headerBg = theme.primary;
      chatConfig.headerTextColor = '#ffffff';
      chatConfig.headerAvatarBg = 'rgba(255,255,255,0.2)';
      chatConfig.headerAvatarColor = '#ffffff';
      chatConfig.agentAvatarBg = theme.primary;
      chatConfig.agentAvatarColor = '#ffffff';
      chatConfig.inputFocusBorderColor = theme.primary;
      chatConfig.inputFocusShadow = `0 0 0 2px ${theme.primary}26`;
      chatConfig.sendButtonBgActive = theme.primary;
      chatConfig.poweredByColor = theme.primary;
      chatConfig.endChatConfirmBg = theme.primary;
      chatConfig.endChatConfirmTextColor = '#ffffff';

      if (isDark) {
        chatConfig.bodyBg = 'var(--cw-bg)';
        chatConfig.inputBg = 'var(--cw-surface)';
        chatConfig.agentBubbleBg = 'var(--cw-surface)';
        chatConfig.agentBubbleColor = 'var(--cw-ink)';
        chatConfig.agentBubbleBorderColor = 'var(--cw-border)';
        chatConfig.footerBg = 'var(--cw-bg)';
        chatConfig.footerTextColor = 'var(--cw-muted)';
        chatConfig.inputTextColor = 'var(--cw-ink)';
        chatConfig.inputBorderColor = 'var(--cw-border)';
        chatConfig.attachButtonBg = 'var(--cw-surface)';
        chatConfig.attachButtonColor = 'var(--cw-muted)';
        chatConfig.emojiButtonColor = 'var(--cw-muted)';
        chatConfig.modalCardBg = 'var(--cw-surface)';
        chatConfig.modalMessageColor = 'var(--cw-ink)';
        chatConfig.endChatCancelBg = 'var(--cw-surface)';
        chatConfig.endChatCancelTextColor = 'var(--cw-muted)';
        chatConfig.endChatCancelBorderColor = 'var(--cw-border)';
      }
    }

    const welcomeObj = chatConfig.welcome || Alpine.store('chatWindow')?.welcome;
    if (welcomeObj) {
      const welcomeUseTheme = welcomeObj.useWebsiteTheme !== undefined ? welcomeObj.useWebsiteTheme : chatConfig.useWebsiteTheme;
      const activeAccent = config.accentColor || chatConfig.accentColor || '#0b5fff';
      if (welcomeUseTheme === true) {
        const secondaryColor = (theme.secondary && theme.secondary !== theme.primary) ? theme.secondary : theme.primary;
        welcomeObj.bgGradient = `linear-gradient(135deg, ${theme.primary}, ${secondaryColor})`;
        welcomeObj.buttonIconColor = theme.primary;
        chatConfig.welcome = welcomeObj;
      } else {
        welcomeObj.bgGradient = createAccentGradient(activeAccent);
        welcomeObj.buttonIconColor = activeAccent;
        chatConfig.welcome = welcomeObj;
      }
    }

    if (isDark && chatConfig.dark && Object.keys(chatConfig.dark).length > 0) {
      Object.assign(chatConfig, chatConfig.dark);
    }

    // Sync features at both top-level and chatWindow level
    if (!config.features) {
      config.features = chatConfig.features || {
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
    chatConfig.features = config.features;
    if (Alpine.store('features')) {
      Object.assign(Alpine.store('features'), config.features);
    }

    Object.assign(Alpine.store('chatWindow'), chatConfig);
    if (Alpine.store('chatcontactv2')) {
      Object.assign(Alpine.store('chatcontactv2'), chatConfig);
    }

    // Sync Chat general info
    const chatStore = Alpine.store('chat');
    if (chatStore) {
      if (chatConfig.clientName) chatStore.clientName = chatConfig.clientName;
      if (chatConfig.agentName) {
        chatStore.agentName = chatConfig.agentName;
        if (chatStore.messages && chatStore.messages[0] && chatStore.messages[0].senderType === 'AGENT') { chatStore.messages[0].senderName = chatConfig.agentName; }
      }

      // Dynamically switch active view to welcome or active based on checkbox toggle if user hasn't sent messages
      if (!chatStore.hasSentMessage && chatConfig.welcome) {
        const targetState = (chatConfig.welcome.enabled === true) ? 'welcome' : 'active';
        if (window.lastWelcomeEnabled === undefined) {
          window.lastWelcomeEnabled = chatConfig.welcome.enabled;
          chatStore.state = targetState;
        } else if (window.lastWelcomeEnabled !== chatConfig.welcome.enabled) {
          window.lastWelcomeEnabled = chatConfig.welcome.enabled;
          chatStore.state = targetState;
        }
      }
    }
  }
}

// Retrigger entrance transition & appearance delay for greeting card
function retriggerGreetCard() {
  const config = window.cutomizationConfig || {};

  // Parse configured appearance delay and input reveal delay in seconds
  const greetDelaySec = Math.max(0, parseFloat(config.greetWindow?.openingTimeAfterInitialLoadSec ?? 2));
  const inputDelaySec = Math.max(0, parseFloat(config.greetWindow?.inputBox?.openingTimeAfterInitialLoadSec ?? 4));

  // 1. Lit Web Component widget re-triggering
  if (window.ChatWidgetLit && window.ChatWidgetLit.greetWindowStore) {
    const gwStore = window.ChatWidgetLit.greetWindowStore;
    const gw = gwStore.get();
    if (gw) {
      // Sync latest delay and animation configuration
      if (config.greetWindow) {
        if (config.greetWindow.openingTimeAfterInitialLoadSec !== undefined) {
          gw.openingTimeAfterInitialLoadSec = config.greetWindow.openingTimeAfterInitialLoadSec;
        }
        if (config.greetWindow.animationOpeningSec !== undefined) {
          gw.animationOpeningSec = config.greetWindow.animationOpeningSec;
        }
        if (config.greetWindow.animationClosingSec !== undefined) {
          gw.animationClosingSec = config.greetWindow.animationClosingSec;
        }
        if (gw.inputBox && config.greetWindow.inputBox) {
          if (config.greetWindow.inputBox.openingTimeAfterInitialLoadSec !== undefined) {
            gw.inputBox.openingTimeAfterInitialLoadSec = config.greetWindow.inputBox.openingTimeAfterInitialLoadSec;
          }
          if (config.greetWindow.inputBox.animationOpeningSec !== undefined) {
            gw.inputBox.animationOpeningSec = config.greetWindow.inputBox.animationOpeningSec;
          }
        }
      }

      // Reset visibility state
      gw.visible = false;
      gw.dismissed = false;
      if (gw.inputBox) gw.inputBox.visible = false;
      if (typeof gwStore.emit === 'function') gwStore.emit('store:greetWindow');

      // Clear existing timers
      if (window._retriggerGreetTimer) clearTimeout(window._retriggerGreetTimer);
      if (window._retriggerInputTimer) clearTimeout(window._retriggerInputTimer);

      // Trigger appearance delay countdown
      window._retriggerGreetTimer = setTimeout(() => {
        const currentGw = gwStore.get();
        if (currentGw) {
          currentGw.visible = true;
          currentGw.dismissed = false;
          if (typeof gwStore.emit === 'function') gwStore.emit('store:greetWindow');
        }

        // Trigger input card reveal delay countdown
        if (gw.inputBox && gw.inputBox.enabled) {
          const remainingInputDelayMs = Math.max(0, (inputDelaySec - greetDelaySec) * 1000);
          window._retriggerInputTimer = setTimeout(() => {
            const curGw = gwStore.get();
            if (curGw && curGw.inputBox) {
              curGw.inputBox.visible = true;
              if (typeof gwStore.emit === 'function') gwStore.emit('store:greetWindow');
            }
          }, remainingInputDelayMs);
        }
      }, Math.max(50, greetDelaySec * 1000));
    }
  }

  // 2. Alpine fallback widget re-triggering
  if (window.Alpine && Alpine.store('greetWindow')) {
    const greetStore = Alpine.store('greetWindow');
    if (greetStore) {
      greetStore.visible = false;
      greetStore.dismissed = false;
      if (greetStore.inputBox) greetStore.inputBox.visible = false;

      setTimeout(() => {
        greetStore.visible = true;
        if (greetStore.inputBox && greetStore.inputBox.enabled) {
          const remainingInputDelayMs = Math.max(0, (inputDelaySec - greetDelaySec) * 1000);
          setTimeout(() => {
            greetStore.inputBox.visible = true;
          }, remainingInputDelayMs);
        }
      }, Math.max(50, greetDelaySec * 1000));
    }
  }
}

// Reset/restart conversation session simulation
function restartChatSession() {
  const welcomeEnabled = window.cutomizationConfig?.chatWindow?.welcome?.enabled;
  if (window.ChatWidgetLit && window.ChatWidgetLit.chatStore) {
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
    const sections = activeTab.querySelectorAll('.accordion-section, .features-card, .section-card, .form-section-card');
    if (!sections.length) return;

    const panelRect = panel.getBoundingClientRect();
    let currentMain = '';
    let currentSub = '';

    sections.forEach(sec => {
      const rect = sec.getBoundingClientRect();
      // Check if section top is near top of panel
      if (rect.top - panelRect.top <= 140 && rect.bottom - panelRect.top > 40) {
        if (sec.classList.contains('accordion-section')) {
          const mainTitle = sec.querySelector('.accordion-title')?.textContent?.trim();
          if (mainTitle) currentMain = mainTitle.replace(/^[^\w\s]+/, '').trim(); // Strip emoji

          // Check for sub section card inside accordion
          const subCards = sec.querySelectorAll('.form-section-card');
          subCards.forEach(sub => {
            const subRect = sub.getBoundingClientRect();
            if (subRect.top - panelRect.top <= 180 && subRect.bottom - panelRect.top > 50) {
              const subTitle = sub.querySelector('.form-section-title')?.textContent?.trim();
              if (subTitle) currentSub = subTitle;
            }
          });
        } else if (sec.classList.contains('features-card')) {
          const mainTitle = sec.querySelector('.features-card-title')?.textContent?.trim();
          if (mainTitle) currentMain = mainTitle;
          const subTitle = sec.querySelector('.feature-name')?.textContent?.trim();
          if (subTitle) currentSub = subTitle;
        } else if (sec.classList.contains('section-card')) {
          const mainTitle = sec.querySelector('.section-card-header')?.textContent?.trim();
          if (mainTitle) currentMain = mainTitle;
        }
      }
    });

    const indicator = document.getElementById('sticky-appearance-breadcrumb');
    if (indicator) {
      if (panel.scrollTop > 30) {
        indicator.classList.add('is-scrolled');
      } else {
        indicator.classList.remove('is-scrolled');
      }
    }

    if (currentMain) {
      if (mainTitleEl.textContent !== currentMain) mainTitleEl.textContent = currentMain;
      if (currentSub) {
        if (subTitleEl.textContent !== currentSub) subTitleEl.textContent = currentSub;
        subTitleEl.style.display = 'inline';
        const sep = document.querySelector('.indicator-separator');
        if (sep) sep.style.display = 'inline';
      } else {
        subTitleEl.style.display = 'none';
        const sep = document.querySelector('.indicator-separator');
        if (sep) sep.style.display = 'none';
      }
    }
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
function updateDisabledAccordionStates() {
  const config = window.cutomizationConfig;
  if (!config) return;

  // Update Greet Card header media visibility (Icon vs Custom Image vs SVG)
  updateGreetMediaFieldsVisibility();

  // 1. Greet Card Popup (Section 2) -> Enabled if greetWindow.enabled is true
  const greetEnabled = !!getValueByPath(config, 'greetWindow.enabled');
  const greetSection = document.getElementById('accordion-greet-card');
  if (greetSection) {
    if (greetEnabled) {
      greetSection.classList.remove('disabled');
    } else {
      greetSection.classList.add('disabled');
      greetSection.classList.remove('active'); // Close if active
    }
  }

  // 2. Greet Card Quick Input Box (sub-section inside Section 2) -> Enabled if greetWindow.inputBox.enabled is true
  const greetInputEnabled = !!getValueByPath(config, 'greetWindow.inputBox.enabled');
  const greetInputSub = document.getElementById('sub-section-greet-input');
  if (greetInputSub) {
    if (greetInputEnabled) {
      greetInputSub.classList.remove('disabled');
    } else {
      greetInputSub.classList.add('disabled');
    }
  }

  // 3. Chatbar Trigger (Section 4) vs Bubble Trigger (Section 3)
  // - If chatbar.enabled is true: Chatbar trigger is enabled, Bubble trigger is disabled.
  // - If chatbar.enabled is false: Bubble trigger is enabled, Chatbar trigger is disabled.
  const chatbarEnabled = !!getValueByPath(config, 'chatbar.enabled');
  const chatbarSection = document.getElementById('accordion-chatbar-trigger');
  const bubbleSection = document.getElementById('accordion-bubble-trigger');

  if (chatbarSection) {
    if (chatbarEnabled) {
      chatbarSection.classList.remove('disabled');
    } else {
      chatbarSection.classList.add('disabled');
      chatbarSection.classList.remove('active');
    }
  }

  if (bubbleSection) {
    if (!chatbarEnabled) {
      bubbleSection.classList.remove('disabled');
    } else {
      bubbleSection.classList.add('disabled');
      bubbleSection.classList.remove('active');
    }
  }

  // 4. Welcome Dashboard (Section 6) -> Enabled if chatWindow.welcome.enabled is true
  const welcomeEnabled = !!getValueByPath(config, 'chatWindow.welcome.enabled');
  const welcomeSection = document.getElementById('accordion-welcome-dashboard');
  if (welcomeSection) {
    if (welcomeEnabled) {
      welcomeSection.classList.remove('disabled');
    } else {
      welcomeSection.classList.add('disabled');
      welcomeSection.classList.remove('active');
    }
  }

  // 5. Dynamic Launcher Offsets toggling
  const bubbleOffsets = document.getElementById('layout-bubble-offsets');
  const chatbarOffsets = document.getElementById('layout-chatbar-offsets');
  if (bubbleOffsets && chatbarOffsets) {
    if (chatbarEnabled) {
      chatbarOffsets.style.display = 'block';
      bubbleOffsets.style.display = 'none';
    } else {
      bubbleOffsets.style.display = 'block';
      chatbarOffsets.style.display = 'none';
    }
  }
}

/* ==========================================================================
   FORMS COMPONENT & PREVIEW INTERACTIVITY
   ========================================================================== */

// Helper to toggle form section accordion cards
function toggleFormSectionCard(cardId) {
  const card = document.getElementById(cardId);
  if (card) {
    card.classList.toggle('active');
  }
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

// Global initialization for imported forms component
async function loadAndInitFormsComponent() {
  const formsContainer = document.getElementById('tab-forms');
  if (!formsContainer) return;

  // Try to dynamically fetch forms.html if data-include is present
  const includeFile = formsContainer.getAttribute('data-include');
  if (includeFile) {
    try {
      const response = await fetch(includeFile);
      if (response.ok) {
        formsContainer.innerHTML = await response.text();
      }
    } catch (err) {
      // Expected offline/standalone fallback — the embedded template is used.
    }
  }

  const isFormsTabActive = () => {
    return document.querySelector('.nav-tab[data-tab="tab-forms"]')?.classList.contains('active');
  };

  // Bind character counters & live preview
  const headingInput = document.getElementById('ticket-form-heading-input');
  const headingCounter = document.getElementById('heading-char-count');
  const subheadingInput = document.getElementById('ticket-form-subheading-input');
  const subheadingCounter = document.getElementById('subheading-char-count');

  const triggerTicketPreview = () => {
    if (isFormsTabActive() && window.FormsPreview) {
      window.FormsPreview.renderTicketPreview('preview-scrollable-content', headingInput?.value, subheadingInput?.value);
    }
  };

  if (headingInput && headingCounter) {
    const updateHeadingCount = () => {
      headingCounter.textContent = `${headingInput.value.length}/65`;
      triggerTicketPreview();
    };
    headingInput.addEventListener('input', updateHeadingCount);
    headingInput.addEventListener('focus', triggerTicketPreview);
    updateHeadingCount();
  }

  if (subheadingInput && subheadingCounter) {
    const updateSubheadingCount = () => {
      subheadingCounter.textContent = `${subheadingInput.value.length}/65`;
      triggerTicketPreview();
    };
    subheadingInput.addEventListener('input', updateSubheadingCount);
    subheadingInput.addEventListener('focus', triggerTicketPreview);
    updateSubheadingCount();
  }

  // Helper to trigger Pre-Chat / Post-Chat form live preview on Lit Web Component
  window.showFormInLivePreview = function (formType) {
    const widgetEmbed = document.getElementById('zotly-widget-embed') || document.querySelector('cw-widget-root');
    if (widgetEmbed) {
      widgetEmbed.style.display = 'block';
    }

    const rootEl = document.querySelector('cw-widget-root');
    if (window.ChatWidgetLit && window.ChatWidgetLit.chatStore) {
      const cs = window.ChatWidgetLit.chatStore.get();
      if (cs) {
        cs.panelOpen = true;
        if (formType === 'postchat') {
          cs.state = 'postchat';
          if (rootEl) rootEl.postchatEnabled = true;
        } else {
          cs.state = 'prechat';
          if (rootEl) rootEl.prechatEnabled = true;
        }
      }
      if (rootEl) {
        rootEl.panelOpen = true;
        if (typeof rootEl.requestUpdate === 'function') rootEl.requestUpdate();
      }
    }

    if (window.Alpine && Alpine.store('chat')) {
      const widgetContainer = document.getElementById('zotly-widget-embed');
      if (widgetContainer && widgetContainer._x_dataStack && widgetContainer._x_dataStack[0]) {
        widgetContainer._x_dataStack[0].openContactWidget = true;
      }
      Alpine.store('chat').panelOpen = true;
      Alpine.store('chat').state = (formType === 'postchat') ? 'postchat' : 'prechat';
    }
  };

  // Post chat form toggle select visibility & preview trigger
  const postchatToggle = document.getElementById('postchat-form-toggle');
  const postchatSelectContainer = document.getElementById('postchat-select-container');
  if (postchatToggle && postchatSelectContainer) {
    postchatToggle.addEventListener('change', () => {
      postchatSelectContainer.style.display = postchatToggle.checked ? 'block' : 'none';
      if (window.cutomizationConfig) {
        window.cutomizationConfig.postchatEnabled = postchatToggle.checked;
      }
      if (isFormsTabActive()) {
        if (postchatToggle.checked) {
          window.showFormInLivePreview('postchat');
        } else if (prechatToggle && prechatToggle.checked) {
          window.showFormInLivePreview('prechat');
        } else {
          window.showFormInLivePreview('prechat');
        }
      }
    });
  }

  // Pre chat form toggle select visibility & preview trigger
  const prechatToggle = document.getElementById('prechat-form-toggle');
  const prechatSelectContainer = document.getElementById('prechat-select-container');
  if (prechatToggle && prechatSelectContainer) {
    prechatToggle.addEventListener('change', () => {
      prechatSelectContainer.style.opacity = prechatToggle.checked ? '1' : '0.5';
      prechatSelectContainer.style.pointerEvents = prechatToggle.checked ? 'auto' : 'none';
      if (window.cutomizationConfig) {
        window.cutomizationConfig.prechatEnabled = prechatToggle.checked;
      }
      if (isFormsTabActive()) {
        if (prechatToggle.checked) {
          window.showFormInLivePreview('prechat');
        } else if (postchatToggle && postchatToggle.checked) {
          window.showFormInLivePreview('postchat');
        } else {
          window.showFormInLivePreview('prechat');
        }
      }
    });
  }

  // Initial render if forms tab is active on page load
  if (isFormsTabActive()) {
    const widgetEmbed = document.getElementById('zotly-widget-embed') || document.querySelector('cw-widget-root');
    if (widgetEmbed) widgetEmbed.style.display = 'block';
    if (postchatToggle && postchatToggle.checked) {
      window.showFormInLivePreview('postchat');
    } else {
      window.showFormInLivePreview('prechat');
    }
  }

  // Form builder modal logic
  const modal = document.getElementById('modal-form-builder');
  const btnOpen = document.getElementById('btn-open-form-builder');
  const btnClose = document.getElementById('btn-close-form-builder');
  const btnCancel = document.getElementById('btn-cancel-form-builder');
  const btnSave = document.getElementById('btn-save-custom-form');

  if (modal) {
    const closeModal = () => { modal.style.display = 'none'; };
    if (btnOpen) btnOpen.addEventListener('click', () => { modal.style.display = 'flex'; });
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);
    if (btnSave) {
      btnSave.addEventListener('click', () => {
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
  }
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

