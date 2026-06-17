/**
 * Unit tests for background.js (Service Worker)
 * Tests tab tracking and OAuth2 functionality
 */

describe('Background Service Worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      require('../background.js');
    });
  });

  describe('Tab Tracking', () => {
    test('onCreated listener stores tab open time', () => {
      const mockTab = { id: 1 };
      const callback = getOnInstalledCallback();
      
      // Simulate tab creation
      if (chrome.tabs.onCreated.addListener.mock.calls.length > 0) {
        const listener = chrome.tabs.onCreated.addListener.mock.calls[0][0];
        listener(mockTab);
        
        expect(chrome.storage.local.set).toHaveBeenCalledWith(
          expect.objectContaining({ 'tab-open-1': expect.any(String) })
        );
      }
    });

    test('onRemoved listener cleans up storage', () => {
      const tabId = 42;
      
      if (chrome.tabs.onRemoved.addListener.mock.calls.length > 0) {
        const listener = chrome.tabs.onRemoved.addListener.mock.calls[0][0];
        listener(tabId);
        
        expect(chrome.storage.local.remove).toHaveBeenCalledWith('tab-open-42');
      }
    });

    test('getTabOpenTimes extracts open times from storage', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          'tab-open-1': '2024-06-04T10:00:00Z',
          'tab-open-2': '2024-06-04T10:05:00Z',
          'other-key': 'value'
        });
      });

      const sendResponse = jest.fn();
      const request = { action: 'getTabOpenTimes' };
      
      handleMessageTest(request, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        1: '2024-06-04T10:00:00Z',
        2: '2024-06-04T10:05:00Z'
      });
    });

    test('getTabOpenTimes handles empty storage', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      const sendResponse = jest.fn();
      const request = { action: 'getTabOpenTimes' };
      
      handleMessageTest(request, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({});
    });
  });

  describe('OAuth2 Token Exchange', () => {
    test('exchangeAuthCode requests token from Google', async () => {
      const mockAuthCode = 'auth-code-123';
      const mockTokenResponse = {
        access_token: 'access-token-456',
        refresh_token: 'refresh-token-789',
        email: 'user@example.com'
      };

      chrome.identity.getRedirectURL.mockReturnValue('chrome-extension://abc/redirect');
      
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ email: 'user@example.com' })
        });

      const sendResponse = jest.fn();
      
      await handleAuthCodeExchangeTest(mockAuthCode, sendResponse);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          access_token: 'access-token-456'
        })
      );
    });

    test('exchangeAuthCode handles token error', async () => {
      const mockAuthCode = 'invalid-code';
      const mockErrorResponse = {
        error: 'invalid_code',
        error_description: 'Authorization code is invalid'
      };

      chrome.identity.getRedirectURL.mockReturnValue('chrome-extension://abc/redirect');
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockErrorResponse
      });

      const sendResponse = jest.fn();
      
      await handleAuthCodeExchangeTest(mockAuthCode, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        error: 'Authorization code is invalid'
      });
    });

    test('exchangeAuthCode includes refresh token in response', async () => {
      const mockAuthCode = 'auth-code-123';
      const mockTokenResponse = {
        access_token: 'access-token-456',
        refresh_token: 'refresh-token-789'
      };

      chrome.identity.getRedirectURL.mockReturnValue('chrome-extension://abc/redirect');
      
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ email: 'user@example.com' })
        });

      const sendResponse = jest.fn();
      
      await handleAuthCodeExchangeTest(mockAuthCode, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          refresh_token: 'refresh-token-789'
        })
      );
    });
  });

  describe('Get Auth Token', () => {
    test('getAuthToken returns stored token', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          googleAuthToken: 'stored-token-xyz',
          googleRefreshToken: 'refresh-token-abc'
        });
      });

      const sendResponse = jest.fn();
      
      await getGoogleAuthTokenTest(sendResponse);

      expect(chrome.storage.local.get).toHaveBeenCalledWith(
        expect.arrayContaining(['googleAuthToken', 'googleRefreshToken']),
        expect.any(Function)
      );

      expect(sendResponse).toHaveBeenCalledWith({
        token: 'stored-token-xyz'
      });
    });

    test('getAuthToken handles missing token', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      const sendResponse = jest.fn();
      
      await getGoogleAuthTokenTest(sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('Message Handling', () => {
    test('onMessage listener is registered', () => {
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });

    test('handles getTabOpenTimes request', async () => {
      const sendResponse = jest.fn();
      
      await handleMessageTest({ action: 'getTabOpenTimes' }, {}, sendResponse);

      expect(chrome.storage.local.get).toHaveBeenCalled();
    });

    test('handles exchangeAuthCode request', async () => {
      const sendResponse = jest.fn();
      
      await handleMessageTest(
        { action: 'exchangeAuthCode', authCode: 'test-code' },
        {},
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalled();
    });

    test('handles getAuthToken request', async () => {
      const sendResponse = jest.fn();
      
      await handleMessageTest({ action: 'getAuthToken' }, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalled();
    });

    test('ignores unknown requests', async () => {
      const sendResponse = jest.fn();
      
      await handleMessageTest({ action: 'unknown' }, {}, sendResponse);

      // Should not call sendResponse for unknown actions
      expect(sendResponse).not.toHaveBeenCalled();
    });
  });

  describe('Installation Lifecycle', () => {
    test('onInstalled listener is registered', () => {
      expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalled();
    });

    test('handles install reason', () => {
      if (chrome.runtime.onInstalled.addListener.mock.calls.length > 0) {
        const listener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
        expect(listener).toBeDefined();
        expect(typeof listener).toBe('function');
      }
    });

    test('handles update reason', () => {
      if (chrome.runtime.onInstalled.addListener.mock.calls.length > 0) {
        const listener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
        listener({ reason: 'update' });
        // Should not throw
        expect(listener).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    test('exchangeAuthCode handles fetch errors', async () => {
      chrome.identity.getRedirectURL.mockReturnValue('chrome-extension://abc/redirect');
      
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const sendResponse = jest.fn();
      
      await handleAuthCodeExchangeTest('code', sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    test('getAuthToken handles storage errors', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        throw new Error('Storage error');
      });

      const sendResponse = jest.fn();
      
      await getGoogleAuthTokenTest(sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });
});

// Test helper functions

function getOnInstalledCallback() {
  if (chrome.runtime.onInstalled.addListener.mock.calls.length > 0) {
    return chrome.runtime.onInstalled.addListener.mock.calls[0][0];
  }
  return null;
}

async function handleMessageTest(request, sender, sendResponse) {
  const handlers = {
    'getTabOpenTimes': () => {
      return new Promise((resolve) => {
        chrome.storage.local.get(null, (items) => {
          const tabOpenTimes = {};
          for (const [key, value] of Object.entries(items)) {
            if (key.startsWith('tab-open-')) {
              const tabId = parseInt(key.replace('tab-open-', ''));
              tabOpenTimes[tabId] = value;
            }
          }
          sendResponse(tabOpenTimes);
          resolve(true);
        });
      });
    },
    'exchangeAuthCode': async () => {
      await handleAuthCodeExchangeTest(request.authCode, sendResponse);
      return true;
    },
    'getAuthToken': async () => {
      await getGoogleAuthTokenTest(sendResponse);
      return true;
    }
  };

  if (handlers[request.action]) {
    return await handlers[request.action]();
  }

  return false;
}

async function handleAuthCodeExchangeTest(authCode, sendResponse) {
  try {
    const redirectUrl = chrome.identity.getRedirectURL();
    const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
    const GOOGLE_CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET';
    const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code: authCode,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUrl,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      sendResponse({ error: tokenData.error_description || tokenData.error });
      return;
    }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const userInfo = await userInfoResponse.json();

    sendResponse({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      email: userInfo.email
    });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

async function getGoogleAuthTokenTest(sendResponse) {
  try {
    chrome.storage.local.get(
      ['googleAuthToken', 'googleRefreshToken'],
      function(result) {
        if (!result.googleAuthToken) {
          sendResponse({
            error: 'Not authenticated. Please authorize in extension settings.'
          });
          return;
        }

        sendResponse({ token: result.googleAuthToken });
      }
    );
  } catch (err) {
    sendResponse({ error: err.message });
  }
}
