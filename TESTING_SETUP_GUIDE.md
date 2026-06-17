# Testing Setup Guide for Simple Tab Manager

## Quick Summary

This Chrome extension has **no existing tests**. This document provides a roadmap for adding a comprehensive testing framework.

## Current State

- **Framework**: None installed
- **Test Files**: 0
- **Test Coverage**: 0%
- **Dependencies**: 0 (pure vanilla JS)
- **package.json**: Does not exist

## Phase 1: Initial Setup (30 minutes)

### Step 1: Create package.json
```bash
cd /path/to/extension
npm init -y
```

### Step 2: Install Jest and dependencies
```bash
npm install --save-dev \
  jest \
  @babel/preset-env \
  babel-jest \
  jest-localstorage-mock \
  @testing-library/jest-dom
```

### Step 3: Create jest.config.js
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'popup.js',
    'background.js',
    'options.js',
    '!dist/**'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
};
```

### Step 4: Create tests/setup.js
```javascript
// Mock Chrome API
global.chrome = {
  tabs: {
    query: jest.fn(),
    move: jest.fn(),
    remove: jest.fn(),
    create: jest.fn(),
    onCreated: { addListener: jest.fn() },
    onRemoved: { addListener: jest.fn() }
  },
  windows: {
    create: jest.fn(),
    getCurrent: jest.fn(),
    update: jest.fn(),
    getAll: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  },
  identity: {
    getRedirectURL: jest.fn(() => 'https://extension-id.chromiumapp.org/'),
    launchWebAuthFlow: jest.fn()
  },
  runtime: {
    id: 'test-extension-id',
    sendMessage: jest.fn(),
    onMessage: { addListener: jest.fn() },
    onInstalled: { addListener: jest.fn() },
    getURL: jest.fn()
  },
  scripting: {
    executeScript: jest.fn()
  }
};

// Setup localStorage mock
require('jest-localstorage-mock');
```

### Step 5: Add test script to package.json
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## Phase 2: Write Core Tests (2-3 hours)

### Test 1: Utility Functions (popup.js)

Create `/tests/unit/popup.test.js`:

```javascript
describe('popup.js utilities', () => {
  describe('extractBaseDomain', () => {
    test('should extract base domain from URL', () => {
      // Test implementation needed
    });

    test('should handle www prefix', () => {
      // Test implementation needed
    });

    test('should handle subdomains', () => {
      // Test implementation needed
    });
  });

  describe('generateCSV', () => {
    test('should generate valid CSV with headers', () => {
      // Test implementation needed
    });

    test('should escape double quotes in fields', () => {
      // Test implementation needed
    });

    test('should include timestamps', () => {
      // Test implementation needed
    });
  });

  describe('escapeCSVField', () => {
    test('should escape double quotes', () => {
      // Test implementation needed
    });

    test('should preserve regular text', () => {
      // Test implementation needed
    });
  });
});
```

### Test 2: Google Drive Integration (popup.js)

Create `/tests/integration/google-drive.integration.js`:

```javascript
describe('Google Drive integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findOrCreateFolder', () => {
    test('should find existing folder', () => {
      // Test implementation needed
    });

    test('should create folder if not found', () => {
      // Test implementation needed
    });

    test('should handle API errors gracefully', () => {
      // Test implementation needed
    });
  });

  describe('uploadToGoogleDrive', () => {
    test('should upload file successfully', () => {
      // Test implementation needed
    });

    test('should handle token expiration', () => {
      // Test implementation needed
    });

    test('should validate token before upload', () => {
      // Test implementation needed
    });
  });
});
```

### Test 3: Tab Operations (popup.js)

Create `/tests/integration/tab-operations.integration.js`:

```javascript
describe('Tab operations', () => {
  describe('sorting tabs', () => {
    test('should sort tabs alphabetically by URL', () => {
      // Test implementation needed
    });

    test('should handle tabs without URLs', () => {
      // Test implementation needed
    });
  });

  describe('merging windows', () => {
    test('should move all tabs to current window', () => {
      // Test implementation needed
    });

    test('should pause videos during merge', () => {
      // Test implementation needed
    });
  });

  describe('extracting by domain', () => {
    test('should extract tabs with matching domain', () => {
      // Test implementation needed
    });

    test('should handle subdomain matching', () => {
      // Test implementation needed
    });

    test('should reject invalid active tab URLs', () => {
      // Test implementation needed
    });
  });

  describe('removing duplicates', () => {
    test('should remove duplicate URLs in current window', () => {
      // Test implementation needed
    });

    test('should remove duplicates across all windows', () => {
      // Test implementation needed
    });

    test('should keep first occurrence', () => {
      // Test implementation needed
    });

    test('should ignore special URLs (chrome://)', () => {
      // Test implementation needed
    });
  });
});
```

### Test 4: Background Service Worker (background.js)

Create `/tests/unit/background.test.js`:

```javascript
describe('background.js', () => {
  describe('tab tracking', () => {
    test('should record tab open time on creation', () => {
      // Test implementation needed
    });

    test('should clean up storage on tab removal', () => {
      // Test implementation needed
    });
  });

  describe('message handling', () => {
    test('should return tab open times', () => {
      // Test implementation needed
    });

    test('should handle auth code exchange', () => {
      // Test implementation needed
    });

    test('should return valid auth token', () => {
      // Test implementation needed
    });
  });
});
```

### Test 5: Options Page (options.js)

Create `/tests/unit/options.test.js`:

```javascript
describe('options.js', () => {
  describe('token validation', () => {
    test('should validate token by listing files', () => {
      // Test implementation needed
    });

    test('should detect expired tokens', () => {
      // Test implementation needed
    });

    test('should handle API errors', () => {
      // Test implementation needed
    });
  });

  describe('auth status checking', () => {
    test('should show connected status when token exists', () => {
      // Test implementation needed
    });

    test('should show disconnected status when no token', () => {
      // Test implementation needed
    });
  });
});
```

## Phase 3: Add Edge Cases & Error Scenarios (1-2 hours)

Create `/tests/unit/error-handling.test.js`:

```javascript
describe('Error handling', () => {
  test('should handle network failures', () => {
    // Test implementation needed
  });

  test('should handle invalid tab URLs', () => {
    // Test implementation needed
  });

  test('should handle missing Chrome permissions', () => {
    // Test implementation needed
  });

  test('should handle storage quota exceeded', () => {
    // Test implementation needed
  });

  test('should handle Google API rate limiting', () => {
    // Test implementation needed
  });

  test('should handle malformed CSV data', () => {
    // Test implementation needed
  });
});
```

## Phase 4: Test Fixtures (30 minutes)

Create `/tests/fixtures/mock-data.js`:

```javascript
export const mockTabs = [
  {
    id: 1,
    windowId: 1,
    index: 0,
    url: 'https://www.google.com',
    title: 'Google',
    active: true
  },
  {
    id: 2,
    windowId: 1,
    index: 1,
    url: 'https://mail.google.com',
    title: 'Gmail',
    active: false
  }
];

export const mockStorageData = {
  'tab-open-1': '2024-06-04T10:00:00Z',
  'tab-open-2': '2024-06-04T10:05:00Z',
  googleAuthToken: 'test-access-token',
  googleRefreshToken: 'test-refresh-token',
  googleUserInfo: 'user@example.com'
};

export const mockGoogleDriveResponses = {
  listFiles: { files: [] },
  createFolder: { id: 'folder-id-123' },
  uploadFile: { 
    id: 'file-id-456',
    name: 'tabs-export.csv',
    webViewLink: 'https://drive.google.com/file/d/file-id-456/view'
  }
};
```

## Phase 5: CI/CD Integration (Optional, 30 minutes)

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16.x, 18.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test -- --coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      if: matrix.node-version == '18.x'
```

## Manual Testing in Firefox
1. Build the Firefox extension: `bash package.sh`
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Select `manifest.json` from the `dist/firefox/` directory.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Coverage Goals

- **Phase 1**: 30% coverage (utilities and basic functions)
- **Phase 2**: 60% coverage (core features)
- **Phase 3**: 80% coverage (most paths covered)
- **Phase 4**: 90%+ coverage (edge cases and error scenarios)

## Key Testing Considerations

### 1. Chrome API Mocking
The biggest challenge is mocking Chrome APIs. Key areas:
- `chrome.tabs.*` - Tab query and manipulation
- `chrome.windows.*` - Window management
- `chrome.storage.local.*` - Data persistence
- `chrome.identity.*` - OAuth flow
- `chrome.runtime.*` - Message passing

### 2. Async Operations
Many functions use `async/await` and Promises:
- Use `jest.fn().mockResolvedValue()` for successful promises
- Use `jest.fn().mockRejectedValue()` for error scenarios
- Use `await` in test functions

### 3. Google Drive API
External API testing:
- Mock `fetch()` calls
- Use fixtures for API responses
- Test both success and error cases

### 4. State Management
The extension relies on `chrome.storage.local`:
- Mock all storage operations
- Test data persistence scenarios
- Verify cleanup on tab removal

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Chrome Extensions Testing](https://developer.chrome.com/docs/extensions/mv3/testing/)
- [Testing Library](https://testing-library.com/)
- [Mock Chrome API](https://github.com/jest-community/jest-chrome)

## Next Steps

1. Complete Phase 1 setup
2. Run `npm test` to verify configuration
3. Start writing tests in Phase 2
4. Gradually increase coverage
5. Integrate with CI/CD

---

**Note**: This guide assumes you're starting from scratch. Adjust based on your specific needs and testing preferences.
