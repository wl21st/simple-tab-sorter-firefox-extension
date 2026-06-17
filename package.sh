#!/bin/bash

# Build script for Web Extensions packaging
# This script creates distributable ZIP files for Chrome and Firefox

OUTPUT_NAME="simple-tab-manager"
VERSION=$(grep '"version"' manifest.json | sed 's/.*"\([^"]*\)".*/\1/')

echo "Building extension packages v${VERSION}..."

# Remove old build artifacts
rm -rf dist/
mkdir -p dist/chrome
mkdir -p dist/firefox

# Files to copy
FILES=(
  "manifest.json"
  "popup.html"
  "popup.js"
  "background.js"
  "options.html"
  "options.js"
  "icon.svg"
  "icon16.png"
  "icon32.png"
  "icon48.png"
  "icon128.png"
)

# Function to copy files
copy_files() {
  local target_dir=$1
  for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
      cp "$file" "$target_dir/"
    fi
  done
  # Also copy lib directory
  if [ -d "lib" ]; then
    cp -r lib "$target_dir/"
  fi
}

# --- Build Chrome ---
echo "Building Chrome version..."
copy_files "dist/chrome"

# Create Chrome ZIP
cd dist/chrome
CHROME_FILE="../${OUTPUT_NAME}-chrome-v${VERSION}.zip"
zip -q -r "$CHROME_FILE" . -x "*.git*" ".DS_Store"
cd ../..

# --- Build Firefox ---
echo "Building Firefox version..."
copy_files "dist/firefox"

# Modify manifest for Firefox using Node.js
node -e '
  const fs = require("fs");
  const path = require("path");
  const manifestPath = path.join("dist", "firefox", "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  // Add Firefox specific settings
  manifest.browser_specific_settings = {
    gecko: {
      id: "simple-tab-manager@example.com",
      strict_min_version: "109.0"
    }
  };

  // Convert background service_worker to scripts
  if (manifest.background && manifest.background.service_worker) {
    manifest.background.scripts = ["lib/browser-polyfill.min.js", manifest.background.service_worker];
    delete manifest.background.service_worker;
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
'

# Create Firefox ZIP
cd dist/firefox
FIREFOX_FILE="../${OUTPUT_NAME}-firefox-v${VERSION}.zip"
zip -q -r "$FIREFOX_FILE" . -x "*.git*" ".DS_Store"
cd ../..

echo "✓ Extensions packaged successfully!"
echo "Chrome build: dist/${OUTPUT_NAME}-chrome-v${VERSION}.zip"
echo "Firefox build: dist/${OUTPUT_NAME}-firefox-v${VERSION}.zip"