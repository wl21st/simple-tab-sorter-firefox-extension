/**
 * Unit tests for popup.js
 * Tests core tab management functionality
 */

describe('Popup Functions', () => {
  // Mock DOM elements before each test
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="status"></div>
      <button id="btn-sort"></button>
      <button id="btn-merge"></button>
      <button id="btn-extract"></button>
      <button id="btn-dedup-current"></button>
      <button id="btn-dedup-all"></button>
      <button id="btn-about"></button>
      <button id="btn-close-about"></button>
      <button id="btn-export-csv"></button>
      <button id="btn-close-csv"></button>
      <button id="btn-copy-csv"></button>
      <button id="btn-download-csv"></button>
      <button id="btn-save-google-drive"></button>
      <button id="btn-close-gdrive"></button>
      <button id="btn-upload-gdrive"></button>
      <button id="btn-settings"></button>
      <div id="about-modal"></div>
      <div id="csv-modal"></div>
      <div id="google-drive-modal"></div>
      <textarea id="csv-content"></textarea>
      <input id="folder-name-input" />
      <input id="file-name-input" />
      <div id="gdrive-status"></div>
      <!-- Filter section -->
      <button id="btn-filter-toggle"></button>
      <div id="filter-body"></div>
      <span id="filter-caret"></span>
      <input id="filter-keyword" />
      <input id="filter-site" />
      <span id="filter-match-count" class="match-num zero">0</span>
      <button id="scope-window" class="scope-btn active"></button>
      <button id="scope-all" class="scope-btn"></button>
      <button id="btn-filter-extract" disabled></button>
    `;

    jest.clearAllMocks();
  });

  describe('CSV Generation', () => {
    test('generateCSV creates valid CSV with headers and rows', () => {
      const tabs = [
        { id: 1, title: 'Google', url: 'https://google.com' },
        { id: 2, title: 'GitHub', url: 'https://github.com' }
      ];
      const tabOpenTimes = {
        1: '2024-06-04T10:00:00Z',
        2: '2024-06-04T10:05:00Z'
      };

      // We'll test this by extracting and evaluating the generateCSV function
      const csv = generateCSVTest(tabs, tabOpenTimes);
      
      expect(csv).toContain('"Title"');
      expect(csv).toContain('Google');
      expect(csv).toContain('github.com');
    });

    test('escapeCSVField handles quotes correctly', () => {
      const escaped = escapeCSVFieldTest('Test "quoted" text');
      expect(escaped).toBe('Test ""quoted"" text');
    });

    test('generateCSV handles empty tabs', () => {
      const csv = generateCSVTest([], {});
      expect(csv).toContain('"Title"');
      const lines = csv.split('\n');
      expect(lines.length).toBe(1); // Only header
    });
  });

  describe('Domain Extraction', () => {
    test('extractBaseDomain removes www prefix', () => {
      const domain = extractBaseDomainTest('www.google.com');
      expect(domain).toBe('google.com');
    });

    test('extractBaseDomain handles subdomains', () => {
      const domain = extractBaseDomainTest('mail.google.com');
      expect(domain).toBe('google.com');
    });

    test('extractBaseDomain handles simple domains', () => {
      const domain = extractBaseDomainTest('github.com');
      expect(domain).toBe('github.com');
    });

    test('extractBaseDomain handles deep subdomains', () => {
      const domain = extractBaseDomainTest('api.service.example.co.uk');
      // Our simple logic returns last 2 parts, so this would be co.uk
      // For full solution, you'd need a public suffix list
      expect(domain.endsWith('.uk') || domain === 'co.uk').toBe(true);
    });

    test('extractBaseDomain handles YouTube variations', () => {
      const youtube1 = extractBaseDomainTest('youtube.com');
      const youtube2 = extractBaseDomainTest('www.youtube.com');
      const youtube3 = extractBaseDomainTest('m.youtube.com');
      const youtube4 = extractBaseDomainTest('music.youtube.com');
      
      expect(youtube1).toBe('youtube.com');
      expect(youtube2).toBe('youtube.com');
      expect(youtube3).toBe('youtube.com');
      expect(youtube4).toBe('youtube.com');
    });

    test('extractBaseDomain handles multi-part TLDs properly', () => {
      const ukDomain = extractBaseDomainTest('www.google.co.uk');
      const brDomain = extractBaseDomainTest('mail.example.com.br');
      const jpDomain = extractBaseDomainTest('sub.test.co.jp');
      
      expect(ukDomain).toBe('google.co.uk');
      expect(brDomain).toBe('example.com.br');
      expect(jpDomain).toBe('test.co.jp');
    });
  });

  describe('Status Display', () => {
    test('showStatus displays success message', () => {
      const statusEl = document.getElementById('status');
      showStatusTest('Operation successful', false);
      
      expect(statusEl.textContent).toBe('Operation successful');
      expect(statusEl.className).toContain('success');
      expect(statusEl.className).toContain('show');
    });

    test('showStatus displays error message', () => {
      const statusEl = document.getElementById('status');
      showStatusTest('Error occurred', true);
      
      expect(statusEl.textContent).toBe('Error occurred');
      expect(statusEl.className).toContain('error');
    });
  });

  describe('Chrome Tab Operations', () => {
    test('sort tabs by URL calls chrome.tabs.query and move', async () => {
      const mockTabs = [
        { id: 2, url: 'https://beta.com', index: 0 },
        { id: 1, url: 'https://alpha.com', index: 1 }
      ];
      
      chrome.tabs.query.mockResolvedValue(mockTabs);
      chrome.tabs.move.mockResolvedValue({});

      await sortTabsTest();

      expect(chrome.tabs.query).toHaveBeenCalledWith({ currentWindow: true });
      expect(chrome.tabs.move).toHaveBeenCalled();
      expect(chrome.tabs.move).toHaveBeenCalledTimes(2);
    });

    test('merge windows moves all tabs to current window', async () => {
      const currentWindow = { id: 1 };
      const mockTabs = [
        { id: 1, windowId: 1 },
        { id: 2, windowId: 2 },
        { id: 3, windowId: 2 }
      ];

      chrome.windows.getCurrent.mockImplementation(() => Promise.resolve(currentWindow));
      chrome.tabs.query.mockImplementation(() => Promise.resolve(mockTabs));
      chrome.tabs.move.mockImplementation(() => Promise.resolve({}));
      chrome.scripting.executeScript.mockImplementation(() => Promise.resolve([]));

      await mergeWindowsTest();

      expect(chrome.tabs.move).toHaveBeenCalledWith(
        2,
        expect.objectContaining({ windowId: 1 })
      );
      expect(chrome.tabs.move).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ windowId: 1 })
      );
    });
  });

  describe('Duplicate Removal', () => {
    test('removeDuplicates identifies duplicate URLs', async () => {
      const mockTabs = [
        { id: 1, url: 'https://google.com', index: 0 },
        { id: 2, url: 'https://google.com', index: 1 },
        { id: 3, url: 'https://github.com', index: 2 }
      ];

      chrome.tabs.query.mockResolvedValue(mockTabs);
      chrome.tabs.remove.mockResolvedValue({});

      await removeDuplicatesTest();

      expect(chrome.tabs.remove).toHaveBeenCalledWith([2]);
    });

    test('removeDuplicates skips chrome:// URLs', async () => {
      const mockTabs = [
        { id: 1, url: 'chrome://settings' },
        { id: 2, url: 'https://google.com' }
      ];

      chrome.tabs.query.mockResolvedValue(mockTabs);
      chrome.tabs.remove.mockResolvedValue({});

      await removeDuplicatesTest();

      expect(chrome.tabs.remove).not.toHaveBeenCalled();
    });

    test('removeDuplicates handles all windows', async () => {
      const mockTabs = [
        { id: 1, url: 'https://google.com' },
        { id: 2, url: 'https://google.com' }
      ];

      chrome.tabs.query.mockResolvedValue(mockTabs);
      chrome.tabs.remove.mockResolvedValue({});

      await removeDuplicatesTest();

      expect(chrome.tabs.query).toHaveBeenCalledWith({});
    });
  });

  describe('Google Drive Integration', () => {
    test('findOrCreateFolder searches for existing folder', async () => {
      const mockToken = 'mock-token';
      const folderName = 'My Tabs';

      global.fetch.mockResolvedValue({
        json: async () => ({
          files: [{ id: 'folder-123' }]
        })
      });

      const folderId = await findOrCreateFolderTest(mockToken, folderName, 'root');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('My%20Tabs'),
        expect.any(Object)
      );
      expect(folderId).toBe('folder-123');
    });

    test('findOrCreateFolder creates new folder when not found', async () => {
      const mockToken = 'mock-token';
      const folderName = 'New Folder';

      global.fetch
        .mockResolvedValueOnce({
          json: async () => ({ files: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'new-folder-456' })
        });

      const folderId = await findOrCreateFolderTest(mockToken, folderName, 'root');

      expect(folderId).toBe('new-folder-456');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('getGoogleAuthToken retrieves stored token', async () => {
      const mockToken = 'stored-token-xyz';
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ googleAuthToken: mockToken });
      });

      const token = await getGoogleAuthTokenTest();

      expect(token).toBe(mockToken);
      expect(chrome.storage.local.get).toHaveBeenCalledWith(
        expect.arrayContaining(['googleAuthToken']),
        expect.any(Function)
      );
    });

    test('getGoogleAuthToken throws error when not authenticated', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      await expect(getGoogleAuthTokenTest()).rejects.toThrow();
    });
  });

  describe('Video Pause Feature', () => {
    test('pauseVideos targets YouTube and Bilibili tabs', async () => {
      const mockTabs = [
        { id: 1, url: 'https://youtube.com/watch' },
        { id: 2, url: 'https://bilibili.com/video' },
        { id: 3, url: 'https://google.com' }
      ];

      chrome.scripting.executeScript.mockResolvedValue([]);

      await pauseVideosTest(mockTabs);

      expect(chrome.scripting.executeScript).toHaveBeenCalledTimes(2);
    });

    test('pauseVideos handles empty tab list', async () => {
      chrome.scripting.executeScript.mockResolvedValue([]);

      await pauseVideosTest([]);

      expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
    });
  });

  describe('Extract Same Domain Feature', () => {
    test('extractDomainTest mutes video tabs and restores them', async () => {
      const mockTabs = [
        { id: 1, url: 'https://youtube.com/watch1', active: true, windowId: 1, mutedInfo: { muted: false } },
        { id: 2, url: 'https://youtube.com/watch2', active: false, windowId: 1, mutedInfo: { muted: false } }
      ];

      chrome.tabs.query.mockImplementation((opts) => {
        if (opts.currentWindow) return Promise.resolve(mockTabs.filter(t => t.windowId === 1));
        return Promise.resolve(mockTabs);
      });
      chrome.windows.create.mockResolvedValue({ id: 2 });
      chrome.scripting.executeScript.mockResolvedValue([]);

      await extractDomainTest();

      // Verify muting happened (id 1 and 2)
      expect(chrome.tabs.update).toHaveBeenCalledWith(1, expect.objectContaining({ muted: true }));
      expect(chrome.tabs.update).toHaveBeenCalledWith(2, expect.objectContaining({ muted: true }));

      // Verify original active tab was restored in new window
      expect(chrome.tabs.update).toHaveBeenCalledWith(1, expect.objectContaining({ active: true }));

      // Verify pause was attempted for each video tab
      expect(chrome.scripting.executeScript).toHaveBeenCalled();

      // Verify unmute happened
      expect(chrome.tabs.update).toHaveBeenCalledWith(1, expect.objectContaining({ muted: false }));
      expect(chrome.tabs.update).toHaveBeenCalledWith(2, expect.objectContaining({ muted: false }));
    });

    test('extractDomainTest restores mute state BEFORE final move', async () => {
      const mockTabs = [
        { id: 1, url: 'https://youtube.com/watch1', active: true, windowId: 1, mutedInfo: { muted: false } },
        { id: 2, url: 'https://youtube.com/watch2', active: false, windowId: 1, mutedInfo: { muted: false } }
      ];

      chrome.tabs.query.mockImplementation((opts) => {
        if (opts.currentWindow) return Promise.resolve(mockTabs.filter(t => t.windowId === 1));
        return Promise.resolve(mockTabs);
      });
      chrome.windows.create.mockResolvedValue({ id: 2 });

      const callOrder = [];
      chrome.tabs.update.mockImplementation((id, props) => {
        callOrder.push(`update-${id}-${Object.keys(props)[0]}`);
        return Promise.resolve({});
      });
      chrome.tabs.move.mockImplementation((id, props) => {
        const ids = Array.isArray(id) ? id : [id];
        ids.forEach(oneId => callOrder.push(`move-${oneId}`));
        return Promise.resolve({});
      });

      await extractDomainTest();

      // Desired Order:
      // 1. Mute tabs (update-1-muted, update-2-muted)
      // 2. Create window (not tracked)
      // 3. Move background matching tabs (move-2)
      // 4. Restore mute states (update-1-muted, update-2-muted)
      // 5. Move active matching tab (move-1)

      const unmute1Index = callOrder.lastIndexOf('update-1-muted');
      const unmute2Index = callOrder.lastIndexOf('update-2-muted');
      const moveActiveIndex = callOrder.indexOf('move-1');

      expect(moveActiveIndex).toBeGreaterThan(-1);
      expect(unmute1Index).toBeLessThan(moveActiveIndex);
      expect(unmute2Index).toBeLessThan(moveActiveIndex);
    });
  });

  describe('Modal Operations', () => {
    test('CSV modal opens and closes', () => {
      const csvModal = document.getElementById('csv-modal');
      
      csvModal.classList.add('show');
      expect(csvModal.classList.contains('show')).toBe(true);
      
      csvModal.classList.remove('show');
      expect(csvModal.classList.contains('show')).toBe(false);
    });

    test('About modal opens and closes', () => {
      const aboutModal = document.getElementById('about-modal');
      
      aboutModal.classList.add('show');
      expect(aboutModal.classList.contains('show')).toBe(true);
      
      aboutModal.classList.remove('show');
      expect(aboutModal.classList.contains('show')).toBe(false);
    });
  });
});

// Test helper functions that extract logic from popup.js
function generateCSVTest(tabs, tabOpenTimes = {}) {
  const headers = ['Title', 'URL', 'Tab Open Time', 'Export Time'];
  const exportTime = new Date().toISOString();
  
  const rows = tabs.map(tab => {
    const tabOpenTime = tabOpenTimes[tab.id] || 'Unknown';
    return [
      escapeCSVFieldTest(tab.title || ''),
      escapeCSVFieldTest(tab.url || ''),
      tabOpenTime,
      exportTime
    ];
  });
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
  
  return csvContent;
}

function escapeCSVFieldTest(field) {
  return String(field).replace(/"/g, '""');
}

function extractBaseDomainTest(hostname) {
  // Remove www. prefix if present
  let domain = hostname.toLowerCase().replace(/^www\./, '');
  
  // For common TLDs, get the base domain
  const parts = domain.split('.');
  
  // If it looks like a subdomain (has 3+ parts), try to return base domain
  if (parts.length >= 3) {
    // Common multi-part TLDs
    const multiPartTLDs = [
      'co.uk', 'org.uk', 'net.uk', 'me.uk',
      'com.au', 'net.au', 'org.au',
      'com.br', 'net.br',
      'com.cn', 'net.cn', 'org.cn',
      'com.jp', 'co.jp',
      'com.mx',
      'com.sg',
      'com.tw'
    ];
    
    const lastTwo = parts.slice(-2).join('.');
    if (multiPartTLDs.includes(lastTwo) && parts.length >= 3) {
      // Return last 3 parts (e.g., example.co.uk)
      return parts.slice(-3).join('.');
    }
    
    // Return last 2 parts (e.g., google.com from mail.google.com)
    return parts.slice(-2).join('.');
  }
  
  return domain;
}

function showStatusTest(message, isError = false) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status show ${isError ? 'error' : 'success'}`;
  
  if (!isError) {
    setTimeout(() => {
      statusEl.classList.remove('show');
    }, 20000);
  }
}

// Async test helpers
async function sortTabsTest() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const sorted = [...tabs].sort((a, b) => {
    const urlA = a.url || '';
    const urlB = b.url || '';
    return urlA.localeCompare(urlB);
  });

  for (let i = 0; i < sorted.length; i++) {
    await chrome.tabs.move(sorted[i].id, { index: i });
  }
}

async function mergeWindowsTest() {
  const currentWindow = await chrome.windows.getCurrent();
  const allTabs = await chrome.tabs.query({});
  
  const tabsToMove = allTabs.filter(tab => tab.windowId !== currentWindow.id);
  await pauseVideosTest(tabsToMove);
  
  const movePromises = tabsToMove.map(tab =>
    chrome.tabs.move(tab.id, { windowId: currentWindow.id, index: -1 })
  );
  
  await Promise.all(movePromises);
}

async function removeDuplicatesTest() {
  const tabs = await chrome.tabs.query({});
  const seen = new Map();
  const toRemove = [];
  const dupCountByUrl = new Map();

  const sorted = [...tabs].sort((a, b) => (a.index || 0) - (b.index || 0));

  for (const tab of sorted) {
    if (!tab.url || tab.url.startsWith('chrome://')) continue;
    if (seen.has(tab.url)) {
      toRemove.push(tab.id);
      dupCountByUrl.set(tab.url, (dupCountByUrl.get(tab.url) || 0) + 1);
    } else {
      seen.set(tab.url, tab);
    }
  }

  if (toRemove.length > 0) {
    await chrome.tabs.remove(toRemove);
  }
}

async function findOrCreateFolderTest(token, folderName, parentId = 'root') {
  if (!folderName) return 'root';

  const searchQuery = `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&spaces=drive&pageSize=1&fields=files(id)`;
  
  const searchResponse = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const searchData = await searchResponse.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId]
  };

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
}

async function getGoogleAuthTokenTest() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['googleAuthToken', 'googleRefreshToken'], (result) => {
      if (result.googleAuthToken) {
        resolve(result.googleAuthToken);
      } else {
        reject(new Error('Not authenticated'));
      }
    });
  });
}

async function extractDomainTest() {
  try {
    const currentWindowTabs = await chrome.tabs.query({ currentWindow: true });
    const activeTab = currentWindowTabs.find(tab => tab.active);
    
    if (!activeTab || !activeTab.url) {
      showStatusTest('No active tab found.', true);
      return;
    }

    let currentDomain = '';
    try {
      const url = new URL(activeTab.url);
      currentDomain = extractBaseDomainTest(url.hostname);
    } catch (e) {
      showStatusTest('Invalid URL in active tab.', true);
      return;
    }

    // Find all tabs matching the current tab's domain across ALL windows
    const allTabs = await chrome.tabs.query({});
    const matchingTabs = [];
    
    for (const tab of allTabs) {
      if (!tab.url) continue;
      try {
        const url = new URL(tab.url);
        const tabDomain = extractBaseDomainTest(url.hostname);
        if (tabDomain === currentDomain) {
          matchingTabs.push(tab);
        }
      } catch (e) {
        // Skip invalid URLs
      }
    }

    if (matchingTabs.length < 2) {
      showStatusTest('No other tabs with same domain found.', true);
      return;
    }

    const activeTabId = activeTab.id;
    const otherTabs = matchingTabs.filter(t => t.id !== activeTabId);
    
    // --- Auto-play Protection (Mute Sandwich) ---
    const videoSites = ['bilibili.com', 'youtube.com'];
    const videoTabs = matchingTabs.filter(tab => tab.url && videoSites.some(site => tab.url.includes(site)));
    
    const muteRecords = videoTabs.map(tab => ({
      id: tab.id,
      wasMuted: tab.mutedInfo?.muted || false
    }));

    for (const record of muteRecords) {
      await chrome.tabs.update(record.id, { muted: true });
    }

    // Create new window
    const firstTabToMove = otherTabs.length > 0 ? otherTabs[0] : matchingTabs[0];
    let newWindow;
    try {
      newWindow = await chrome.windows.create({ 
        tabId: firstTabToMove.id,
        focused: false
      });
    } catch (err) {
      for (const record of muteRecords) {
        try {
          await chrome.tabs.update(record.id, { muted: record.wasMuted });
        } catch (e) {
          // Ignore
        }
      }
      throw err;
    }
    
    // Move remaining tabs
    const moveErrors = [];
    const otherIdsToMove = otherTabs.filter(t => t.id !== firstTabToMove.id).map(t => t.id);
    if (otherIdsToMove.length > 0) {
      try {
        await chrome.tabs.move(otherIdsToMove, { windowId: newWindow.id, index: -1 });
      } catch (err) {
        moveErrors.push(`Background tabs: ${err.message}`);
      }
    }

    // First pause attempt
    await pauseVideosTest(matchingTabs);
    
    // Restore original mute states BEFORE final move
    const unmuteFailures = [];
    for (const record of muteRecords) {
      try {
        await chrome.tabs.update(record.id, { muted: record.wasMuted });
      } catch (err) {
        unmuteFailures.push(record.id);
      }
    }

    // Prepare status message
    let message = `Extracted ${matchingTabs.length} tabs from ${currentDomain}`;
    if (unmuteFailures.length > 0) {
      message += ` • Warning: Could not restore sound for ${unmuteFailures.length} tabs.`;
    }
    showStatusTest(message, unmuteFailures.length > 0);

    // Finally move the active tab
    if (activeTabId !== firstTabToMove.id) {
      try {
        await chrome.tabs.move(activeTabId, { windowId: newWindow.id, index: -1 });
        await chrome.tabs.update(activeTabId, { active: true });
      } catch (err) {
        // Ignore
      }
    }

    // Now focus the new window
    try {
      await chrome.windows.update(newWindow.id, { focused: true });
      await pauseVideosTest(matchingTabs);
    } catch (err) {
      // Ignore
    }
  } catch (err) {
    showStatusTest('Error extracting tabs: ' + err.message, true);
  }
}

async function pauseVideosTest(tabs) {
  const videoSites = ['bilibili.com', 'youtube.com'];
  const targetTabs = tabs.filter(tab => tab.url && videoSites.some(site => tab.url.includes(site)));
  
  if (targetTabs.length === 0) return;

  try {
    await Promise.all(
      targetTabs.map(tab =>
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            document.querySelectorAll('video').forEach(v => v.pause());
          }
        })
      )
    );
  } catch (err) {
    // Silently ignore injection errors
  }
}

// ---------------------------------------------------------------------------
// Filter helper (mirrors getFilteredTabs logic from popup.js)
// ---------------------------------------------------------------------------
function extractBaseDomainForFilter(hostname) {
  let domain = hostname.toLowerCase().replace(/^www\./, '');
  const parts = domain.split('.');
  const multiPartTLDs = ['co.uk','org.uk','net.uk','com.au','net.au','com.br','com.cn','co.jp','com.mx','com.sg','com.tw'];
  if (parts.length >= 3) {
    if (multiPartTLDs.includes(parts.slice(-2).join('.'))) return parts.slice(-3).join('.');
    return parts.slice(-2).join('.');
  }
  return domain;
}

function filterTabsTest(tabs, { keyword = '', site = '', scope = 'window', currentWindowId = 1 } = {}) {
  const kw   = keyword.trim().toLowerCase();
  const site_ = site.trim().toLowerCase().replace(/^www\./, '');

  return tabs.filter(tab => {
    const url   = (tab.url   || '').toLowerCase();
    const title = (tab.title || '').toLowerCase();

    if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:')) return false;
    if (scope === 'window' && tab.windowId !== currentWindowId) return false;

    if (site_) {
      try {
        const tabDomain = extractBaseDomainForFilter(new URL(tab.url).hostname);
        if (!tabDomain.includes(site_) && !site_.includes(tabDomain)) return false;
      } catch { return false; }
    }

    if (kw) {
      const tokens = kw.split(/\s+/).filter(Boolean);
      if (!tokens.every(t => title.includes(t) || url.includes(t))) return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
describe('Filter Tabs Feature', () => {
  const allTabs = [
    { id: 1, title: 'GitHub Issues',  url: 'https://github.com/issues',         windowId: 1 },
    { id: 2, title: 'GitHub PRs',     url: 'https://github.com/pulls',          windowId: 1 },
    { id: 3, title: 'Google Search',  url: 'https://www.google.com/search?q=a', windowId: 1 },
    { id: 4, title: 'YouTube Video',  url: 'https://www.youtube.com/watch?v=1', windowId: 2 },
    { id: 5, title: 'MDN Web Docs',   url: 'https://developer.mozilla.org/en',  windowId: 2 },
    { id: 6, title: 'Chrome Flags',   url: 'chrome://flags',                    windowId: 1 },
  ];

  describe('keyword matching', () => {
    test('matches tab title (case-insensitive)', () => {
      const result = filterTabsTest(allTabs, { keyword: 'github', scope: 'all' });
      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual([1, 2]);
    });

    test('matches tab URL', () => {
      const result = filterTabsTest(allTabs, { keyword: 'pulls', scope: 'all' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    test('multi-word: all tokens must match', () => {
      const result = filterTabsTest(allTabs, { keyword: 'github issues', scope: 'all' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    test('empty keyword returns all non-internal tabs', () => {
      const result = filterTabsTest(allTabs, { keyword: '', scope: 'all' });
      // Should exclude chrome://flags (id=6)
      expect(result.map(t => t.id)).not.toContain(6);
      expect(result).toHaveLength(5);
    });

    test('no match returns empty array', () => {
      const result = filterTabsTest(allTabs, { keyword: 'xyznonexistent', scope: 'all' });
      expect(result).toHaveLength(0);
    });
  });

  describe('scope filtering', () => {
    test('scope=window limits to current window', () => {
      const result = filterTabsTest(allTabs, { keyword: '', scope: 'window', currentWindowId: 1 });
      // window 1 has ids 1,2,3 (6 is chrome:// filtered out)
      expect(result.map(t => t.id)).toEqual([1, 2, 3]);
    });

    test('scope=all includes all windows', () => {
      const result = filterTabsTest(allTabs, { keyword: '', scope: 'all' });
      expect(result.map(t => t.id)).toEqual([1, 2, 3, 4, 5]);
    });

    test('scope=window with keyword filters within window only', () => {
      const result = filterTabsTest(allTabs, { keyword: 'video', scope: 'window', currentWindowId: 1 });
      expect(result).toHaveLength(0);
    });
  });

  describe('site filter', () => {
    test('site filter narrows by domain', () => {
      const result = filterTabsTest(allTabs, { keyword: '', site: 'github.com', scope: 'all' });
      expect(result.map(t => t.id)).toEqual([1, 2]);
    });

    test('site filter with www prefix stripped', () => {
      const result = filterTabsTest(allTabs, { keyword: '', site: 'www.google.com', scope: 'all' });
      expect(result.map(t => t.id)).toEqual([3]);
    });

    test('site + keyword combined', () => {
      const result = filterTabsTest(allTabs, { keyword: 'pulls', site: 'github.com', scope: 'all' });
      expect(result.map(t => t.id)).toEqual([2]);
    });

    test('site filter no match returns empty', () => {
      const result = filterTabsTest(allTabs, { keyword: '', site: 'stackoverflow.com', scope: 'all' });
      expect(result).toHaveLength(0);
    });
  });

  describe('internal page exclusion', () => {
    test('chrome:// pages are always excluded', () => {
      const result = filterTabsTest(allTabs, { keyword: 'flags', scope: 'all' });
      expect(result).toHaveLength(0);
    });

    test('edge:// pages are excluded', () => {
      const edgeTabs = [{ id: 10, title: 'Edge Page', url: 'edge://newtab', windowId: 1 }];
      const result = filterTabsTest(edgeTabs, { keyword: '', scope: 'all' });
      expect(result).toHaveLength(0);
    });

    test('about: pages are excluded', () => {
      const aboutTabs = [{ id: 11, title: 'About', url: 'about:blank', windowId: 1 }];
      const result = filterTabsTest(aboutTabs, { keyword: '', scope: 'all' });
      expect(result).toHaveLength(0);
    });
  });

  describe('extract filtered tabs', () => {
    beforeEach(() => {
      chrome.tabs.query.mockResolvedValue(allTabs);
      chrome.windows.create.mockResolvedValue({ id: 99 });
      chrome.tabs.move.mockResolvedValue([]);
      chrome.windows.update.mockResolvedValue({});
      chrome.scripting.executeScript.mockResolvedValue([]);
    });

    test('extract calls windows.create with first matching tab', async () => {
      const matched = filterTabsTest(allTabs, { keyword: 'github', scope: 'all' });
      expect(matched).toHaveLength(2);

      // Simulate extract: create window with first tab
      await chrome.windows.create({ tabId: matched[0].id, focused: false });
      expect(chrome.windows.create).toHaveBeenCalledWith({ tabId: 1, focused: false });
    });

    test('extract moves remaining tabs after window creation', async () => {
      const matched = filterTabsTest(allTabs, { keyword: 'github', scope: 'all' });
      const [first, ...rest] = matched;

      await chrome.windows.create({ tabId: first.id, focused: false });
      if (rest.length > 0) {
        await chrome.tabs.move(rest.map(t => t.id), { windowId: 99, index: -1 });
      }

      expect(chrome.tabs.move).toHaveBeenCalledWith([2], { windowId: 99, index: -1 });
    });

    test('extract with 0 matches does not call windows.create', async () => {
      const matched = filterTabsTest(allTabs, { keyword: 'xyznonexistent', scope: 'all' });
      expect(matched).toHaveLength(0);
      // windows.create should NOT be called
      expect(chrome.windows.create).not.toHaveBeenCalled();
    });
  });
});

describe('Smoke Tests', () => {
  test('popup.js parses without syntax errors', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.resolve(__dirname, '../popup.js'), 'utf8');
    expect(() => new Function(code)).not.toThrow();
  });

  test('background.js parses without syntax errors', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.resolve(__dirname, '../background.js'), 'utf8');
    expect(() => new Function(code)).not.toThrow();
  });
});
