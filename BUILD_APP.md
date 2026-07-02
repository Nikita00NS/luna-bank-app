# 📱 Luna Bank — Установка на iPhone и Android

---

## 🤖 Android — просто APK

### На Mac (одноразово):
1. Скачай Android Studio: https://developer.android.com/studio
2. Установи, открой, подожди пока скачается SDK

### Сборка APK:
```bash
cd ~/Desktop
git clone https://github.com/Nikita00NS/luna-bank-app.git
cd luna-bank-app
npm install
npm run build
npx cap sync android
npx cap open android
```
3. В Android Studio подожди загрузку (~2 мин)
4. Меню: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
5. APK файл появится в `android/app/build/outputs/apk/debug/`
6. Отправь APK в Telegram → установи на Android

---

## 🍎 iPhone — БЕЗ $99 (бесплатно!)

### Способ 1: Через Xcode напрямую (рекомендую)

**Нужно:** Mac + iPhone + USB-кабель + бесплатный Apple ID

1. Установи Xcode из App Store (бесплатно)
2. В терминале:
```bash
cd ~/Desktop/luna-bank-app
npm run build
npx cap sync ios
npx cap open ios
```
3. В Xcode:
   - Слева нажми на **App** (синяя иконка, самый верх)
   - В центре → **Signing & Capabilities**
   - Поставь ✅ **Automatically manage signing**
   - **Team** → нажми **Add Account** → войди своим Apple ID (тот что на iPhone)
   - **Bundle Identifier**: оставь `app.lunabank.crypto`
4. Подключи iPhone кабелем
5. Вверху Xcode выбери свой iPhone
6. Нажми ▶️ **Run**
7. На iPhone: Настройки → Основные → **VPN и управление устройствами** → Доверять

**⚠️ Ограничение:** приложение работает 7 дней, потом нужно снова подключить к Mac и нажать Run. Это ограничение Apple для бесплатных аккаунтов.

### Способ 2: Через AltStore (без подключения каждые 7 дней)

1. Скачай AltServer на Mac: https://altstore.io
2. Установи AltStore на iPhone через AltServer (по Wi-Fi)
3. Собери .ipa файл:
```bash
cd ~/Desktop/luna-bank-app
npm run build
npx cap sync ios
```
4. В Xcode: Product → Archive → Export → Ad Hoc → получишь .ipa файл
5. Открой .ipa через AltStore на iPhone
6. AltStore автоматически обновляет подпись каждые 7 дней по Wi-Fi!

### Способ 3: PWA (самый простой, без Mac)

На iPhone:
1. Открой Safari → https://luna-bank-app.vercel.app
2. Нажми 📤 (Поделиться)
3. «На экран "Домой"»
4. Готово — работает как приложение!

---

## 🔄 Обновление

```bash
cd ~/Desktop/luna-bank-app
git pull
npm install
npm run build
npx cap sync
# Потом Build APK или Run на iPhone
```

---

## ❓ FAQ

**Q: "Untrusted Developer" на iPhone?**
A: Настройки → Основные → VPN и управление устройствами → Доверять

**Q: Приложение пропало через 7 дней?**
A: Подключи iPhone к Mac, в Xcode нажми Run. Или используй AltStore.

**Q: APK не устанавливается?**
A: Настройки → Безопасность → Разрешить неизвестные источники

**Q: Нет Mac для iPhone?**
A: Используй PWA (Способ 3) — работает в Safari.
