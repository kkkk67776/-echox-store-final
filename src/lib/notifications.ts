// ECHOX STORE — Mobile Web Push (VAPID), PWA Install & Control Room Notifications Client

import { getAdminAuthHeaders, notifySessionExpired } from './security';

export type NotificationCategory = 'order' | 'payment' | 'security' | 'activity' | 'support';
export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface AdminNotificationEvent {
  id: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  url: string;
  read: boolean;
  createdAt: string;
  meta?: Record<string, string | number | boolean>;
}

export interface PublicStoreAnnouncement {
  id: string;
  tag: string;
  title: string;
  body: string;
  url?: string;
  createdAt: string;
}

export interface NotificationSettings {
  notifyOrders: boolean;
  notifySecurity: boolean;
  notifyActivity: boolean;
  notifySupport: boolean;
  notifyStorefrontVisitors: boolean;
}

export interface AdminNotificationDevice {
  id: string;
  deviceLabel: string;
  createdAt: string;
  lastSuccessAt?: string;
}

export interface AdminNotificationsOverviewResponse {
  success?: boolean;
  unauthorized?: boolean;
  vapidPublicKey: string;
  unreadCount: number;
  events: AdminNotificationEvent[];
  subscriptionsCount: number;
  subscriptions: AdminNotificationDevice[];
  settings: NotificationSettings;
  error?: string;
}

const PUBLIC_SUB_KEY = 'echox_public_push_endpoint';
const ADMIN_SUB_KEY = 'echox_admin_push_endpoint';

let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let cachedDeferredInstallPrompt: any = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    cachedDeferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('echox_pwa_install_ready'));
  });
  window.addEventListener('appinstalled', () => {
    cachedDeferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent('echox_pwa_installed'));
  });
}

export function getDeferredInstallPrompt(): any {
  return cachedDeferredInstallPrompt;
}

export async function triggerPwaInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!cachedDeferredInstallPrompt || typeof cachedDeferredInstallPrompt.prompt !== 'function') {
    return 'unavailable';
  }
  try {
    await cachedDeferredInstallPrompt.prompt();
    const choice = await cachedDeferredInstallPrompt.userChoice;
    cachedDeferredInstallPrompt = null;
    return choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch {
    return 'unavailable';
  }
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent || '');
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    (window.navigator as any)?.standalone === true
  );
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export function getSavedPublicEndpoint(): string | null {
  try {
    return localStorage.getItem(PUBLIC_SUB_KEY);
  } catch {
    return null;
  }
}

export function getSavedAdminEndpoint(): string | null {
  try {
    return localStorage.getItem(ADMIN_SUB_KEY);
  } catch {
    return null;
  }
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function registerEchoxServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => reg)
      .catch((err) => {
        console.warn('[PWA] Service Worker registration notice:', err);
        swRegistrationPromise = null;
        return null;
      });
  }
  return swRegistrationPromise;
}

async function getReadyServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  const reg = await registerEchoxServiceWorker();
  if (!reg) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return reg;
  }
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  try {
    const reg = await getReadyServiceWorker();
    if (!reg || !reg.pushManager) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

function detectDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'هاتف المالك';
  const ua = navigator.userAgent || '';
  if (/iphone/i.test(ua)) return 'iPhone / iOS';
  if (/ipad/i.test(ua)) return 'iPad / iOS';
  if (/android/i.test(ua)) return 'هاتف Android';
  if (/mac/i.test(ua)) return 'متصفح Mac';
  if (/windows/i.test(ua)) return 'متصفح Windows';
  return 'متصفح الويب';
}

async function subscribeBrowserPushWithKey(vapidPublicKey: string): Promise<{
  ok: boolean;
  subscription?: PushSubscriptionJSON;
  rawSubscription?: PushSubscription;
  error?: string;
  needsIosHomeScreen?: boolean;
}> {
  if (isIosDevice() && !isStandalonePWA()) {
    return {
      ok: false,
      needsIosHomeScreen: true,
      error: 'على أجهزة iPhone/iPad يجب تثبيت الموقع أولاً على الشاشة الرئيسية (Add to Home Screen) لتفعيل إشعارات الهاتف.',
    };
  }

  if (!isPushSupported()) {
    return {
      ok: false,
      error: 'متصفحك الحالي لا يدعم إشعارات الدفع الخلفية (Web Push). يُنصح بفتح المتجر عبر Chrome أو Edge أو تثبيته كتطبيق.',
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      ok: false,
      error:
        permission === 'denied'
          ? 'تم حظر الإشعارات في إعدادات المتصفح. يرجى السماح بالإشعارات للموقع من أيقونة القفل بجانب الرابط.'
          : 'لم يتم منح إذن الإشعارات بعد.',
    };
  }

  const reg = await getReadyServiceWorker();
  if (!reg || !reg.pushManager) {
    return { ok: false, error: 'تعذر تشغيل عامل الإشعارات (Service Worker) على هذا المتصفح.' };
  }

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const appServerKey = urlBase64ToUint8Array(vapidPublicKey);
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey.buffer as ArrayBuffer,
    });
  }

  return {
    ok: true,
    rawSubscription: sub,
    subscription: sub.toJSON(),
  };
}

// ==========================================
// 🛍️ PUBLIC STOREFRONT NOTIFICATIONS
// ==========================================

export async function fetchPublicNotifications(): Promise<{
  vapidPublicKey: string;
  announcements: PublicStoreAnnouncement[];
}> {
  try {
    const res = await fetch('/api/notifications/public', { cache: 'no-store' });
    if (!res.ok) return { vapidPublicKey: '', announcements: [] };
    const data = await res.json();
    return {
      vapidPublicKey: data.vapidPublicKey || '',
      announcements: Array.isArray(data.announcements) ? data.announcements : [],
    };
  } catch {
    return { vapidPublicKey: '', announcements: [] };
  }
}

export async function subscribePublicPushClient(): Promise<{
  ok: boolean;
  error?: string;
  needsIosHomeScreen?: boolean;
}> {
  const pubInfo = await fetchPublicNotifications();
  if (!pubInfo.vapidPublicKey) {
    return { ok: false, error: 'مفتاح إشعارات الخادم غير متاح حالياً. تأكد من اتصال الخادم.' };
  }

  const subRes = await subscribeBrowserPushWithKey(pubInfo.vapidPublicKey);
  if (!subRes.ok || !subRes.subscription) {
    return {
      ok: false,
      error: subRes.error,
      needsIosHomeScreen: subRes.needsIosHomeScreen,
    };
  }

  try {
    const res = await fetch('/api/notifications/public/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subRes.subscription }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { ok: false, error: data.error || 'تعذر تسجيل اشتراك الإشعارات.' };
    }
    try {
      if (subRes.subscription.endpoint) {
        localStorage.setItem(PUBLIC_SUB_KEY, subRes.subscription.endpoint);
      }
    } catch {}
    return { ok: true };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالخادم لحفظ اشتراك الإشعارات.' };
  }
}

export async function unsubscribePublicPushClient(): Promise<{ ok: boolean }> {
  const existing = await getExistingPushSubscription();
  const endpoint = existing?.endpoint || getSavedPublicEndpoint() || '';
  if (endpoint) {
    try {
      await fetch('/api/notifications/public/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });
    } catch {}
  }
  try {
    localStorage.removeItem(PUBLIC_SUB_KEY);
  } catch {}
  // Unsubscribe browser push only if admin push isn't also enabled on this browser
  if (existing && !getSavedAdminEndpoint()) {
    try {
      await existing.unsubscribe();
    } catch {}
  }
  return { ok: true };
}

// ==========================================
// 🛡️ CONTROL ROOM ADMIN NOTIFICATIONS
// ==========================================

export async function fetchAdminNotifications(since?: string): Promise<AdminNotificationsOverviewResponse> {
  try {
    const qs = since ? `?since=${encodeURIComponent(since)}` : '';
    const res = await fetch(`/api/admin/notifications${qs}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: getAdminAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      notifySessionExpired();
      return {
        unauthorized: true,
        vapidPublicKey: '',
        unreadCount: 0,
        events: [],
        subscriptionsCount: 0,
        subscriptions: [],
        settings: {
          notifyOrders: true,
          notifySecurity: true,
          notifyActivity: true,
          notifySupport: true,
          notifyStorefrontVisitors: true,
        },
        error: data.error || 'انتهت جلسة مركز التحكم.',
      };
    }
    return {
      success: Boolean(data.success),
      vapidPublicKey: data.vapidPublicKey || '',
      unreadCount: Number(data.unreadCount || 0),
      events: Array.isArray(data.events) ? data.events : [],
      subscriptionsCount: Number(data.subscriptionsCount || 0),
      subscriptions: Array.isArray(data.subscriptions) ? data.subscriptions : [],
      settings: data.settings || {
        notifyOrders: true,
        notifySecurity: true,
        notifyActivity: true,
        notifySupport: true,
        notifyStorefrontVisitors: true,
      },
    };
  } catch {
    return {
      vapidPublicKey: '',
      unreadCount: 0,
      events: [],
      subscriptionsCount: 0,
      subscriptions: [],
      settings: {
        notifyOrders: true,
        notifySecurity: true,
        notifyActivity: true,
        notifySupport: true,
        notifyStorefrontVisitors: true,
      },
      error: 'تعذر جلب إشعارات مركز التحكم.',
    };
  }
}

export async function subscribeAdminPushClient(
  vapidPublicKey?: string,
  customDeviceLabel?: string
): Promise<{
  ok: boolean;
  subscriptionsCount?: number;
  error?: string;
  needsIosHomeScreen?: boolean;
}> {
  let key = vapidPublicKey || '';
  if (!key) {
    const overview = await fetchAdminNotifications();
    if (overview.unauthorized) {
      return { ok: false, error: 'انتهت جلسة مركز التحكم، يرجى إعادة المصادقة.' };
    }
    key = overview.vapidPublicKey;
  }
  if (!key) {
    return { ok: false, error: 'مفتاح VAPID غير جاهز على الخادم.' };
  }

  const subRes = await subscribeBrowserPushWithKey(key);
  if (!subRes.ok || !subRes.subscription) {
    return {
      ok: false,
      error: subRes.error,
      needsIosHomeScreen: subRes.needsIosHomeScreen,
    };
  }

  try {
    const res = await fetch('/api/admin/notifications/subscribe', {
      method: 'POST',
      credentials: 'same-origin',
      headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        subscription: subRes.subscription,
        deviceLabel: customDeviceLabel || detectDeviceLabel(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      notifySessionExpired();
      return { ok: false, error: 'انتهت جلسة مركز التحكم.' };
    }
    if (!res.ok || !data.success) {
      return { ok: false, error: data.error || 'تعذر تفعيل إشعارات مركز التحكم.' };
    }
    try {
      if (subRes.subscription.endpoint) {
        localStorage.setItem(ADMIN_SUB_KEY, subRes.subscription.endpoint);
      }
    } catch {}
    return { ok: true, subscriptionsCount: Number(data.subscriptionsCount || 1) };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالخادم لتفعيل إشعارات مركز التحكم.' };
  }
}

export async function unsubscribeAdminPushClient(): Promise<{ ok: boolean }> {
  const existing = await getExistingPushSubscription();
  const endpoint = existing?.endpoint || getSavedAdminEndpoint() || '';
  if (endpoint) {
    try {
      const res = await fetch('/api/admin/notifications/unsubscribe', {
        method: 'POST',
        credentials: 'same-origin',
        headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ endpoint }),
      });
      if (res.status === 401 || res.status === 403) {
        notifySessionExpired();
      }
    } catch {}
  }
  try {
    localStorage.removeItem(ADMIN_SUB_KEY);
  } catch {}
  if (existing && !getSavedPublicEndpoint()) {
    try {
      await existing.unsubscribe();
    } catch {}
  }
  return { ok: true };
}

export async function updateAdminNotificationSettings(
  patch: Partial<NotificationSettings>
): Promise<{ ok: boolean; settings?: NotificationSettings }> {
  try {
    const res = await fetch('/api/admin/notifications/settings', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      notifySessionExpired();
      return { ok: false };
    }
    return { ok: Boolean(data.success), settings: data.settings };
  } catch {
    return { ok: false };
  }
}

export async function markAdminNotificationsReadClient(
  ids?: string[]
): Promise<{ ok: boolean; unreadCount?: number }> {
  try {
    const res = await fetch('/api/admin/notifications/read', {
      method: 'POST',
      credentials: 'same-origin',
      headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ids }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      notifySessionExpired();
      return { ok: false };
    }
    return { ok: Boolean(data.success), unreadCount: Number(data.unreadCount ?? 0) };
  } catch {
    return { ok: false };
  }
}

export async function clearAdminNotificationsClient(): Promise<{ ok: boolean }> {
  try {
    const res = await fetch('/api/admin/notifications', {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: getAdminAuthHeaders(),
    });
    if (res.status === 401 || res.status === 403) {
      notifySessionExpired();
      return { ok: false };
    }
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

export async function sendTestAdminPushClient(): Promise<{
  ok: boolean;
  sent: number;
  failed: number;
  total: number;
  error?: string;
}> {
  try {
    const existing = await getExistingPushSubscription();
    const res = await fetch('/api/admin/notifications/test', {
      method: 'POST',
      credentials: 'same-origin',
      headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(existing?.endpoint ? { endpoint: existing.endpoint } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      notifySessionExpired();
      return { ok: false, sent: 0, failed: 0, total: 0, error: 'انتهت جلسة مركز التحكم.' };
    }
    return {
      ok: Boolean(data.success),
      sent: Number(data.sent || 0),
      failed: Number(data.failed || 0),
      total: Number(data.total || 0),
    };
  } catch {
    return { ok: false, sent: 0, failed: 0, total: 0, error: 'تعذر إرسال الإشعار التجريبي.' };
  }
}

export async function showLocalNotificationFallback(event: AdminNotificationEvent): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  // Only show local fallback on devices that opted into admin notifications on this browser
  if (!getSavedAdminEndpoint()) return;

  try {
    const reg = await getReadyServiceWorker();
    if (reg) {
      await reg.showNotification(event.title, {
        body: event.body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: `echox-${event.id}`,
        dir: 'rtl',
        lang: 'ar',
        requireInteraction: event.severity === 'critical',
        data: { url: event.url || '/owner/dashboard' },
      });
    }
  } catch {
    // ignore OS fallback errors
  }
}
