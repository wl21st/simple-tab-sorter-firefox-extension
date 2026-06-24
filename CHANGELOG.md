# Changelog

All notable changes to Tab Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.2.0] - 2026-06-24

### Changed
- **Extract Same Host**: Renamed from "Extract Same Domain". Now matches by exact hostname (case-insensitive) instead of guessing a "base domain" via heuristics. `portal.hyperspace.tools.sap` and `github.tools.sap` are correctly treated as different hosts.
- Removed `extractBaseDomain` from the extract feature entirely — no more brand TLD lists, shared-hosting lists, or multi-part TLD guessing.

## [3.1.5] - 2026-06-24

### Fixed
- **Extract Same Domain**: Moved all tab extraction logic from popup.js into background.js service worker. The popup now sends a message and the background script does the heavy lifting asynchronously — survives popup close on both Chrome and Firefox. Fixes the "extra windows" bug caused by the popup closing mid-operation.

## [3.1.4] - 2026-06-24

### Refactored
- **Extract Same Domain**: Rewrote move logic to collect all tab IDs upfront before touching anything. Eliminates the entire class of "random tab left behind" bugs caused by on-the-fly active-tab special-casing. New flow: collect → mute → create window → move all remaining → restore mutes → focus.
## [3.1.3] - 2026-06-24

### Fixed
- **Extract Same Domain**: The newly created window now receives focus after all tabs are assembled, so the user is taken directly to it instead of staying on the original window.

### Added
- **Filter & Extract**: Pressing **Enter** in either the keyword or site-filter input now triggers "Extract Matching Tabs" instantly — no need to click the button.

## [3.1.1] - 2026-06-22

### Fixed
- **Extract to New Window**: Fixed an issue in Firefox where extracting multiple tabs to a new window (both for "Filter & Extract" and "Extract Same Domain") would fail or only move tabs from a single window. The extension now works around a known Firefox API limitation by grouping bulk tab moves by their original window ID.
- **Merge Windows**: Applied the same workaround for merging windows to ensure all tabs are merged correctly.

## [3.1] - 2026-06-22

### Changed
- **Filter & Extract**: Made "All Windows" the default search scope instead of "Current Window" for easier full-session tab extraction.

### Fixed
- **Extract to New Window**: The extension now safely defers moving the active tab to prevent premature popup closures and moves tabs concurrently across all windows using robust Promise mapping.

## [3.0] - 2026-06-11

### Changed
- **Toolbar icon**: Redesigned for clarity at small sizes — three stacked browser tab shapes (ear+body silhouette) in a depth fan with a bidirectional sort arrow on the right. Clearly communicates "tab sorter" even at 16×16px.
## [2.9] - 2026-06-11

### Changed
- **Extension icon**: Redesigned with a modern browser-tab motif — blue gradient background, three tab pills in a chrome bar, staggered sorted-row content, and a sort-arrow accent glyph.
- Renamed **"Remove Duplicates (All Windows)"** button label to **"Remove Duplicates"** for brevity.

## [2.8] - 2026-06-11

### Changed
- Renamed **"Extract Same Domain to New Window"** button to **"Extract Same Domain"** for brevity.

### Removed
- **Remove Duplicates (Current Window)**: Dropped the per-window dedup button; the "Remove Duplicates" button already covered this use case and having both caused confusion.

## [2.6] - 2026-06-08

### Added
- **Filter & Extract Tabs**: New collapsible panel at the top of the popup.
  - Keyword text box: matches tab title or URL (case-insensitive, all tokens must match).
  - Scope toggle: **Window** (current window only) or **All** (every open window).
  - Optional **Site** filter to narrow by domain (e.g. `github.com`).
  - Live **match count** badge updates on every keystroke.
  - **Extract Matching Tabs to New Window** button (disabled when count = 0), with full audio-restoration safety for YouTube/Bilibili tabs.

## [2.5] - 2026-06-07

### Fixed
- **Robust Domain Extraction**: Fixed a critical syntax error (message redeclaration) that broke the "Extract Same Domain" feature for YouTube.
- **Improved Audio Restoration**: Refined the robust audio logic to ensure unmuting happens while the popup is still open. 
- **Array-based Recording**: Now uses an array to track mute states for maximum reliability as requested.

## [2.4] - 2026-06-07

### Added
- **Audio Restoration Enhancement**: Recorded mute states and restored them after tab moves (Superseded by robust logic in v2.5).
- **Failure Warnings**: The extension now detects and reports if any tabs could not be unmuted.

## [2.3] - 2026-06-07

### Fixed
- Initial fix for muted audio bug by reordering operations. (Superseded by robust logic in v2.4)
- Optimized tab movement by using batch moves (chrome.tabs.move with an array of IDs).
- Added regression test for extraction operation sequence.

## [2.2] - 2026-06-06

### Fixed
- Prevent YouTube/Bilibili autoplay when extracting tabs to a new window (mute sandwich pattern)
- Ensure tabs are unmuted after extraction by restoring mute state before focusing the new window
- Handle windows.create() failure gracefully by restoring mute states
- Improve test robustness by asserting on tab targets instead of call counts

## [2.1] - 2026-06-06

### Fixed
- Fixed "Extract Same Domain" issue where some tabs (like YouTube) were missed during extraction.
- Improved "Extract Same Domain" robustness by moving the active tab last and using non-focused window creation to prevent popup closure.
- Enhanced domain matching logic to correctly handle multi-part TLDs (e.g., .co.uk, .com.br).
- Improved case-insensitivity in domain matching.

## [2.0] - 2026-06-05

### Added
- **Comprehensive Token Acquisition & Refresh Guide** - Enhanced Settings page with detailed instructions for acquiring and managing Google Drive tokens
  - **Token Guide Box** - Quick reference explaining access tokens, refresh tokens, and expiry information
  - **Option 1: Quick Setup** - Temporary token acquisition via OAuth2 Playground (1-hour expiry, manual refresh needed)
  - **Option 2: Recommended Setup** - Permanent auto-refresh solution using Google Cloud Project (indefinite access, automatic renewal)
  - **Manual Refresh Section** - Clear instructions for refreshing expired tokens and validating token status
- **Improved Token Management UX** - Better visual hierarchy with color-coded sections and clear guidance on when to use each option

### Changed
- Settings page token acquisition instructions now provide step-by-step guidance for both temporary and permanent solutions
- Enhanced color-coded instruction boxes with better visual distinction (info/warning/success colors)
- Token refresh workflow now includes clear instructions for using the "Retest Token" button
- Added tips and best practices for token management in the settings UI

## [1.9] - 2026-06-04

### Added
- **Enhanced Token Acquisition Instructions** - Clear, step-by-step guidance in Settings page for obtaining Google Drive tokens
  - **Temporary Solution** - Quick setup using OAuth2 Playground (5 minutes, 1-hour token expiry)
  - **Recommended Solution** - Permanent setup with Google Cloud Project (automatic token refresh, indefinite access)
- **Visual Instructions** - Color-coded sections (orange for temporary, green for recommended) with direct links to Google Cloud Console and OAuth2 Playground
- **Configuration Example** - Inline JSON example for `oauth-config.json` setup

### Changed
- Settings page now clearly distinguishes between temporary and long-term token solutions
- Improved user guidance to encourage permanent OAuth2 setup with auto-refresh capabilities

## [1.8] - 2026-06-04

### Added
- **Google Drive Integration** - Save tabs directly to Google Drive as CSV files
- **Manual OAuth2 Token Authentication** - Users can paste access tokens from Google OAuth Playground without complex Client ID setup
- **Dynamic Token Validation** - Tests tokens by listing files from Google Drive (lightweight operation)
- **Retest Token Button** - Allows retesting token validity anytime, useful for detecting expired tokens
- **Last Test Result Display** - Shows validation timestamp and error messages in settings
- **Options Page** - New settings interface for Google Drive connection management
  - Token input fields for access token and optional refresh token
  - Connection status display with last test result
  - "Save without testing" checkbox for skipping validation
  - Extension ID display for reference
  - Disconnect button to clear stored tokens
- **CSV Export** - Export tabs with Tab Open Time and Export Time columns
- **Settings Button** - Quick access to Settings from the popup menu

### Changed
- Auto-dismiss timeout for success/info messages increased from 2s to 20s (errors still require manual dismiss)
- Error messages now persist on screen until user manually dismisses them
- Token validation now uses Google Drive API (lists 1 file) instead of user info endpoint

### Fixed
- CSP violation in popup.js by making DOMContentLoaded callback async
- Removed hardcoded Client ID checks that were hiding the Connect button
- Enhanced error output to show full error object structure with nested error format handling
- Subdomain extraction with `extractBaseDomain()` function for "Extract Same Domain" feature

### Technical
- Added `background.js` for Chrome extension background processing
- Added token storage keys: `googleAuthToken`, `googleRefreshToken`, `googleUserInfo`, `lastTestResult`, `lastTestTime`
- Added manifest permissions: `"identity"`, `"storage"`, `"scripting"`
- Added `"options_ui"` configuration in manifest pointing to options page

## [1.5] - 2026-XX-XX

### Initial Release
- Basic tab management and extraction functionality
- Export tabs to CSV (view/download modes)
- Extract same domain tabs
- Sort tabs by various criteria

