/**
 * Luna Wallet v2 — Toast Notification System
 * In-app notifications without blocking
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

type ToastListener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
let listeners: ToastListener[] = [];
let counter = 0;

function notify() {
  listeners.forEach(l => l([...toasts]));
}

export function addToast(t: Omit<Toast, 'id'>): string {
  const id = `toast-${++counter}`;
  toasts = [...toasts, { ...t, id }];
  notify();
  
  const duration = t.duration || 4000;
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration);
  }
  
  return id;
}

export function removeToast(id: string): void {
  toasts = toasts.filter(t => t.id !== id);
  notify();
}

export function clearToasts(): void {
  toasts = [];
  notify();
}

export function subscribeToasts(listener: ToastListener): () => void {
  listeners = [...listeners, listener];
  return () => { listeners = listeners.filter(l => l !== listener); };
}

export function getToasts(): Toast[] {
  return toasts;
}

// ===== Convenience =====

export function toastSuccess(title: string, message?: string, duration?: number): string {
  return addToast({ type: 'success', title, message, duration });
}

export function toastError(title: string, message?: string, duration?: number): string {
  return addToast({ type: 'error', title, message, duration });
}

export function toastInfo(title: string, message?: string, duration?: number): string {
  return addToast({ type: 'info', title, message, duration });
}

export function toastWarning(title: string, message?: string, duration?: number): string {
  return addToast({ type: 'warning', title, message, duration });
}