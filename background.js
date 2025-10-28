// background.js (hardened: validation + error handling; logic unchanged)

// ---- Utility: safe logging (kept minimal for production) ----
function logDebug(...args) {
  // Uncomment for debugging
  // console.debug('[ambient-theme]', ...args);
}

// ---- Color helpers (unchanged logic; added input checks) ----
function normalizeHex(hex) {
  try {
    if (!hex) return null;
    let s = String(hex).trim();
    if (s.startsWith('rgba')) {
      const m = s.match(/rgba?\s*\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
      if (m) {
        const [r, g, b] = [m[1], m[2], m[3]].map(Number);
        return rgbToHex(r, g, b);
      }
    }
    if (s.startsWith('rgb')) {
      const m = s.match(/rgb\s*\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
      if (m) {
        const [r, g, b] = [m[1], m[2], m[3]].map(Number);
        return rgbToHex(r, g, b);
      }
    }
    if (s[0] === '#') s = s.slice(1);
    if (s.length === 3) s = s.split('').map(c => c + c).join('');
    if (s.length === 8) s = s.slice(0, 6);
    if (s.length !== 6) return null;
    return '#' + s.toUpperCase();
  } catch {
    return null;
  }
}
function rgbToHex(r, g, b) {
  try {
    const rr = Number.isFinite(r) ? r : 0;
    const gg = Number.isFinite(g) ? g : 0;
    const bb = Number.isFinite(b) ? b : 0;
    return ('#' + [rr, gg, bb].map(v => Math.max(0, Math.min(255, v))).map(v => v.toString(16).padStart(2, '0')).join('')).toUpperCase();
  } catch {
    return '#000000';
  }
}
function hexToRgb(hex) {
  try {
    const s = normalizeHex(hex);
    if (!s) return null;
    const n = s.slice(1);
    return {
      r: parseInt(n.slice(0, 2), 16),
      g: parseInt(n.slice(2, 4), 16),
      b: parseInt(n.slice(4, 6), 16)
    };
  } catch {
    return null;
  }
}
function relativeLuminance({ r, g, b }) {
  try {
    const srgb = [r, g, b].map(v => v / 255).map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  } catch {
    return 0;
  }
}
function contrastRatio(fgHex, bgHex) {
  try {
    const fg = hexToRgb(fgHex), bg = hexToRgb(bgHex);
    if (!fg || !bg) return 1;
    const L1 = relativeLuminance(fg), L2 = relativeLuminance(bg);
    const lighter = Math.max(L1, L2), darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
  } catch {
    return 1;
  }
}
function getReadableTextColor(bgHex, minContrast) {
  try {
    const black = '#000000';
    const white = '#FFFFFF';
    const cBlack = contrastRatio(black, bgHex);
    const cWhite = contrastRatio(white, bgHex);
    const pick = (cWhite >= cBlack) ? white : black;
    if (contrastRatio(pick, bgHex) >= (Number.isFinite(minContrast) ? minContrast : 4.5)) return pick;
    return pick;
  } catch {
    return '#FFFFFF';
  }
}
function blendColors(hexA, hexB, t) {
  try {
    const a = hexToRgb(hexA), b = hexToRgb(hexB);
    if (!a || !b) return normalizeHex(hexA) || '#000000';
    const mix = (x, y) => Math.round(x + (y - x) * (Number.isFinite(t) ? t : 0));
    return rgbToHex(mix(a.r, b.r), mix(a.g, b.g), mix(a.b, b.b));
  } catch {
    return normalizeHex(hexA) || '#000000';
  }
}
function isHttpUrl(u) {
  try {
    const x = new URL(u);
    return x.protocol === 'http:' || x.protocol === 'https:';
  } catch {
    return false;
  }
}
function getHostname(u) {
  try {
    return new URL(u).hostname || '';
  } catch {
    return '';
  }
}

// ---- Storage sanitization (defensive; logic preserved) ----
function sanitizePrefs(input) {
  const out = {};
  const i = input || {};
  out.enabled = typeof i.enabled === 'boolean' ? i.enabled : true;
  out.minContrast = Number.isFinite(Number(i.minContrast)) ? Math.max(1, Math.min(21, Number(i.minContrast))) : 4.5;
  out.toolbarBlend = Number.isFinite(Number(i.toolbarBlend)) ? Math.max(0, Math.min(1, Number(i.toolbarBlend))) : 0.08;
  out.perSiteDisabled = sanitizeHostMap(i.perSiteDisabled);
  return out;
}
function sanitizeHostMap(map) {
  const clean = {};
  if (map && typeof map === 'object') {
    for (const [k, v] of Object.entries(map)) {
      const h = normalizeHost(k);
      if (!h) continue;
      clean[h] = !!v;
    }
  }
  return clean;
}
function normalizeHost(input) {
  try {
    const s = String(input || '').trim().toLowerCase();
    if (!s) return '';
    if (s.startsWith('.') || s.endsWith('.')) return '';
    if (/\s/.test(s) || s.includes('/') || s.includes('*')) return '';
    const parts = s.split('.');
    if (parts.some(p => !p || p.length > 63 || p.startsWith('-') || p.endsWith('-') || /[^a-z0-9-]/i.test(p))) return '';
    return s;
  } catch {
    return '';
  }
}

// ---- Optional in-memory cache (unchanged usage) ----
const lastTabColors = new Map();

// ---- Privileged operations: wrap in try/catch ----
async function safeThemeUpdate(windowId, theme) {
  try {
    if (Number.isInteger(windowId) && theme && typeof theme === 'object') {
      await browser.theme.update(windowId, theme);
    }
  } catch (e) {
    logDebug('theme.update failed', e);
  }
}
async function safeThemeReset(windowId) {
  try {
    if (Number.isInteger(windowId)) {
      await browser.theme.reset(windowId);
    }
  } catch (e) {
    logDebug('theme.reset failed', e);
  }
}
async function safeSendToTab(tabId, msg) {
  try {
    if (Number.isInteger(tabId) && msg && typeof msg === 'object') {
      await browser.tabs.sendMessage(tabId, msg);
    }
  } catch (e) {
    logDebug('tabs.sendMessage failed', e);
  }
}
async function safeQueryActiveTab() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    return tab || null;
  } catch (e) {
    logDebug('tabs.query failed', e);
    return null;
  }
}
async function safeGetStorage(keys) {
  try {
    const raw = await browser.storage.local.get(keys);
    return sanitizePrefs(raw);
  } catch (e) {
    logDebug('storage.get failed', e);
    return sanitizePrefs({});
  }
}
async function safeSetStorage(obj) {
  try {
    const payload = JSON.parse(JSON.stringify(obj));
    await browser.storage.local.set(payload);
  } catch (e) {
    logDebug('storage.set failed', e);
  }
}

// ---- Message routing (logic preserved; added validation) ----
browser.runtime.onMessage.addListener(async (msg, sender) => {
  try {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'ambient-theme-refresh') {
      const tabId = Number.isInteger(msg.tabId) ? msg.tabId : null;
      const windowId = Number.isInteger(msg.windowId) ? msg.windowId : null;
      const host = normalizeHost(msg.host);
      const store = await safeGetStorage(['perSiteDisabled', 'enabled']);
      const enabled = store.enabled !== false;
      const disabled = !!(host && store.perSiteDisabled[host]);

      if (!enabled) {
        if (windowId !== null) await safeThemeReset(windowId);
        return;
      }
      if (disabled) {
        if (windowId !== null) await safeThemeReset(windowId);
        return;
      }
      if (tabId !== null) {
        await safeSendToTab(tabId, { type: 'ambient-theme-request' });
      } else if (windowId !== null) {
        await safeThemeReset(windowId);
      }
      return;
    }

    if (msg.type !== 'ambient-theme-colors') return;

    // Read settings defensively
    const settings = await safeGetStorage(['enabled', 'minContrast', 'perSiteDisabled', 'toolbarBlend']);
    const enabled = settings.enabled !== false;
    const minContrast = settings.minContrast;
    const perSiteDisabled = settings.perSiteDisabled || {};
    const toolbarBlend = settings.toolbarBlend;

    const url = sender?.tab?.url || '';
    const winId = Number.isInteger(sender?.tab?.windowId) ? sender.tab.windowId : null;

    if (!enabled || !isHttpUrl(url)) {
      if (winId !== null) await safeThemeReset(winId);
      return;
    }

    const hostname = normalizeHost(getHostname(url));
    if (hostname && perSiteDisabled[hostname]) {
      if (winId !== null) await safeThemeReset(winId);
      return;
    }

    // Validate payload colors and compute theme (logic preserved)
    const base = normalizeHex(msg?.payload?.primary) || '#2B2B2B';
    const acc = normalizeHex(msg?.payload?.accent) || base;
    const tabText = getReadableTextColor(base, minContrast);
    const toolbar = blendColors(base, '#111111', toolbarBlend);

    const theme = {
      colors: {
        frame: base,
        toolbar,
        tab_text: tabText,
        tab_background_text: tabText,
        toolbar_text: tabText,
        accentcolor: acc,
        textcolor: tabText
      }
    };

    // Cache last colors for potential future use (unchanged intention)
    if (Number.isInteger(sender?.tab?.id)) {
      lastTabColors.set(sender.tab.id, { base, acc, tabText, toolbar });
    }

    if (winId !== null) {
      await safeThemeUpdate(winId, theme);
    }
  } catch (e) {
    logDebug('onMessage handler error', e);
  }
});

// ---- Tab/window event wiring (logic preserved; added guards) ----
browser.tabs.onActivated.addListener(async () => {
  try { await requestActiveTabColors(); } catch (e) { logDebug('onActivated error', e); }
});
browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  try {
    if (changeInfo && changeInfo.status === 'complete') {
      requestActiveTabColors().catch(e => logDebug('onUpdated error', e));
    }
  } catch (e) { logDebug('onUpdated outer error', e); }
});
browser.windows.onFocusChanged.addListener(() => {
  try { requestActiveTabColors().catch(e => logDebug('onFocusChanged error', e)); } catch (e) { logDebug('onFocusChanged outer error', e); }
});

// ---- Active tab refresh (logic preserved; added reset on non-http/disabled) ----
async function requestActiveTabColors() {
  try {
    const tab = await safeQueryActiveTab();
    if (!tab) return;

    const { enabled = true } = await safeGetStorage(['enabled']);
    const urlOk = isHttpUrl(tab.url);

    if (!enabled || !urlOk) {
      if (Number.isInteger(tab.windowId)) await safeThemeReset(tab.windowId);
      return;
    }

    await safeSendToTab(tab.id, { type: 'ambient-theme-request' });
  } catch (e) {
    logDebug('requestActiveTabColors error', e);
    // As a safety, attempt to reset if we know the window
    try {
      const tab = await safeQueryActiveTab();
      if (tab && Number.isInteger(tab.windowId)) await safeThemeReset(tab.windowId);
    } catch {}
  }
}
