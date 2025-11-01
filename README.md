# Ambient Theme by Site Colour

Automatically adapts Firefox’s UI theme colors to match the current site.

- Dynamic, per-site UI coloring based on the page’s dominant color.
- Respectful of readability: minimum contrast and toolbar blending controls.
- Works automatically on tab change, page navigation, and window focus.
- Per‑site quick toggle from the popup and full controls in Options.
- All processing is on‑device; no data is collected or sent anywhere.

## Installation

Download and Install from Firefox Official Add-ons Extensions page: 

https://addons.mozilla.org/en-US/firefox/addon/ambient-theme-by-site-colour/

## How it works

A lightweight content script samples the current page to determine a representative color using this priority order:

1. `<meta name="theme-color">`
2. Prominent logo‑like element (header logos, SVGs)
3. Favicon dominant color
4. Primary button color
5. Largest visible image (CORS‑safe; skips if pixel reads are blocked)
6. Page background color

The background script then updates the browser theme for the active window using the computed color while keeping text readable and toolbars legible.

## Features

- Per‑site toggle: Disable or enable dynamic theming for specific hostnames.
- Minimum contrast: Ensure readable text against page‑matched colors.
- Toolbar blend: Mix base color with a dark reference for better toolbar clarity.
- MV3 compatible and optimized for Firefox 144.

## Permissions

- Access your data for all websites (`<all_urls>`): Needed to read page colors for adaptive theming.
- Read and modify browser settings: Uses the Theme API to set window colors.
- Access browser tabs: Used to detect the active tab and its hostname for per‑site toggling.
- Storage: Saves preferences locally (enabled, contrast, blend, per‑site disabled map).

These permissions are used only for local processing and UI updates.

## Privacy

- No personal data collection or transmission.
- Color extraction and theming happen entirely on your device.
- If the browser blocks cross‑origin pixel reads (CORS taint), the add‑on skips those pixels.
- See PRIVACY.md for details.

## Usage

- Click the toolbar button to open the popup:
  - Toggle “Disable/Enable for this site” to control theming per hostname.
  - Click “More options” for full settings.
- Options page:
  - Enable dynamic theming globally.
  - Adjust “Minimum contrast ratio” (1.0–21.0).
  - Adjust “Toolbar blend (0..1)”.
  - Disable/Enable for a specific host via the hostname input and Toggle button.

Changes are saved immediately and apply when you switch tabs, navigate, or refocus the window. The popup’s toggle triggers an immediate refresh.

## First‑run tips

- Start on a regular website (not a special page like `about:newtab` or `addons.mozilla.org`). The popup will be disabled on restricted pages by design.
- Click the toolbar button. If the site’s colors don’t change immediately, switch to another tab and back or refresh once to let the color extraction run.
- Use the popup to quickly “Disable for this site” if a site’s color clashes with your theme; click again to re‑enable. This takes effect instantly.
- Open Options (More options in the popup) to tune:
  - Minimum contrast ratio (1.0–21.0) for readability.
  - Toolbar blend (0..1) to keep the toolbar legible while matching the page.
- If images are hosted cross‑origin and block pixel reads, the add‑on automatically falls back to other sources (logo, favicon, theme‑color, background) — no action needed.
- You can revoke site access in Add‑ons Manager at any time. The add‑on will keep working gracefully where access remains.

## Troubleshooting

- Popup says “Unavailable on this page”: Special pages (e.g., `about:`) and some restricted URLs can’t be themed.
- Theme doesn’t change after disabling a site: The background resets the theme for that window; if you still see the old theme, switch away and back to the tab or click the popup toggle again to trigger a refresh.
- Colors look off on some images: If cross‑origin images block pixel reads, the add‑on falls back to other sources (logo, favicon, meta tag, background).
- Nothing happens: Ensure the extension has site access in Add‑ons Manager and that global enable is on in Options.

## Development

Structure:
```bash
ambient theme by site colour/
├─ manifest.json
├─ background.js
├─ content/
│  └─ contentScript.js
├─ options/
│  ├─ options.html
│  └─ options.js
├─ popup/
│  ├─ popup.html
│  └─ popup.js
├─ icons/
│  ├─ icon-16.png
│  ├─ icon-32.png
│  ├─ icon-48.png
│  ├─ icon-96.png
│  └─ icon-128.png
├─ _locales/
│  └─ en/
│     └─ messages.json
├─ LICENSE
├─ PRIVACY.md
└─ README.md
```

Notable implementation notes:
- Internationalization (i18n): All visible strings live in `_locales/en/messages.json`; UI uses `data-i18n` and the scripts set `textContent` from `browser.i18n.getMessage`.
- Security:
  - No `innerHTML` writes; only text content is updated.
  - Hostnames are validated before saving to the per‑site map.
  - Canvas reads are wrapped in try/catch; if tainted by CORS, sampling is skipped.
  - All privileged API calls are guarded with try/catch.
- Background refresh:
  - The popup sends an `ambient-theme-refresh` message after toggling per‑site, prompting immediate theme reset or re-extraction.
  - The background resets themes for disabled sites and on non‑http(s) pages.

## Building and installing

- Temporary install for development:
  - Visit `about:debugging` → “This Firefox” → “Load Temporary Add-on…”
  - Select `manifest.json`.
- Signing for distribution:
  - Submit the ZIP/XPI to AMO. All Firefox add-ons require signing.

## Support

- Issues: https://github.com/manikandancode/ambient-theme-by-site-colour/issues
- Project: https://github.com/manikandancode/ambient-theme-by-site-colour

## License

MIT license. See LICENSE for details.
