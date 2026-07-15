import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { supabase } from './supabase';

const PUSH_TOKEN_KEY = 'push_token';

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  type: 'transaction' | 'system' | 'service' | 'support' | 'price_alert' | 'security';
}

export async function initializePushNotifications(): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: 'Push requires native platform' };
  }

  return { 
    success: false, 
    error: 'Push notifications require @capacitor/push-notifications plugin' 
  };
}

export async function showLocalNotification(notification: PushNotificationData): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        data: notification.data,
      });
    }
    return;
  }

  // Placeholder - requires @capacitor/local-notifications
  console.log('[Push] Local notification:', notification);
}

export async function sendPushNotification(
  userId: string,
  notification: PushNotificationData
): Promise<boolean> {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      title: notification.title,
      message: notification.body,
      type: notification.type,
      data: notification.data,
      read: false,
    });
    return true;
  } catch (err) {
    console.error('[Push] Send error:', err);
    return false;
  }
}

export async function schedulePriceAlert(
  asset: string,
  targetPrice: number,
  condition: 'above' | 'below'
): Promise<void> {
  const alerts = await getPriceAlerts();
  alerts.push({ asset, targetPrice, condition, id: Date.now().toString() });
  await Preferences.set({ key: 'price_alerts', value: JSON.stringify(alerts) });
}

export async function getPriceAlerts(): Promise<Array<{
  id: string;
  asset: string;
  targetPrice: number;
  condition: 'above' | 'below';
}>> {
  const result = await Preferences.get({ key: 'price_alerts' });
  return result.value ? JSON.parse(result.value) : [];
}

export async function checkPriceAlerts(currentPrices: Record<string, number>): Promise<void> {
  const alerts = await getPriceAlerts();
  for (const alert of alerts) {
    const currentPrice = currentPrices[alert.asset];
    if (!currentPrice) continue;

    const triggered = alert.condition === 'above' 
      ? currentPrice >= alert.targetPrice 
      : currentPrice <= alert.targetPrice;

    if (triggered) {
      await showLocalNotification({
        title: 'Price Alert',
        body: `${alert.asset} is now $${currentPrice} (${alert.condition} $${alert.targetPrice})`,
        type: 'price_alert',
        data: { asset: alert.asset, price: currentPrice },
      });

      const remaining = alerts.filter(a => a.id !== alert.id);
      await Preferences.set({ key: 'price_alerts', value: JSON.stringify(remaining) });
    }
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (!('Notification' in window)) return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}