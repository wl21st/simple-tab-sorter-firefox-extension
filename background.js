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
  if (request.action === 'extractTabs') {
    handleExtractTabs(request.tabIds, request.activeTabId).then(() => {
      sendResponse({ success: true });
    }).catch(err => {
      sendResponse({ error: err.message });
    });
    return true;
  }
  if (request.action === 'mergeWindows') {
    handleMergeWindows(request.currentWindowId).then(() => {
      sendResponse({ success: true });
    }).catch(err => {
      sendResponse({ error: err.message });
    });
    return true;
  }
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

// --- Background Task Handlers ---

async function pauseVideosBg(tabIds) {
  const videoSites = ['bilibili.com', 'youtube.com'];
  const tabs = await browser.tabs.query({});
  const targetTabs = tabs.filter(t => tabIds.includes(t.id) && t.url && videoSites.some(site => t.url.includes(site)));
  
  if (targetTabs.length === 0) return;

  try {
    await Promise.all(
      targetTabs.map(tab =>
        browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            document.querySelectorAll('video').forEach(v => v.pause());
          }
        }).catch(() => {})
      )
    );
  } catch (err) {
    // Ignore
  }
}

async function handleExtractTabs(tabIds, activeTabId) {
  try {
    // 1. Mute video tabs before moving to prevent autoplay
    const tabs = await browser.tabs.query({});
    const videoSites = ['bilibili.com', 'youtube.com'];
    const videoTabs = tabs.filter(t => tabIds.includes(t.id) && t.url && videoSites.some(site => t.url.includes(site)));
    
    const muteRecords = videoTabs.map(t => ({ id: t.id, wasMuted: t.mutedInfo?.muted || false }));
    for (const r of muteRecords) {
      try { await browser.tabs.update(r.id, { muted: true }); } catch {}
    }

    // 2. Create an empty window (doesn't move tabs yet)
    const newWin = await browser.windows.create({ focused: true });
    
    // 3. Move all background tabs sequentially
    let targetIndex = 1;
    for (const tabId of tabIds) {
      if (tabId === activeTabId) continue;
      try {
        await browser.tabs.move(tabId, { windowId: newWin.id, index: targetIndex++ });
      } catch (err) {
        console.warn('Failed to move tab ' + tabId, err);
      }
    }
    
    // 4. Pause videos in the new window
    await pauseVideosBg(tabIds);
    
    // 5. Restore original mute states
    for (const r of muteRecords) {
      try { await browser.tabs.update(r.id, { muted: r.wasMuted }); } catch {}
    }
    
    // 6. Move active tab last
    if (activeTabId) {
      try {
        await browser.tabs.move(activeTabId, { windowId: newWin.id, index: targetIndex });
        await browser.tabs.update(activeTabId, { active: true });
      } catch (err) {}
    }
    
    // 7. Clean up the placeholder empty tab
    if (newWin.tabs && newWin.tabs.length > 0) {
      try { await browser.tabs.remove(newWin.tabs[0].id); } catch(e){}
    } else {
      const tempTabs = await browser.tabs.query({ windowId: newWin.id });
      if (tempTabs.length > 0) {
        await browser.tabs.remove(tempTabs[0].id);
      }
    }
    
    await browser.windows.update(newWin.id, { focused: true });
  } catch (err) {
    console.error('Extract Tabs Error:', err);
    throw err;
  }
}

async function handleMergeWindows(currentWindowId) {
  try {
    const currentWindow = await browser.windows.get(currentWindowId, { populate: true });
    const allTabs = await browser.tabs.query({});
    
    const tabsToMove = allTabs.filter(tab => tab.windowId !== currentWindowId);
    
    // Pause videos
    const tabIdsToMove = tabsToMove.map(t => t.id);
    await pauseVideosBg(tabIdsToMove);

    if (tabsToMove.length > 0) {
      let targetIndexMerge = currentWindow.tabs ? currentWindow.tabs.length : 1000;
      for (const t of tabsToMove) {
        try {
          await browser.tabs.move(t.id, { windowId: currentWindowId, index: targetIndexMerge++ });
        } catch (err) {
          console.warn('Failed to merge tab ' + t.id, err);
        }
      }
    }
  } catch (err) {
    console.error('Merge Windows Error:', err);
    throw err;
  }
}

// --- Extract Same Host: runs entirely in background (survives popup close) ---

function normalizeHost(hostname) {
  return hostname.toLowerCase();
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

  // Collect all tab IDs upfront
  const tabIds = matchingTabs.map(t => t.id);

  // Reuse the robust extraction logic
  await handleExtractTabs(tabIds, activeTabId);

  return {
    success: true,
    message: `Extracted ${matchingTabs.length} tab${matchingTabs.length !== 1 ? 's' : ''} for "${currentHost}" to new window.`
  };
}
