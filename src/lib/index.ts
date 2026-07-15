export { useStore } from './store';
export type { 
  TokenBalance, 
  BlockchainTx, 
  NFTItem, 
  AppNotification,
  Page,
  User,
  ServicePurchase,
  VirtualCard,
  SupportTicket,
  AppEvent,
} from './store';

export { haptic, formatCrypto, formatUsd, formatFiat, shortAddress, formatTimeAgo, formatDate, copyToClipboard } from './utils';
export { isValidTonAddress, fromNano, toNano, buildTransfer, fetchTonBalance, fetchJettons, fetchTransactions, fetchNFTs } from './ton';
export { isNative, platform } from './capacitor';

// QR Scanner
export { qrScanner, extractTonAddress, isValidTonAddress as isValidTonAddr, formatTonAddress } from './qrScanner';

// StonFi DEX
export { getStonFiQuote, buildStonFiSwapTx, getJettonInfo, getAllJettons, fetchUserJettonBalances } from './stonfi';
export type { SwapQuote, SwapTxParams } from './stonfi';

// Biometric Auth
export { isBiometricAvailable, enableBiometric, authenticateWithBiometric, disableBiometric, isBiometricEnabled, getBiometricType, getBiometricIcon } from './biometric';
export type { BiometricResult } from './biometric';

// MoonPay (Fiat Onramp - Commission Revenue)
export { getMoonPayUrl, MoonPayWidget, MoonPayBuyButton, MoonPaySellButton, getMoonPaySupportedCurrencies, getMoonPayQuote, MOONPAY_COMMISSION_RATE } from './moonpay';
export type { MoonPayConfig } from './moonpay';

// Bitrefill (Service Payments - Commission Revenue)
export { getBitrefillProducts, getBitrefillCategories, getProductsByCategory, createBitrefillOrder, getBitrefillOrderStatus, mapLunaCategoryToBitrefill, POPULAR_SERVICES, BITREFILL_COMMISSION_RATE } from './bitrefill';
export type { BitrefillProduct, BitrefillOrderRequest, BitrefillOrderResponse } from './bitrefill';

// Push Notifications
export { initializePushNotifications, showLocalNotification, sendPushNotification, schedulePriceAlert, checkPriceAlerts, requestNotificationPermission } from './pushNotifications';
export type { PushNotificationData } from './pushNotifications';

// Commission Tracking (Revenue)
export { recordCommission, getRevenueStats, getCommissionHistory, useCommissionTracker, DEFAULT_COMMISSION_RATES } from './commission';
export type { CommissionRecord, RevenueStats } from './commission';