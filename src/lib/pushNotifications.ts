import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { supabase } from './supabase';

const PUSH_TOKEN_KEY = 'push_token';
const NOTIFICATION_PERMISSION_KEY = 'notification_permission';

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
    return await initializeWebPush();
  }

  try {
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== 'granted') {
      return { success: false, error: 'Permission denied' };
    }

    await Preferences.set({ key: NOTIFICATION_PERMISSION_KEY, value: 'granted' });

    PushNotifications.addListener('registration', async (token) => {
      await Preferences.set({ key: PUSH_TOKEN_KEY, value: token.value });
      await savePushTokenToServer(token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push] Registration error:', error.error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      handleForegroundNotification(notification as any);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      handleNotificationAction(action as any);
    });

    await PushNotifications.register();
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

async function initializeWebPush(): Promise<{ success: boolean; token?: string; error?: string }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'Push not supported' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY || ''),
    });

    const token = JSON.stringify(subscription);
    await Preferences.set({ key: PUSH_TOKEN_KEY, value: token });
    await savePushTokenToServer(token);

    navigator.serviceWorker.addEventListener('push', (event: any) => {
      if (event.data) {
        const data = event.data.json();
        showLocalNotification({
          title: data.title || 'Luna Wallet',
          body: data.body || '',
          data: data.data,
          type: data.type || 'system',
        });
      }
    });

    return { success: true, token };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

async function savePushTokenToServer(token: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('push_tokens').upsert({
        user_id: user.id,
        token,
        platform: Capacitor.getPlatform(),
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[Push] Save token error:', err);
  }
}

function handleForegroundNotification(notification: any): void {
  const data = notification.data || {};
  showLocalNotification({
    title: notification.title || 'Luna Wallet',
    body: notification.body || '',
    data,
    type: (data.type as any) || 'system',
  });
}

function handleNotificationAction(action: any): void {
  const data = action.notification?.data || {};
  
  if (data.type === 'transaction' && data.txHash) {
    window.location.hash = `#/tx-detail?hash=${data.txHash}`;
  } else if (data.type === 'support' && data.ticketId) {
    window.location.hash = `#/support?ticket=${data.ticketId}`;
  } else if (data.type === 'service' && data.orderId) {
    window.location.hash = `#/service-history?order=${data.orderId}`;
  }
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

  await LocalNotifications.schedule({
    notifications: [{
      title: notification.title,
      body: notification.body,
      id: Date.now(),
      schedule: { at: new Date(Date.now() + 100) },
      sound: notification.type === 'security' ? 'alarm' : 'default',
      attachments: [],
      actionTypeId: '',
      extra: notification.data,
    }],
  });
}

export async function sendPushNotification(
  userId: string,
  notification: PushNotificationData
): Promise<boolean> {
  try {
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', userId);

    if (!tokens || tokens.length === 0) return false;

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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (!('Notification' in window)) return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }

  const result = await PushNotifications.requestPermissions();
  return result.receive === 'granted';
}