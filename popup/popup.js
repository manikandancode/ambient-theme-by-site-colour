(async function () {
  applyI18n();

  const toggleBtn = document.getElementById('toggle');

  // Safely get the active tab and derive a normalized host
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const url = typeof tab?.url === 'string' ? tab.url : '';
  const { host, isHttp } = parseHttpHost(url);

  if (!host || !isHttp) {
    toggleBtn.disabled = true;
    toggleBtn.title = getMsg('unavailableHere') || 'Unavailable on this page';
  }

  // Defensive read of perSiteDisabled
  const initial = await browser.storage.local.get('perSiteDisabled');
  const map = sanitizeHostMap(initial?.perSiteDisabled || {});
  setToggleText(!!map[host]);

  toggleBtn.addEventListener('click', async () => {
    if (!host || !isHttp) return;

    // Flip flag with defensive storage round-trip
    const s = await browser.storage.local.get('perSiteDisabled');
    const current = sanitizeHostMap(s?.perSiteDisabled || {});
    current[host] = !current[host];

    // Defensive set (no prototype pollution)
    await browser.storage.local.set(JSON.parse(JSON.stringify({ perSiteDisabled: current })));
    setToggleText(current[host]);

    // Ask background to refresh or clear theme immediately
    try {
      const [currTab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (currTab && Number.isInteger(currTab.id) && Number.isInteger(currTab.windowId)) {
        await browser.runtime.sendMessage({
          type: 'ambient-theme-refresh',
          tabId: currTab.id,
          windowId: currTab.windowId,
          host
        });
      }
    } catch {
      // ignore errors to keep UX smooth
    }
  });

  // --- Helpers ---

  function setToggleText(disabled) {
    toggleBtn.textContent = disabled
      ? getMsg('toggleEnableSite') || 'Enable for this site'
      : getMsg('toggleDisableSite') || 'Disable for this site';
  }

  function applyI18n() {
    const nodes = document.querySelectorAll('[data-i18n]');
    for (const n of nodes) {
      const key = n.getAttribute('data-i18n');
      const msg = getMsg(key);
      if (msg) n.textContent = msg; // text-only (no HTML injection)
    }
    const titleMsg = getMsg('popupTitle');
    if (titleMsg) document.title = titleMsg;
  }

  function getMsg(k) {
    try { return browser.i18n.getMessage(k); } catch { return ''; }
  }

  function parseHttpHost(u) {
    try {
      const parsed = new URL(u);
      const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';
      const host = normalizeHost(parsed.hostname);
      return { host, isHttp };
    } catch {
      return { host: '', isHttp: false };
    }
  }

  function sanitizeHostMap(m) {
    const clean = {};
    for (const [k, v] of Object.entries(m)) {
      const h = normalizeHost(k);
      if (!h) continue;
      clean[h] = !!v;
    }
    return clean;
  }

  function normalizeHost(input) {
    const s = String(input || '').trim().toLowerCase();
    if (!s) return '';
    if (s.startsWith('.') || s.endsWith('.')) return '';
    if (/\s/.test(s) || s.includes('/') || s.includes('*')) return '';
    const parts = s.split('.');
    if (parts.some(p => !p || p.length > 63 || p.startsWith('-') || p.endsWith('-') || /[^a-z0-9-]/i.test(p))) return '';
    return s;
  }
})();
