document.addEventListener('DOMContentLoaded', async () => {
  applyI18n();

  const enabledEl = document.getElementById('enabled');
  const minContrastEl = document.getElementById('minContrast');
  const toolbarBlendEl = document.getElementById('toolbarBlend');
  const siteEl = document.getElementById('disableSite');
  const toggleBtn = document.getElementById('toggleSite');
  const status = document.getElementById('status');

  const defaults = Object.freeze({
    enabled: true,
    minContrast: 4.5,
    toolbarBlend: 0.08,
    perSiteDisabled: {}
  });

  
  const storedRaw = await browser.storage.local.get(['enabled', 'minContrast', 'toolbarBlend', 'perSiteDisabled']);
  const prefs = sanitizePrefs(storedRaw, defaults);

  
  enabledEl.checked = !!prefs.enabled;
  minContrastEl.value = String(prefs.minContrast);
  toolbarBlendEl.value = String(prefs.toolbarBlend);

  
  enabledEl.addEventListener('change', async () => {
    const value = !!enabledEl.checked;
    await safeSet({ enabled: value });
    flashSaved(status);
  });

  minContrastEl.addEventListener('change', async () => {
    const raw = Number(minContrastEl.value);
    const v = clamp(isFinite(raw) ? raw : defaults.minContrast, 1, 21);
    minContrastEl.value = String(v);
    await safeSet({ minContrast: v });
    flashSaved(status);
  });

  toolbarBlendEl.addEventListener('change', async () => {
    const raw = Number(toolbarBlendEl.value);
    const v = clamp(isFinite(raw) ? raw : defaults.toolbarBlend, 0, 1);
    toolbarBlendEl.value = String(v);
    await safeSet({ toolbarBlend: v });
    flashSaved(status);
  });

  toggleBtn.addEventListener('click', async () => {
    const host = normalizeHost(siteEl.value);
    if (!host) {
      flash(status, getMsg('invalidHost') || 'Enter a valid host name');
      return;
    }
    const store = sanitizePrefs(await browser.storage.local.get('perSiteDisabled'), defaults);
    const map = { ...(store.perSiteDisabled || {}) };
    map[host] = !map[host];
    await safeSet({ perSiteDisabled: map });
    flash(status, map[host] ? getMsg('hostDisabled') : getMsg('hostEnabled'));
  });

 

  function sanitizePrefs(input, defs) {
    const out = {};
    const i = input || {};
    out.enabled = typeof i.enabled === 'boolean' ? i.enabled : defs.enabled;
    out.minContrast = isFinite(Number(i.minContrast)) ? clamp(Number(i.minContrast), 1, 21) : defs.minContrast;
    out.toolbarBlend = isFinite(Number(i.toolbarBlend)) ? clamp(Number(i.toolbarBlend), 0, 1) : defs.toolbarBlend;
    const map = (i.perSiteDisabled && typeof i.perSiteDisabled === 'object') ? i.perSiteDisabled : {};
    out.perSiteDisabled = sanitizeHostMap(map);
    return out;

    function sanitizeHostMap(m) {
      const clean = {};
      for (const [k, v] of Object.entries(m)) {
        const host = normalizeHost(k);
        if (!host) continue;
        clean[host] = !!v;
      }
      return clean;
    }
  }

  async function safeSet(obj) {
    
    const payload = JSON.parse(JSON.stringify(obj));
    await browser.storage.local.set(payload);
  }

  function flashSaved(el) { flash(el, getMsg('saved') || 'Saved'); }

  function flash(el, text) {
    el.textContent = String(text);
    setTimeout(() => { el.textContent = ''; }, 1200);
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function normalizeHost(input) {
    const s = String(input || '').trim().toLowerCase();
    if (!s) return '';
    
    if (s.includes('://') || s.includes('/') || s.includes('?') || s.includes('#') || s.includes('*') || /\s/.test(s)) return '';
    
    const [hostOnly] = s.split(':');
    if (!hostOnly || hostOnly.startsWith('.') || hostOnly.endsWith('.')) return '';
    const parts = hostOnly.split('.');
    
    if (parts.some(p => !p || p.length > 63 || p.startsWith('-') || p.endsWith('-') || /[^a-z0-9-]/i.test(p))) return '';
    return hostOnly;
  }

  function applyI18n() {
    const nodes = document.querySelectorAll('[data-i18n]');
    for (const n of nodes) {
      const key = n.getAttribute('data-i18n');
      const msg = getMsg(key);
      if (msg) n.textContent = msg;
    }
    const titleMsg = getMsg('optionsTitle');
    if (titleMsg) document.title = titleMsg;
  }

  function getMsg(k) {
    try { return browser.i18n.getMessage(k); } catch { return ''; }
  }
});
