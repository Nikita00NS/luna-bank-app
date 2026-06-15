import React, { useState, useRef, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic } from '../lib/utils';
import { ArrowLeftIcon } from '../components/Icons';
import { getAIResponse } from '../lib/ai';

// ===== SMART AI — 50+ topics with context =====
const AI_DB: Record<string, string> = {
  // Переводы
  'перевод': '📤 **Как перевести деньги:**\n\n1️⃣ Главная → кнопка «Перевод»\n2️⃣ Введите @username или Luna ID получателя\n3️⃣ Выберите счёт списания\n4️⃣ Введите сумму\n5️⃣ Проверьте детали и подтвердите\n\n💡 Комиссия зависит от подписки:\n• Free: 0.5%\n• Plus: 0.3%\n• Cosmic: 0%\n\nПеревод зачисляется мгновенно!',
  'отправить': '📤 Чтобы отправить деньги: Главная → Перевод → найдите получателя → введите сумму → подтвердите. Комиссия от 0% до 0.5% в зависимости от подписки.',
  'комиссия': '💰 **Комиссии Luna Bank:**\n\n• Free: 0.5% за перевод\n• Plus ($4.99/мес): 0.3% + кэшбэк 1%\n• Cosmic ($19.99/мес): 0% + кэшбэк 3%\n\nОбмен (Swap): 0.1% для всех\nГарант-сервис: 2%\nОткрытие счёта: бесплатно',

  // Счета
  'счёт': '🏦 **Как открыть счёт:**\n\n1️⃣ Перейдите в «Счета»\n2️⃣ Нажмите «+ Открыть»\n3️⃣ Выберите тип: Личный, Бизнес, TON, USDT, BTC или ETH\n4️⃣ Заполните ФИО, телефон, email\n5️⃣ Прочитайте и подпишите договор\n6️⃣ Поставьте электронную подпись\n\nPDF договора скачается автоматически!',
  'открыть': '🏦 Чтобы открыть новый счёт: Счета → + Открыть → выберите тип → заполните данные → подпишите договор электронной подписью.',
  'баланс': '💰 Ваш баланс отображается на главном экране. Можете переключать валюту отображения кнопкой в правом верхнем углу (USD, RUB, EUR и др.)',
  'iban': '🏦 IBAN и реквизиты вашего счёта можно найти: откройте счёт → раздел «Детали» внизу. Также можно скачать PDF с реквизитами.',

  // LNC
  'lnc': '🌙 **Luna Coin (LNC):**\n\n• Курс: 1 LNC = $0.05 (5 центов)\n• Фиксированный курс\n• Используется для переводов, подписок, покупок\n• Можно купить за TON через обмен\n• Нельзя вывести в фиат — только внутри Luna Bank',
  'луна': '🌙 Luna Coin (LNC) — внутренняя валюта Luna Bank. 1 LNC = $0.05. Используется для всех операций внутри экосистемы.',
  'курс': '📊 **Курсы:**\n• 1 LNC = $0.05\n• TON ≈ $6.85\n• BTC ≈ $71,250\n• ETH ≈ $3,820\n• USDT = $1.00\n\nАктуальные курсы: Главная → Курсы',

  // TON
  'ton': '🔗 **TON Connect:**\n\n1️⃣ Профиль → TON-кошелёк\n2️⃣ Нажмите «Подключить кошелёк»\n3️⃣ Выберите Tonkeeper, MyTonWallet или другой\n4️⃣ Подтвердите подключение в кошельке\n\nПосле подключения автоматически создаются счета TON, USDT, BTC, ETH!',
  'кошелёк': '👛 Для работы с криптовалютами подключите TON-кошелёк: Профиль → TON-кошелёк. Поддерживаются Tonkeeper, MyTonWallet, Wallet, Tonhub.',
  'tonkeeper': '💎 Tonkeeper — самый популярный кошелёк для TON. Скачайте из App Store / Google Play, затем подключите в Luna Bank: Профиль → TON-кошелёк → Подключить.',

  // Карты
  'карт': '💳 **Карты Luna Bank:**\n\n• Виртуальная — $0, мгновенно\n• Премиум — $4.99, повышенные лимиты\n• Пластиковая — $19.99, доставка 3-7 дней\n\n6 дизайнов: Classic, White, Gradient, Night, Ocean, Metal\n\nОформить: откройте счёт → кнопка «Оформить карту»\n\nДанные карты (номер, CVV) защищены PIN-кодом.',
  'cvv': '🔐 Чтобы увидеть данные карты: откройте карту → нажмите TAP TO FLIP → введите PIN → данные отобразятся (номер, CVV, срок).',

  // KYC
  'kyc': '🔐 **KYC верификация (8 шагов):**\n\n1️⃣ Телефон\n2️⃣ Email\n3️⃣ ФИО + дата рождения\n4️⃣ Фото паспорта\n5️⃣ Селфи с документом\n6️⃣ Адрес проживания\n7️⃣ Проверка данных\n8️⃣ Соглашение\n\nОбработка: 1-5 рабочих дней\nПосле одобрения: лимиты до $50,000/мес!',
  'верификац': '🔐 Пройдите KYC: Профиль → Верификация. 8 шагов: телефон, email, ФИО, паспорт, селфи, адрес, проверка, соглашение.',
  'лимит': '📊 Лимиты без KYC: $1,000/день (Free), $10,000 (Plus), безлимит (Cosmic). После KYC: до $50,000/мес.',

  // Подписки
  'подписк': '⭐ **Подписки Luna Bank:**\n\n🆓 **Free** — $0/мес\n• Комиссия 0.5%, без кэшбэка\n• Лимит $1,000/день\n\n⭐ **Plus** — $4.99/мес\n• Комиссия 0.3%, кэшбэк 1%\n• Лимит $10,000/день\n\n🚀 **Cosmic** — $19.99/мес\n• 0% комиссии, кэшбэк 3%\n• Безлимит, VIP поддержка 24/7\n\nОплата в LNC с личного счёта.',
  'кэшбэк': '💎 Кэшбэк: Free 0%, Plus 1%, Cosmic 3%. Начисляется автоматически на личный LNC-счёт после каждой покупки.',
  'тариф': '📋 Сравнение тарифов: Профиль → Подписка. Там можно выбрать и оплатить новый тариф.',

  // Безопасность
  'безопасн': '🛡️ **Безопасность Luna Bank:**\n\n• PIN-код при каждом входе (SHA-256 + соль)\n• Биометрия (Face ID / Touch ID)\n• Данные карты защищены PIN\n• Все операции логируются\n• Seed-фразы не хранятся на сервере\n\nСменить PIN: Профиль → Безопасность → Сменить PIN',
  'pin': '🔐 PIN-код: 4 цифры, хешируется SHA-256 с вашим Telegram ID как солью. Сменить: Профиль → Безопасность → Сменить PIN.',
  'взлом': '🚨 Если вы подозреваете взлом: немедленно смените PIN (Профиль → Безопасность), отключите TON-кошелёк и напишите в поддержку.',

  // Обмен
  'обмен': '💱 **Обмен (Swap):**\n\nГлавная → кнопка «Обмен»\n• Поддерживаются: LNC ↔ TON ↔ USDT ↔ BTC ↔ ETH\n• Комиссия: 0.1%\n• Мгновенный обмен по текущему курсу\n• Кнопки быстрого выбора: 25%, 50%, 75%, 100%',
  'swap': '💱 Swap: обменяйте криптовалюты мгновенно. Главная → Обмен. Комиссия 0.1%. Поддерживаются LNC, TON, USDT, BTC, ETH.',

  // Биржа
  'биржа': '📊 **Биржа Pro:**\n\nГлавная → Биржа\n• Вкладка «Рынок»: графики цен\n• Вкладка «Торговля»: Buy/Sell\n• Вкладка «Ордера»: история сделок\n• Оплата в LNC',
  'купить': '📈 Купить крипту: Главная → Биржа → выберите монету → вкладка «Торговля» → Buy. Или используйте Swap для быстрого обмена.',
  'продать': '📉 Продать крипту: Биржа → выберите монету → Sell. Средства зачисляются на LNC-счёт.',

  // Вклады
  'вклад': '💎 **Earn / Вклады:**\n\nГлавная → Earn\n• Гибкий: 5% годовых, без срока\n• 30 дней: 8%\n• 90 дней: 12%\n• Стейкинг TON: 7%\n\nДоход начисляется ежедневно. Вывод по истечении срока.',
  'стейкинг': '💎 Стейкинг TON: 7% годовых, минимум 14 дней, от 10 TON. Главная → Earn → Стейкинг TON.',
  'процент': '📈 Процентные ставки: 5% (гибкий), 8% (30 дней), 12% (90 дней), 7% (TON стейкинг). Доход = сумма × ставка / 365 × дни.',

  // Гарант
  'гарант': '🔒 **Гарант-сервис:**\n\n1. Создайте сделку (товар + сумма + @продавец)\n2. LNC замораживаются на эскроу\n3. Продавец доставляет товар\n4. Вы подтверждаете → деньги продавцу\n\nКомиссия: 2% (платит покупатель)\nМожно открыть спор если товар не получен.',
  'эскроу': '🔒 Эскроу = гарант-сервис. Средства замораживаются до подтверждения обеих сторон. Комиссия 2%.',

  // Игры
  'игр': '🎮 **Мини-игры Luna Bank:**\n\n🚴 Курьер — поймай посылки\n💻 Фрилансер — набери код\n👨‍💻 Разработчик — поймай баги\n📊 Менеджер — сортируй задачи\n📈 Трейдер — купи на дне\n\n🎰 Lucky Spin — крути колесо (до 🌙5000)\n🚀 Crash — успей забрать\n🪙 Монетка — x1.95\n\nВсе выигрыши зачисляются на LNC-счёт!',
  'city': '🏙️ Luna City: выбирайте профессии (5 штук), открывайте бизнесы (4 типа), зарабатывайте реальные LNC. Город → Работы / Бизнес.',
  'бизнес': '🏪 Бизнесы в Luna City: Кофейня (🌙500), Магазин (🌙2000), Офис (🌙5000), Ресторан (🌙15000). Покупайте и собирайте доход!',

  // NFT
  'nft': '🎨 **NFT маркетплейс:**\n\n• 8 NFT в 2 коллекциях (Cards + Avatars)\n• 4 редкости: Common → Rare → Epic → Legendary\n• Покупка за LNC\n• Legendary NFT светятся!\n\nГлавная → NFT',

  // Платежи
  'оплат': '🧾 **Платежи:**\n\nОплата услуг за LNC:\n📱 Связь: МТС, Билайн, МегаФон, Tele2\n🎮 Игры: Steam, PlayStation, Xbox, Roblox\n🏠 ЖКХ: электричество, газ, вода\n🌐 Интернет: Ростелеком, Дом.ру\n\nГлавная → Платежи',

  // PDF
  'pdf': '📄 **PDF документы:**\n\n5 типов документов генерируются автоматически:\n1. Договор (при открытии счёта)\n2. Выписка по счёту\n3. Реквизиты\n4. Справка об остатке\n5. Справка о договоре\n\nСкачать: откройте счёт → раздел «Документы PDF»',
  'договор': '📋 Договор подписывается при открытии счёта электронной подписью. PDF скачивается автоматически. Повторно: откройте счёт → Документы.',
  'выписк': '📄 Выписка по счёту: откройте детали счёта → Документы PDF → Выписка. Содержит все операции за период.',

  // Профиль
  'профиль': '👤 В профиле: аватар, уровень, XP, кэшбэк, KYC статус. Доступны: Подписка, Счета, QR, TON-кошелёк, Безопасность, FAQ, Оформление.',
  'уровень': '📊 Уровень повышается за XP. XP получаете за работы в Luna City. Каждый уровень = level × 100 XP. Отображается в профиле.',
  'qr': '📱 Ваш QR-код: Профиль → Мой QR. Покажите отправителю для получения перевода. Содержит Luna ID и @username.',

  // Темы
  'тем': '🎨 Темы оформления: Профиль → Оформление. 8 тем: Default, Gold, Neon, Ocean, Rose Gold, Matrix, Sunset, Ice. + 12 аватаров.',

  // Общее
  'привет': '👋 Привет! Я Luna AI — умный помощник Luna Bank.\n\nМогу рассказать про:\n• Переводы и счета\n• Криптовалюты и TON\n• Карты и подписки\n• Игры и NFT\n• Безопасность\n\nПросто спросите!',
  'здравствуй': '👋 Здравствуйте! Чем могу помочь? Спросите про любую функцию Luna Bank.',
  'помощь': '🆘 Чем могу помочь?\n\n📤 Переводы\n🏦 Счета\n💳 Карты\n💱 Обмен\n📊 Биржа\n💎 Вклады\n🔒 Гарант\n🎮 Игры\n🎨 NFT\n🧾 Платежи\n🔐 Безопасность\n📄 Документы\n\nНапишите тему!',
  'спасибо': '😊 Рад помочь! Если появятся ещё вопросы — пишите.',
  'пока': '👋 До свидания! Удачи с Luna Bank!',
};

const QUICK_QUESTIONS = [
  'Как перевести деньги?',
  'Как открыть счёт?',
  'Что такое LNC?',
  'Какие комиссии?',
  'Как пройти KYC?',
  'Как играть в Luna City?',
  'Как работает гарант?',
  'Как подключить TON?',
];

// Support auto-responses
const SUPPORT_RULES = [
  { kw: ['перевод', 'отправить', 'списа'], reply: 'Для перевода: Главная → Перевод. Если проблема с конкретной транзакцией — укажите TX ID.' },
  { kw: ['комиссия', 'сколько стоит'], reply: 'Комиссии: Free 0.5%, Plus 0.3%, Cosmic 0%. Обмен 0.1%. Гарант 2%.' },
  { kw: ['счёт', 'открыть', 'создать'], reply: 'Счёт: Счета → + Открыть → тип → данные → подпись → PDF.' },
  { kw: ['карт', 'оформить'], reply: 'Карта: откройте счёт → Оформить карту. Виртуальная бесплатно.' },
  { kw: ['kyc', 'верификац', 'паспорт'], reply: 'KYC: Профиль → Верификация → 8 шагов. Обработка 1-5 дней.' },
  { kw: ['pin', 'пин', 'забыл'], reply: 'Сменить PIN: Профиль → Безопасность. Если забыли — обратитесь к владельцу.' },
  { kw: ['бот', 'уведомлен'], reply: 'Уведомления приходят в приложение. Push-уведомления в Telegram настраиваются администратором.' },
  { kw: ['ошибк', 'не работ', 'баг'], reply: 'Опишите проблему подробнее: какой экран, что нажимали, что произошло. Мы разберёмся!' },
  { kw: ['деньги', 'вернуть', 'возврат'], reply: 'Для возврата средств обратитесь к администратору с указанием TX ID транзакции.' },
];

type ChatTab = 'ai' | 'support';

export default function ChatScreen() {
  const { aiMsgs, supportMsgs, addAiMsg, addSupportMsg } = useStore();
  const [activeTab, setActiveTab] = useState<ChatTab>('ai');
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const messages = activeTab === 'ai' ? aiMsgs : supportMsgs;
  const addMessage = activeTab === 'ai' ? addAiMsg : addSupportMsg;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const findAIResponse = (text: string): string => {
    const lower = text.toLowerCase();

    // Search through all topics
    for (const [keyword, response] of Object.entries(AI_DB)) {
      if (lower.includes(keyword)) return response;
    }

    // Default
    return '🤔 Интересный вопрос! Попробуйте спросить про:\n\n' +
      '• Переводы и комиссии\n' +
      '• Счета и карты\n' +
      '• TON и криптовалюты\n' +
      '• KYC верификацию\n' +
      '• Подписки и кэшбэк\n' +
      '• Обмен и биржу\n' +
      '• Вклады и стейкинг\n' +
      '• Гарант-сервис\n' +
      '• Игры и NFT\n' +
      '• Безопасность\n' +
      '• PDF документы\n\n' +
      'Или напишите «помощь» для списка тем!';
  };

  const sendMessage = (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    haptic('light');
    setInput('');

    addMessage({ id: uid(), role: 'user', content: msg, timestamp: new Date().toISOString() });

    if (activeTab === 'ai') {
      // Real AI via OpenRouter
      getAIResponse(msg).then((reply) => {
        addMessage({
          id: uid(),
          role: 'assistant',
          content: reply,
          timestamp: new Date().toISOString(),
        });
      });
    } else {
      // Support — auto-response with delay
      setTimeout(() => {
        const lower = msg.toLowerCase();
        let replied = false;
        for (const rule of SUPPORT_RULES) {
          if (rule.kw.some((k) => lower.includes(k))) {
            addMessage({ id: uid(), role: 'assistant', content: `🤖 ${rule.reply}`, timestamp: new Date().toISOString() });
            replied = true;
            break;
          }
        }
        if (!replied) {
          addMessage({ id: uid(), role: 'assistant', content: '🤖 Сейчас позову оператора...', timestamp: new Date().toISOString() });
          setTimeout(() => {
            addMessage({ id: uid(), role: 'system', content: '⏳ Все операторы заняты. Посмотрите FAQ: Профиль → FAQ\n\nИли опишите проблему подробнее.', timestamp: new Date().toISOString() });
          }, 2000);
        }
      }, 600 + Math.random() * 400);
    }
  };
  return (
    <div className="h-full flex flex-col bg-black safe-top">
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <h1 className="text-2xl font-extrabold mb-3">Чаты</h1>
        <div className="flex gap-2">
          {(['ai', 'support'] as ChatTab[]).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === t ? 'bg-white text-black' : 'glass text-white/50'}`}>
              {t === 'ai' ? '🤖 Luna AI' : '💬 Поддержка'}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-10 animate-fade-in">
            <span className="text-5xl mb-4 block">{activeTab === 'ai' ? '🤖' : '💬'}</span>
            <h3 className="font-bold mb-2">{activeTab === 'ai' ? 'Luna AI' : 'Поддержка'}</h3>
            <p className="text-sm text-white/35 mb-4">
              {activeTab === 'ai' ? 'Знаю всё о Luna Bank! Спросите что угодно.' : 'Опишите вашу проблему'}
            </p>
            {activeTab === 'ai' && (
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_QUESTIONS.map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="glass rounded-xl px-3 py-2 text-xs text-white/50 active:scale-95 transition-transform">
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] ${
              msg.role === 'user' ? 'bg-white text-black rounded-br-sm' :
              msg.role === 'system' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15 rounded-xl' :
              'glass rounded-bl-sm'}`}>
              <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
              <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-black/35' : 'text-white/25'}`}>
                {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-5 pb-24 pt-2">
        <div className="glass flex items-center px-4 gap-3">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Сообщение..." className="flex-1 bg-transparent py-3 text-white outline-none text-sm" />
          <button onClick={() => sendMessage()} disabled={!input.trim()}
            className="text-white/50 disabled:text-white/15 text-lg transition-colors active:scale-95">
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
