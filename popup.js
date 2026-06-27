document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const aboutModal = document.getElementById('about-modal');
  const csvModal = document.getElementById('csv-modal');
  const googleDriveModal = document.getElementById('google-drive-modal');

  function showStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.className = `status show ${isError ? 'error' : 'success'}`;
    
    // Don't auto-dismiss errors - let user see them
    if (!isError) {
      setTimeout(() => {
        statusEl.classList.remove('show');
      }, 20000);
    }
  }

  // Global function to open settings
  window.openSettings = function() {
    console.log('openSettings called');
    try {
      console.log('browser.runtime:', browser.runtime);
      console.log('browser.runtime.openOptionsPage:', browser.runtime.openOptionsPage);
      
      if (typeof browser.runtime.openOptionsPage === 'function') {
        console.log('Calling browser.runtime.openOptionsPage...');
        browser.runtime.openOptionsPage();
        console.log('openOptionsPage called');
      } else {
        console.error('openOptionsPage is not a function');
        // Fallback: open options.html directly
        const optionsUrl = browser.runtime.getURL('options.html');
        console.log('Opening options URL directly:', optionsUrl);
        browser.tabs.create({ url: optionsUrl });
      }
    } catch (err) {
      console.error('Error in openSettings:', err);
      showStatus('Error: ' + err.message, true);
    }
  };

  // ─── Filter & Extract Section ──────────────────────────────────────────────

  // State
  let filterScope = 'all'; // 'window' | 'all'

  // Elements
  const filterToggleBtn  = document.getElementById('btn-filter-toggle');
  const filterBody       = document.getElementById('filter-body');
  const filterCaret      = document.getElementById('filter-caret');
  const filterKeywordEl  = document.getElementById('filter-keyword');
  const filterSiteEl     = document.getElementById('filter-site');
  const filterCountEl    = document.getElementById('filter-match-count');
  const scopeWindowBtn   = document.getElementById('scope-window');
  const scopeAllBtn      = document.getElementById('scope-all');
  const btnFilterExtract = document.getElementById('btn-filter-extract');

  // Toggle open/closed
  filterToggleBtn.addEventListener('click', () => {
    const isOpen = filterBody.classList.toggle('open');
    filterCaret.classList.toggle('open', isOpen);
    if (isOpen) {
      filterKeywordEl.focus();
      updateFilterCount();
    }
  });

  // Scope switcher
  scopeWindowBtn.addEventListener('click', () => {
    filterScope = 'window';
    scopeWindowBtn.classList.add('active');
    scopeAllBtn.classList.remove('active');
    updateFilterCount();
  });
  scopeAllBtn.addEventListener('click', () => {
    filterScope = 'all';
    scopeAllBtn.classList.add('active');
    scopeWindowBtn.classList.remove('active');
    updateFilterCount();
  });

  // Re-count on every keystroke in either input
  filterKeywordEl.addEventListener('input', updateFilterCount);
  filterSiteEl.addEventListener('input', updateFilterCount);

  // Press Enter in either filter input to extract matching tabs
  function onFilterEnter(e) {
    if (e.key === 'Enter' && !btnFilterExtract.disabled) {
      btnFilterExtract.click();
    }
  }
  filterKeywordEl.addEventListener('keydown', onFilterEnter);
  filterSiteEl.addEventListener('keydown', onFilterEnter);

  /** Returns tabs that match current keyword + site filters */
  async function getFilteredTabs() {
    const keyword = filterKeywordEl.value.trim().toLowerCase();
    const site    = filterSiteEl.value.trim().toLowerCase().replace(/^www\./, '');
    const queryOpts = filterScope === 'all' ? {} : { currentWindow: true };
    const tabs = await browser.tabs.query(queryOpts);

    return tabs.filter(tab => {
      const url   = (tab.url   || '').toLowerCase();
      const title = (tab.title || '').toLowerCase();

      // Skip internal browser pages
      if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:')) return false;

      // Site filter: match base domain
      if (site) {
        try {
          const tabDomain = extractBaseDomain(new URL(tab.url).hostname);
          if (!tabDomain.includes(site) && !site.includes(tabDomain)) return false;
        } catch { return false; }
      }

      // Keyword filter: any of the space-separated tokens must match title OR url
      if (keyword) {
        const tokens = keyword.split(/\s+/).filter(Boolean);
        const matches = tokens.every(token => title.includes(token) || url.includes(token));
        if (!matches) return false;
      }

      return true;
    });
  }

  /** Update the live match count badge and extract button state */
  async function updateFilterCount() {
    try {
      const matched = await getFilteredTabs();
      const n = matched.length;
      filterCountEl.textContent = n;
      filterCountEl.className = `match-num${n === 0 ? ' zero' : ''}`;
      btnFilterExtract.disabled = n < 1;
    } catch {
      filterCountEl.textContent = '?';
      btnFilterExtract.disabled = true;
    }
  }

  /** Extract all matching tabs into a new window */
  btnFilterExtract.addEventListener('click', async () => {
    try {
      const matched = await getFilteredTabs();
      if (matched.length === 0) {
        showStatus('No matching tabs to extract.', true);
        return;
      }

      // Auto-play protection — mute video tabs before moving
      const videoSites = ['bilibili.com', 'youtube.com'];
      const videoTabs  = matched.filter(t => t.url && videoSites.some(s => t.url.includes(s)));
      const muteRecords = videoTabs.map(t => ({ id: t.id, wasMuted: t.mutedInfo?.muted || false }));
      for (const r of muteRecords) {
        try { await browser.tabs.update(r.id, { muted: true }); } catch { /* ignore */ }
      }

      // Find the active tab to defer moving it (prevents popup from closing prematurely)
      const currentWindowTabs = await browser.tabs.query({ currentWindow: true, active: true });
      const currentActiveTab = currentWindowTabs[0];

      let activeMatchedTab = null;
      let otherMatchedTabs = [];
      for (const t of matched) {
        if (currentActiveTab && t.id === currentActiveTab.id) {
          activeMatchedTab = t;
        } else {
          otherMatchedTabs.push(t);
        }
      }

      // Create new window with the first background tab (if any)
      const firstTabToMove = otherMatchedTabs.length > 0 ? otherMatchedTabs[0] : activeMatchedTab;
      let newWin;
      try {
        newWin = await browser.windows.create({ tabId: firstTabToMove.id, focused: false });
      } catch (err) {
        // Restore mute on failure
        for (const r of muteRecords) {
          try { await browser.tabs.update(r.id, { muted: r.wasMuted }); } catch { /* ignore */ }
        }
        throw err;
      }

      // Move the rest of the non-active tabs
      const restToMove = otherMatchedTabs.filter(t => t.id !== firstTabToMove.id);
      if (restToMove.length > 0) {
        // WORKAROUND: Firefox has a known bug where passing an array of tabIds from 
        // different original windows to browser.tabs.move() will silently fail to move 
        // tabs outside of the first tab's original window. 
        // Group tabs by their original windowId and move them in batches.
        const groupedByWindow = {};
        for (const t of restToMove) {
          if (!groupedByWindow[t.windowId]) groupedByWindow[t.windowId] = [];
          groupedByWindow[t.windowId].push(t.id);
        }
        for (const winId in groupedByWindow) {
          try {
            await browser.tabs.move(groupedByWindow[winId], { windowId: newWin.id, index: -1 });
          } catch (err) {
            console.warn(`Failed to move filtered tabs from window ${winId}:`, err);
          }
        }
      }

      // Pause videos, then restore mute states
      await pauseVideos(matched);
      for (const r of muteRecords) {
        try { await browser.tabs.update(r.id, { muted: r.wasMuted }); } catch { /* ignore */ }
      }

      const keyword = filterKeywordEl.value.trim();
      showStatus(`Extracted ${matched.length} tab${matched.length !== 1 ? 's' : ''} matching "${keyword || '(all)'}" to new window.`);

      // Finally, move the active tab if it's part of the match (this will close the popup)
      if (activeMatchedTab && activeMatchedTab.id !== firstTabToMove.id) {
        try {
          await browser.tabs.move(activeMatchedTab.id, { windowId: newWin.id, index: -1 });
          await browser.tabs.update(activeMatchedTab.id, { active: true });
        } catch (err) {
          console.warn('Failed to move active tab:', err);
        }
      }

      // Focus new window (may close popup if it survived this far)
      try { await browser.windows.update(newWin.id, { focused: true }); } catch { /* ignore */ }

      // Reset count (only executes if popup is still open)
      await updateFilterCount();
    } catch (err) {
      showStatus('Error extracting filtered tabs: ' + err.message, true);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────

  // Attach to Settings button
  const settingsBtn = document.getElementById('btn-settings');
  if (settingsBtn) {
    console.log('Settings button found, attaching click handler');
    settingsBtn.addEventListener('click', window.openSettings);
  } else {
    console.error('Settings button not found!');
  }

  // CSV generation helper
  function generateCSV(tabs, tabOpenTimes = {}) {
    const headers = ['Title', 'URL', 'Tab Open Time', 'Export Time'];
    const exportTime = new Date().toISOString();
    
    const rows = tabs.map(tab => {
      // Get tab open time from the tabOpenTimes object
      const tabOpenTime = tabOpenTimes[tab.id] || 'Unknown';
      
      return [
        escapeCSVField(tab.title || ''),
        escapeCSVField(tab.url || ''),
        tabOpenTime,
        exportTime
      ];
    });
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    return csvContent;
  }

  // Helper to estimate tab open time from tab properties
  function getTabOpenTime(tab) {
    // Chrome doesn't provide exact open time, but we can estimate based on:
    // - Session data (if available)
    // - Tab creation (not directly available)
    // We'll return a placeholder indicating when this data was last updated
    // In a real scenario, you'd need to track this with a content script or service worker
    
    // Check if we have stored open time for this tab
    const storedTime = sessionStorage.getItem(`tab-open-${tab.id}`);
    if (storedTime) {
      return storedTime;
    }
    
    // If no stored time, return "Unknown" as Chrome doesn't expose exact open time
    return 'Unknown';
  }

  function escapeCSVField(field) {
    return String(field).replace(/"/g, '""');
  }

  // Display CSV in modal
  async function displayCSVModal() {
    try {
      const tabs = await browser.tabs.query({});
      
      // Get tab open times from service worker
      const tabOpenTimes = await new Promise((resolve) => {
        browser.runtime.sendMessage({ action: 'getTabOpenTimes' }).then((response) => {
          resolve(response || {});
        });
      });
      
      const csvContent = generateCSV(tabs, tabOpenTimes);
      document.getElementById('csv-content').value = csvContent;
      csvModal.classList.add('show');
    } catch (err) {
      showStatus('Error generating CSV: ' + err.message, true);
    }
  }

  // Download CSV file
  function downloadCSV(csvContent) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // Format: 2024-06-04T14-30-15
    
    link.setAttribute('href', url);
    link.setAttribute('download', `tabs-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Copy CSV to clipboard
  async function copyToClipboard() {
    const csvContent = document.getElementById('csv-content').value;
    try {
      await navigator.clipboard.writeText(csvContent);
      showStatus('CSV copied to clipboard!');
    } catch (err) {
      showStatus('Failed to copy: ' + err.message, true);
    }
  }

  // Get OAuth token with auto-refresh support
  async function getGoogleAuthToken() {
    try {
      const { googleAuthToken, googleRefreshToken } = await browser.storage.local.get(['googleAuthToken', 'googleRefreshToken']);
      
      if (!googleAuthToken) {
        throw new Error('Not authenticated. Please open Settings to connect your Google account.');
      }

      // Check if token might be expired and refresh if we have refresh token
      if (googleRefreshToken) {
        // Try to validate token first
        try {
          const testResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${googleAuthToken}` }
          });
          
          if (testResponse.status === 401) {
            // Token expired, try to refresh
            console.log('Access token expired, attempting refresh...');
            const newToken = await refreshGoogleToken(googleRefreshToken);
            if (newToken) {
              return newToken;
            }
          }
        } catch (err) {
          console.log('Token validation check failed:', err.message);
          // If check fails, try refresh anyway
          const newToken = await refreshGoogleToken(googleRefreshToken);
          if (newToken) {
            return newToken;
          }
        }
      }
      
      return googleAuthToken;
    } catch (err) {
      throw new Error(err.message || 'Failed to get authentication token');
    }
  }

  // Refresh access token using refresh token
  async function refreshGoogleToken(refreshToken) {
    try {
      console.log('Refreshing access token...');
      
      // Note: This requires a backend or proxy to handle token refresh
      // For now, we'll just return null and let user manually refresh
      // In production, you'd call your backend like:
      // const response = await fetch('https://your-backend.com/refresh-token', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ refreshToken })
      // });
      
      console.log('Token refresh requires backend (not implemented in client-only extension)');
      return null;
    } catch (err) {
      console.error('Token refresh failed:', err);
      return null;
    }
  }

  // Find or create folder in Google Drive
  async function findOrCreateFolder(token, folderName, parentId = 'root') {
    if (!folderName) return 'root';

    // Search for existing folder
    const searchQuery = `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&spaces=drive&pageSize=1&fields=files(id)`;
    
    try {
      const searchResponse = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const searchData = await searchResponse.json();

      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }
    } catch (err) {
      console.error('Search error:', err);
    }

    // Create new folder if not found
    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    };

    try {
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      if (!createResponse.ok) {
        throw new Error(`API error: ${createResponse.status}`);
      }

      const createData = await createResponse.json();
      return createData.id;
    } catch (err) {
      throw new Error('Failed to create folder: ' + err.message);
    }
  }

  // Upload CSV to Google Drive
  async function uploadToGoogleDrive() {
    const gdriveStatusEl = document.getElementById('gdrive-status');
    const uploadBtn = document.getElementById('btn-upload-gdrive');
    const folderName = document.getElementById('folder-name-input').value.trim();
    const fileName = document.getElementById('file-name-input').value.trim() || 'tabs-export.csv';

    try {
      gdriveStatusEl.textContent = 'Authenticating with Google...';
      uploadBtn.disabled = true;

      const token = await getGoogleAuthToken();
      
      gdriveStatusEl.textContent = 'Preparing CSV...';
      const tabs = await browser.tabs.query({});
      
      // Get tab open times from service worker
      const tabOpenTimes = await new Promise((resolve) => {
        browser.runtime.sendMessage({ action: 'getTabOpenTimes' }).then((response) => {
          resolve(response || {});
        });
      });
      
      const csvContent = generateCSV(tabs, tabOpenTimes);

      if (folderName) {
        gdriveStatusEl.textContent = `Finding or creating folder "${folderName}"...`;
        var folderId = await findOrCreateFolder(token, folderName);
      } else {
        var folderId = 'root';
      }

      gdriveStatusEl.textContent = 'Uploading file...';
      const metadata = {
        name: fileName,
        parents: [folderId]
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([csvContent], { type: 'text/csv' }));

      const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(`Upload failed: ${errorData.error?.message || uploadResponse.status}`);
      }

      const uploadData = await uploadResponse.json();
      gdriveStatusEl.innerHTML = `✓ Uploaded successfully!<br><a href="${uploadData.webViewLink}" target="_blank" style="color: #4c8bf5; font-size: 12px;">View on Google Drive</a>`;
      
      googleDriveModal.classList.remove('show');
      showStatus(`Saved to Google Drive: ${uploadData.name}`);
    } catch (err) {
      gdriveStatusEl.textContent = `Error: ${err.message}`;
      console.error('Google Drive upload error:', err);
      uploadBtn.disabled = false;
    } finally {
      uploadBtn.disabled = false;
    }
  }

  // Pause videos on Bilibili or YouTube tabs to prevent auto-play
  async function pauseVideos(tabs) {
    const videoSites = ['bilibili.com', 'youtube.com'];
    const targetTabs = tabs.filter(tab => tab.url && videoSites.some(site => tab.url.includes(site)));
    if (targetTabs.length === 0) return;

    try {
      await Promise.all(
        targetTabs.map(tab =>
          browser.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              document.querySelectorAll('video').forEach(v => v.pause());
            }
          })
        )
      );
    } catch (err) {
      // Silently ignore injection errors (e.g., restricted pages)
    }
  }

  // --- 1. Sort Tabs ---
  document.getElementById('btn-sort').addEventListener('click', async () => {
    try {
      const tabs = await browser.tabs.query({ currentWindow: true });
      const sorted = [...tabs].sort((a, b) => {
        const urlA = a.url || '';
        const urlB = b.url || '';
        return urlA.localeCompare(urlB);
      });

      for (let i = 0; i < sorted.length; i++) {
        await browser.tabs.move(sorted[i].id, { index: i });
      }
      showStatus('Tabs sorted by URL!');
    } catch (err) {
      showStatus('Error sorting tabs: ' + err.message, true);
    }
  });

  // --- 2. Merge All Windows ---
  document.getElementById('btn-merge').addEventListener('click', async () => {
    try {
      const currentWindow = await browser.windows.getCurrent({ populate: true });
      const allTabs = await browser.tabs.query({});

      const tabsToMove = allTabs.filter(tab => tab.windowId !== currentWindow.id);
      await pauseVideos(tabsToMove);

      if (tabsToMove.length > 0) {
        const groupedByWindow = {};
        for (const t of tabsToMove) {
          if (!groupedByWindow[t.windowId]) groupedByWindow[t.windowId] = [];
          groupedByWindow[t.windowId].push(t.id);
        }
        for (const winId in groupedByWindow) {
          try {
            await browser.tabs.move(groupedByWindow[winId], { windowId: currentWindow.id, index: -1 });
          } catch (err) {
            console.warn(`Failed to merge tabs from window ${winId}:`, err);
          }
        }
      }

      showStatus('All windows merged!');
    } catch (err) {
      showStatus('Error merging windows: ' + err.message, true);
    }
  });

  // --- Helper: Remove duplicate tabs ---
  async function removeDuplicates() {
    const tabs = await browser.tabs.query({});
    const seen = new Map(); // url -> kept tab
    const toRemove = [];    // tab ids to close
    const dupCountByUrl = new Map(); // url -> count of dups
    let totalKept = 0;

    // Sort by index to keep the left-most tab
    const sorted = [...tabs].sort((a, b) => (a.index || 0) - (b.index || 0));

    for (const tab of sorted) {
      if (!tab.url || tab.url.startsWith('chrome://')) continue;
      if (seen.has(tab.url)) {
        toRemove.push(tab.id);
        dupCountByUrl.set(tab.url, (dupCountByUrl.get(tab.url) || 0) + 1);
      } else {
        seen.set(tab.url, tab);
        totalKept++;
      }
    }

    if (toRemove.length === 0) {
      showStatus('No duplicated tabs found.', true);
      return;
    }

    await browser.tabs.remove(toRemove);

    // Build summary: e.g. "Removed 3 duplicates (2× youtube.com/..., 1× example.com)"
    const dupEntries = [...dupCountByUrl.entries()];
    const summarize = (url) => {
      try {
        const u = new URL(url);
        const path = u.pathname.length > 20 ? u.pathname.slice(0, 20) + '…' : u.pathname;
        return `${u.hostname}${path}`;
      } catch { return url; }
    };
    let detail = dupEntries
      .slice(0, 3)
      .map(([url, count]) => `${count}× ${summarize(url)}`)
      .join(', ');
    if (dupEntries.length > 3) detail += ` (+${dupEntries.length - 3} more)`;

    showStatus(`Removed ${toRemove.length} duplicates: ${detail}`);
  }

  // --- 4. Remove Duplicates ---
  document.getElementById('btn-dedup-all').addEventListener('click', () => {
    removeDuplicates().catch(err => showStatus('Error: ' + err.message, true));
  });

  // --- Set version from manifest ---
  const manifest = chrome.runtime.getManifest();
  document.getElementById('version-text').textContent = `v${manifest.version}`;
  document.getElementById('about-version').textContent = `Simple Tab Manager v${manifest.version}`;

  // --- Changelog data ---
  const changelogData = [
    { version: '3.2.0', changes: [
      'Renamed "Extract Same Domain" to "Extract Same Host". Now matches by exact hostname (case-insensitive) instead of guessing a "base domain".',
      'Removed domain-guessing heuristics entirely — no more brand TLD lists or multi-part TLD guessing.',
    ]},
    { version: '3.1.5', changes: [
      'Moved Extract Domain operation to background service worker for reliability (popup no longer closes mid-operation).',
    ]},
    { version: '3.1.1', changes: [
      'Fixed cross-window tab extraction in Firefox to work around an API limitation by grouping bulk tab moves by their original window ID.',
      'Applied the same workaround for merging windows to ensure all tabs are correctly merged.',
    ]},
    { version: '3.1', changes: [
      'Made "All Windows" the default scope for the Filter &amp; Extract feature.',
      'Fixed "Extract to New Window" logic to safely defer moving the active tab, preventing premature popup closures.',
    ]},
    { version: '3.0', changes: [
      'Redesigned toolbar icon: three stacked browser tabs (ear+body silhouette) with a bidirectional sort arrow — clearly communicates the extension&#39;s purpose at all sizes.',
    ]},
    { version: '2.9', changes: [
      'Redesigned extension icon with a modern browser-tab motif, blue gradient background, and sort-arrow accent.',
      'Renamed <strong>"Remove Duplicates (All Windows)"</strong> label to <strong>"Remove Duplicates"</strong> for brevity.',
    ]},
    { version: '2.8', changes: [
      'Renamed <strong>"Extract Same Domain to New Window"</strong> to <strong>"Extract Same Domain"</strong> for brevity.',
    ]},
    { version: '2.7', changes: [
      'Removed <strong>Remove Duplicates (Current Window)</strong> button; all-windows dedup already covered this.',
    ]},
    { version: '2.6', changes: [
      'Added <strong>Filter &amp; Extract Tabs</strong> section: keyword search (matches title + URL), scope toggle (This Window / All Windows), optional site filter, live match count badge, and extract-to-new-window button.',
    ]},
    { version: '2.5', changes: [
      'Implemented robust audio restoration with array recording and safe tab switching.',
      'Optimized tab movement using batch operations for faster extraction.',
      'Improved reliability and error reporting for extraction process.',
    ]},
    { version: '2.0', changes: [
      'Added detailed Google Drive token acquisition and refresh guidelines in Settings.',
      'Improved token management UX with color-coded instruction boxes and validation tips.',
    ]},
    { version: '1.9', changes: [
      'Added step-by-step guidance in Settings for obtaining temporary (OAuth2 Playground) vs. recommended (Google Cloud Project) Google Drive tokens.',
      'Enhanced settings interface with visual direct links and inline configurations.',
    ]},
    { version: '1.8', changes: [
      'Added Google Drive integration to save tabs directly as CSV files.',
      'Implemented manual OAuth2 token authentication, dynamic token validation, and connection testing in settings.',
      'Added CSV export including Tab Open Time and Export Time metadata.',
    ]},
    { version: '1.5', changes: [
      'Enhanced "Extract Same Domain" to search and extract tabs from all windows, not just current window',
    ]},
    { version: '1.4', changes: [
      'Fixed "Extract Same Domain" to use active tab&#39;s domain instead of most frequent domain',
      'Eliminated blank tab creation when extracting tabs to new window',
      'Added missing "windows" permission for reliable window operations',
    ]},
    { version: '1.3', changes: [
      'Enhanced duplicate removal with per-URL breakdown in status feedback',
    ]},
    { version: '1.2', changes: [
      'Added remove duplicates in current/all windows',
    ]},
    { version: '1.1', changes: [
      'Renamed to <strong>Simple Tab Manager</strong> to avoid naming conflicts',
      'Added auto-pause for Bilibili/YouTube when merging or extracting windows',
    ]},
    { version: '1.0', changes: [
      'Initial release with sort, merge, and extract features',
    ]},
  ];

  function renderChangelog() {
    const container = document.getElementById('changelog-content');
    container.innerHTML = changelogData.map(entry => `
      <div class="changelog-item">
        <span class="changelog-version">v${entry.version}</span> —
        <ul style="margin: 4px 0 0 16px; padding: 0;">
          ${entry.changes.map(c => `<li>${c}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  }
  renderChangelog();

  // --- About Modal ---
  document.getElementById('btn-about').addEventListener('click', () => {
    aboutModal.classList.add('show');
  });
  document.getElementById('btn-close-about').addEventListener('click', () => {
    aboutModal.classList.remove('show');
  });

  // --- CSV Export Modal ---
  document.getElementById('btn-export-csv').addEventListener('click', () => {
    displayCSVModal();
  });

  document.getElementById('btn-close-csv').addEventListener('click', () => {
    csvModal.classList.remove('show');
  });

  document.getElementById('btn-copy-csv').addEventListener('click', () => {
    copyToClipboard();
  });

  document.getElementById('btn-download-csv').addEventListener('click', () => {
    const csvContent = document.getElementById('csv-content').value;
    downloadCSV(csvContent);
    showStatus('CSV downloaded!');
  });

  // --- Google Drive Modal ---
  document.getElementById('btn-save-google-drive').addEventListener('click', async () => {
    // Check if user is authenticated
    const { googleAuthToken } = await browser.storage.local.get('googleAuthToken');
    
    if (!googleAuthToken) {
      showStatus('Please go to Settings and connect your Google Drive first.', true);
      return;
    }
    
    document.getElementById('folder-name-input').value = '';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // Format: 2024-06-04T14-30-15
    document.getElementById('file-name-input').value = `tabs-${timestamp}.csv`;
    document.getElementById('gdrive-status').textContent = '';
    googleDriveModal.classList.add('show');
  });

  document.getElementById('btn-close-gdrive').addEventListener('click', () => {
    googleDriveModal.classList.remove('show');
  });

  document.getElementById('btn-upload-gdrive').addEventListener('click', async () => {
    await uploadToGoogleDrive();
  });

  // --- Helper: Extract domain from hostname (handles subdomains) ---
  function extractBaseDomain(hostname) {
    let domain = hostname.toLowerCase().replace(/^www\./, '');

    if (!domain || !domain.includes('.')) return domain;

    const parts = domain.split('.');

    if (parts.length >= 3) {
      const multiPartTLDs = [
        'co.uk', 'org.uk', 'net.uk', 'me.uk',
        'com.au', 'net.au', 'org.au',
        'com.br', 'net.br',
        'com.cn', 'net.cn', 'org.cn',
        'com.jp', 'co.jp', 'ne.jp', 'or.jp',
        'com.mx', 'com.sg', 'com.tw',
        'co.kr', 'or.kr',
        'co.nz', 'net.nz', 'org.nz',
        'co.in', 'net.in', 'org.in',
        'com.hk', 'org.hk',
        'co.za'
      ];

      // Brand/corporate gTLDs where x.brand is an organizational suffix
      const brandTLDs = [
        'sap', 'google', 'amazon', 'microsoft', 'apple', 'aws',
        'ibm', 'oracle', 'cisco', 'samsung', 'sony', 'toyota',
        'bmw', 'audi', 'honda', 'intel', 'dell', 'hp',
        'siemens', 'bosch', 'philips', 'nokia', 'ericsson',
        'alibaba', 'baidu', 'tencent', 'huawei', 'xiaomi'
      ];

      const sharedHostingSuffixes = [
        'github.io', 'gitlab.io', 'netlify.app', 'vercel.app',
        'herokuapp.com', 'firebaseapp.com', 'web.app',
        'blogspot.com', 'blogspot.co.uk', 'blogspot.com.au',
        'wordpress.com', 'tumblr.com', 'medium.com',
        'azurewebsites.net', 'cloudfront.net', 'amazonaws.com',
        'pages.dev', 'workers.dev', 'r2.dev',
        'fly.dev', 'deno.dev',
        'surge.sh', 'now.sh',
        'appspot.com', 'cloudfunctions.net',
        'azureedge.net', 'trafficmanager.net',
        's3.amazonaws.com'
      ];

      const tld = parts[parts.length - 1];
      const lastTwo = parts.slice(-2).join('.');
      const lastThree = parts.slice(-3).join('.');

      // Brand gTLDs: treat x.brand as a suffix (like co.uk)
      if (brandTLDs.includes(tld)) {
        return parts.slice(-3).join('.');
      }

      // Multi-part ccTLDs
      if (multiPartTLDs.includes(lastTwo)) {
        return parts.slice(-3).join('.');
      }

      // Shared-hosting suffixes
      if (sharedHostingSuffixes.includes(lastTwo) || sharedHostingSuffixes.includes(lastThree)) {
        if (sharedHostingSuffixes.includes(lastTwo)) {
          return parts.slice(-3).join('.');
        }
        return parts.slice(-4).join('.');
      }

      return parts.slice(-2).join('.');
    }

    return domain;
  }

  // --- 3. Extract Same Host ---
  document.getElementById('btn-extract').addEventListener('click', async () => {
    try {
      const currentWindowTabs = await browser.tabs.query({ currentWindow: true });
      const activeTab = currentWindowTabs.find(tab => tab.active);

      if (!activeTab || !activeTab.url) {
        showStatus('No active tab found.', true);
        return;
      }

      showStatus('Extracting...');

      // Delegate to background script (survives popup close)
      const result = await browser.runtime.sendMessage({
        action: 'extractDomain',
        activeTabId: activeTab.id,
        activeTabUrl: activeTab.url
      });

      if (result && result.success) {
        showStatus(result.message);
      } else if (result && result.error) {
        showStatus(result.error, true);
      } else if (result && result.message) {
        showStatus(result.message, true);
      }
    } catch (err) {
      // Popup may close before response arrives — that's fine,
      // background continues the work regardless
      console.log('Extract message sent (popup may close):', err.message);
    }
  });
});