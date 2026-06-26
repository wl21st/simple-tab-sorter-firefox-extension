// Options page for Google Drive authentication

document.addEventListener('DOMContentLoaded', async () => {
  const authStatusEl = document.getElementById('auth-status');
  const userInfoEl = document.getElementById('user-info');
  const statusEl = document.getElementById('status');
  const disconnectBtn = document.getElementById('btn-disconnect');
  const extensionIdEl = document.getElementById('extension-id');
  const clearErrorBtn = document.getElementById('btn-clear-error');
  const retestBtn = document.getElementById('btn-retest-token');
  
  const manualTokenSection = document.getElementById('manual-token-section');
  const tokenInput = document.getElementById('token-input');
  const refreshTokenInput = document.getElementById('refresh-token-input');
  const skipValidationCheckbox = document.getElementById('skip-validation');
  const saveTokenBtn = document.getElementById('btn-save-token');

  // Show extension ID
  extensionIdEl.textContent = browser.runtime.id;

  function showStatus(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    statusEl.textContent = message;
    statusEl.className = `status show ${type}`;
    
    // For errors, show dismiss button and don't auto-hide
    if (type === 'error') {
      if (clearErrorBtn) {
        clearErrorBtn.style.display = 'block';
      }
      // Don't auto-dismiss errors - they stay until user clicks dismiss
    } else {
      // For success/info, auto-hide after 5 seconds
      if (clearErrorBtn) {
        clearErrorBtn.style.display = 'none';
      }
      setTimeout(() => {
        statusEl.classList.remove('show');
      }, 20000);
    }
  }

  // Clear error button
  if (clearErrorBtn) {
    clearErrorBtn.addEventListener('click', () => {
      statusEl.classList.remove('show');
      clearErrorBtn.style.display = 'none';
    });
  }

  // Validate token by listing files from Google Drive (lightweight operation)
  async function validateTokenByListingFiles(token) {
    console.log('=== VALIDATING TOKEN BY LISTING FILES ===');
    try {
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files?pageSize=1&spaces=drive',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('List files response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('List files failed:', errorData);
        
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
      console.log('✅ Token valid! Can access Google Drive');
      return { success: true, filesAccessible: true };
    } catch (err) {
      console.error('Exception during token validation:', err);
      return { success: false, error: err.message };
    }
  }

  // Check authentication status on load
  async function checkAuthStatus() {
    const { googleAuthToken, googleUserInfo, lastTestResult, lastTestTime } = await browser.storage.local.get([
      'googleAuthToken',
      'googleUserInfo',
      'lastTestResult',
      'lastTestTime'
    ]);

    if (googleAuthToken) {
      authStatusEl.className = 'auth-status connected';
      
      // Build status message with last test result
      let statusText = '✅ Connected to Google Drive';
      if (lastTestResult) {
        if (lastTestResult.success) {
          statusText += ' • Last test: ✅ Valid';
        } else {
          statusText += ` • Last test: ❌ ${lastTestResult.error}`;
        }
        if (lastTestTime) {
          const date = new Date(lastTestTime);
          statusText += ` (${date.toLocaleTimeString()})`;
        }
      }
      
      authStatusEl.textContent = statusText;
      if (googleUserInfo) {
        userInfoEl.style.display = 'block';
        userInfoEl.innerHTML = `Signed in as: <strong>${googleUserInfo}</strong>`;
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
  }

  // Manual token save
  saveTokenBtn.addEventListener('click', async () => {
    const token = tokenInput.value.trim();
    const refreshToken = refreshTokenInput.value.trim();
    const skipValidation = skipValidationCheckbox ? skipValidationCheckbox.checked : false;
    
    console.log('=== TOKEN SAVE ===');
    console.log('Token length:', token.length);
    console.log('Refresh token provided?', !!refreshToken);
    console.log('Skip validation?', skipValidation);
    
    if (!token) {
      showStatus('❌ Please paste an access token', 'error');
      return;
    }

    try {
      saveTokenBtn.disabled = true;
      
      // Always save token directly (skip validation during save)
      console.log('Saving token...');
      showStatus('⏳ Saving token...', 'info');
      
      const storageData = {
        googleAuthToken: token,
        googleUserInfo: 'User'
      };
      
      if (refreshToken) {
        storageData.googleRefreshToken = refreshToken;
        console.log('✅ Refresh token stored');
      }
      
      await browser.storage.local.set(storageData);
      console.log('✅ Token saved to storage');
      
      // Now validate by listing files
      if (!skipValidation) {
        showStatus('⏳ Testing token...', 'info');
        const result = await validateTokenByListingFiles(token);
        
        if (result.success) {
          const testData = {
            lastTestResult: { success: true },
            lastTestTime: new Date().toISOString()
          };
          await browser.storage.local.set(testData);
          showStatus('✅ Token saved and tested successfully!', 'success');
        } else {
          const testData = {
            lastTestResult: { success: false, error: result.error },
            lastTestTime: new Date().toISOString()
          };
          await browser.storage.local.set(testData);
          showStatus(`⚠️ Token saved, but test failed: ${result.error}`, 'error');
        }
      } else {
        showStatus('✅ Token saved (validation skipped)', 'success');
      }
      
      tokenInput.value = '';
      refreshTokenInput.value = '';
      await checkAuthStatus();
      saveTokenBtn.disabled = false;
    } catch (err) {
      console.error('Exception during token save:', err);
      console.error('Error stack:', err.stack);
      showStatus(`❌ Error: ${err.message}`, 'error');
      saveTokenBtn.disabled = false;
    }
  });

  // Retest token button
  if (retestBtn) {
    retestBtn.addEventListener('click', async () => {
      try {
        retestBtn.disabled = true;
        showStatus('⏳ Retesting token...', 'info');
        
        const { googleAuthToken } = await browser.storage.local.get(['googleAuthToken']);
        if (!googleAuthToken) {
          showStatus('❌ No token found', 'error');
          retestBtn.disabled = false;
          return;
        }
        
        const result = await validateTokenByListingFiles(googleAuthToken);
        
        if (result.success) {
          const testData = {
            lastTestResult: { success: true },
            lastTestTime: new Date().toISOString()
          };
          await browser.storage.local.set(testData);
          showStatus('✅ Token test passed!', 'success');
        } else {
          const testData = {
            lastTestResult: { success: false, error: result.error },
            lastTestTime: new Date().toISOString()
          };
          await browser.storage.local.set(testData);
          showStatus(`❌ Token test failed: ${result.error}`, 'error');
        }
        
        await checkAuthStatus();
        retestBtn.disabled = false;
      } catch (err) {
        console.error('Retest error:', err);
        showStatus(`❌ Retest error: ${err.message}`, 'error');
        retestBtn.disabled = false;
      }
    });
  }

  // Disconnect
  disconnectBtn.addEventListener('click', async () => {
    try {
      console.log('=== DISCONNECT ===');
      disconnectBtn.disabled = true;
      showStatus('⏳ Disconnecting...', 'info');

      await browser.storage.local.remove(['googleAuthToken', 'googleRefreshToken', 'googleUserInfo', 'lastTestResult', 'lastTestTime']);

      console.log('✅ Disconnected');
      showStatus('✅ Disconnected from Google Drive', 'success');
      await checkAuthStatus();
    } catch (err) {
      console.error('Disconnect error:', err);
      showStatus(`❌ Error: ${err.message}`, 'error');
    } finally {
      disconnectBtn.disabled = false;
    }
  });

  // Set version from manifest
  const manifest = chrome.runtime.getManifest();
  const optionsVersionEl = document.getElementById('options-version');
  if (optionsVersionEl) optionsVersionEl.textContent = `v${manifest.version}`;

  // Initial check
  console.log('Checking initial auth status...');
  await checkAuthStatus();
});
