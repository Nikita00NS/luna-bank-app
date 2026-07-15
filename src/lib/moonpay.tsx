import { MoonPayProvider } from '@moonpay/moonpay-react';
import { ReactNode } from 'react';

const MOONPAY_API_KEY = import.meta.env.VITE_MOONPAY_API_KEY || 'pk_test_your_key_here';
const MOONPAY_WIDGET_URL = 'https://buy.moonpay.com';

export interface MoonPayConfig {
  apiKey: string;
  environment: 'sandbox' | 'production';
  flow: 'buy' | 'sell' | 'swap';
  walletAddress?: string;
  currencyCode?: string;
  baseCurrencyCode?: string;
  baseCurrencyAmount?: number;
  colorCode?: string;
  extraParams?: Record<string, string>;
}

export function getMoonPayUrl(config: MoonPayConfig): string {
  const params = new URLSearchParams({
    apiKey: config.apiKey,
    flow: config.flow,
    showWalletAddressForm: (!config.walletAddress).toString(),
    colorCode: config.colorCode || '#007aff',
  });

  if (config.walletAddress) params.set('walletAddress', config.walletAddress);
  if (config.currencyCode) params.set('currencyCode', config.currencyCode);
  if (config.baseCurrencyCode) params.set('baseCurrencyCode', config.baseCurrencyCode);
  if (config.baseCurrencyAmount) params.set('baseCurrencyAmount', config.baseCurrencyAmount.toString());
  if (config.extraParams) {
    Object.entries(config.extraParams).forEach(([k, v]) => params.set(k, v));
  }

  params.set('affiliateId', 'luna-wallet');
  params.set('utm_source', 'luna-wallet');
  params.set('utm_medium', 'widget');
  params.set('utm_campaign', 'fiat-onramp');

  return `${MOONPAY_WIDGET_URL}?${params.toString()}`;
}

export function MoonPayWidget({ config, onSuccess, onError, onClose }: {
  config: MoonPayConfig;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}) {
  return (
    <MoonPayProvider apiKey={config.apiKey}>
      <MoonPayWidgetInner config={config} onSuccess={onSuccess} onError={onError} onClose={onClose} />
    </MoonPayProvider>
  );
}

function MoonPayWidgetInner({ config, onSuccess, onError, onClose }: {
  config: MoonPayConfig;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}) {
  const handleOpen = () => {
    const url = getMoonPayUrl(config);
    window.open(url, '_blank', 'width=400,height=600');
    onSuccess?.({ success: true });
  };

  return (
    <button onClick={handleOpen} className="btn btn-primary w-full">
      {config.flow === 'buy' ? 'Buy Crypto' : config.flow === 'sell' ? 'Sell Crypto' : 'Swap'}
    </button>
  );
}

export function MoonPayBuyButton({
  walletAddress,
  currencyCode = 'TON',
  baseCurrencyCode = 'USD',
  baseCurrencyAmount,
  onSuccess,
  onError,
  children,
}: {
  walletAddress?: string;
  currencyCode?: string;
  baseCurrencyCode?: string;
  baseCurrencyAmount?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  children?: ReactNode;
}) {
  const handleClick = () => {
    const url = getMoonPayUrl({
      apiKey: import.meta.env.VITE_MOONPAY_API_KEY || 'pk_test_your_key_here',
      environment: 'sandbox',
      flow: 'buy',
      walletAddress,
      currencyCode,
      baseCurrencyCode,
      baseCurrencyAmount,
      colorCode: '#007aff',
      extraParams: { affiliateId: 'luna-wallet' },
    });
    window.open(url, '_blank', 'width=400,height=600');
    onSuccess?.({ success: true });
  };

  return (
    <button onClick={handleClick} className="btn btn-primary w-full">
      {children || `Buy ${currencyCode}`}
    </button>
  );
}

export function MoonPaySellButton({
  walletAddress,
  currencyCode = 'TON',
  baseCurrencyCode = 'USD',
  onSuccess,
  onError,
  children,
}: {
  walletAddress?: string;
  currencyCode?: string;
  baseCurrencyCode?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  children?: ReactNode;
}) {
  const handleClick = () => {
    const url = getMoonPayUrl({
      apiKey: import.meta.env.VITE_MOONPAY_API_KEY || 'pk_test_your_key_here',
      environment: 'sandbox',
      flow: 'sell',
      walletAddress,
      currencyCode,
      baseCurrencyCode,
      colorCode: '#007aff',
      extraParams: { affiliateId: 'luna-wallet' },
    });
    window.open(url, '_blank', 'width=400,height=600');
    onSuccess?.({ success: true });
  };

  return (
    <button onClick={handleClick} className="btn btn-secondary w-full">
      {children || `Sell ${currencyCode}`}
    </button>
  );
}

export async function getMoonPaySupportedCurrencies(apiKey: string): Promise<Array<{
  code: string;
  name: string;
  type: 'crypto' | 'fiat';
}>> {
  try {
    const response = await fetch(`https://api.moonpay.com/v3/currencies?apiKey=${apiKey}`);
    if (!response.ok) throw new Error('Failed to fetch currencies');
    const data = await response.json();
    return data.data || [];
  } catch (err) {
    console.error('[MoonPay] Fetch currencies error:', err);
    return [];
  }
}

export async function getMoonPayQuote(params: {
  baseCurrencyCode: string;
  baseCurrencyAmount: number;
  currencyCode: string;
  apiKey: string;
}): Promise<{ estimatedAmount: number; fee: number } | null> {
  try {
    const searchParams = new URLSearchParams({
      baseCurrencyCode: params.baseCurrencyCode,
      baseCurrencyAmount: params.baseCurrencyAmount.toString(),
      currencyCode: params.currencyCode,
      apiKey: params.apiKey,
    });

    const response = await fetch(`https://api.moonpay.com/v3/quotes?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch quote');
    const data = await response.json();
    return {
      estimatedAmount: data.estimatedAmount,
      fee: data.fee,
    };
  } catch (err) {
    console.error('[MoonPay] Quote error:', err);
    return null;
  }
}

export const MOONPAY_COMMISSION_RATE = 0.01;