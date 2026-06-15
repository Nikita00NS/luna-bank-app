import React, { useState, useRef } from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';
import { dbSubmitKYC, dbUpdateUser } from '../lib/db';
import { supabase } from '../lib/supabase';
import { ArrowLeftIcon, CheckIcon } from '../components/Icons';

const STEP_INFO = [
  { num: 1, title: 'Телефон', icon: '📱' },
  { num: 2, title: 'Email', icon: '📧' },
  { num: 3, title: 'Данные', icon: '👤' },
  { num: 4, title: 'Паспорт', icon: '📄' },
  { num: 5, title: 'Селфи', icon: '🤳' },
  { num: 6, title: 'Адрес', icon: '🏠' },
  { num: 7, title: 'Проверка', icon: '✅' },
  { num: 8, title: 'Согласие', icon: '📝' },
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
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const passRef = useRef<HTMLInputElement>(null);
  const selfRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  // Status screens
  if (user.kyc_status === 'approved') {
    return (
      <div className="h-full flex flex-col items-center justify-center px-5 safe-top animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-emerald-500/15 flex items-center justify-center mb-5 animate-check-pop">
          <CheckIcon size={48} color="#34d399" />
        </div>
        <h2 className="text-2xl font-extrabold mb-2">KYC пройден</h2>
        <p className="text-white/35 text-sm mb-2">Верификация подтверждена</p>
        <div className="glass p-4 w-full max-w-sm mb-6 space-y-1.5">
          {[['Статус', '✅ Одобрено'], ['Лимиты', 'до $50,000/мес']].map(([l, v]) => (
            <div key={l} className="flex justify-between text-sm">
              <span className="text-white/30">{l}</span><span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
        <button onClick={() => go('profile')} className="btn-primary px-8">Назад</button>
      </div>
    );
  }

  if (user.kyc_status === 'pending') {
    return (
      <div className="h-full flex flex-col items-center justify-center px-5 safe-top animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-amber-500/15 flex items-center justify-center text-5xl mb-5 animate-float">⏳</div>
        <h2 className="text-2xl font-extrabold mb-2">На проверке</h2>
        <p className="text-white/35 text-sm mb-6">Обычно 1-2 рабочих дня</p>
        <button onClick={() => go('profile')} className="btn-primary px-8">Назад</button>
      </div>
    );
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'passport' | 'selfie') => {
    const file = e.target.files?.[0];
    if (!file) return;
    haptic('light');
    if (type === 'passport') { setPassport(file); setPassportPreview(URL.createObjectURL(file)); }
    else { setSelfie(file); setSelfiePreview(URL.createObjectURL(file)); }
  };

  const canNext = () => {
    switch (step) {
      case 1: return phone.length >= 5;
      case 2: return email.includes('@');
      case 3: return fullName.length >= 3 && birthDate;
      case 4: return !!passport;
      case 5: return !!selfie;
      case 6: return address.length >= 3 && city.length >= 2;
      case 7: return true;
      case 8: return agreed && scrolled;
      default: return false;
    }
  };

  const next = () => { haptic('medium'); if (step < 8) setStep(step + 1); };

  const submit = async () => {
    haptic('success');
    setSubmitting(true);
    try {
      // Upload files
      if (passport) {
        const path = `kyc/${user.telegram_id}/passport_${Date.now()}.${passport.name.split('.').pop()}`;
        await supabase.storage.from('kyc-documents').upload(path, passport).catch(() => {});
      }
      if (selfie) {
        const path = `kyc/${user.telegram_id}/selfie_${Date.now()}.${selfie.name.split('.').pop()}`;
        await supabase.storage.from('kyc-documents').upload(path, selfie).catch(() => {});
      }
      await dbSubmitKYC(user.telegram_id, { phone, email, birth_date: birthDate });
    } catch {}
    patchUser({ kyc_status: 'pending' as const });
    setSubmitting(false);
    go('profile');
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => step > 1 ? setStep(step - 1) : go('profile')} className="text-white/50">
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="font-bold flex-1">Верификация KYC</h1>
        <span className="text-xs text-white/25 mono">{step}/8</span>
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
          {STEP_INFO.map((s) => (
            <div key={s.num} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium ${
              s.num === step ? 'bg-white/10 text-white' : s.num < step ? 'text-emerald-400/60' : 'text-white/15'
            }`}>
              {s.num < step ? '✓' : s.icon} {s.title}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 overflow-y-auto pb-8 animate-fade-in" key={step}>
        {step === 1 && (
          <StepLayout icon="📱" title="Номер телефона" desc="Для связи и подтверждения">
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (999) 123-45-67"
              className="w-full glass px-4 py-4 bg-transparent text-white outline-none text-lg text-center focus:ring-1 focus:ring-white/10" />
          </StepLayout>
        )}
        {step === 2 && (
          <StepLayout icon="📧" title="Email" desc="Для уведомлений о статусе">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com"
              className="w-full glass px-4 py-4 bg-transparent text-white outline-none text-lg text-center focus:ring-1 focus:ring-white/10" />
          </StepLayout>
        )}
        {step === 3 && (
          <StepLayout icon="👤" title="Личные данные">
            <div className="space-y-3">
              <div><label className="text-xs text-white/30 mb-1 block">ФИО (как в паспорте)</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Иванов Иван Сергеевич"
                  className="w-full glass px-4 py-3.5 bg-transparent text-white outline-none focus:ring-1 focus:ring-white/10" /></div>
              <div><label className="text-xs text-white/30 mb-1 block">Дата рождения</label>
                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full glass px-4 py-3.5 bg-transparent text-white outline-none focus:ring-1 focus:ring-white/10" /></div>
            </div>
          </StepLayout>
        )}
        {step === 4 && (
          <StepLayout icon="📄" title="Фото паспорта" desc="Главная страница с фото">
            <input ref={passRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e, 'passport')} />
            <button onClick={() => passRef.current?.click()}
              className={`w-full rounded-2xl p-8 flex flex-col items-center gap-3 active:scale-[0.98] transition-all ${passport ? 'glass ring-1 ring-emerald-500/30' : 'glass border border-dashed border-white/10'}`}>
              {passportPreview ? <img src={passportPreview} className="w-32 h-20 object-cover rounded-lg" alt="" /> : <span className="text-5xl">📷</span>}
              <p className="text-sm text-white/40">{passport ? `✅ ${passport.name}` : 'Нажмите для загрузки'}</p>
            </button>
          </StepLayout>
        )}
        {step === 5 && (
          <StepLayout icon="🤳" title="Селфи с документом" desc="Держите паспорт рядом с лицом">
            <input ref={selfRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => handleFile(e, 'selfie')} />
            <button onClick={() => selfRef.current?.click()}
              className={`w-full rounded-2xl p-8 flex flex-col items-center gap-3 active:scale-[0.98] transition-all ${selfie ? 'glass ring-1 ring-emerald-500/30' : 'glass border border-dashed border-white/10'}`}>
              {selfiePreview ? <img src={selfiePreview} className="w-32 h-32 object-cover rounded-full" alt="" /> : <span className="text-5xl">🤳</span>}
              <p className="text-sm text-white/40">{selfie ? `✅ ${selfie.name}` : 'Нажмите для загрузки'}</p>
            </button>
          </StepLayout>
        )}
        {step === 6 && (
          <StepLayout icon="🏠" title="Адрес проживания">
            <div className="space-y-3">
              <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Страна"
                className="w-full glass px-4 py-3.5 bg-transparent text-white outline-none focus:ring-1 focus:ring-white/10" />
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Город"
                className="w-full glass px-4 py-3.5 bg-transparent text-white outline-none focus:ring-1 focus:ring-white/10" />
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Улица, дом, квартира"
                className="w-full glass px-4 py-3.5 bg-transparent text-white outline-none focus:ring-1 focus:ring-white/10" />
            </div>
          </StepLayout>
        )}
        {step === 7 && (
          <StepLayout icon="✅" title="Проверьте данные">
            <div className="glass divide-y divide-white/[0.04]">
              {[['📱', phone], ['📧', email], ['👤', fullName], ['🎂', birthDate],
                ['📄', passport ? '✅ Загружен' : '❌'], ['🤳', selfie ? '✅ Загружено' : '❌'],
                ['🏠', `${city}, ${address}`]
              ].map(([icon, val]) => (
                <div key={icon} className="flex justify-between p-3 text-sm">
                  <span className="text-white/30">{icon}</span>
                  <span className="text-right max-w-[70%] truncate">{val}</span>
                </div>
              ))}
            </div>
          </StepLayout>
        )}
        {step === 8 && (
          <StepLayout icon="📝" title="Соглашение">
            <div onScroll={(e) => { const el = e.target as HTMLDivElement; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) setScrolled(true); }}
              className="glass p-4 overflow-y-auto text-[13px] text-white/50 leading-relaxed mb-4 min-h-[200px]">
              <p className="mb-3">Я, {fullName || user.first_name}, подтверждаю:</p>
              <p className="mb-2">1. Все предоставленные данные достоверны.</p>
              <p className="mb-2">2. Загруженные документы подлинные.</p>
              <p className="mb-2">3. Даю согласие на обработку персональных данных.</p>
              <p className="mb-2">4. Ложная информация = блокировка аккаунта.</p>
              <p className="mb-2">5. После одобрения: лимиты до $50,000/мес.</p>
              <p className="mb-2">6. Обработка: 1-5 рабочих дней.</p>
              <p className="mt-4 text-white/25">Дата: {new Date().toLocaleDateString('ru-RU')}</p>
            </div>
            {!scrolled && <p className="text-[11px] text-white/20 text-center mb-2 animate-pulse">↓ Прокрутите до конца</p>}
            <label className={`flex items-center gap-3 mb-4 ${scrolled ? '' : 'opacity-25 pointer-events-none'}`}>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${agreed ? 'bg-white border-white' : 'border-white/20'}`}
                onClick={() => setAgreed(!agreed)}>
                {agreed && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <span className="text-[13px]">Подтверждаю достоверность данных</span>
            </label>
          </StepLayout>
        )}

        <button onClick={step === 8 ? submit : next} disabled={!canNext() || submitting} className="btn-primary w-full mt-6">
          {submitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />Отправка...</span>
            : step === 8 ? '📤 Отправить на проверку' : 'Далее →'}
        </button>
      </div>
    </div>
  );
}

function StepLayout({ icon, title, desc, children }: { icon: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-center mb-6">
        <span className="text-5xl block mb-3">{icon}</span>
        <h2 className="text-xl font-extrabold">{title}</h2>
        {desc && <p className="text-sm text-white/30 mt-1">{desc}</p>}
      </div>
      {children}
    </div>
  );
}
