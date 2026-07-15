import React, { lazy, Suspense } from 'react';
import { useStore } from './lib/store';
import BottomNav from './components/BottomNav';
import ToastContainer from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';

const HomeScreen = lazy(() => import('./pages/HomeScreen'));
const SendScreen = lazy(() => import('./pages/SendScreen'));
const ReceiveScreen = lazy(() => import('./pages/ReceiveScreen'));
const SwapScreen = lazy(() => import('./pages/SwapScreen'));
const HistoryScreen = lazy(() => import('./pages/HistoryScreen'));
const TxDetailScreen = lazy(() => import('./pages/TxDetailScreen'));
const PortfolioScreen = lazy(() => import('./pages/PortfolioScreen'));
const P2PScreen = lazy(() => import('./pages/P2PScreen'));
const SettingsScreen = lazy(() => import('./pages/SettingsScreen'));
const ProfileScreen = lazy(() => import('./pages/ProfileScreen'));
const QRScanScreen = lazy(() => import('./pages/QRScanScreen'));
const NFCPayScreen = lazy(() => import('./pages/NFCPayScreen'));
const BLETransferScreen = lazy(() => import('./pages/BLETransferScreen'));
const AggregatorScreen = lazy(() => import('./pages/AggregatorScreen'));
const TokenDetailScreen = lazy(() => import('./pages/TokenDetailScreen'));
const NotificationsScreen = lazy(() => import('./pages/NotificationsScreen'));
const NFTGalleryScreen = lazy(() => import('./pages/NFTGalleryScreen'));
const ServicesScreen = lazy(() => import('./pages/ServicesScreen'));
const ServicePayScreen = lazy(() => import('./pages/ServicePayScreen'));
const VirtualCardScreen = lazy(() => import('./pages/VirtualCardScreen'));
const ServiceHistoryScreen = lazy(() => import('./pages/ServiceHistoryScreen'));
const AdminScreen = lazy(() => import('./pages/AdminScreen'));
const AdminUsersScreen = lazy(() => import('./pages/AdminUsersScreen'));
const AdminSupportScreen = lazy(() => import('./pages/AdminSupportScreen'));
const AdminServicesScreen = lazy(() => import('./pages/AdminServicesScreen'));
const AdminSettingsScreen = lazy(() => import('./pages/AdminSettingsScreen'));
const SeedPhraseScreen = lazy(() => import('./pages/SeedPhraseScreen'));
const FAQScreen = lazy(() => import('./pages/FAQScreen'));

function PageLoader() {
  return <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg)' }}>
    <div className="w-6 h-6 border-2 border-white/10 border-t-[var(--accent)] rounded-full animate-spin" />
  </div>;
}

const pages: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  home: HomeScreen, send: SendScreen, receive: ReceiveScreen, swap: SwapScreen,
  history: HistoryScreen, 'tx-detail': TxDetailScreen, portfolio: PortfolioScreen,
  p2p: P2PScreen, settings: SettingsScreen, profile: ProfileScreen,
  'qr-scan': QRScanScreen, 'nfc-pay': NFCPayScreen, 'ble-transfer': BLETransferScreen,
  aggregator: AggregatorScreen, 'token-detail': TokenDetailScreen, 'nft-gallery': NFTGalleryScreen,
  notifications: NotificationsScreen, 'seed-phrase': SeedPhraseScreen, faq: FAQScreen,
  services: ServicesScreen, 'service-pay': ServicePayScreen, 'virtual-cards': VirtualCardScreen,
  'service-history': ServiceHistoryScreen, splash: HomeScreen,
  admin: AdminScreen, 'admin-users': AdminUsersScreen, 'admin-support': AdminSupportScreen,
  'admin-services': AdminServicesScreen, 'admin-settings': AdminSettingsScreen,
};

const NAV_TABS = ['home', 'swap', 'portfolio', 'p2p', 'settings'];

export default function App() {
  const { page } = useStore();
  const PageComponent = pages[page] || HomeScreen;
  const showNav = NAV_TABS.includes(page);

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)', paddingTop: 'var(--safe-top)' }}>
        <Suspense fallback={<PageLoader />}><PageComponent /></Suspense>
        {showNav && <BottomNav />}
        <ToastContainer />
      </div>
    </ErrorBoundary>
  );
}