// content/contentScript.js (hardened: validation + error handling; logic unchanged)
//
// Extraction priority:
// 1) <meta name="theme-color">
// 2) Logo-like element (header/logo heuristics)
// 3) Favicon dominant color
// 4) Primary button color
// 5) Largest visible image (CORS-safe sampling with taint checks)
// 6) Page background color

(function () {
  // Avoid running in tiny or offscreen iframes
  try {
    if (window.top !== window) {
      const w = document.documentElement?.clientWidth || 0;
      const h = document.documentElement?.clientHeight || 0;
      if (w < 2 || h < 2) return;
    }
  } catch {
    // cross-origin frame access blocked; proceed
  }

  let prefs = { enabled: true, sampleScale: 0.12 };

  // Defensive preference read
  try {
    browser.storage?.local?.get({ enabled: true, sampleScale: 0.12 }).then(
      got => {
        const g = got || {};
        prefs.enabled = typeof g.enabled === 'boolean' ? g.enabled : true;
        const s = Number(g.sampleScale);
        prefs.sampleScale = Number.isFinite(s) ? clamp(s, 0.02, 0.5) : 0.12;
        if (prefs.enabled) scheduleReextract();
      },
      () => { if (prefs.enabled) scheduleReextract(); }
    );
  } catch {
    // If storage is unavailable, continue with defaults
    if (prefs.enabled) scheduleReextract();
  }

  // React to background requests (tab switch, focus, navigation complete)
  try {
    browser.runtime.onMessage.addListener((msg) => {
      try {
        if (msg && msg.type === 'ambient-theme-request') {
          scheduleReextract();
        }
      } catch {
        // ignore
      }
    });
  } catch {
    // ignore
  }

  // Debounce extraction to avoid excessive work
  let debounceTimer = null;
  function scheduleReextract() {
    try {
      if (!prefs.enabled) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        reextractAndSend().catch(() => {});
      }, 80);
    } catch {
      // ignore
    }
  }

  async function reextractAndSend() {
    try {
      if (!document || !document.documentElement) return;

      // 1) meta[name="theme-color"]
      const metaTheme = tryMetaThemeColor();
      if (metaTheme) { sendColors(metaTheme, null); return; }

      // 2) Logo-like color
      const logoHex = await tryLogoColor();
      if (logoHex) { sendColors(logoHex, null); return; }

      // 3) Favicon dominant color
      const favHex = await tryFaviconColor();
      if (favHex) { sendColors(favHex, null); return; }

      // 4) Primary button color
      const btnHex = tryPrimaryButtonColor();
      if (btnHex) { sendColors(btnHex, null); return; }

      // 5) Largest visible image dominant color
      const imgHex = await tryLargestImageColor();
      if (imgHex) { sendColors(imgHex, null); return; }

      // 6) Page background color
      const bg = tryPageBackgroundColor();
      if (bg) { sendColors(bg, null); return; }
    } catch {
      // ignore
    }
  }

  function sendColors(primary, accent) {
    try {
      const payload = {
        type: 'ambient-theme-colors',
        payload: {
          primary: normalizeHex(primary),
          accent: normalizeHex(accent)
        }
      };
      // Avoid sending empty objects that could confuse the background
      if (!payload.payload.primary && !payload.payload.accent) return;
      browser.runtime.sendMessage(payload).catch(() => {});
    } catch {
      // ignore
    }
  }

  // --------- Extractors (logic unchanged, wrapped with guards) ---------

  function tryMetaThemeColor() {
    try {
      const content = document.querySelector('meta[name="theme-color"]')?.content;
      return normalizeHex(content);
    } catch {
      return null;
    }
  }

  async function tryLogoColor() {
    try {
      const list = document.querySelectorAll('header img, header svg, [class*="logo"] img, [class*="logo"] svg, a[aria-label*=logo] img, a[aria-label*=logo] svg');
      const candidates = [...list].filter(isElementVisible).slice(0, 8);
      for (const el of candidates) {
        const c = await dominantColorFromElement(el);
        if (c) return c;
      }
    } catch {}
    return null;
  }

  async function tryFaviconColor() {
    try {
      const links = [...document.querySelectorAll('link[rel~="icon"], link[rel="shortcut icon"], link[rel="mask-icon"]')];
      for (const l of links) {
        const href = l?.href;
        if (!href) continue;
        const c = await dominantColorFromUrl(href);
        if (c) return c;
      }
    } catch {}
    return null;
  }

  function tryPrimaryButtonColor() {
    try {
      const btn = document.querySelector('button, .btn, [role="button"], input[type="submit"], input[type="button"]');
      if (!btn || !isElementVisible(btn)) return null;
      const cs = safeGetComputedStyle(btn);
      const bg = (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent')
        ? cs.backgroundColor
        : cs.color;
      return normalizeHex(bg);
    } catch {
      return null;
    }
  }

  async function tryLargestImageColor() {
    try {
      const imgs = [...document.images].filter(isElementVisible).filter(i => {
        const w = Number(i.naturalWidth) || 0;
        const h = Number(i.naturalHeight) || 0;
        return w * h > 0;
      });
      if (imgs.length === 0) return null;
      imgs.sort((a, b) => ((b.naturalWidth || 0) * (b.naturalHeight || 0)) - ((a.naturalWidth || 0) * (a.naturalHeight || 0)));
      const top = imgs.slice(0, 6);
      for (const img of top) {
        const c = await dominantColorFromElement(img);
        if (c) return c;
      }
    } catch {}
    return null;
  }

  function tryPageBackgroundColor() {
    try {
      const rootCS = safeGetComputedStyle(document.documentElement);
      const bodyCS = document.body ? safeGetComputedStyle(document.body) : null;
      const root = rootCS.backgroundColor;
      const body = bodyCS?.backgroundColor;
      return normalizeHex(root) || normalizeHex(body);
    } catch {
      return null;
    }
  }

  // --------- Helpers (logic preserved, guarded) ---------

  function isElementVisible(el) {
    try {
      if (!el || typeof el.getBoundingClientRect !== 'function') return false;
      const rect = el.getBoundingClientRect();
      if (!rect) return false;
      return rect.width > 1 && rect.height > 1 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
    } catch {
      return false;
    }
  }

  function safeGetComputedStyle(el) {
    try {
      return getComputedStyle(el);
    } catch {
      return { backgroundColor: '', color: '' };
    }
  }

  async function dominantColorFromElement(el) {
    try {
      const tag = (el.tagName || '').toLowerCase();
      if (tag === 'img' && el.src) {
        return await dominantColorFromUrl(el.src);
      }
      if (tag === 'svg') {
        const fill = el.getAttribute('fill') || safeGetComputedStyle(el).color;
        return normalizeHex(fill);
      }
      // background-image case
      const cs = safeGetComputedStyle(el);
      const bgImg = cs.backgroundImage || '';
      const m = bgImg.match(/url\(["']?([^"')]+)["']?\)/);
      if (m && m[1]) return await dominantColorFromUrl(m[1]);
    } catch {}
    return null;
  }

  async function dominantColorFromUrl(url) {
    try {
      const abs = toAbsoluteUrl(url);
      if (!abs) return null;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.src = abs;

      // decode may fail; continue to allow drawImage attempt
      try { await img.decode(); } catch {}

      const iw = Number(img.naturalWidth) || 0;
      const ih = Number(img.naturalHeight) || 0;
      if (iw === 0 || ih === 0) return null;

      const scale = clamp(Number(prefs.sampleScale) || 0.12, 0.02, 0.5);
      const w = Math.max(1, Math.floor(iw * scale));
      const h = Math.max(1, Math.floor(ih * scale));

      const { canvas, ctx } = makeCanvas(w, h);
      ctx.drawImage(img, 0, 0, w, h);

      let data;
      try {
        data = ctx.getImageData(0, 0, w, h).data;
      } catch {
        // tainted canvas; do not read pixels
        return null;
      }

      const buckets = new Map();
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 128) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
        buckets.set(key, (buckets.get(key) || 0) + 1);
      }

      let bestKey = null, bestCount = -1;
      for (const [k, c] of buckets) {
        if (c > bestCount) { bestCount = c; bestKey = k; }
      }
      if (bestKey == null) return null;

      const r = ((bestKey >> 10) & 31) << 3;
      const g = ((bestKey >> 5) & 31) << 3;
      const b = (bestKey & 31) << 3;
      return rgbToHex(r, g, b);
    } catch {
      return null;
    }
  }

  function toAbsoluteUrl(u) {
    try { return new URL(u, document.baseURI).href; } catch { return null; }
  }

  function makeCanvas(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, w | 0);
    canvas.height = Math.max(1, h | 0);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    return { canvas, ctx };
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function normalizeHex(hex) {
    try {
      if (!hex) return null;
      let s = String(hex).trim();
      if (s.startsWith('rgba') || s.startsWith('rgb')) {
        const m = s.match(/rgba?\s*\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
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
})();
