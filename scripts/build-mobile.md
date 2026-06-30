# 📱 Luna Bank — Сборка мобильного приложения

## Требования
- **Android**: Android Studio + JDK 17
- **iOS**: Xcode 15+ (только на macOS) + Apple Developer Account ($99/год)

---

## 🤖 Android (APK)

### 1. Установи Android Studio
https://developer.android.com/studio

### 2. Собери проект
```bash
cd luna-bank
npm run build
npx cap sync android
npx cap open android
```

### 3. В Android Studio
- Build → Build Bundle(s) / APK(s) → Build APK(s)
- APK будет в: `android/app/build/outputs/apk/debug/app-debug.apk`

### 4. Для release APK
- Build → Generate Signed Bundle / APK
- Создай keystore файл
- APK будет подписан для Google Play

---

## 🍎 iOS (TestFlight)

### 1. Установи Xcode
App Store → Xcode (бесплатно, но нужен Mac)

### 2. Apple Developer Account
https://developer.apple.com/programs/ — $99/год

### 3. Собери проект
```bash
cd luna-bank
npm run build
npx cap sync ios
npx cap open ios
```

### 4. В Xcode
- Выбери Team (Apple Developer Account)
- Product → Archive
- Distribute App → App Store Connect → Upload
- В App Store Connect → TestFlight → добавь тестеров

---

## 🤖 Telegram Bot — раздача ссылок

Бот автоматически определяет устройство пользователя и даёт правильную ссылку:
- Android → APK файл (или Google Play)
- iOS → TestFlight ссылка

Команда в боте: `/app` или `/download`
