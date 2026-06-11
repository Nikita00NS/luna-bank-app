import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';
import { ArrowLeftIcon } from '../components/Icons';

const FAQ_ITEMS = [
  { q: 'Как открыть счёт?', a: 'Счета → «+ Открыть» → выберите тип → заполните данные → подпишите договор электронной подписью.' },
  { q: 'Как пополнить счёт?', a: 'На странице счёта → «Пополнить» → купить за крипту через TON-кошелёк или получить перевод.' },
  { q: 'Как перевести деньги?', a: '«Переводы» → найти по @username или Luna ID → выбрать счёт и сумму → подтвердить.' },
  { q: 'Какие комиссии?', a: 'Free: 0.5%, Plus: 0.3%, Cosmic: 0%. Автоматически рассчитывается от суммы.' },
  { q: 'Что такое LNC?', a: 'Luna Coin — внутренняя валюта. 1 LNC = $0.05 (5 центов). Для переводов, подписок, покупок.' },
  { q: 'Как подключить TON-кошелёк?', a: 'Профиль → TON-кошелёк. Поддерживаются Tonkeeper, MyTonWallet, Wallet, Tonhub.' },
  { q: 'Как пройти KYC?', a: 'Профиль → Верификация → 8 шагов → лимиты до $50,000/мес после одобрения.' },
  { q: 'Как оформить карту?', a: 'Страница счёта → «Оформить карту». Виртуальная $0, премиум $4.99, пластик $19.99.' },
  { q: 'Как сменить PIN?', a: 'Профиль → Безопасность → Сменить PIN.' },
  { q: 'Как работает гарант-сервис?', a: 'Создайте сделку → средства замораживаются → продавец доставляет → вы подтверждаете → деньги уходят продавцу.' },
  { q: 'Что такое Luna City?', a: 'Мини-игры: выбирайте профессии, играйте и зарабатывайте реальные LNC на свой счёт.' },
  { q: 'Как связаться с поддержкой?', a: '«Чаты» → «Поддержка». AI-бот ответит на вопросы, при необходимости подключит оператора.' },
];

export default function FAQScreen() {
  const { go } = useStore();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('profile')} className="text-white/50">
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="font-bold flex-1">Частые вопросы</h1>
      </div>

      {/* FAQ Accordion */}
      <div className="px-5 mt-4 space-y-2">
        {FAQ_ITEMS.map((item, i) => (
          <div
            key={i}
            className="glass overflow-hidden animate-slide-up"
            style={{ animationDelay: `${i * 0.03}s` }}
          >
            {/* Question */}
            <button
              onClick={() => {
                haptic('light');
                setOpenIdx(openIdx === i ? null : i);
              }}
              className="w-full p-4 flex items-center gap-3 text-left"
            >
              <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-xs text-white/40 flex-shrink-0">
                ?
              </div>
              <span className="flex-1 text-[13px] font-medium">
                {item.q}
              </span>
              <span
                className={`
                  text-white/20 transition-transform text-xs
                  ${openIdx === i ? 'rotate-180' : ''}
                `}
              >
                ▼
              </span>
            </button>

            {/* Answer */}
            {openIdx === i && (
              <div className="px-4 pb-4 pt-0 animate-fade-in">
                <p className="text-[13px] text-white/50 leading-relaxed pl-9">
                  {item.a}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
