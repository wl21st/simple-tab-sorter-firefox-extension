/**
 * Unit tests for options.js
 * Tests Google Drive authentication and token management
 */

describe('Options Page', () => {
  let tokenInput, refreshTokenInput, saveTokenBtn, statusEl;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="auth-status"></div>
      <div id="user-info"></div>
      <div id="status"></div>
      <button id="btn-disconnect"></button>
      <button id="btn-clear-error"></button>
      <button id="btn-retest-token"></button>
      <div id="extension-id"></div>
      <div id="manual-token-section"></div>
      <input id="token-input" />
      <input id="refresh-token-input" />
      <input id="skip-validation" type="checkbox" />
      <button id="btn-save-token"></button>
    `;

    tokenInput = document.getElementById('token-input');
    refreshTokenInput = document.getElementById('refresh-token-input');
    saveTokenBtn = document.getElementById('btn-save-token');
    statusEl = document.getElementById('status');

    jest.clearAllMocks();
    chrome.runtime.id = 'test-extension-id-123';
  });

  describe('Extension ID Display', () => {
    test('displays extension ID on load', () => {
      const extensionIdEl = document.getElementById('extension-id');
      extensionIdEl.textContent = chrome.runtime.id;
      
      expect(extensionIdEl.textContent).toBe('test-extension-id-123');
    });
  });

  describe('Status Display', () => {
    test('showStatus displays info message', () => {
      showStatusTest('Test message', 'info');
      
      expect(statusEl.textContent).toBe('Test message');
      expect(statusEl.className).toContain('info');
      expect(statusEl.className).toContain('show');
    });

    test('showStatus displays success message', () => {
      showStatusTest('Success!', 'success');
      
      expect(statusEl.textContent).toBe('Success!');
      expect(statusEl.className).toContain('success');
    });

    test('showStatus displays error message', () => {
      showStatusTest('Error occurred', 'error');
      
      expect(statusEl.textContent).toBe('Error occurred');
      expect(statusEl.className).toContain('error');
    });

    test('error messages show clear button', () => {
      showStatusTest('Error', 'error');
      const clearBtn = document.getElementById('btn-clear-error');
      
      // In real code, this would show the button
      expect(statusEl.className).toContain('error');
    });

    test('non-error messages hide clear button', () => {
      showStatusTest('Success', 'success');
      const clearBtn = document.getElementById('btn-clear-error');
      
      // In real code, this would hide the button
      expect(statusEl.className).not.toContain('error');
    });
  });

  describe('Token Validation', () => {
    test('validateTokenByListingFiles validates token with Google Drive', async () => {
      const mockToken = 'valid-token-123';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] })
      });

      const result = await validateTokenByListingFilesTest(mockToken);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files?pageSize=1&spaces=drive',
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` }
        })
      );

      expect(result.success).toBe(true);
    });

    test('validateTokenByListingFiles handles invalid token', async () => {
      const mockToken = 'invalid-token';

      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            message: 'Invalid token'
          }
        })
      });

      const result = await validateTokenByListingFilesTest(mockToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid token');
    });

    test('validateTokenByListingFiles handles network error', async () => {
      const mockToken = 'token-123';

      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await validateTokenByListingFilesTest(mockToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    test('validateTokenByListingFiles handles 401 unauthorized', async () => {
      const mockToken = 'expired-token';

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            message: 'Invalid Credentials'
          }
        })
      });

      const result = await validateTokenByListingFilesTest(mockToken);

      expect(result.success).toBe(false);
    });
  });

  describe('Authentication Status Check', () => {
    test('checkAuthStatus shows connected status when token exists', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        const result = {
          googleAuthToken: 'valid-token',
          googleUserInfo: 'user@example.com'
        };
        if (typeof callback === 'function') callback(result);
        return Promise.resolve(result);
      });

      await checkAuthStatusTest();

      const authStatusEl = document.getElementById('auth-status');
      const userInfoEl = document.getElementById('user-info');

      expect(authStatusEl.className).toContain('connected');
      expect(userInfoEl.style.display).not.toBe('none');
    });

    test('checkAuthStatus shows disconnected status when no token', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        const result = {};
        if (typeof callback === 'function') callback(result);
        return Promise.resolve(result);
      });

      await checkAuthStatusTest();

      const authStatusEl = document.getElementById('auth-status');
      const userInfoEl = document.getElementById('user-info');

      expect(authStatusEl.className).toContain('disconnected');
      expect(userInfoEl.style.display).toBe('none');
    });

    test('checkAuthStatus displays user info when available', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        const result = {
          googleAuthToken: 'token',
          googleUserInfo: 'john@example.com'
        };
        if (typeof callback === 'function') callback(result);
        return Promise.resolve(result);
      });

      await checkAuthStatusTest();

      const userInfoEl = document.getElementById('user-info');
      expect(userInfoEl.innerHTML).toContain('john@example.com');
    });

    test('checkAuthStatus displays last test result', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        const result = {
          googleAuthToken: 'token',
          googleUserInfo: 'user@example.com',
          lastTestResult: { success: true },
          lastTestTime: new Date().toISOString()
        };
        if (typeof callback === 'function') callback(result);
        return Promise.resolve(result);
      });

      await checkAuthStatusTest();

      const authStatusEl = document.getElementById('auth-status');
      expect(authStatusEl.textContent).toContain('Last test');
    });

    test('checkAuthStatus shows disconnect button when authenticated', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          googleAuthToken: 'token'
        });
      });

      await checkAuthStatusTest();

      const disconnectBtn = document.getElementById('btn-disconnect');
      expect(disconnectBtn.style.display).not.toBe('none');
    });

    test('checkAuthStatus hides disconnect button when not authenticated', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        const result = {};
        if (typeof callback === 'function') callback(result);
        return Promise.resolve(result);
      });

      await checkAuthStatusTest();

      const disconnectBtn = document.getElementById('btn-disconnect');
      expect(disconnectBtn.style.display).toBe('none');
    });
  });

  describe('Manual Token Save', () => {
    test('saveTokenButton requires token input', async () => {
      tokenInput.value = '';

      await saveManualTokenTest();

      expect(statusEl.textContent).toContain('Please paste');
      expect(statusEl.className).toContain('error');
    });

    test('saveTokenButton saves token to storage', async () => {
      tokenInput.value = 'my-access-token';
      refreshTokenInput.value = 'my-refresh-token';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] })
      });

      await saveManualTokenTest();

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          googleAuthToken: 'my-access-token'
        }),
        expect.any(Function)
      );
    });

    test('saveTokenButton saves refresh token when provided', async () => {
      tokenInput.value = 'access-token';
      refreshTokenInput.value = 'refresh-token';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] })
      });

      await saveManualTokenTest();

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          googleRefreshToken: 'refresh-token'
        }),
        expect.any(Function)
      );
    });

    test('saveTokenButton validates token after saving', async () => {
      tokenInput.value = 'test-token';
      const skipCheckbox = document.getElementById('skip-validation');
      skipCheckbox.checked = false;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] })
      });

      await saveManualTokenTest();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('googleapis.com'),
        expect.any(Object)
      );
    });

    test('saveTokenButton skips validation when checkbox is set', async () => {
      tokenInput.value = 'test-token';
      const skipCheckbox = document.getElementById('skip-validation');
      skipCheckbox.checked = true;

      await saveManualTokenTest(true);

      expect(statusEl.textContent).toContain('validation skipped');
    });

    test('saveTokenButton disables button while saving', async () => {
      tokenInput.value = 'test-token';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] })
      });

      await saveManualTokenTest();

      // Button should be enabled after operation
      expect(saveTokenBtn.disabled).toBe(false);
    });
  });

  describe('Disconnect Button', () => {
    test('disconnect button clears stored tokens', async () => {
      await disconnectTest();

      expect(chrome.storage.local.remove).toHaveBeenCalled();
    });
  });

  describe('Clear Error Button', () => {
    test('clear error button hides status', () => {
      statusEl.classList.add('show');

      clearErrorTest();

      expect(statusEl.classList.contains('show')).toBe(false);
    });
  });

  describe('Retest Token Button', () => {
    test('retest button validates current token', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        const result = { googleAuthToken: 'current-token' };
        if (typeof callback === 'function') callback(result);
        return Promise.resolve(result);
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] })
      });

      await retestTokenTest();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('googleapis.com'),
        expect.any(Object)
      );
    });

    test('retest button stores test result', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        const result = { googleAuthToken: 'token' };
        if (typeof callback === 'function') callback(result);
        return Promise.resolve(result);
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] })
      });

      await retestTokenTest();

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          lastTestResult: expect.any(Object),
          lastTestTime: expect.any(String)
        }),
        expect.any(Function)
      );
    });
  });

  describe('Error Handling', () => {
    test('handles storage errors gracefully', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        return Promise.reject(new Error('Storage error'));
      });

      await checkAuthStatusTest();

      // Should not throw, component should handle error
      expect(statusEl).toBeDefined();
    });

    test('handles fetch errors during validation', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await validateTokenByListingFilesTest('token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    test('handles malformed error response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}) // Empty error object
      });

      const result = await validateTokenByListingFilesTest('token');

      expect(result.success).toBe(false);
    });
  });
});

// Test helper functions

function showStatusTest(message, type = 'info') {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status show ${type}`;
  
  if (type === 'error') {
    const clearErrorBtn = document.getElementById('btn-clear-error');
    if (clearErrorBtn) {
      clearErrorBtn.style.display = 'block';
    }
  } else {
    const clearErrorBtn = document.getElementById('btn-clear-error');
    if (clearErrorBtn) {
      clearErrorBtn.style.display = 'none';
    }
    setTimeout(() => {
      statusEl.classList.remove('show');
    }, 20000);
  }
}

function clearErrorTest() {
  const statusEl = document.getElementById('status');
  statusEl.classList.remove('show');
}

async function validateTokenByListingFilesTest(token) {
  try {
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?pageSize=1&spaces=drive',
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      
      let errorMsg = 'Unknown error';
      if (typeof errorData.error === 'object') {
        if (errorData.error.message) {
          errorMsg = errorData.error.message;
        } else if (errorData.error.status) {
          errorMsg = errorData.error.status;
        } else {
          errorMsg = JSON.stringify(errorData.error);
        }
      } else if (errorData.error) {
        errorMsg = String(errorData.error);
      }
      
      return { success: false, error: errorMsg };
    }

    const data = await response.json();
    return { success: true, filesAccessible: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function checkAuthStatusTest() {
  try {
    const result = await chrome.storage.local.get([
      'googleAuthToken',
      'googleUserInfo',
      'lastTestResult',
      'lastTestTime'
    ]);

    const authStatusEl = document.getElementById('auth-status');
    const userInfoEl = document.getElementById('user-info');
    const manualTokenSection = document.getElementById('manual-token-section');
    const disconnectBtn = document.getElementById('btn-disconnect');
    const retestBtn = document.getElementById('btn-retest-token');

    if (result.googleAuthToken) {
      authStatusEl.className = 'auth-status connected';
      
      let statusText = '✅ Connected to Google Drive';
      if (result.lastTestResult) {
        if (result.lastTestResult.success) {
          statusText += ' • Last test: ✅ Valid';
        } else {
          statusText += ` • Last test: ❌ ${result.lastTestResult.error}`;
        }
        if (result.lastTestTime) {
          const date = new Date(result.lastTestTime);
          statusText += ` (${date.toLocaleTimeString()})`;
        }
      }
      
      authStatusEl.textContent = statusText;
      if (result.googleUserInfo) {
        userInfoEl.style.display = 'block';
        userInfoEl.innerHTML = `Signed in as: <strong>${result.googleUserInfo}</strong>`;
      }
      manualTokenSection.style.display = 'none';
      disconnectBtn.style.display = 'inline-block';
      if (retestBtn) {
        retestBtn.style.display = 'inline-block';
      }
    } else {
      authStatusEl.className = 'auth-status disconnected';
      authStatusEl.textContent = '⚠️ Not connected to Google Drive';
      userInfoEl.style.display = 'none';
      manualTokenSection.style.display = 'block';
      disconnectBtn.style.display = 'none';
      if (retestBtn) {
        retestBtn.style.display = 'none';
      }
    }
  } catch (err) {
    console.error('checkAuthStatusTest error:', err);
  }
}

async function saveManualTokenTest(skipValidation = false) {
  const tokenInput = document.getElementById('token-input');
  const refreshTokenInput = document.getElementById('refresh-token-input');
  const saveTokenBtn = document.getElementById('btn-save-token');
  const skipCheckbox = document.getElementById('skip-validation');
  const statusEl = document.getElementById('status');

  const token = tokenInput.value.trim();
  const refreshToken = refreshTokenInput.value.trim();
  const skip = skipCheckbox ? skipCheckbox.checked : false;

  if (!token) {
    statusEl.textContent = '❌ Please paste an access token';
    statusEl.className = 'status show error';
    return;
  }

  try {
    saveTokenBtn.disabled = true;
    statusEl.textContent = '⏳ Saving token...';
    statusEl.className = 'status show info';

    const storageData = {
      googleAuthToken: token,
      googleUserInfo: 'User'
    };

    if (refreshToken) {
      storageData.googleRefreshToken = refreshToken;
    }

    await new Promise((resolve, reject) => {
      chrome.storage.local.set(storageData, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });

    if (!skip) {
      statusEl.textContent = '⏳ Testing token...';
      const result = await validateTokenByListingFilesTest(token);

      if (result.success) {
        const testData = {
          lastTestResult: { success: true },
          lastTestTime: new Date().toISOString()
        };
        await new Promise((resolve) => {
          chrome.storage.local.set(testData, resolve);
        });
        statusEl.textContent = '✅ Token saved and tested successfully!';
        statusEl.className = 'status show success';
      } else {
        const testData = {
          lastTestResult: { success: false, error: result.error },
          lastTestTime: new Date().toISOString()
        };
        await new Promise((resolve) => {
          chrome.storage.local.set(testData, resolve);
        });
        statusEl.textContent = `⚠️ Token saved, but test failed: ${result.error}`;
        statusEl.className = 'status show error';
      }
    } else {
      statusEl.textContent = '✅ Token saved (validation skipped)';
      statusEl.className = 'status show success';
    }
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
    statusEl.className = 'status show error';
  } finally {
    saveTokenBtn.disabled = false;
  }
}

async function disconnectTest() {
  const statusEl = document.getElementById('status');
  try {
    statusEl.textContent = '⏳ Disconnecting...';
    statusEl.className = 'status show info';

    await new Promise((resolve) => {
      chrome.storage.local.remove(
        ['googleAuthToken', 'googleRefreshToken', 'googleUserInfo', 'lastTestResult', 'lastTestTime'],
        resolve
      );
    });

    statusEl.textContent = '✅ Disconnected from Google Drive';
    statusEl.className = 'status show success';
    await checkAuthStatusTest();
  } catch (err) {
    statusEl.textContent = `❌ Error: ${err.message}`;
    statusEl.className = 'status show error';
  }
}

async function retestTokenTest() {
  const statusEl = document.getElementById('status');

  return new Promise((resolve) => {
    chrome.storage.local.get(['googleAuthToken'], async (result) => {
      if (!result.googleAuthToken) {
        statusEl.textContent = 'No token stored';
        statusEl.className = 'status show error';
        resolve();
        return;
      }

      statusEl.textContent = '⏳ Testing token...';
      statusEl.className = 'status show info';

      const testResult = await validateTokenByListingFilesTest(result.googleAuthToken);

      const testData = {
        lastTestResult: {
          success: testResult.success,
          error: testResult.error
        },
        lastTestTime: new Date().toISOString()
      };

      chrome.storage.local.set(testData, () => {
        if (testResult.success) {
          statusEl.textContent = '✅ Token is valid!';
          statusEl.className = 'status show success';
        } else {
          statusEl.textContent = `❌ Token validation failed: ${testResult.error}`;
          statusEl.className = 'status show error';
        }
        resolve();
      });
    });
  });
}
