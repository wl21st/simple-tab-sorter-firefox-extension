## ADDED Requirements

### Requirement: Firefox Manifest V3 Support
The extension SHALL include a manifest compatible with Firefox MV3 requirements, including `browser_specific_settings.gecko.id` and specifying the background script correctly.

#### Scenario: Extension loaded in Firefox
- **WHEN** the user loads the extension as a temporary add-on in Firefox
- **THEN** it installs successfully without manifest errors
- **AND** the background script starts and registers its listeners

### Requirement: Cross-Browser API Usage
The extension SHALL use the `browser.*` namespace and the `webextension-polyfill` to ensure API calls work consistently across Chrome and Firefox.

#### Scenario: Tab operations performed
- **WHEN** the extension queries, creates, updates, or removes tabs
- **THEN** the operations succeed in both Chrome and Firefox using the polyfill

### Requirement: Google OAuth on Firefox
The extension SHALL successfully complete the Google OAuth flow in Firefox, respecting its unique redirect URL.

#### Scenario: User authenticates via Google
- **WHEN** the user initiates the Bilibili/YouTube OAuth login from the options page in Firefox
- **THEN** the extension opens the Google auth flow
- **AND** correctly redirects back to the extension using `identity.getRedirectURL()`
- **AND** successfully retrieves and stores the tokens
