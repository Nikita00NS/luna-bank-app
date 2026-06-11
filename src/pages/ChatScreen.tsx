import React, { useState, useRef, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic } from '../lib/utils';

// ===== AI Knowledge Base =====
const AI_KNOWLEDGE: Record<string, string> = {
  перевод:
    '📤 **Перевод:**\n1. Главная → Перевод\n2. Найдите получателя по @username\n3. Выберите счёт и сумму\n4. Подтвердите\n\nКомиссия: Free 0.5%, Plus 0.3%, Cosmic 0%',
  счёт:
    '🏦 **Открытие счёта:**\n1. Счета → + Открыть\n2. Выберите тип\n3. Заполните данные\n4. Подпишите договор\n\n6 типов: Личный, Бизнес, TON, USDT, BTC, ETH',
  ton:
    '🔗 **TON Connect:**\nПрофиль → TON-кошелёк → выберите кошелёк → подключите\n\nПоддерживаются: Tonkeeper, MyTonWallet, Wallet, Tonhub',
  kyc:
    '🔐 **KYC (8 шагов):**\nТелефон → Email → ФИО → Паспорт → Селфи → Адрес → Проверка → Соглашение\n\nПосле одобрения: лимиты до $50,000/мес',
  карта:
    '💳 **Карты:**\nВиртуальная — $0\nПремиум — $4.99\nПластиковая — $19.99\n\n6 дизайнов: Classic, White, Gradient, Night, Ocean, Metal',
  комиссия:
    '💰 **Комиссии:**\nFree: 0.5%\nPlus: 0.3%\nCosmic: 0%',
  lnc:
    '◎ **Luna Coin:**\n1 LNC = $0.05 (5 центов)\nФиксированный курс\nДля переводов, подписок, покупок',
  безопасность:
    '🛡️ **Безопасность:**\nPIN SHA-256 + соль\nБиометрия (опционально)\nВсе операции логируются',
};

const QUICK_QUESTIONS = [
  'Как перевести?',
  'Как открыть счёт?',
  'Что такое LNC?',
  'Какие комиссии?',
  'Как пройти KYC?',
  'Как оформить карту?',
];

// ===== Support Auto-Responses =====
const SUPPORT_RULES = [
  { keywords: ['перевод', 'отправить'], reply: 'Для перевода перейдите в «Переводы» на главной. Если проблема — укажите номер транзакции.' },
  { keywords: ['комиссия', 'сколько'], reply: 'Комиссия зависит от подписки: Free 0.5%, Plus 0.3%, Cosmic 0%. Подробнее: Профиль → Подписка.' },
  { keywords: ['счёт', 'открыть'], reply: 'Откройте счёт в Счета → + Открыть. Доступны 6 типов.' },
  { keywords: ['карта', 'карту'], reply: 'Оформите карту на странице счёта. Виртуальная бесплатно.' },
  { keywords: ['kyc', 'верификац'], reply: 'Пройдите KYC: Профиль → Верификация. 8 шагов, ~5 минут.' },
  { keywords: ['pin', 'пин'], reply: 'Сменить PIN: Профиль → Безопасность → Сменить PIN.' },
];

type ChatTab = 'ai' | 'support';

export default function ChatScreen() {
  const { aiMsgs, supportMsgs, addAiMsg, addSupportMsg } = useStore();

  const [activeTab, setActiveTab] = useState<ChatTab>('ai');
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = activeTab === 'ai' ? aiMsgs : supportMsgs;
  const addMessage = activeTab === 'ai' ? addAiMsg : addSupportMsg;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ===== Send Message =====
  const sendMessage = (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;

    haptic('light');
    setInput('');

    // Add user message
    addMessage({
      id: uid(),
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    });

    // Generate response after delay
    setTimeout(() => {
      if (activeTab === 'ai') {
        // AI: match keywords
        const lower = msg.toLowerCase();
        let reply = '🤔 Интересный вопрос! Попробуйте спросить про:\n• Переводы\n• Счета\n• TON\n• KYC\n• Карты\n• Комиссии\n• LNC\n• Безопасность';

        for (const [keyword, response] of Object.entries(AI_KNOWLEDGE)) {
          if (lower.includes(keyword)) {
            reply = response;
            break;
          }
        }

        addMessage({
          id: uid(),
          role: 'assistant',
          content: reply,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Support: auto-response
        const lower = msg.toLowerCase();
        let replied = false;

        for (const rule of SUPPORT_RULES) {
          if (rule.keywords.some((k) => lower.includes(k))) {
            addMessage({
              id: uid(),
              role: 'assistant',
              content: `🤖 ${rule.reply}`,
              timestamp: new Date().toISOString(),
            });
            replied = true;
            break;
          }
        }

        if (!replied) {
          addMessage({
            id: uid(),
            role: 'assistant',
            content: '🤖 Сейчас позову оператора...',
            timestamp: new Date().toISOString(),
          });

          setTimeout(() => {
            addMessage({
              id: uid(),
              role: 'system',
              content: '⏳ Все операторы заняты. Посмотрите FAQ: Профиль → FAQ',
              timestamp: new Date().toISOString(),
            });
          }, 2000);
        }
      }
    }, 800);
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <h1 className="text-2xl font-extrabold mb-3">💬 Чаты</h1>

        {/* Tab switcher */}
        <div className="flex gap-2">
          {(['ai', 'support'] as ChatTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`
                flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${activeTab === t ? 'bg-white text-black' : 'glass text-white/50'}
              `}
            >
              {t === 'ai' ? '🤖 Luna AI' : '💬 Поддержка'}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="text-center py-10 animate-fade-in">
            <span className="text-5xl mb-4 block">
              {activeTab === 'ai' ? '🤖' : '💬'}
            </span>
            <h3 className="font-bold mb-2">
              {activeTab === 'ai' ? 'Luna AI' : 'Поддержка'}
            </h3>
            <p className="text-sm text-white/35 mb-4">
              {activeTab === 'ai'
                ? 'Задайте любой вопрос!'
                : 'Опишите вашу проблему'}
            </p>

            {/* Quick questions */}
            {activeTab === 'ai' && (
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="glass rounded-xl px-3 py-2 text-xs text-white/50 active:scale-95 transition-transform"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[85%] rounded-2xl px-4 py-3 text-[13px]
                ${
                  msg.role === 'user'
                    ? 'bg-white text-black rounded-br-sm'
                    : msg.role === 'system'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15 rounded-xl'
                    : 'glass rounded-bl-sm'
                }
              `}
            >
              <p className="whitespace-pre-line">{msg.content}</p>
              <p
                className={`text-[10px] mt-1 ${
                  msg.role === 'user' ? 'text-black/35' : 'text-white/25'
                }`}
              >
                {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-5 pb-24 pt-2">
        <div className="glass flex items-center px-4 gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Сообщение..."
            className="flex-1 bg-transparent py-3 text-white outline-none text-sm"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim()}
            className="text-white/50 disabled:text-white/15 text-lg transition-colors"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
