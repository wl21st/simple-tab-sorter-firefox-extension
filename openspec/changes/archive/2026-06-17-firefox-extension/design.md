## Context

The Simple Tab Manager extension currently works on Chrome via Manifest V3. To expand the user base, we are converting it to support Firefox (which also supports Manifest V3 but has some architectural and API differences). Specifically, Firefox requires `browser_specific_settings` in the manifest for features like OAuth, prefers `background.scripts` over `service_worker`, and natively uses the Promise-based `browser.*` API namespace.

## Goals / Non-Goals

**Goals:**
- Maintain a single unified codebase where possible to avoid duplicate logic.
- Ensure the extension installs and runs on Firefox MV3 natively.
- Handle Google OAuth successfully on Firefox.

**Non-Goals:**
- Completely rewriting the extension to use only `browser.*` manually without a polyfill (we will use the standard polyfill).
- Supporting Firefox Manifest V2 (we will target Firefox MV3).

## Decisions

1. **API Namespace Compatibility (`webextension-polyfill`)**
   - **Decision:** Include Mozilla's `webextension-polyfill` in the project.
   - **Rationale:** This allows us to use `browser.*` with Promises across both Chrome and Firefox without manually checking namespaces. It's the industry standard for cross-browser extension development. We will update all `chrome.*` calls to `browser.*`.
   
2. **Manifest Handling Strategy**
   - **Decision:** Maintain one base `manifest.json` but introduce a build step (updating `package.sh`) to generate a Firefox-specific manifest (`manifest-firefox.json` or dynamically modified during packaging) or we can use a unified manifest if Firefox is tolerant of `service_worker`.
   - **Alternative Considered:** Since Firefox 109+, background service workers are supported. However, it's often more stable to use `background.scripts` for Firefox. For simplicity, we will try to use a unified manifest where we add `browser_specific_settings.gecko.id`, but if Firefox rejects `service_worker`, the build script will swap it to `scripts`. Let's decide to adapt `package.sh` to generate a `firefox-build` directory containing a manifest with `background.scripts` and the `browser_specific_settings`.

3. **Google OAuth**
   - **Decision:** No major code logic changes needed for `identity.getRedirectURL()` since it works similarly, but we MUST document the generated Firefox URL (`https://<id>.extensions.allizom.org/`) and add it to the Google Cloud Console credentials. This requires setting a static `gecko.id`.

## Risks / Trade-offs

- **Risk:** Firefox MV3 requires explicit user opt-in for host permissions (`*://*.bilibili.com/*` etc.) unlike Chrome where they are granted at install.
  - **Mitigation:** Ensure the extension gracefully handles missing host permissions by prompting the user or providing instructions in the popup/options page.

- **Risk:** `webextension-polyfill` adds a small amount of bloat.
  - **Mitigation:** The polyfill is very lightweight and the trade-off for cross-browser compatibility is overwhelmingly positive.