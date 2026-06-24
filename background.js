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

  // Handle Extract Same Domain (async processing — popup just sends this message)
  if (request.action === 'extractDomain') {
    handleExtractDomain(request).then(result => {
      sendResponse(result);
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
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

// --- Extract Same Host: runs entirely in background (survives popup close) ---

function normalizeHost(hostname) {
  return hostname.toLowerCase();
}

async function pauseVideoTabs(tabs) {
  const videoSites = ['bilibili.com', 'youtube.com'];
  const targetTabs = tabs.filter(t => t.url && videoSites.some(s => t.url.includes(s)));
  if (targetTabs.length === 0) return;
  try {
    await Promise.all(
      targetTabs.map(tab =>
        browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => { document.querySelectorAll('video').forEach(v => v.pause()); }
        })
      )
    );
  } catch (err) {
    // Silently ignore injection errors (restricted pages)
  }
}

async function handleExtractDomain(request) {
  const { activeTabId, activeTabUrl } = request;

  let currentHost;
  try {
    currentHost = normalizeHost(new URL(activeTabUrl).hostname);
  } catch (e) {
    return { success: false, error: 'Invalid URL in active tab.' };
  }

  if (!currentHost) {
    return { success: false, error: 'Cannot determine host for active tab.' };
  }

  // Find all tabs matching the exact host across ALL windows
  const allTabs = await browser.tabs.query({});
  const matchingTabs = [];

  for (const tab of allTabs) {
    if (!tab.url) continue;
    try {
      const tabHost = normalizeHost(new URL(tab.url).hostname);
      if (tabHost === currentHost) {
        matchingTabs.push(tab);
      }
    } catch (e) {
      // skip tabs with invalid URLs
    }
  }

  if (matchingTabs.length < 2) {
    return { success: false, message: 'No other tabs with same host found.' };
  }

  // Pause video tabs before moving
  await pauseVideoTabs(matchingTabs);

  // Collect all tab IDs upfront
  const tabIds = matchingTabs.map(t => t.id);

  // Create new window with the first tab, then move the rest
  const newWindow = await browser.windows.create({ tabId: tabIds[0] });
  if (tabIds.length > 1) {
    await browser.tabs.move(tabIds.slice(1), { windowId: newWindow.id, index: -1 });
  }

  return {
    success: true,
    message: `Extracted ${matchingTabs.length} tab${matchingTabs.length !== 1 ? 's' : ''} for "${currentHost}" to new window.`
  };
}