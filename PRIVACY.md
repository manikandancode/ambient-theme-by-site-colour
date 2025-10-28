# Privacy Policy for Ambient Theme by Site Colour

Effective date: 2025-10-28

Ambient Theme by Site Colour (“the add-on”, “extension”) adapts Firefox’s UI colors to match the currently viewed website. This policy explains what data is processed, how it is handled, and your choices.

## Summary
- No personal data is collected, stored, or shared by this add-on.
- All color extraction and theme updates happen locally in your browser.
- No data is transmitted off-device by the add-on.
- You can disable the add-on globally or per-site at any time.

## What the add-on does
The add-on analyzes visual elements of the page (for example, theme-color meta tags, logos, favicons, prominent buttons, or large images) to compute a representative color and applies it to the browser theme for the active window. This analysis runs entirely on your device.

## Data collection and processing
- Personal data: The add-on does not collect, transmit, or sell personal information.
- Web content: The add-on reads the current page’s styling information (e.g., colors) and may draw page images into an in-memory canvas strictly to estimate a dominant color. If the browser blocks cross-origin pixel reads (CORS taint), the add-on skips reading those pixels.
- Browsing history: The add-on does not store or transmit your browsing history. It accesses the active tab’s URL only to determine the hostname for per-site enable/disable.
- Telemetry/analytics: None. The add-on does not send analytics or diagnostics.

## Permissions rationale
- Access to all sites (“<all_urls>” host permissions): Required to read page colors and compute a theme that matches each site. Without this, the add-on cannot adapt to the current page.
- Tabs/activeTab: Used to detect the active tab, its URL (for hostname-based toggling), and when to refresh the theme.
- Storage: Used to save user preferences (global enable/disable, contrast, blend) and a per-site disable map. These settings are stored locally in your browser.
- Theme: Required to update or reset the browser’s theme colors.

## Local storage
The add-on uses browser-managed local storage to keep:
- Global enable/disable flag
- Minimum contrast ratio (for readability)
- Toolbar blend amount (for legibility)
- Per-site disabled map (hostname → true/false)

No sensitive or personal data is stored. You can clear these settings by removing the extension data or uninstalling the add-on.

## Data sharing
The add-on does not share data with third parties. There are no external servers, trackers, or analytics used by the add-on.

## User controls
- Global toggle: Turn the add-on on/off in the Options page or via about:addons.
- Per-site toggle: Use the popup or Options page to disable or enable the add-on for a specific site (based on hostname).
- Permissions management: In about:addons, you can adjust site permissions for the extension; the add-on will function gracefully when access is limited or revoked, but adaptive theming may be unavailable.

## Security considerations
- Processing is local-only and best-effort: When cross-origin image pixels cannot be read due to browser security (CORS), the add-on skips that step.
- The add-on does not inject remote scripts or use remote code.
- All UI strings are localized safely (text-only), and user inputs (hostnames) are validated before saving.

## Children’s privacy
The add-on does not target children and does not collect personal data.

## Changes to this policy
If this policy changes, the updated version and effective date will be posted with the extension release notes. Material changes will be highlighted.

## Contact
For questions about this policy or the add-on’s behavior, please open an issue on the project’s repository or contact the author via the add-on listing page.
