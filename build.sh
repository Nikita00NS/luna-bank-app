#!/bin/bash
# ═══════════════════════════════════════════════════
# 🌙 Luna Bank — Автоматическая сборка APK + IPA
# ═══════════════════════════════════════════════════
#
# Запуск:   chmod +x build.sh && ./build.sh
# Что делает: собирает .apk (Android) и .app (iOS)
# Результат: файлы в папке ./release/
#
# ═══════════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "══════════════════════════════════════"
echo "  🌙 Luna Bank — Build Script v1.3"
echo "══════════════════════════════════════"
echo ""

# ===== Check prerequisites =====
echo -e "${BLUE}[1/7]${NC} Проверяю инструменты..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js не установлен!${NC}"
    echo "   Скачай: https://nodejs.org (LTS)"
    echo "   Или: brew install node"
    exit 1
fi
echo "   ✅ Node.js $(node -v)"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm не найден${NC}"
    exit 1
fi
echo "   ✅ npm $(npm -v)"

HAS_ANDROID=false
HAS_IOS=false

if [ -d "$HOME/Library/Android/sdk" ] || [ -n "$ANDROID_HOME" ]; then
    HAS_ANDROID=true
    echo "   ✅ Android SDK найден"
else
    echo -e "   ${YELLOW}⚠️  Android SDK не найден — APK пропустим${NC}"
    echo "      Установи Android Studio: https://developer.android.com/studio"
fi

if command -v xcodebuild &> /dev/null; then
    HAS_IOS=true
    echo "   ✅ Xcode найден"
else
    echo -e "   ${YELLOW}⚠️  Xcode не найден — iOS пропустим${NC}"
    echo "      Установи из App Store"
fi

# ===== Install dependencies =====
echo ""
echo -e "${BLUE}[2/7]${NC} Устанавливаю зависимости..."
npm install --silent 2>/dev/null
echo "   ✅ Зависимости установлены"

# ===== Build web =====
echo ""
echo -e "${BLUE}[3/7]${NC} Собираю веб-приложение..."
npm run build --silent 2>/dev/null
echo "   ✅ Web build готов"

# ===== Sync Capacitor =====
echo ""
echo -e "${BLUE}[4/7]${NC} Синхронизирую Capacitor..."
npx cap sync --silent 2>/dev/null || npx cap sync 2>/dev/null
echo "   ✅ Capacitor синхронизирован"

# ===== Create release folder =====
mkdir -p release
echo ""

# ===== Build Android APK =====
if [ "$HAS_ANDROID" = true ]; then
    echo -e "${BLUE}[5/7]${NC} Собираю Android APK..."
    
    # Set ANDROID_HOME if not set
    if [ -z "$ANDROID_HOME" ]; then
        export ANDROID_HOME="$HOME/Library/Android/sdk"
    fi
    export PATH="$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:$PATH"
    
    cd android
    
    # Make gradlew executable
    chmod +x gradlew 2>/dev/null || true
    
    # Build debug APK
    ./gradlew assembleDebug 2>/dev/null || {
        echo -e "   ${YELLOW}⚠️  Gradle build failed. Trying with --stacktrace...${NC}"
        ./gradlew assembleDebug --stacktrace 2>&1 | tail -5
    }
    
    # Copy APK
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    if [ -f "$APK_PATH" ]; then
        cp "$APK_PATH" ../release/LunaBank-v1.3.apk
        APK_SIZE=$(du -h ../release/LunaBank-v1.3.apk | cut -f1)
        echo -e "   ${GREEN}✅ APK готов: release/LunaBank-v1.3.apk ($APK_SIZE)${NC}"
    else
        echo -e "   ${RED}❌ APK не найден. Открой Android Studio:${NC}"
        echo "      npx cap open android"
        echo "      Build → Build APK"
    fi
    
    cd ..
else
    echo -e "${BLUE}[5/7]${NC} ${YELLOW}APK пропущен (нет Android SDK)${NC}"
fi

# ===== Build iOS =====
if [ "$HAS_IOS" = true ]; then
    echo ""
    echo -e "${BLUE}[6/7]${NC} Собираю iOS..."
    
    cd ios/App
    
    # Install CocoaPods if needed
    if [ -f "Podfile" ] && ! [ -d "Pods" ]; then
        echo "   Устанавливаю CocoaPods..."
        if command -v pod &> /dev/null; then
            pod install 2>/dev/null || {
                echo -e "   ${YELLOW}⚠️  pod install failed. Попробуй: sudo gem install cocoapods${NC}"
            }
        else
            echo -e "   ${YELLOW}⚠️  CocoaPods не установлен: sudo gem install cocoapods${NC}"
        fi
    fi
    
    # Build for simulator (no signing needed)
    echo "   Компилирую для симулятора..."
    xcodebuild -workspace App.xcworkspace \
        -scheme App \
        -sdk iphonesimulator \
        -configuration Release \
        -derivedDataPath build \
        -quiet \
        2>/dev/null || {
        echo -e "   ${YELLOW}⚠️  Xcode build с workspace не удался, пробую xcodeproj...${NC}"
        xcodebuild -project App.xcodeproj \
            -scheme App \
            -sdk iphonesimulator \
            -configuration Release \
            -derivedDataPath build \
            -quiet \
            2>/dev/null || true
    }
    
    # Find .app
    APP_PATH=$(find build -name "App.app" -type d 2>/dev/null | head -1)
    if [ -n "$APP_PATH" ]; then
        # Create .ipa from .app
        mkdir -p Payload
        cp -r "$APP_PATH" Payload/
        cd ../../
        zip -r release/LunaBank-v1.3.ipa ios/App/Payload/ -q 2>/dev/null
        rm -rf ios/App/Payload
        IPA_SIZE=$(du -h release/LunaBank-v1.3.ipa 2>/dev/null | cut -f1)
        echo -e "   ${GREEN}✅ IPA готов: release/LunaBank-v1.3.ipa ($IPA_SIZE)${NC}"
    else
        cd ../../
        echo -e "   ${YELLOW}⚠️  .app не найден. Для реального устройства:${NC}"
        echo "      npx cap open ios"
        echo "      В Xcode: подключи iPhone → Run"
        echo ""
        echo "      Для IPA: Product → Archive → Export"
    fi
else
    echo -e "${BLUE}[6/7]${NC} ${YELLOW}iOS пропущен (нет Xcode)${NC}"
fi

# ===== Summary =====
echo ""
echo -e "${BLUE}[7/7]${NC} Готово!"
echo ""
echo "══════════════════════════════════════"
echo "  🌙 Luna Bank v1.3 — Результаты"
echo "══════════════════════════════════════"
echo ""

if [ -f "release/LunaBank-v1.3.apk" ]; then
    echo -e "  ${GREEN}📱 Android APK:${NC} release/LunaBank-v1.3.apk"
else
    echo -e "  ${YELLOW}📱 Android APK:${NC} не собран (нужен Android SDK)"
fi

if [ -f "release/LunaBank-v1.3.ipa" ]; then
    echo -e "  ${GREEN}🍎 iOS IPA:${NC}     release/LunaBank-v1.3.ipa"
else
    echo -e "  ${YELLOW}🍎 iOS IPA:${NC}     не собран (нужен Xcode + подпись)"
fi

echo ""
echo -e "  ${GREEN}🌐 Web App:${NC}     https://luna-bank-app.vercel.app"
echo -e "  ${GREEN}🤖 Bot:${NC}         https://t.me/LunaBankBot"
echo -e "  ${GREEN}📦 GitHub:${NC}      https://github.com/Nikita00NS/luna-bank-app"
echo ""
echo "  Файлы в папке: $(pwd)/release/"
echo ""

# Open release folder
if [ -d "release" ]; then
    ls -la release/ 2>/dev/null
    echo ""
    if command -v open &> /dev/null; then
        open release/
    fi
fi

echo "══════════════════════════════════════"
echo "  🌙 Done!"
echo "══════════════════════════════════════"
