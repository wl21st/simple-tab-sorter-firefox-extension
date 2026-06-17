# Simple Tab Manager Chrome Extension - Codebase Analysis

## 1. PROJECT STRUCTURE & TYPE

### Project Type
**Chrome Extension** (Manifest V3)
- Not a traditional web application or Node.js project
- Browser extension running in Chrome/Edge (88+)
- Single-purpose extension for tab management and organization

### Directory Structure
```
simple-tab-sorter-chrome-extension/
├── manifest.json              # Extension configuration (Manifest V3)
├── popup.html                 # Extension popup UI
├── popup.js                   # Main feature implementations (587 lines)
├── background.js              # Service worker for background tasks (125 lines)
├── options.html               # Settings/options page UI
├── options.js                 # Settings page logic (278 lines)
├── icon.svg                   # Extension icon
├── CHANGELOG.md               # Version history
├── README.md                  # Project documentation
├── STORE_LISTING.md           # Chrome Web Store description
├── package.sh                 # Packaging script
├── docs/                      # Documentation subdirectories
│   ├── development/
│   ├── setup/
│   └── troubleshooting/
└── dist/                      # Distribution build artifacts
    ├── manifest.json
    ├── popup.html
    └── popup.js
```

### Key Statistics
- **Total Files**: 94
- **Project Size**: 468 KB
- **Core JavaScript Files**: 3 (popup.js, background.js, options.js)
- **Total JavaScript LOC**: ~990 lines
- **Current Version**: 1.9

---

## 2. CURRENT TESTING FRAMEWORK

### Testing Status: **NO TESTING FRAMEWORK CURRENTLY IN USE**

**Finding**: Zero test infrastructure present
- ❌ No `package.json` - Extension doesn't use npm/node dependencies
- ❌ No test files (*.test.js, *.spec.js)
- ❌ No test directories (test/, tests/, __tests__, spec/, specs/)
- ❌ No test framework configuration (jest.config.js, .mocharc, karma.conf.js, vitest.config.js)
- ❌ No testing libraries installed (Jest, Mocha, Vitest, Cypress, Puppeteer, etc.)
- ❌ No test scripts in package.json (N/A - no package.json exists)

### Why This Matters
The extension currently lacks:
- Unit tests for core functions
- Integration tests for Chrome API interactions
- End-to-end tests for user workflows
- Regression testing protection
- Code coverage metrics
- Automated quality assurance

---

## 3. MAIN FUNCTIONALITY

### Core Features (7 Main Functions)

#### Tab Management Features
1. **Sort Tabs** - Alphabetically sort all tabs in current window by URL
2. **Merge All Windows** - Combine all open windows into a single window
3. **Extract Same Domain** - Extract all tabs from same domain as active tab (across all windows)
4. **Remove Duplicates (Current Window)** - Remove duplicate tabs in active window
5. **Remove Duplicates (All Windows)** - Remove duplicate tabs across all windows

#### Export Features
6. **Export Tabs as CSV (View)** - Display tabs in CSV modal with columns: Title, URL, Tab Open Time, Export Time
7. **Save Tabs to Google Drive** - Upload tabs CSV directly to Google Drive with custom folder and filename

### Architecture Components

#### 1. **popup.js** (587 lines) - Main Feature Engine
Contains implementations for:
- CSV generation and export functions (`generateCSV()`, `escapeCSVField()`)
- Google Drive integration (`getGoogleAuthToken()`, `uploadToGoogleDrive()`, `findOrCreateFolder()`)
- Tab sorting and merging logic
- Duplicate removal with detailed feedback
- Domain extraction utility (`extractBaseDomain()`)
- Video pause automation for Bilibili/YouTube
- Modal management and UI interactions
- Clipboard operations

**Key Functions**:
```javascript
- showStatus()                    // User feedback
- generateCSV()                   // CSV formatting
- displayCSVModal()               // CSV modal rendering
- downloadCSV()                   // File download
- copyToClipboard()               // Clipboard copy
- getGoogleAuthToken()            // OAuth token management
- uploadToGoogleDrive()           // Google Drive upload
- findOrCreateFolder()            // Folder management
- pauseVideos()                   // Video pause automation
- removeDuplicates()              // Deduplication logic
- extractBaseDomain()             // Domain parsing
```

#### 2. **background.js** (125 lines) - Service Worker
Handles:
- Tab creation/removal event tracking
- Tab open time recording using Chrome storage
- OAuth2 token exchange handling
- Message passing between popup and service worker
- Google authentication flow coordination

**Key Functions**:
```javascript
- chrome.runtime.onInstalled      // Extension lifecycle
- chrome.tabs.onCreated           // Track tab open times
- chrome.tabs.onRemoved           // Clean up storage
- chrome.runtime.onMessage        // Message handlers
- handleAuthCodeExchange()        // OAuth token exchange
- getGoogleAuthToken()            // Token retrieval
```

#### 3. **options.js** (278 lines) - Settings Management
Provides:
- Google Drive authentication status checking
- Manual token entry and validation
- Token testing via Google Drive API
- User disconnect functionality
- Storage of OAuth tokens (access + refresh)
- Settings persistence

**Key Functions**:
```javascript
- checkAuthStatus()               // Auth status check
- validateTokenByListingFiles()   // Token validation
- Manual token save and test
- Disconnect workflow
```

#### 4. **popup.html** (297 lines) - UI Layout
UI Components:
- 7 action buttons (sort, merge, extract, dedup, export, save)
- Modal overlays (about, CSV export, Google Drive)
- Status display area
- Settings button linking to options page

#### 5. **options.html** (238 lines) - Settings UI
Components:
- Google Drive auth status display
- Manual token input fields
- Quick setup instructions (OAuth Playground)
- Permanent setup guide (Google Cloud Console)
- Extension ID display
- Token validation feedback

### Permissions & Capabilities
```json
"permissions": [
  "tabs",        // Query and manage tabs
  "windows",     // Create and manage windows
  "scripting",   // Execute scripts (pause videos)
  "identity",    // OAuth authentication
  "storage"      // Persist data locally
]

"host_permissions": [
  "*://*.bilibili.com/*",  // Auto-pause
  "*://*.youtube.com/*"    // Auto-pause
]
```

### Data Storage
Uses `chrome.storage.local` for:
- Tab open times: `tab-open-{tabId}` → ISO timestamp
- Google Auth Token: `googleAuthToken` → access token string
- Refresh Token: `googleRefreshToken` → refresh token string
- User Info: `googleUserInfo` → user email
- Token test results: `lastTestResult`, `lastTestTime`

---

## 4. WHERE TESTS SHOULD BE LOCATED

### Recommended Test Structure

```
simple-tab-sorter-chrome-extension/
├── tests/                              # Test directory
│   ├── unit/                           # Unit tests
│   │   ├── popup.test.js               # popup.js tests
│   │   ├── background.test.js          # background.js tests
│   │   ├── options.test.js             # options.js tests
│   │   └── utilities.test.js           # Utility function tests
│   │
│   ├── integration/                    # Integration tests
│   │   ├── chrome-api.integration.js   # Chrome API mocking
│   │   ├── google-drive.integration.js # Google Drive API tests
│   │   └── tab-operations.integration.js
│   │
│   ├── e2e/                            # End-to-end tests (optional)
│   │   └── user-workflows.e2e.js
│   │
│   ├── fixtures/                       # Test data
│   │   ├── mock-tabs.json
│   │   ├── mock-windows.json
│   │   └── mock-api-responses.json
│   │
│   └── setup.js                        # Test configuration & mocks
│
├── jest.config.js                      # Jest configuration
├── package.json                        # New: Add for testing only
└── [existing files unchanged]
```

### Test Categories

#### Unit Tests (popup.js)
- ✓ `generateCSV()` - CSV formatting with escaping
- ✓ `extractBaseDomain()` - Domain parsing logic
- ✓ `escapeCSVField()` - CSV field escaping
- ✓ Error handling in status display

#### Unit Tests (background.js)
- ✓ Tab open time tracking
- ✓ Storage cleanup on tab removal
- ✓ Message handler routing

#### Unit Tests (options.js)
- ✓ Token validation logic
- ✓ Auth status determination
- ✓ Storage operations

#### Integration Tests
- ✓ Chrome tabs API interactions (sort, merge, extract)
- ✓ Chrome storage operations
- ✓ Chrome identity API flow
- ✓ Message passing between contexts
- ✓ Google Drive API interactions

#### Edge Cases & Error Scenarios
- ✓ Invalid URLs in active tab
- ✓ Chrome:// and special protocol URLs
- ✓ Missing permissions
- ✓ Offline scenarios
- ✓ Expired tokens
- ✓ Network failures during upload

---

## 5. IMPLEMENTATION RECOMMENDATIONS

### Phase 1: Setup Testing Infrastructure
```bash
npm install --save-dev jest @babel/preset-env babel-jest
npm install --save-dev jest-chrome-webextension  # Chrome API mocks
npm install --save-dev jest-localstorage-mock    # Storage API mock
```

### Phase 2: Add Test Configuration
- Create `jest.config.js` with Chrome extension specific setup
- Create `tests/setup.js` for mock initialization
- Create test fixtures for Chrome API responses

### Phase 3: Write Core Tests
- Start with utility functions (highest ROI)
- Mock Chrome APIs consistently
- Test error paths thoroughly
- Use fixtures for complex data

### Phase 4: CI/CD Integration
- Add GitHub Actions workflow for running tests on PR
- Set up code coverage reporting
- Block merges on test failures

---

## SUMMARY TABLE

| Aspect | Status | Details |
|--------|--------|---------|
| **Project Type** | ✅ Identified | Chrome Extension (Manifest V3) |
| **Framework** | ❌ None | No testing framework installed |
| **Main Code** | ✅ 3 files | popup.js (587), background.js (125), options.js (278) |
| **Total LOC** | ~990 | Core functionality |
| **Test Files** | ❌ Zero | No tests present |
| **package.json** | ❌ None | Not needed for extension runtime |
| **Test Location** | 📋 Recommended | `/tests/unit`, `/tests/integration` |
| **Build System** | Basic | package.sh script only |
| **Version** | 2.4 | Currently v2.4 |
| **Dependencies** | 0 | Pure vanilla JavaScript |

---

## NEXT STEPS

1. **Setup Jest** - Install and configure for Chrome extension testing
2. **Create Mock Framework** - Mock chrome.* APIs
3. **Write Utility Tests** - Start with `extractBaseDomain()` and CSV functions
4. **Add Integration Tests** - Test Chrome API interactions
5. **Setup CI/CD** - Automate testing on commits
6. **Achieve Coverage** - Aim for 80%+ code coverage

