/**
 * Luna Bank — Telegram WebApp API Layer
 *
 * Wraps Telegram Mini App JavaScript API methods
 * for contacts, phone access, write permissions, etc.
 */

// ===== Types =====

export interface TelegramContact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id: number;
}

export interface ContactResponse {
  response: string;
  responseUnsafe: {
    auth_date: string;
    contact: TelegramContact;
    hash: string;
  };
  status: 'sent';
}

export interface CancelResponse {
  status: 'cancelled';
}

// ===== WebApp access =====

function getWebApp(): any {
  return (window as any).Telegram?.WebApp;
}

export function isTelegramEnv(): boolean {
  return !!getWebApp();
}

// ===== Request Contact =====
// Shows a native Telegram popup asking the user to share their phone number.
// Returns the contact info if shared, or null if cancelled.

export function requestContact(): Promise<TelegramContact | null> {
  return new Promise((resolve) => {
    const tg = getWebApp();

    if (!tg?.requestContact) {
      console.warn('[TG] requestContact not available');
      resolve(null);
      return;
    }

    tg.requestContact((success: boolean, result: ContactResponse | CancelResponse) => {
      if (success && result.status === 'sent') {
        const contactResult = result as ContactResponse;
        const contact = contactResult.responseUnsafe?.contact;
        if (contact) {
          resolve({
            phone_number: contact.phone_number,
            first_name: contact.first_name,
            last_name: contact.last_name,
            user_id: contact.user_id,
          });
        } else {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
}

// ===== Request Write Access =====
// Asks permission to send messages to the user from the bot.

export function requestWriteAccess(): Promise<boolean> {
  return new Promise((resolve) => {
    const tg = getWebApp();

    if (!tg?.requestWriteAccess) {
      console.warn('[TG] requestWriteAccess not available');
      resolve(false);
      return;
    }

    tg.requestWriteAccess((granted: boolean) => {
      resolve(granted);
    });
  });
}

// ===== Show Confirm =====

export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const tg = getWebApp();

    if (!tg?.showConfirm) {
      resolve(window.confirm(message));
      return;
    }

    tg.showConfirm(message, (confirmed: boolean) => {
      resolve(confirmed);
    });
  });
}

// ===== Show Alert =====

export function showAlert(message: string): Promise<void> {
  return new Promise((resolve) => {
    const tg = getWebApp();

    if (!tg?.showAlert) {
      window.alert(message);
      resolve();
      return;
    }

    tg.showAlert(message, () => {
      resolve();
    });
  });
}

// ===== Open Telegram Link =====

export function openTelegramLink(url: string) {
  const tg = getWebApp();
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(url);
  } else {
    window.open(url, '_blank');
  }
}

// ===== Show Popup =====

export interface PopupButton {
  id: string;
  type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
  text?: string;
}

export function showPopup(
  title: string,
  message: string,
  buttons: PopupButton[]
): Promise<string | null> {
  return new Promise((resolve) => {
    const tg = getWebApp();

    if (!tg?.showPopup) {
      resolve(null);
      return;
    }

    tg.showPopup({ title, message, buttons }, (buttonId: string) => {
      resolve(buttonId);
    });
  });
}

// ===== Format phone =====

export function formatPhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('7')) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }
  if (digits.length === 11 && digits.startsWith('8')) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }
  if (digits.length >= 10) {
    return `+${digits}`;
  }
  return phone;
}

// ===== Normalize phone for search (strip to digits only) =====

export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  // Convert Russian 8 to 7
  if (digits.length === 11 && digits.startsWith('8')) {
    digits = '7' + digits.slice(1);
  }
  // Add leading 7 for Russian 10-digit numbers
  if (digits.length === 10 && !digits.startsWith('7')) {
    digits = '7' + digits;
  }
  return digits;
}
