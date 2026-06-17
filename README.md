# Simple Tab Manager

A lightweight Chrome extension to efficiently manage, organize, and extract your browser tabs.

## Features

- **Sort Tabs** - Alphabetically sort all tabs by URL in the current window
- **Merge All Windows** - Combine all open windows into a single window
- **Extract Same Domain** - Extract all tabs from the same domain as the active tab across all windows into a new window
- **Remove Duplicates** - Remove duplicate tabs by URL (current window or all windows)
- **Auto-Pause Videos** - Automatically pause videos on Bilibili and YouTube when merging or extracting tabs
- **Export Tabs as CSV** - View tabs in CSV format, copy to clipboard, or download as file
- **Save to Google Drive** - Upload tabs CSV directly to Google Drive in a folder of your choice

## Installation

### From Source (Development)

1. Clone this repository:
   ```bash
   git clone https://github.com/wl21st/simple-tab-sorter-chrome-extension.git
   cd simple-tab-sorter-chrome-extension
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in the top right)

4. Click "Load unpacked" and select the project folder

5. The extension icon will appear in your Chrome toolbar

### Google Drive Integration Setup

If you want to use the "Save Tabs to Google Drive" feature:

1. Follow the [OAuth2 Setup Guide](./OAUTH2_SETUP.md) (simplified, 5 minutes)
2. The guide walks you through creating OAuth credentials
3. Once configured, click "Settings" in the extension and authorize
4. Done! Now you can save tabs directly to Google Drive

**What's new:** The setup is now automated! No more manual credential configuration in manifest.json.

### From Source (Firefox Development)

1. Clone this repository as above.
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Navigate to the project folder and select `manifest.json`
5. The extension icon will appear in your Firefox toolbar

**Note on OAuth for Firefox:**
Firefox generates a unique redirect URL for Google OAuth based on the extension ID. Ensure you have added the Firefox redirect URL to your Google Cloud Console credentials. It typically looks like `https://<your-gecko-id>.extensions.allizom.org/`.

### From Chrome Web Store

[Coming soon]

## Usage

Click the extension icon in your Chrome toolbar to open the popup menu with all available features.

### Tab Management Features

#### Sort Tabs
- Click "Sort Tabs (by URL)" to alphabetically sort all tabs in current window by URL

#### Merge All Windows
- Click "Merge All Windows" to combine all open windows into a single window

#### Extract Same Domain
- Click on a tab from the domain you want to extract
- Click "Extract Same Domain"
- All tabs from that domain (across all open windows) will be moved to a new window

#### Remove Duplicates
- Click "Remove Duplicates (Current Window)" to remove duplicates in the active window only
- Click "Remove Duplicates (All Windows)" to remove duplicates across all open windows

### Tab Export Features

#### Mode 1: Export Tabs as CSV (View)
1. Click "Export Tabs as CSV (View)"
2. A modal will display your tabs in CSV format with columns:
   - **Title** - Tab title
   - **URL** - Tab URL
   - **Tab Open Time** - When the tab was opened (ISO 8601 format)
   - **Export Time** - When you exported the CSV (ISO 8601 format)
3. You can:
   - **Copy to Clipboard** - Copy the CSV text to your clipboard
   - **Download CSV** - Download the CSV as a file (named `tabs-YYYY-MM-DD.csv`)

#### Mode 2: Save to Google Drive
1. Click "Save Tabs to Google Drive"
2. (Optional) Enter a folder name - the extension will create the folder if it doesn't exist
3. (Optional) Enter a custom filename (defaults to `tabs-YYYY-MM-DD.csv`)
4. Click "Upload to Google Drive"
5. Sign in with your Google account (first time only)
6. The CSV file will be saved directly to your Google Drive

**Important:** Before using the Google Drive feature, follow the [Google Drive Setup Guide](./SETUP_GOOGLE_DRIVE.md) to configure OAuth credentials.

## Development

### Project Structure

```
simple-tab-sorter-chrome-extension/
├── manifest.json          # Extension configuration
├── popup.html             # Popup UI
├── popup.js               # Feature implementations
├── icon.svg               # Extension icon
└── README.md              # This file
```

### Permissions Used

- `tabs` - Query and manage tabs
- `windows` - Create and manage windows
- `scripting` - Execute scripts to pause videos on specific sites
- `identity` - OAuth authentication with Google
- `storage` - Store tab open times locally

### Host Permissions

- `*://*.bilibili.com/*` - For auto-pause functionality
- `*://*.youtube.com/*` - For auto-pause functionality

## Changelog

### v2.1
- **Fixed Tab Extraction** - Resolved issue where "Extract Same Domain" would miss tabs (especially YouTube) due to popup closure.
- **Improved Domain Matching** - Enhanced logic to correctly handle multi-part TLDs (e.g., .co.uk) and case-insensitivity.

### v2.0
- **Google Drive Token Guide & Refresh Guide** - Added detailed guidelines for Option 1 (OAuth2 Playground) and Option 2 (Google Cloud Project) setup.
- **Improved UX** - Color-coded instruction boxes and validation tips in Settings page.

### v1.9
- **Enhanced Token Acquisition Instructions** - Temporary vs recommended setup guides.
- **Visual Improvements** - Color-coded instruction sections with links.

### v1.8
- **Automated OAuth2 Setup** - No more manual credential exchange!
- Added Settings page to connect/disconnect Google Drive
- Implemented `chrome.identity.launchWebAuthFlow()` for secure OAuth authentication
- Tokens now stored securely in chrome.storage
- Users just click "Connect Google Drive" in Settings
- Removed old manual OAuth setup from manifest.json
- Added Settings button (gear icon) to popup for easy access
- Simplified OAuth2 setup guide (5 minutes instead of 20)

### v1.7
- Fixed "Extract Same Domain" subdomain matching (now matches www.example.com with mail.example.com)
- Improved domain extraction to intelligently handle subdomains
- Added better error handling for tab moving operations
- Enhanced status messages to show partial success counts
- Added console logging for debugging domain extraction issues
- Added troubleshooting section to README

### v1.6
- Added "Export Tabs as CSV (View)" - view and edit tabs as CSV in a modal
- Added "Tab Open Time" column - tracks when each tab was opened
- Added "Export Time" column - timestamp of when you exported the CSV
- Added "Save Tabs to Google Drive" - upload tabs CSV directly to Google Drive
- Added ability to create custom folders in Google Drive
- Added background service worker to track tab open times
- Added new permissions: `identity`, `storage`

### v1.5
- Enhanced "Extract Same Domain" to search and extract tabs from all windows, not just current window

### v1.4
- Fixed "Extract Same Domain" to use active tab's domain instead of most frequent domain
- Eliminated blank tab creation when extracting tabs to new window
- Added missing "windows" permission for reliable window operations

### v1.3
- Enhanced duplicate removal with per-URL breakdown in status feedback

### v1.2
- Added remove duplicates in current/all windows

### v1.1
- Renamed to **Simple Tab Manager** to avoid naming conflicts
- Added auto-pause for Bilibili/YouTube when merging or extracting windows

### v1.0
- Initial release with sort, merge, and extract features

## Building for Chrome Web Store

To package the extension for submission:

```bash
# Create a ZIP file for submission
zip -r simple-tab-manager.zip . -x ".*" ".git*" "node_modules/*" "*.md"
```

Then submit the ZIP file to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/).

## Troubleshooting

### Extract Same Domain Not Working

**Problem:** "No other tabs with same domain found" error when you know you have multiple tabs from the same site

**Solutions:**
1. **Subdomain matching** - The feature now intelligently matches subdomains:
   - `www.google.com` and `mail.google.com` are now treated as the same domain
   - `example.com` and `subdomain.example.com` are matched
   
2. **Active tab requirements:**
   - Make sure the active tab (the one you're currently viewing) has a valid HTTP/HTTPS URL
   - Some special pages like `chrome://`, `edge://`, or `about:` pages cannot be used as the source
   - Click on a regular webpage before using Extract

3. **Multiple windows** - The feature searches ALL open windows:
   - If you only have one tab from that domain, nothing will be extracted
   - You need at least 2 tabs from the same domain to extract

4. **Checking the browser console:**
   - Open DevTools (F12) → Console tab
   - Any detailed error messages will appear there
   - Share these errors if reporting a bug

### Other Issues

- **Tabs not moving** - Some tabs (especially those in full-screen mode) may have restrictions
- **Video pause not working** - Only works on Bilibili and YouTube; check if videos are embedded in iframes
- **Google Drive upload failing** - See [SETUP_GOOGLE_DRIVE.md](./SETUP_GOOGLE_DRIVE.md) for OAuth setup issues

## Browser Support

- Chrome 88+
- Edge 88+ (Chromium-based)

## License

[Specify your license here]

## Author

Created by wl21st

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, bugs, or feature requests, please open an issue on GitHub.
