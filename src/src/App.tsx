import React, { useEffect } from 'react';
import { useStore } from './lib/store';
import { useSupabaseSync } from './hooks/useSupabase';
import BottomNav from './components/BottomNav';
import SplashScreen from './pages/SplashScreen';
import OnboardingScreen from './pages/OnboardingScreen';
import WelcomeScreen from './pages/WelcomeScreen';
import HomeScreen from './pages/HomeScreen';
import CardsScreen from './pages/CardsScreen';
import AccountDetailScreen from './pages/AccountDetailScreen';
import OpenAccountScreen from './pages/OpenAccountScreen';
import TransferScreen from './pages/TransferScreen';
import DepositScreen from './pages/DepositScreen';
import ReceiveScreen from './pages/ReceiveScreen';
import QRScreen from './pages/QRScreen';
import ProfileScreen from './pages/ProfileScreen';
import SubscriptionScreen from './pages/SubscriptionScreen';
import KYCScreen from './pages/KYCScreen';
import SettingsScreen from './pages/SettingsScreen';
import NotificationsScreen from './pages/NotificationsScreen';
import ChatScreen from './pages/ChatScreen';
import NewsScreen from './pages/NewsScreen';
import CityScreen from './pages/CityScreen';
import FAQScreen from './pages/FAQScreen';
import AdminScreen from './pages/AdminScreen';
import TonConnectScreen from './pages/TonConnectScreen';
import MarketsScreen from './pages/MarketsScreen';
import SwapScreen from './pages/SwapScreen';
import ExchangeScreen from './pages/ExchangeScreen';
import EarnScreen from './pages/EarnScreen';
import GamesScreen from './pages/GamesScreen';
import NFTScreen from './pages/NFTScreen';
import SocialScreen from './pages/SocialScreen';
import PaymentsScreen from './pages/PaymentsScreen';
import ThemesScreen from './pages/ThemesScreen';
import EscrowScreen from './pages/EscrowScreen';

const pages: Record<string, React.ComponentType> = {
  splash: SplashScreen, onboarding: OnboardingScreen, welcome: WelcomeScreen,
  home: HomeScreen, cards: CardsScreen, 'account-detail': AccountDetailScreen,
  'open-account': OpenAccountScreen, transfer: TransferScreen, deposit: DepositScreen,
  receive: ReceiveScreen, qr: QRScreen, profile: ProfileScreen,
  subscription: SubscriptionScreen, kyc: KYCScreen, settings: SettingsScreen,
  notifications: NotificationsScreen, chat: ChatScreen, news: NewsScreen,
  city: CityScreen, faq: FAQScreen, admin: AdminScreen,
  'ton-connect': TonConnectScreen, markets: MarketsScreen,
  swap: SwapScreen, exchange: ExchangeScreen, earn: EarnScreen,
  games: GamesScreen, nft: NFTScreen,
  social: SocialScreen, payments: PaymentsScreen, themes: ThemesScreen,
  escrow: EscrowScreen,
};

const navPages = ['home', 'cards', 'city', 'news', 'chat'];

export default function App() {
  const { page, authed } = useStore();
  useSupabaseSync();

  useEffect(() => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor('#000000'); tg.setBackgroundColor('#000000'); }
    } catch {}
  }, []);

  const Page = pages[page] || HomeScreen;
  const showNav = authed && navPages.includes(page);

  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-white">
      <Page />
      {showNav && <BottomNav />}
    </div>
  );
}
