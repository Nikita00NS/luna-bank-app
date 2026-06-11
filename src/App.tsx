import React, { useEffect } from 'react';
import { useStore } from './lib/store';
import BottomNav from './components/BottomNav';
import PlaceholderScreen from './pages/PlaceholderScreen';

// Phase 1 screens (properly written)
import SplashScreen from './pages/SplashScreen';
import OnboardingScreen from './pages/OnboardingScreen';
import WelcomeScreen from './pages/WelcomeScreen';
import HomeScreen from './pages/HomeScreen';

// Phase 2 screens
import CardsScreen from './pages/CardsScreen';
import OpenAccountScreen from './pages/OpenAccountScreen';
import TransferScreen from './pages/TransferScreen';

// Phase 3 screens
import CityScreen from './pages/CityScreen';
import NewsScreen from './pages/NewsScreen';
import ChatScreen from './pages/ChatScreen';
import JobGameScreen from './pages/JobGameScreen';

// Phase 4 screens
import ProfileScreen from './pages/ProfileScreen';
import NotificationsScreen from './pages/NotificationsScreen';
import SettingsScreen from './pages/SettingsScreen';
import FAQScreen from './pages/FAQScreen';
import DepositScreen from './pages/DepositScreen';
import SubscriptionScreen from './pages/SubscriptionScreen';
import MarketsScreen from './pages/MarketsScreen';
import QRScreen from './pages/QRScreen';
import AccountDetailScreen from './pages/AccountDetailScreen';
import KYCScreen from './pages/KYCScreen';
import AdminScreen from './pages/AdminScreen';
import TonConnectScreen from './pages/TonConnectScreen';
import SocialScreen from './pages/SocialScreen';
import PaymentsScreen from './pages/PaymentsScreen';
import ThemesScreen from './pages/ThemesScreen';

// Placeholder factory for Phase 2-4 screens
const ph = (name: string, icon: string, backTo?: any) =>
  () => <PlaceholderScreen name={name} icon={icon} backTo={backTo} />;

const pages: Record<string, React.ComponentType> = {
  // Phase 1 — Done ✅
  splash: SplashScreen,
  onboarding: OnboardingScreen,
  welcome: WelcomeScreen,
  home: HomeScreen,

  // Phase 2 — Done ✅
  cards: CardsScreen,
  'open-account': OpenAccountScreen,
  transfer: TransferScreen,
  receive: ph('Получить', '📋'),
  swap: ph('Обмен', '💱'),
  exchange: ph('Биржа', '📊'),
  earn: ph('Earn', '💎'),
  escrow: ph('Гарант', '🔒'),

  // Phase 3 — Done ✅
  city: CityScreen,
  news: NewsScreen,
  chat: ChatScreen,
  games: ph('Игры', '🎮', 'city'),
  'job-game': JobGameScreen,
  nft: ph('NFT', '🎨'),

  // Phase 4 — Done ✅
  profile: ProfileScreen,
  notifications: NotificationsScreen,
  settings: SettingsScreen,
  faq: FAQScreen,
  deposit: DepositScreen,

  subscription: SubscriptionScreen,
  markets: MarketsScreen,
  qr: QRScreen,
  'account-detail': AccountDetailScreen,

  // All remaining screens ✅
  kyc: KYCScreen,
  admin: AdminScreen,
  'ton-connect': TonConnectScreen,
  social: SocialScreen,
  payments: PaymentsScreen,
  themes: ThemesScreen,
};

const NAV_PAGES = ['home', 'cards', 'city', 'news', 'chat'];

export default function App() {
  const { page, authed } = useStore();

  // Telegram WebApp init
  useEffect(() => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#000000');
        tg.setBackgroundColor('#000000');
      }
    } catch {}
  }, []);

  const PageComponent = pages[page] || HomeScreen;
  const showNav = authed && NAV_PAGES.includes(page);

  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-white">
      <PageComponent />
      {showNav && <BottomNav />}
    </div>
  );
}
