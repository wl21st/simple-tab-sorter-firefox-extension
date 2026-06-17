try { importScripts("lib/browser-polyfill.min.js"); } catch (e) { console.log(e); }

// Service Worker for Simple Tab Manager
// Tracks tab open times and handles OAuth2

// Google OAuth2 configuration
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Initialize tab tracking storage
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Simple Tab Manager installed');
  } else if (details.reason === 'update') {
    console.log('Simple Tab Manager updated');
  }
});

// Track when tabs are created
browser.tabs.onCreated.addListener((tab) => {
  const openTime = new Date().toISOString();
  browser.storage.local.set({
    [`tab-open-${tab.id}`]: openTime
  });
  console.log(`Tab ${tab.id} opened at ${openTime}`);
});

// Clean up storage when tabs are closed
browser.tabs.onRemoved.addListener((tabId) => {
  browser.storage.local.remove(`tab-open-${tabId}`);
  console.log(`Tab ${tabId} closed, storage cleaned up`);
});

// Get all tab open times
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTabOpenTimes') {
    browser.storage.local.get(null).then((items) => {
      const tabOpenTimes = {};
      for (const [key, value] of Object.entries(items)) {
        if (key.startsWith('tab-open-')) {
          const tabId = parseInt(key.replace('tab-open-', ''));
          tabOpenTimes[tabId] = value;
        }
      }
      sendResponse(tabOpenTimes);
    });
    return true;
  }

  // Handle OAuth2 token exchange
  if (request.action === 'exchangeAuthCode') {
    handleAuthCodeExchange(request.authCode, sendResponse);
    return true;
  }

  // Get fresh access token if needed
  if (request.action === 'getAuthToken') {
    getGoogleAuthToken(sendResponse);
    return true;
  }
});

// Exchange authorization code for tokens
async function handleAuthCodeExchange(authCode, sendResponse) {
  try {
    const redirectUrl = browser.identity.getRedirectURL();

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

    // Get user info
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

// Get valid access token (refresh if needed)
async function getGoogleAuthToken(sendResponse) {
  try {
    const { googleAuthToken, googleRefreshToken } = await browser.storage.local.get([
      'googleAuthToken',
      'googleRefreshToken'
    ]);

    if (!googleAuthToken) {
      sendResponse({ error: 'Not authenticated. Please authorize in extension settings.' });
      return;
    }

    // TODO: Check token expiration and refresh if needed
    // For now, just return the stored token
    sendResponse({ token: googleAuthToken });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

