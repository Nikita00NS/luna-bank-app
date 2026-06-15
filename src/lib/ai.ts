/**
 * Luna Bank — AI Chat via OpenRouter
 * 
 * Uses Llama 3.1 8B via OpenRouter API.
 * Key is in client code — for production, move to Edge Function.
 */

const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'meta-llama/llama-3.1-8b-instruct';

const SYSTEM_PROMPT = `Ты — Luna AI, умный ассистент крипто-банка Luna Bank.

О банке:
- Luna Bank — крипто-финансовая экосистема в Telegram
- Валюта: Luna Coin (LNC), 1 LNC = $0.05
- Поддерживает: TON, BTC, ETH, USDT, LNC
- 6 типов счетов: Личный, Бизнес, TON, USDT, Bitcoin, Ethereum
- 3 подписки: Free (0.5% комиссия), Plus ($4.99, 0.3%), Cosmic ($19.99, 0%)
- Карты: виртуальная ($0), премиум ($4.99), пластик ($19.99)
- KYC: 8 шагов верификации, лимиты до $50K/мес
- Luna City: мини-игры с заработком LNC
- NFT маркетплейс, Swap обмен, биржа Pro, стейкинг до 12%
- Гарант-сервис (эскроу) с комиссией 2%
- Оплата услуг: связь, интернет, ЖКХ, игры

Правила ответа:
- Отвечай на русском
- Кратко и по делу (2-5 предложений)
- Используй эмодзи для наглядности
- Если не знаешь точный ответ — предложи обратиться в поддержку
- Не выдумывай функции которых нет`;

/**
 * Send message to AI and get response
 */
export async function getAIResponse(userMessage: string): Promise<string> {
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      console.warn('[AI] OpenRouter error:', res.status);
      return fallbackResponse(userMessage);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return fallbackResponse(userMessage);
    }

    return reply.trim();
  } catch (err) {
    console.warn('[AI] Request failed:', err);
    return fallbackResponse(userMessage);
  }
}

/**
 * Fallback responses when API is unavailable
 */
function fallbackResponse(msg: string): string {
  const lower = msg.toLowerCase();
  
  if (lower.includes('перевод') || lower.includes('отправить'))
    return '📤 Для перевода: Главная → Перевод → найдите получателя → введите сумму → подтвердите. Комиссия зависит от подписки (0-0.5%).';
  if (lower.includes('счёт') || lower.includes('открыть'))
    return '🏦 Откройте счёт: Счета → + Открыть → выберите тип → заполните данные → подпишите договор электронной подписью.';
  if (lower.includes('lnc') || lower.includes('луна'))
    return '🌙 Luna Coin (LNC) — валюта Luna Bank. 1 LNC = $0.05. Для переводов, подписок, покупок внутри экосистемы.';
  if (lower.includes('ton') || lower.includes('кошел'))
    return '🔗 Подключите TON-кошелёк: Профиль → TON-кошелёк → выберите Tonkeeper или другой → подтвердите. Авто-создание счетов TON/USDT/BTC/ETH.';
  if (lower.includes('привет') || lower.includes('здравствуй'))
    return '👋 Привет! Я Luna AI — ваш помощник. Спросите про переводы, счета, крипту, игры или любую функцию Luna Bank!';
  
  return '🤔 Сейчас не могу подключиться к AI. Попробуйте позже или напишите в Поддержку. Могу помочь с базовыми вопросами о переводах, счетах, криптовалютах.';
}
