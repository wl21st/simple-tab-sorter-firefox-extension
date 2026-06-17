## 1. Setup and Build Modification

- [x] 1.1 Add `webextension-polyfill` to the project (e.g., via `npm install webextension-polyfill`) and ensure it's copied to the extension directory during build or tracked in the repo if no complex build exists.
- [x] 1.2 Update `package.sh` (or create a Firefox-specific build script) to generate a Firefox-compatible `manifest.json` that includes `browser_specific_settings.gecko.id` and converts the `service_worker` field to `scripts`.

## 2. Codebase Refactoring

- [x] 2.1 Update `manifest.json` and build scripts to inject `browser-polyfill.min.js` before the `background.js` script.
- [x] 2.2 Include the polyfill script tag (`<script src="browser-polyfill.min.js"></script>`) in `popup.html` and `options.html`.
- [x] 2.3 Refactor `background.js`, `popup.js`, and `options.js` to standardise on the `browser.*` namespace instead of `chrome.*` to leverage the polyfill's cross-browser Promise support.

## 3. Testing and Documentation

- [x] 3.1 Document the Firefox-specific OAuth redirect URL in `README.md` and add instructions on how to add it to Google Cloud Console.
- [x] 3.2 Update `TESTING.md` and `TESTING_SETUP_GUIDE.md` to include instructions for loading the extension as a temporary add-on in Firefox (e.g., via `about:debugging`).
