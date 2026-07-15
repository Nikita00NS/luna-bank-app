/**
 * Luna Wallet v2 — Multi-language System (RU / EN)
 */

export type Lang = 'ru' | 'en';

export const STRINGS: Record<Lang, Record<string, string>> = {
  ru: {
    'app.name': 'Luna Wallet',
    'app.tagline': 'Крипто-кошелёк на TON',
    'common.loading': 'Загрузка...',
    'common.error': 'Ошибка',
    'common.success': 'Успешно',
    'common.copy': 'Копировать',
    'common.copied': 'Скопировано',
    'common.cancel': 'Отмена',
    'common.confirm': 'Подтвердить',
    'common.save': 'Сохранить',
    'common.delete': 'Удалить',
    'common.close': 'Закрыть',
    'common.retry': 'Попробовать снова',
    'common.all': 'Все',

    'nav.home': 'Кошелёк',
    'nav.swap': 'Обмен',
    'nav.portfolio': 'Портфель',
    'nav.p2p': 'P2P',
    'nav.settings': 'Настройки',

    'wallet.total_balance': 'Общий баланс',
    'wallet.connect': 'Подключить кошелёк',
    'wallet.disconnect': 'Отключить',
    'wallet.connected': 'Кошелёк подключён',
    'wallet.send': 'Отправить',
    'wallet.receive': 'Получить',
    'wallet.swap': 'Обменять',
    'wallet.scan': 'Сканировать',
    'wallet.assets': 'Активов',
    'wallet.no_assets': 'Нет активов',
    'wallet.top_up': 'Пополните кошелёк',
    'wallet.history': 'История',
    'wallet.manage': 'Управлять',
    'wallet.add_token': 'Добавить токен',

    'send.title': 'Отправить',
    'send.amount': 'Сумма',
    'send.address': 'Адрес получателя',
    'send.comment': 'Комментарий (необязательно)',
    'send.max': 'Макс',
    'send.sending': 'Отправка...',
    'send.sent': 'Отправлено!',
    'send.insufficient': 'Недостаточно средств',
    'send.invalid_address': 'Неверный адрес TON',
    'send.enter_address': 'EQ... или .ton домен',

    'receive.title': 'Получить',
    'receive.address': 'Адрес кошелька',
    'receive.request_amount': 'Запросить сумму (необязательно)',
    'receive.share': 'Поделиться',

    'swap.title': 'Обмен',
    'swap.from': 'Отдаёте',
    'swap.to': 'Получаете',
    'swap.balance': 'Баланс',
    'swap.best_rate': 'Поиск лучшего курса...',
    'swap.routes': 'Доступные маршруты',
    'swap.completed': 'Обмен выполнен!',
    'swap.slippage': 'Проскальзывание',
    'swap.fee': 'Комиссия',

    'p2p.title': 'P2P Торговля',
    'p2p.buy': 'Купить',
    'p2p.sell': 'Продать',
    'p2p.create': 'Создать',
    'p2p.amount': 'Количество',
    'p2p.to_pay': 'К оплате',
    'p2p.trading': 'Обработка...',
    'p2p.rate': 'Курс',
    'p2p.payment_method': 'Способ оплаты',
    'p2p.limits': 'Лимиты',
    'p2p.deals': 'сделок',

    'portfolio.title': 'Портфель',
    'portfolio.my': 'Мой портфель',
    'portfolio.market': 'Рынок',
    'portfolio.search': 'Поиск монет...',
    'portfolio.price_change': 'Изменение за 24ч',

    'history.title': 'История',
    'history.all': 'Все',
    'history.incoming': 'Получено',
    'history.outgoing': 'Отправлено',
    'history.empty': 'История пуста',

    'settings.title': 'Настройки',
    'settings.wallet': 'Кошелёк',
    'settings.security': 'Безопасность',
    'settings.general': 'Общие',
    'settings.pin': 'PIN-код',
    'settings.language': 'Язык',
    'settings.currency': 'Валюта',
    'settings.notifications': 'Уведомления',
    'settings.about': 'О приложении',
    'settings.logout': 'Выйти из аккаунта',
    'settings.version': 'v2.0.0',

    'nft.title': 'NFT Коллекция',
    'nft.empty': 'NFT не найдены',

    'notif.title': 'Уведомления',
    'notif.empty': 'Нет уведомлений',
    'notif.read_all': 'Прочитать все',

    'qr.scan': 'Сканировать QR',
    'qr.manual': 'Или введите адрес вручную',

    'ble.title': 'BLE передача',
    'ble.scan': 'Найти устройства',
    'ble.connected': 'Подключено',
    'ble.searching': 'Поиск устройств...',

    'nfc.title': 'NFC-оплата',
    'nfc.scanning': 'Сканирование...',
    'nfc.hold': 'Приложите телефон',

    'agg.title': 'Агрегатор обменников',
    'agg.best': 'Лучшие курсы на внешних сервисах',
    'agg.estimate': 'По лучшему курсу',

    'tx.detail': 'Детали',
    'tx.status': 'Статус',
    'tx.sender': 'Отправитель',
    'tx.receiver': 'Получатель',
    'tx.fee': 'Комиссия',
    'tx.date': 'Дата',
    'tx.hash': 'Tx Hash',
    'tx.open_explorer': 'Открыть в TON Viewer',
    'tx.completed': 'Выполнено',
    'tx.pending': 'В обработке',
    'tx.failed': 'Ошибка',

    'confirm.title': 'Подтверждение',
    'confirm.pin': 'Введите PIN-код',
    'confirm.wrong_pin': 'Неверный PIN-код',
    'confirm.confirm_button': 'Подтвердить',
    'confirm.cancel_button': 'Отменить',

    'auth.welcome': 'Добро пожаловать в Luna Wallet!',

    'error.boundary': 'Что-то пошло не так',
    'error.occurred': 'Произошла ошибка',
    'error.no_data': 'Нет данных для подтверждения',

    'time.just_now': 'только что',
    'time.min_ago': 'мин назад',
    'time.h_ago': 'ч назад',
    'time.d_ago': 'д назад',
  },
  en: {
    'app.name': 'Luna Wallet',
    'app.tagline': 'Crypto wallet on TON',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.copy': 'Copy',
    'common.copied': 'Copied',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.close': 'Close',
    'common.retry': 'Try again',
    'common.all': 'All',

    'nav.home': 'Wallet',
    'nav.swap': 'Swap',
    'nav.portfolio': 'Portfolio',
    'nav.p2p': 'P2P',
    'nav.settings': 'Settings',

    'wallet.total_balance': 'Total Balance',
    'wallet.connect': 'Connect Wallet',
    'wallet.disconnect': 'Disconnect',
    'wallet.connected': 'Wallet connected',
    'wallet.send': 'Send',
    'wallet.receive': 'Receive',
    'wallet.swap': 'Swap',
    'wallet.scan': 'Scan',
    'wallet.assets': 'Assets',
    'wallet.no_assets': 'No assets',
    'wallet.top_up': 'Top up your wallet',
    'wallet.history': 'History',
    'wallet.manage': 'Manage',
    'wallet.add_token': 'Add token',

    'send.title': 'Send',
    'send.amount': 'Amount',
    'send.address': 'Recipient address',
    'send.comment': 'Comment (optional)',
    'send.max': 'Max',
    'send.sending': 'Sending...',
    'send.sent': 'Sent!',
    'send.insufficient': 'Insufficient funds',
    'send.invalid_address': 'Invalid TON address',
    'send.enter_address': 'EQ... or .ton domain',

    'receive.title': 'Receive',
    'receive.address': 'Wallet address',
    'receive.request_amount': 'Request amount (optional)',
    'receive.share': 'Share',

    'swap.title': 'Swap',
    'swap.from': 'You pay',
    'swap.to': 'You receive',
    'swap.balance': 'Balance',
    'swap.best_rate': 'Finding best rate...',
    'swap.routes': 'Available routes',
    'swap.completed': 'Swap completed!',
    'swap.slippage': 'Slippage',
    'swap.fee': 'Fee',

    'p2p.title': 'P2P Trading',
    'p2p.buy': 'Buy',
    'p2p.sell': 'Sell',
    'p2p.create': 'Create',
    'p2p.amount': 'Amount',
    'p2p.to_pay': 'To pay',
    'p2p.trading': 'Processing...',
    'p2p.rate': 'Rate',
    'p2p.payment_method': 'Payment method',
    'p2p.limits': 'Limits',
    'p2p.deals': 'deals',

    'portfolio.title': 'Portfolio',
    'portfolio.my': 'My Portfolio',
    'portfolio.market': 'Market',
    'portfolio.search': 'Search coins...',
    'portfolio.price_change': '24h change',

    'history.title': 'History',
    'history.all': 'All',
    'history.incoming': 'Received',
    'history.outgoing': 'Sent',
    'history.empty': 'No transactions',

    'settings.title': 'Settings',
    'settings.wallet': 'Wallet',
    'settings.security': 'Security',
    'settings.general': 'General',
    'settings.pin': 'PIN code',
    'settings.language': 'Language',
    'settings.currency': 'Currency',
    'settings.notifications': 'Notifications',
    'settings.about': 'About',
    'settings.logout': 'Log out',
    'settings.version': 'v2.0.0',

    'nft.title': 'NFT Collection',
    'nft.empty': 'No NFTs found',

    'notif.title': 'Notifications',
    'notif.empty': 'No notifications',
    'notif.read_all': 'Mark all read',

    'qr.scan': 'Scan QR',
    'qr.manual': 'Or enter address manually',

    'ble.title': 'BLE Transfer',
    'ble.scan': 'Scan devices',
    'ble.connected': 'Connected',
    'ble.searching': 'Searching devices...',

    'nfc.title': 'NFC Pay',
    'nfc.scanning': 'Scanning...',
    'nfc.hold': 'Hold phone near NFC tag',

    'agg.title': 'Exchange Aggregator',
    'agg.best': 'Best rates from external services',
    'agg.estimate': 'At best rate',

    'tx.detail': 'Details',
    'tx.status': 'Status',
    'tx.sender': 'Sender',
    'tx.receiver': 'Receiver',
    'tx.fee': 'Fee',
    'tx.date': 'Date',
    'tx.hash': 'Tx Hash',
    'tx.open_explorer': 'Open in TON Viewer',
    'tx.completed': 'Completed',
    'tx.pending': 'Pending',
    'tx.failed': 'Failed',

    'confirm.title': 'Confirmation',
    'confirm.pin': 'Enter PIN',
    'confirm.wrong_pin': 'Wrong PIN',
    'confirm.confirm_button': 'Confirm',
    'confirm.cancel_button': 'Cancel',

    'auth.welcome': 'Welcome to Luna Wallet!',

    'error.boundary': 'Something went wrong',
    'error.occurred': 'An error occurred',
    'error.no_data': 'No data to confirm',

    'time.just_now': 'just now',
    'time.min_ago': 'min ago',
    'time.h_ago': 'h ago',
    'time.d_ago': 'd ago',
  },
};

// ===== Active language state =====

let currentLang: Lang = 'ru';
const listeners: Array<(lang: Lang) => void> = [];

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  localStorage.setItem('luna-lang', lang);
  listeners.forEach(l => l(lang));
}

export function subscribeLang(listener: (lang: Lang) => void): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

// Init from localStorage
try {
  const saved = localStorage.getItem('luna-lang') as Lang | null;
  if (saved && (saved === 'ru' || saved === 'en')) currentLang = saved;
} catch {}

// ===== Translate function =====

export function t(key: string, params?: Record<string, string | number>): string {
  const str = STRINGS[currentLang]?.[key] || STRINGS['ru']?.[key] || key;
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}

export function tLang(lang: Lang, key: string): string {
  return STRINGS[lang]?.[key] || STRINGS['ru']?.[key] || key;
}