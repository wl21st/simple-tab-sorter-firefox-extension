# Codebase Analysis Index

Complete analysis of the Simple Tab Manager Chrome Extension testing and codebase structure.

## Quick Links to Analysis Documents

### 1. [CODEBASE_ANALYSIS.md](./CODEBASE_ANALYSIS.md) - Complete Technical Overview
- **Length**: 11 KB
- **Best For**: Understanding the full architecture and project structure
- **Contains**:
  - Project structure and type (Chrome Extension Manifest V3)
  - Detailed architecture breakdown
  - All 7 core features explained
  - Current testing framework status (NONE)
  - Recommended test structure
  - Data storage layout
  - Summary table

**Key Sections**:
- Project Type (Chrome Extension)
- Codebase Statistics (94 files, 468 KB)
- Main Functionality (7 features)
- Architecture Components
- Current Testing Status (0% coverage)
- Recommended Test Structure
- Implementation Recommendations

---

### 2. [TESTING_SETUP_GUIDE.md](./TESTING_SETUP_GUIDE.md) - Implementation Roadmap
- **Length**: 11 KB
- **Best For**: Step-by-step setup instructions and implementation
- **Contains**:
  - Phase-by-phase setup instructions
  - Jest configuration examples
  - Chrome API mock setup
  - Test skeleton code for all modules
  - Error handling test cases
  - CI/CD integration examples
  - Coverage goals and timeline

**Key Sections**:
- Phase 1: Initial Infrastructure Setup (30 min)
- Phase 2: Core Unit Tests (2-3 hours)
- Phase 3: Error Scenarios (1-2 hours)
- Phase 4: Test Fixtures (30 min)
- Phase 5: CI/CD Integration (30 min)
- Running Tests (commands)
- Key Testing Considerations
- Resources

---

## Project at a Glance

| Aspect | Details |
|--------|---------|
| **Project Type** | Chrome Extension (Manifest V3) |
| **Language** | Vanilla JavaScript (No dependencies) |
| **Version** | 1.9 |
| **Core Files** | 3 JS files (~990 lines total) |
| **Size** | 468 KB across 94 files |
| **Testing Framework** | ❌ None (0% coverage) |
| **Test Files** | 0 |
| **package.json** | ❌ Does not exist |

## Core Architecture

```
popup.js (587 lines)          background.js (125 lines)      options.js (278 lines)
├─ Tab operations            ├─ Tab tracking               ├─ Auth management
├─ CSV generation            ├─ OAuth exchange             ├─ Token validation
├─ Google Drive upload       ├─ Message passing            ├─ Settings UI
├─ Domain extraction         └─ Event listeners            └─ Storage handling
└─ Modal management
```

## Main Features (7 Core)

1. **Sort Tabs** - Alphabetically by URL
2. **Merge All Windows** - Consolidate to one window
3. **Extract Same Domain** - New window with matching tabs
4. **Remove Duplicates (Current)** - Current window only
5. **Remove Duplicates (All)** - All windows
6. **Export as CSV** - View/download tab data
7. **Save to Google Drive** - Upload with OAuth2

## Testing Roadmap

### Phase 1: Setup (30 min)
- [ ] Create package.json
- [ ] Install Jest
- [ ] Create jest.config.js
- [ ] Create tests/setup.js
- [ ] Add test scripts

### Phase 2: Unit Tests (2-3 hours)
- [ ] popup.js utilities
- [ ] background.js functions
- [ ] options.js handlers
- [ ] Achieve 30% coverage

### Phase 3: Integration Tests (2-3 hours)
- [ ] Chrome APIs
- [ ] Google Drive API
- [ ] Message passing
- [ ] Achieve 60% coverage

### Phase 4: Error Handling (1-2 hours)
- [ ] Edge cases
- [ ] API failures
- [ ] Invalid input
- [ ] Achieve 80% coverage

### Phase 5: CI/CD (30 min)
- [ ] GitHub Actions
- [ ] Coverage reporting
- [ ] PR checks

## Key Functions to Test

### HIGH PRIORITY (Most Critical)
- `extractBaseDomain()` - Edge-case prone
- `generateCSV()` - Data integrity critical
- `uploadToGoogleDrive()` - Complex external API
- `removeDuplicates()` - Complex logic

### MEDIUM PRIORITY
- Tab sorting - Chrome API
- Tab merging - Window management
- Domain extraction - Tab filtering
- Token validation - OAuth handling

### LOW PRIORITY
- UI event handlers
- Modal management
- Status display

## File Structure (Current)

```
/Users/sfuser/tmp/ai/chrome_extension/
├── ANALYSIS_INDEX.md            ← You are here
├── CODEBASE_ANALYSIS.md         ← Full technical overview
├── TESTING_SETUP_GUIDE.md       ← Implementation instructions
├── README.md                    ← Project documentation
├── manifest.json                ← Extension config
├── popup.js                     ← Main features (587 lines)
├── background.js                ← Service worker (125 lines)
├── options.js                   ← Settings (278 lines)
├── popup.html                   ← Popup UI
├── options.html                 ← Settings UI
├── icon.svg                     ← Extension icon
├── docs/                        ← Documentation
└── dist/                        ← Build artifacts
```

## Recommended Test File Structure (To Create)

```
tests/
├── unit/
│   ├── popup.test.js
│   ├── background.test.js
│   ├── options.test.js
│   └── utilities.test.js
├── integration/
│   ├── chrome-api.integration.js
│   ├── google-drive.integration.js
│   └── tab-operations.integration.js
├── e2e/
│   └── user-workflows.e2e.js
├── fixtures/
│   ├── mock-tabs.json
│   ├── mock-windows.json
│   └── mock-data.js
├── setup.js
└── jest.config.js
```

## Quick Start Commands

```bash
# From TESTING_SETUP_GUIDE.md Phase 1:

# Create package.json
npm init -y

# Install Jest and dependencies
npm install --save-dev jest @babel/preset-env babel-jest

# Add test script
npm test
```

## Chrome Storage Schema

The extension uses `chrome.storage.local` for:

| Key | Type | Purpose |
|-----|------|---------|
| `googleAuthToken` | String | Google Drive access token |
| `googleRefreshToken` | String | Token refresh capability |
| `googleUserInfo` | String | Authenticated user email |
| `tab-open-{tabId}` | ISO Timestamp | When tab was opened |
| `lastTestResult` | Object | Token validation result |
| `lastTestTime` | ISO Timestamp | Last token test time |

## Chrome Permissions

- `tabs` - Query and manage tabs
- `windows` - Create and manage windows
- `scripting` - Execute scripts (video pause)
- `identity` - OAuth authentication
- `storage` - Local data persistence

## Key Challenges & Solutions

### Challenge 1: Chrome API Mocking
- **Solution**: See TESTING_SETUP_GUIDE.md Phase 1, Step 4
- **Key mocks**: tabs, windows, storage, identity, runtime

### Challenge 2: External API Testing
- **Solution**: Mock fetch() calls with fixtures
- **Reference**: TESTING_SETUP_GUIDE.md Phase 4

### Challenge 3: Async Operations
- **Solution**: Use jest.fn().mockResolvedValue()
- **Reference**: TESTING_SETUP_GUIDE.md section on async

## Success Criteria

| Phase | Coverage | Timeframe |
|-------|----------|-----------|
| Phase 1 | N/A | Week 1 |
| Phase 2 | 30% | Week 1-2 |
| Phase 3 | 60% | Week 2-3 |
| Phase 4 | 80%+ | Week 3-4 |
| Production | 80%+ | Ongoing |

## Resources

### Official Documentation
- [Jest](https://jestjs.io/)
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)

### Testing Libraries
- Jest - Test framework
- @babel/preset-env - Transpilation
- jest-localstorage-mock - Storage mock
- jest-chrome-webextension - Chrome API mock

## Timeline Estimates

- **Setup**: 30 minutes
- **Unit Tests**: 2-3 hours
- **Integration Tests**: 2-3 hours
- **Error Handling**: 1-2 hours
- **CI/CD**: 30 minutes
- **Total**: 8-12 hours for complete setup

## Next Steps

1. **Read** [CODEBASE_ANALYSIS.md](./CODEBASE_ANALYSIS.md) - Understand the architecture
2. **Read** [TESTING_SETUP_GUIDE.md](./TESTING_SETUP_GUIDE.md) - Learn setup steps
3. **Execute** Phase 1 from TESTING_SETUP_GUIDE.md
4. **Create** jest.config.js and tests/setup.js
5. **Write** First unit test for `extractBaseDomain()`
6. **Gradually** Expand test coverage

## Questions?

See the detailed analysis documents:
- **Technical Questions** → CODEBASE_ANALYSIS.md
- **How-To Questions** → TESTING_SETUP_GUIDE.md
- **Architecture Questions** → CODEBASE_ANALYSIS.md Section 3

---

**Generated**: June 4, 2026
**Project**: Simple Tab Manager Chrome Extension v2.4
**Analysis**: Complete codebase exploration and testing roadmap
