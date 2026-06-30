import React, { useEffect } from 'react';
import { useStore } from './lib/store';
import BottomNav from './components/BottomNav';
import { initTheme } from './pages/ThemesScreen';

// Auth screens
import SplashScreen from './pages/SplashScreen';
import OnboardingScreen from './pages/OnboardingScreen';
import WelcomeScreen from './pages/WelcomeScreen';

// Main screens
import HomeScreen from './pages/HomeScreen';
import CardsScreen from './pages/CardsScreen';
import AccountDetailScreen from './pages/AccountDetailScreen';
import OpenAccountScreen from './pages/OpenAccountScreen';
import TransferScreen from './pages/TransferScreen';
import DepositScreen from './pages/DepositScreen';
import ReceiveScreen from './pages/ReceiveScreen';
import SwapScreen from './pages/SwapScreen';
import ExchangeScreen from './pages/ExchangeScreen';
import EarnScreen from './pages/EarnScreen';
import EscrowScreen from './pages/EscrowScreen';

// Content screens
import NewsScreen from './pages/NewsScreen';
import ChatScreen from './pages/ChatScreen';
import SocialScreen from './pages/SocialScreen';
import PaymentsScreen from './pages/PaymentsScreen';

// Profile screens
import ProfileScreen from './pages/ProfileScreen';
import SubscriptionScreen from './pages/SubscriptionScreen';
import KYCScreen from './pages/KYCScreen';
import SettingsScreen from './pages/SettingsScreen';
import NotificationsScreen from './pages/NotificationsScreen';
import FAQScreen from './pages/FAQScreen';
import AdminScreen from './pages/AdminScreen';
import TonConnectScreen from './pages/TonConnectScreen';
import MarketsScreen from './pages/MarketsScreen';
import QRScreen from './pages/QRScreen';
import ThemesScreen from './pages/ThemesScreen';
import ReferralScreen from './pages/ReferralScreen';
import AchievementsScreen from './pages/AchievementsScreen';
import SavingsScreen from './pages/SavingsScreen';
import StoriesScreen from './pages/StoriesScreen';
import PortfolioScreen from './pages/PortfolioScreen';
import P2PScreen from './pages/P2PScreen';
import MarketplaceScreen from './pages/MarketplaceScreen';
import HistoryScreen from './pages/HistoryScreen';
import TxDetailScreen from './pages/TxDetailScreen';

const pages: Record<string, React.ComponentType> = {
  splash: SplashScreen,
  onboarding: OnboardingScreen,
  welcome: WelcomeScreen,
  home: HomeScreen,
  cards: CardsScreen,
  'account-detail': AccountDetailScreen,
  'open-account': OpenAccountScreen,
  transfer: TransferScreen,
  deposit: DepositScreen,
  receive: ReceiveScreen,
  swap: SwapScreen,
  exchange: ExchangeScreen,
  earn: EarnScreen,
  escrow: EscrowScreen,
  news: NewsScreen,
  chat: ChatScreen,
  social: SocialScreen,
  payments: PaymentsScreen,
  profile: ProfileScreen,
  subscription: SubscriptionScreen,
  kyc: KYCScreen,
  settings: SettingsScreen,
  notifications: NotificationsScreen,
  faq: FAQScreen,
  admin: AdminScreen,
  'ton-connect': TonConnectScreen,
  markets: MarketsScreen,
  qr: QRScreen,
  themes: ThemesScreen,
  referral: ReferralScreen,
  achievements: AchievementsScreen,
  savings: SavingsScreen,
  stories: StoriesScreen,
  portfolio: PortfolioScreen,
  p2p: P2PScreen,
  marketplace: MarketplaceScreen,
  history: HistoryScreen,
  'tx-detail': TxDetailScreen,
};

const NAV_PAGES = ['home', 'cards', 'portfolio', 'news', 'chat'];

export default function App() {
  const { page, authed } = useStore();

  useEffect(() => {
    initTheme();
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
