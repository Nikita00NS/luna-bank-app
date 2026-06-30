# 📱 Luna Bank — Сборка приложения для iPhone и Android

## ⏱ Займёт: ~30 минут (первый раз), потом 2 минуты

---

## ШАГ 1: Установи программы на Mac

### 1.1 — Xcode (для iPhone)
1. Открой **App Store** на Mac
2. Найди **Xcode** (от Apple, бесплатно)
3. Нажми **Скачать** (весит ~12 ГБ, подожди)
4. После установки — открой Xcode один раз, прими лицензию

### 1.2 — Android Studio (для Android)
1. Открой в браузере: https://developer.android.com/studio
2. Нажми **Download Android Studio**
3. Установи как обычную программу (перетащи в Applications)
4. Открой Android Studio → Setup Wizard → выбери **Standard** → Next → Finish
5. Подожди пока скачается Android SDK (~5 ГБ)

### 1.3 — Node.js (если ещё нет)
1. Открой в браузере: https://nodejs.org
2. Скачай **LTS версию**
3. Установи

---

## ШАГ 2: Скачай проект

Открой **Терминал** (Cmd+Пробел → набери "Terminal" → Enter)

Скопируй и вставь эти команды **по одной**:

```bash
cd ~/Desktop
git clone https://github.com/Nikita00NS/luna-bank-app.git
cd luna-bank-app
npm install
```

Подожди пока всё установится (~1-2 мин).

---

## ШАГ 3: Собери веб-часть

```bash
npm run build
npx cap sync
```

---

## ШАГ 4: Собери Android APK

### В терминале:
```bash
npx cap open android
```

Откроется Android Studio с проектом.

### В Android Studio:
1. Подожди пока проект загрузится (внизу будет полоса загрузки, ~2-3 мин)
2. В верхнем меню нажми: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Подожди пока соберётся (~1-2 мин)
4. Появится уведомление внизу справа: "APK(s) generated successfully"
5. Нажми **locate** — откроется папка с файлом **app-debug.apk**

### Этот APK файл — твоё приложение для Android!
- Отправь его себе в Telegram
- На Android телефоне открой и установи
- Готово!

---

## ШАГ 5: Собери для iPhone (TestFlight)

### В терминале:
```bash
npx cap open ios
```

Откроется Xcode с проектом.

### В Xcode:
1. Слева в навигаторе нажми на **App** (самый верх, синяя иконка)
2. В центре → вкладка **Signing & Capabilities**
3. Поставь галочку **Automatically manage signing**
4. В **Team** — выбери свой Apple ID (если нет — нажми Add Account → войди Apple ID)
5. В **Bundle Identifier** оставь: `app.lunabank.crypto`

### Собрать для своего iPhone (без TestFlight):
1. Подключи iPhone кабелем к Mac
2. Вверху Xcode выбери свой iPhone (вместо "Any iOS Device")
3. Нажми ▶️ (кнопка Play)
4. На iPhone появится диалог "Доверять разработчику?" → Настройки → Основные → Профили → Доверять
5. Приложение установится на телефон!

### Собрать для TestFlight (раздавать другим):
1. Нужен Apple Developer Account ($99/год) — https://developer.apple.com/programs/
2. В Xcode: Product → Archive
3. Window → Organizer → Distribute App → App Store Connect
4. В App Store Connect → TestFlight → Добавить тестеров по email

---

## 🔄 Обновление приложения

Когда обновишь код:
```bash
cd ~/Desktop/luna-bank-app
git pull
npm run build
npx cap sync
npx cap open android   # или ios
```
И снова Build APK / Run на iPhone.

---

## ❓ Проблемы?

### "Command not found: npx"
→ Установи Node.js: https://nodejs.org

### "Could not find an installed version of Gradle"
→ Открой Android Studio → Preferences → Android SDK → SDK Tools → поставь галочку на Gradle

### "No signing certificate"
→ В Xcode → Signing & Capabilities → добавь Apple ID

### APK не устанавливается на Android
→ На телефоне: Настройки → Безопасность → Разрешить установку из неизвестных источников
