#!/bin/bash
# =============================================================
# Luna Wallet — iOS Build Script
# =============================================================
set -e

echo "🍎 Luna Wallet — iOS Build"
echo "==========================="

# 1. Build web app
echo "🔨 Building web app..."
npm run build

# 2. Copy to Capacitor
echo "📱 Syncing to Capacitor iOS..."
npx cap sync ios

# 3. Open Xcode
echo "📂 Opening Xcode..."
npx cap open ios

echo ""
echo "✅ iOS build ready!"
echo "   In Xcode: Product → Archive → Distribute App"
echo "   Requirements: iOS 15.0+, Apple Developer account"