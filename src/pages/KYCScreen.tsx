import React, { useState, useRef } from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';
import { dbSubmitKYC, dbUpdateUser } from '../lib/sync';
import { supabase } from '../lib/supabase';
import { notifyUser } from '../lib/telegram-bot';

const STEPS = [
  { num: 1, title: 'Телефон', icon: '📱', desc: 'Номер для связи' },
  { num: 2, title: 'Email', icon: '📧', desc: 'Электронная почта' },
  { num: 3, title: 'Данные', icon: '👤', desc: 'ФИО и дата рождения' },
  { num: 4, title: 'Паспорт', icon: '📄', desc: 'Фото главной страницы' },
  { num: 5, title: 'Селфи', icon: '🤳', desc: 'Фото с документом' },
  { num: 6, title: 'Адрес', icon: '🏠', desc: 'Адрес проживания' },
  { num: 7, title: 'Проверка', icon: '✅', desc: 'Подтверждение данных' },
  { num: 8, title: 'Соглашение', icon: '📝', desc: 'Подпись' },
];

export default function KYCScreen() {
  const { user, go, patchUser } = useStore();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [passport, setPassport] = useState<File | null>(null);
  const [passportPreview, setPassportPreview] = useState('');
  const [selfie, setSelfie] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const passportRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  if (user.kyc_status === 'approved') return (
    <div className="h-full flex flex-col items-center justify-center px-5 safe-top animate-fade-in">
      <div className="w-24 h-24 rounded-full bg-emerald-500/15 flex items-center justify-center text-5xl mb-5 animate-check-pop">✅</div>
      <h2 className="text-2xl font-extrabold mb-2">KYC пройден</h2>
      <p className="text-white/35 text-sm mb-2">Верификация подтверждена</p>
      <div className="glass rounded-xl p-4 w-full max-w-sm mb-6 space-y-1.5">
        {[['Статус', '✅ Одобрено'], ['Лимиты', 'до $50,000/мес'], ['Дата', new Date().toLocaleDateString('ru-RU')]].map(([l, v]) => (
          <div key={l} className="flex justify-between text-sm"><span className="text-white/30">{l}</span><span className="font-medium">{v}</span></div>
        ))}
      </div>
      <button onClick={() => go('profile')} className="btn-primary px-8">Назад</button>
    </div>
  );

  if (user.kyc_status === 'pending') return (
    <div className="h-full flex flex-col items-center justify-center px-5 safe-top animate-fade-in">
      <div className="w-24 h-24 rounded-full bg-amber-500/15 flex items-center justify-center text-5xl mb-5 animate-float">⏳</div>
      <h2 className="text-2xl font-extrabold mb-2">На проверке</h2>
      <p className="text-white/35 text-sm mb-2">Обычно 1-2 рабочих дня</p>
      <div className="glass rounded-xl p-4 w-full max-w-sm mb-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <p className="text-sm text-white/50">Ваша заявка обрабатывается</p>
        </div>
      </div>
      <button onClick={() => go('profile')} className="btn-primary px-8">Назад</button>
    </div>
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'passport' | 'selfie') => {
    const file = e.target.files?.[0];
    if (!file) return;
    haptic('light');
    const url = URL.createObjectURL(file);
    if (type === 'passport') { setPassport(file); setPassportPreview(url); }
    else { setSelfie(file); setSelfiePreview(url); }
  };

  const next = () => { haptic('medium'); if (step < 8) setStep(step + 1); };

  const submit = async () => {
    haptic('success');
    setSubmitting(true);

    try {
      // Upload files to Supabase Storage if available
      if (passport) {
        const path = `kyc/${user.telegram_id}/passport_${Date.now()}.${passport.name.split('.').pop()}`;
        await supabase.storage.from('kyc-documents').upload(path, passport).catch(() => {});
      }
      if (selfie) {
        const path = `kyc/${user.telegram_id}/selfie_${Date.now()}.${selfie.name.split('.').pop()}`;
        await supabase.storage.from('kyc-documents').upload(path, selfie).catch(() => {});
      }

      // Submit KYC data
      await dbSubmitKYC(user.telegram_id, { phone, email, birth_date: birthDate });
    } catch (e) {
      console.warn('KYC submit error:', e);
    }

    patchUser({ kyc_status: 'pending' as const });
    setSubmitting(false);
    go('profile');
  };

  const canNext = () => {
    switch (step) {
      case 1: return phone.length >= 5;
      case 2: return email.includes('@');
      case 3: return fullName.length >= 3 && birthDate;
      case 4: return !!passport;
      case 5: return !!selfie;
      case 6: return address.length >= 5 && city.length >= 2;
      case 7: return true;
      case 8: return agreed && scrolled;
      default: return false;
    }
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => step > 1 ? setStep(step - 1) : go('profile')} className="text-white/50 text-sm">← Назад</button>
        <h1 className="font-bold flex-1">🔐 Верификация KYC</h1>
        <span className="text-xs text-white/25 tabular-nums">{step}/8</span>
      </div>

      {/* Progress */}
      <div className="px-5 mb-2">
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500" style={{ width: `${(step / 8) * 100}%` }} />
        </div>
      </div>

      {/* Step indicators */}
      <div className="px-5 mb-4 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {STEPS.map(s => (
            <div key={s.num} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium transition-all ${
              s.num === step ? 'bg-white/10 text-white' :
              s.num < step ? 'text-emerald-400/60' : 'text-white/15'
            }`}>
              {s.num < step ? '✓' : s.icon} {s.title}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-5 overflow-y-auto pb-8 animate-fade-in" key={step}>
        {/* Step 1: Phone */}
        {step === 1 && (
          <div>
            <div className="text-center mb-6">
              <span className="text-5xl block mb-3">📱</span>
              <h2 className="text-xl font-extrabold">Номер телефона</h2>
              <p className="text-sm text-white/30 mt-1">Для связи и подтверждения</p>
            </div>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+7 (999) 123-45-67"
              className="w-full glass rounded-xl px-4 py-4 bg-transparent text-white outline-none text-lg text-center focus:ring-1 focus:ring-white/10" />
          </div>
        )}

        {/* Step 2: Email */}
        {step === 2 && (
          <div>
            <div className="text-center mb-6">
              <span className="text-5xl block mb-3">📧</span>
              <h2 className="text-xl font-extrabold">Email</h2>
              <p className="text-sm text-white/30 mt-1">Для уведомлений о статусе</p>
            </div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full glass rounded-xl px-4 py-4 bg-transparent text-white outline-none text-lg text-center focus:ring-1 focus:ring-white/10" />
          </div>
        )}

        {/* Step 3: Personal data */}
        {step === 3 && (
          <div>
            <div className="text-center mb-6">
              <span className="text-5xl block mb-3">👤</span>
              <h2 className="text-xl font-extrabold">Личные данные</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/30 mb-1 block">ФИО (как в паспорте)</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Иванов Иван Сергеевич"
                  className="w-full glass rounded-xl px-4 py-3.5 bg-transparent text-white outline-none focus:ring-1 focus:ring-white/10" />
              </div>
              <div>
                <label className="text-xs text-white/30 mb-1 block">Дата рождения</label>
                <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                  className="w-full glass rounded-xl px-4 py-3.5 bg-transparent text-white outline-none focus:ring-1 focus:ring-white/10" />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Passport */}
        {step === 4 && (
          <div>
            <div className="text-center mb-6">
              <span className="text-5xl block mb-3">📄</span>
              <h2 className="text-xl font-extrabold">Фото паспорта</h2>
              <p className="text-sm text-white/30 mt-1">Главная страница с фото</p>
            </div>
            <input ref={passportRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFile(e, 'passport')} />
            <button onClick={() => passportRef.current?.click()}
              className={`w-full rounded-2xl p-8 flex flex-col items-center gap-3 transition-all active:scale-[0.98] ${
                passport ? 'glass ring-1 ring-emerald-500/30' : 'glass border border-dashed border-white/10'
              }`}>
              {passportPreview ? (
                <img src={passportPreview} className="w-32 h-20 object-cover rounded-lg" alt="" />
              ) : (
                <span className="text-5xl">📷</span>
              )}
              <p className="text-sm text-white/40">{passport ? `✅ ${passport.name}` : 'Нажмите для загрузки'}</p>
            </button>
            <p className="text-[11px] text-white/20 text-center mt-3">Принимаются: JPG, PNG. Макс. 10 МБ</p>
          </div>
        )}

        {/* Step 5: Selfie */}
        {step === 5 && (
          <div>
            <div className="text-center mb-6">
              <span className="text-5xl block mb-3">🤳</span>
              <h2 className="text-xl font-extrabold">Селфи с документом</h2>
              <p className="text-sm text-white/30 mt-1">Держите паспорт рядом с лицом</p>
            </div>
            <input ref={selfieRef} type="file" accept="image/*" capture="user" className="hidden" onChange={e => handleFile(e, 'selfie')} />
            <button onClick={() => selfieRef.current?.click()}
              className={`w-full rounded-2xl p-8 flex flex-col items-center gap-3 transition-all active:scale-[0.98] ${
                selfie ? 'glass ring-1 ring-emerald-500/30' : 'glass border border-dashed border-white/10'
              }`}>
              {selfiePreview ? (
                <img src={selfiePreview} className="w-32 h-32 object-cover rounded-full" alt="" />
              ) : (
                <span className="text-5xl">🤳</span>
              )}
              <p className="text-sm text-white/40">{selfie ? `✅ ${selfie.name}` : 'Нажмите для загрузки'}</p>
            </button>
          </div>
        )}

        {/* Step 6: Address */}
        {step === 6 && (
          <div>
            <div className="text-center mb-6">
              <span className="text-5xl block mb-3">🏠</span>
              <h2 className="text-xl font-extrabold">Адрес проживания</h2>
            </div>
            <div className="space-y-3">
              <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="Страна"
                className="w-full glass rounded-xl px-4 py-3.5 bg-transparent text-white outline-none focus:ring-1 focus:ring-white/10" />
              <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Город"
                className="w-full glass rounded-xl px-4 py-3.5 bg-transparent text-white outline-none focus:ring-1 focus:ring-white/10" />
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Улица, дом, квартира"
                className="w-full glass rounded-xl px-4 py-3.5 bg-transparent text-white outline-none focus:ring-1 focus:ring-white/10" />
            </div>
          </div>
        )}

        {/* Step 7: Review */}
        {step === 7 && (
          <div>
            <div className="text-center mb-6">
              <span className="text-5xl block mb-3">✅</span>
              <h2 className="text-xl font-extrabold">Проверьте данные</h2>
            </div>
            <div className="glass rounded-2xl divide-y divide-white/[0.04]">
              {[
                ['📱 Телефон', phone], ['📧 Email', email], ['👤 ФИО', fullName],
                ['🎂 Дата рождения', birthDate], ['📄 Паспорт', passport ? '✅ Загружен' : '❌'],
                ['🤳 Селфи', selfie ? '✅ Загружено' : '❌'], ['🏠 Адрес', `${city}, ${address}`],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between p-3 text-sm">
                  <span className="text-white/30">{l}</span>
                  <span className="text-right max-w-[60%] truncate">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 8: Agreement */}
        {step === 8 && (
          <div>
            <div className="text-center mb-4">
              <span className="text-5xl block mb-3">📝</span>
              <h2 className="text-xl font-extrabold">Соглашение</h2>
            </div>
            <div onScroll={e => { const el = e.target as HTMLDivElement; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) setScrolled(true); }}
              className="glass rounded-2xl p-4 overflow-y-auto text-[13px] text-white/50 leading-relaxed mb-4 max-h-[35vh]">
              <p className="mb-3">Я, {fullName || user.first_name + ' ' + user.last_name}, подтверждаю:</p>
              <p className="mb-2">1. Все предоставленные данные являются достоверными и принадлежат мне лично.</p>
              <p className="mb-2">2. Загруженные документы являются подлинными и не подвергались модификации.</p>
              <p className="mb-2">3. Я даю согласие на обработку персональных данных в соответствии с Политикой конфиденциальности Luna Bank.</p>
              <p className="mb-2">4. Предоставление ложной информации может привести к отказу в верификации и блокировке аккаунта.</p>
              <p className="mb-2">5. После одобрения лимиты будут увеличены до $50,000 в месяц.</p>
              <p className="mb-2">6. Обработка заявки занимает от 1 до 5 рабочих дней.</p>
              <p className="mt-4 text-white/30">Дата: {new Date().toLocaleDateString('ru-RU')}</p>
            </div>
            {!scrolled && <p className="text-[11px] text-white/20 text-center mb-2 animate-pulse">↓ Прокрутите до конца</p>}
            <label className={`flex items-center gap-3 mb-4 transition-opacity ${scrolled ? '' : 'opacity-25 pointer-events-none'}`}>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${agreed ? 'bg-white border-white' : 'border-white/20'}`}
                onClick={() => setAgreed(!agreed)}>
                {agreed && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <span className="text-[13px]">Я подтверждаю достоверность данных</span>
            </label>
          </div>
        )}

        {/* Navigation button */}
        <button onClick={step === 8 ? submit : next} disabled={!canNext() || submitting}
          className="btn-primary w-full mt-6">
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              Отправка...
            </span>
          ) : step === 8 ? '📤 Отправить на проверку' : 'Далее →'}
        </button>
      </div>
    </div>
  );
}
