# Simple Tab Manager — Agent Instructions

Chrome MV3 extension (vanilla JS) for tab management: sort, merge, extract by domain, remove duplicates, export CSV, upload to Google Drive.

## Entrypoints & Ownership

| File | Role |
|---|---|
| `popup.js` | UI logic (sort, merge, extract, dedup, filter, CSV, Google Drive upload, video pause) |
| `background.js` | Service worker — tracks `tab-open-{tabId}` timestamps in `chrome.storage.local`, handles OAuth2 token exchange messages |
| `options.js` | Settings page (Google Drive auth status, manual token paste, retest/disconnect) |

**Critical**: `background.js` runs as a service worker — no DOM access, no `document`.

## Developer Commands

```bash
npm test                  # All tests (jest, jsdom env)
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage (threshold: 50% branches/funcs/lines/stmts)
npm test tests/popup.test.js  # Single test file
```

### Packaging (Chrome Web Store)

```bash
./package.sh              # Creates dist/simple-tab-manager-v{VERSION}.zip
```

**Quirk**: `package.sh` omits `background.js`, `options.html`, `options.js` — the ZIP is incomplete for deployment. If packaging for real use, manually include these files.

## Architecture Quirks & Gotchas

### Test setup (`tests/setup.js`)
- Mocks all Chrome APIs (`tabs`, `windows`, `storage`, `runtime`, `identity`, `scripting`) globally
- `chrome.storage.local.get/set/remove` support **both callback and promise** signatures
- `jest.clearAllMocks()` runs after each test automatically
- `fetch` is also mocked globally (for Google Drive API)

### Stale / misleading docs
- `TESTING_SETUP_GUIDE.md` is a planning draft that says "no existing tests" — ignore it, tests exist in `tests/`
- `GEMINI.md` is empty
- `README.md` project tree is outdated (shows only 4 files); use `AGENTS.md` or `ls` instead

### Tab operations
- **Subdomain matching**: `www.google.com` and `mail.google.com` match as same base domain
- **Special pages**: `chrome://`, `edge://`, `about:` URLs must be filtered out — they crash `new URL()` and cannot be sorted/extracted/moved
- **Video auto-pause**: Only works for YouTube and Bilibili (host permissions limited to those). Videos in inaccessible iframes fail silently
- **Filter & Extract** (v2.6): Collapsible panel in popup with keyword search, scope toggle (window/all), optional site filter, live match count

### CSV generation
- Headers: `Title`, `URL`, `Tab Open Time`, `Export Time` — all double-quoted
- Internal `"` escaped as `""`
- Tab open times fetched from service worker via `chrome.runtime.sendMessage({action: 'getTabOpenTimes'})`

### Google Drive OAuth2
- Credentials in `background.js:5-6` are placeholders (`YOUR_GOOGLE_CLIENT_ID`, `YOUR_GOOGLE_CLIENT_SECRET`) — will fail until real values injected
- Token stored in `chrome.storage.local` under `googleAuthToken`
- Options page validates token by listing 1 file via Google Drive API before enabling upload
- Token refresh requires a backend (not implemented client-side)

## What Agents Commonly Miss
1. `package.sh` is incomplete (missing 3 files) — verify before shipping
2. `background.js` has no DOM — cannot reference `document`, `window`, etc.
3. Tab open times come from the service worker, not popup; popup alone can't track them
4. Test mocks must support both `callback(data)` and `Promise.resolve(data)` patterns
5. Subdomain matching uses a hardcoded `multiPartTLDs` list (`.co.uk`, `.com.au`, etc.) in `extractBaseDomain()` — not the Public Suffix List
