// Global setup for all tests - mocks Chrome API
global.chrome = global.browser = {
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    move: jest.fn(),
    update: jest.fn(),
    onCreated: {
      addListener: jest.fn(),
    },
    onRemoved: {
      addListener: jest.fn(),
    },
  },
  windows: {
    getAll: jest.fn(),
    getCurrent: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    },
    local: {
      get: jest.fn((keys, callback) => {
        return new Promise((resolve) => {
          const result = {};
          if (typeof keys === 'function') {
            keys(result);
            resolve(result);
          } else if (typeof callback === 'function') {
            callback(result);
            resolve(result);
          } else {
            resolve(result);
          }
        });
      }),
      set: jest.fn((data, callback) => {
        return new Promise((resolve) => {
          if (typeof callback === 'function') {
            callback();
          }
          resolve();
        });
      }),
      remove: jest.fn((keys, callback) => {
        return new Promise((resolve) => {
          if (typeof callback === 'function') {
            callback();
          }
          resolve();
        });
      }),
    },
  },
  runtime: {
    id: 'test-extension-id',
    onMessage: {
      addListener: jest.fn(),
    },
    onInstalled: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
    getURL: jest.fn((path) => `chrome-extension://mock/${path}`),
    openOptionsPage: jest.fn(),
  },
  identity: {
    getAuthToken: jest.fn(),
    getRedirectURL: jest.fn(),
    removeCachedAuthToken: jest.fn(),
    launchWebAuthFlow: jest.fn(),
  },
  scripting: {
    executeScript: jest.fn(),
  },
};

// Mock Fetch API for Google Drive integration tests
global.fetch = jest.fn();

// Suppress console errors during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Not implemented: HTMLFormElement.prototype.submit') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.reset'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
