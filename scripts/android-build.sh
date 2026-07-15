#!/bin/bash
# =============================================================
# Luna Wallet — Android Build Script
# =============================================================
set -e

echo "🤖 Luna Wallet — Android Build"
echo "==============================="

# 1. Build web app
echo "🔨 Building web app..."
npm run build

# 2. Copy to Capacitor
echo "📱 Syncing to Capacitor Android..."
npx cap sync android

# 3. Build APK (debug)
echo "📦 Building debug APK..."
cd android
./gradlew assembleDebug
cd ..

echo ""
echo "✅ Android build ready!"
echo "   APK: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "   For release:"
echo "   1. Generate keystore: keytool -genkey -v -keystore luna-wallet.keystore -alias luna -keyalg RSA -keysize 2048 -validity 10000"
echo "   2. Sign APK: jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore luna-wallet.keystore app-release-unsigned.apk luna"
echo "   3. Optimize: zipalign -v 4 app-release-unsigned.apk LunaWallet.apk"