import crypto from 'crypto';
import fs from 'fs';
import * as webpush from 'web-push';
import {
  atomicWriteJsonSync,
  getDataFilePath,
  isCloudPersistenceEnabled,
  loadCloudJson,
  pushCloudJson,
} from './cloudPersistence';

export type NotificationCategory = 'order' | 'payment' | 'security' | 'activity' | 'support';
export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface StoredPushSubscription {
  id: string;
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceLabel?: string;
  createdAt: string;
  lastSuccessAt?: string;
}

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

interface NotificationsDb {
  vapidKeys: {
    publicKey: string;
    privateKey: string;
  };
  settings: NotificationSettings;
  adminSubscriptions: StoredPushSubscription[];
  publicSubscriptions: StoredPushSubscription[];
  events: AdminNotificationEvent[];
  publicAnnouncements: PublicStoreAnnouncement[];
  updatedAt: string;
}

const DB_FILE = getDataFilePath('notifications_db.json');
const CLOUD_KEY = 'echox:notifications_db';

const DEFAULT_SETTINGS: NotificationSettings = {
  notifyOrders: true,
  notifySecurity: true,
  notifyActivity: true,
  notifySupport: true,
  notifyStorefrontVisitors: true,
};

let dbCache: NotificationsDb | null = null;
const securityDebounceMap = new Map<string, number>();

function configureWebPush(keys: { publicKey: string; privateKey: string }) {
  const email = (process.env.ECHOX_OWNER_EMAIL || 'abdelkaderbahri570@gmail.com').trim();
  const subject = `mailto:${email}`;
  try {
    webpush.setVapidDetails(subject, keys.publicKey, keys.privateKey);
  } catch (err) {
    console.warn('[Notifications] VAPID configuration notice:', err);
  }
}

function buildInitialDb(): NotificationsDb {
  const envPub = (process.env.VAPID_PUBLIC_KEY || '').trim();
  const envPriv = (process.env.VAPID_PRIVATE_KEY || '').trim();
  const vapidKeys =
    envPub && envPriv
      ? { publicKey: envPub, privateKey: envPriv }
      : webpush.generateVAPIDKeys();

  return {
    vapidKeys,
    settings: { ...DEFAULT_SETTINGS },
    adminSubscriptions: [],
    publicSubscriptions: [],
    events: [],
    publicAnnouncements: [],
    updatedAt: new Date().toISOString(),
  };
}

function normalizeDb(raw: Partial<NotificationsDb> | null): NotificationsDb {
  const base = buildInitialDb();
  if (!raw || typeof raw !== 'object') return base;

  const envPub = (process.env.VAPID_PUBLIC_KEY || '').trim();
  const envPriv = (process.env.VAPID_PRIVATE_KEY || '').trim();
  const vapidKeys =
    envPub && envPriv
      ? { publicKey: envPub, privateKey: envPriv }
      : raw.vapidKeys?.publicKey && raw.vapidKeys?.privateKey
      ? raw.vapidKeys
      : base.vapidKeys;

  return {
    vapidKeys,
    settings: {
      ...DEFAULT_SETTINGS,
      ...(raw.settings || {}),
    },
    adminSubscriptions: Array.isArray(raw.adminSubscriptions) ? raw.adminSubscriptions.slice(0, 50) : [],
    publicSubscriptions: Array.isArray(raw.publicSubscriptions) ? raw.publicSubscriptions.slice(0, 500) : [],
    events: Array.isArray(raw.events) ? raw.events.slice(0, 250) : [],
    publicAnnouncements: Array.isArray(raw.publicAnnouncements) ? raw.publicAnnouncements.slice(0, 30) : [],
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

function loadDb(): NotificationsDb {
  if (dbCache) return dbCache;
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      dbCache = normalizeDb(parsed);
      configureWebPush(dbCache.vapidKeys);
      return dbCache;
    }
  } catch (err) {
    console.warn('[Notifications] Local read notice:', err);
  }
  dbCache = buildInitialDb();
  saveDb(dbCache);
  configureWebPush(dbCache.vapidKeys);
  return dbCache;
}

function saveDb(next: NotificationsDb): void {
  next.updatedAt = new Date().toISOString();
  dbCache = next;
  try {
    atomicWriteJsonSync(DB_FILE, next);
  } catch (err) {
    console.warn('[Notifications] Local write notice:', err);
  }
  pushCloudJson(CLOUD_KEY, next);
}

export async function hydrateNotificationsFromCloud(): Promise<void> {
  const local = loadDb();
  if (!isCloudPersistenceEnabled()) return;
  try {
    const cloud = await loadCloudJson<Partial<NotificationsDb>>(CLOUD_KEY);
    if (cloud && typeof cloud === 'object') {
      const normalized = normalizeDb(cloud);
      dbCache = normalized;
      configureWebPush(normalized.vapidKeys);
      try {
        atomicWriteJsonSync(DB_FILE, normalized);
      } catch {}
    } else {
      pushCloudJson(CLOUD_KEY, local);
    }
  } catch (err) {
    console.warn('[Notifications] Cloud hydrate notice:', err);
  }
}

export function getVapidPublicKey(): string {
  return loadDb().vapidKeys.publicKey;
}

export function getNotificationSettings(): NotificationSettings {
  return loadDb().settings;
}

export function updateNotificationSettings(patch: Partial<NotificationSettings>): NotificationSettings {
  const db = loadDb();
  db.settings = {
    notifyOrders: typeof patch.notifyOrders === 'boolean' ? patch.notifyOrders : db.settings.notifyOrders,
    notifySecurity: typeof patch.notifySecurity === 'boolean' ? patch.notifySecurity : db.settings.notifySecurity,
    notifyActivity: typeof patch.notifyActivity === 'boolean' ? patch.notifyActivity : db.settings.notifyActivity,
    notifySupport: typeof patch.notifySupport === 'boolean' ? patch.notifySupport : db.settings.notifySupport,
    notifyStorefrontVisitors:
      typeof patch.notifyStorefrontVisitors === 'boolean'
        ? patch.notifyStorefrontVisitors
        : db.settings.notifyStorefrontVisitors,
  };
  saveDb(db);
  return db.settings;
}

function isValidPushSubscription(sub: any): sub is {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
} {
  return Boolean(
    sub &&
      typeof sub.endpoint === 'string' &&
      sub.endpoint.startsWith('https://') &&
      sub.keys &&
      typeof sub.keys.p256dh === 'string' &&
      sub.keys.p256dh.length >= 16 &&
      typeof sub.keys.auth === 'string' &&
      sub.keys.auth.length >= 8
  );
}

export function subscribeAdminPush(
  rawSub: any,
  deviceLabel?: string
): { ok: boolean; subscriptionsCount: number; error?: string } {
  if (!isValidPushSubscription(rawSub)) {
    return { ok: false, subscriptionsCount: loadDb().adminSubscriptions.length, error: 'بيانات الاشتراك بالإشعارات غير صالحة.' };
  }

  const db = loadDb();
  const id = crypto.createHash('sha256').update(rawSub.endpoint).digest('hex').slice(0, 16);
  const cleanLabel = String(deviceLabel || 'جهاز المالك').slice(0, 80);

  const existingIdx = db.adminSubscriptions.findIndex((s) => s.endpoint === rawSub.endpoint);
  const record: StoredPushSubscription = {
    id,
    endpoint: rawSub.endpoint,
    expirationTime: rawSub.expirationTime ?? null,
    keys: {
      p256dh: rawSub.keys.p256dh,
      auth: rawSub.keys.auth,
    },
    deviceLabel: cleanLabel,
    createdAt: existingIdx >= 0 ? db.adminSubscriptions[existingIdx].createdAt : new Date().toISOString(),
    lastSuccessAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    db.adminSubscriptions[existingIdx] = record;
  } else {
    db.adminSubscriptions.unshift(record);
    db.adminSubscriptions = db.adminSubscriptions.slice(0, 50);
  }
  saveDb(db);
  return { ok: true, subscriptionsCount: db.adminSubscriptions.length };
}

export function unsubscribeAdminPush(endpoint: string): { ok: boolean; subscriptionsCount: number } {
  const db = loadDb();
  if (endpoint) {
    db.adminSubscriptions = db.adminSubscriptions.filter((s) => s.endpoint !== endpoint);
    saveDb(db);
  }
  return { ok: true, subscriptionsCount: db.adminSubscriptions.length };
}

export function subscribePublicPush(rawSub: any): { ok: boolean; error?: string } {
  if (!isValidPushSubscription(rawSub)) {
    return { ok: false, error: 'بيانات اشتراك الإشعارات غير صالحة.' };
  }
  const db = loadDb();
  const id = crypto.createHash('sha256').update(rawSub.endpoint).digest('hex').slice(0, 16);
  const existingIdx = db.publicSubscriptions.findIndex((s) => s.endpoint === rawSub.endpoint);
  const record: StoredPushSubscription = {
    id,
    endpoint: rawSub.endpoint,
    expirationTime: rawSub.expirationTime ?? null,
    keys: {
      p256dh: rawSub.keys.p256dh,
      auth: rawSub.keys.auth,
    },
    createdAt: existingIdx >= 0 ? db.publicSubscriptions[existingIdx].createdAt : new Date().toISOString(),
  };
  if (existingIdx >= 0) {
    db.publicSubscriptions[existingIdx] = record;
  } else {
    db.publicSubscriptions.unshift(record);
    db.publicSubscriptions = db.publicSubscriptions.slice(0, 500);
  }
  saveDb(db);
  return { ok: true };
}

export function unsubscribePublicPush(endpoint: string): { ok: boolean } {
  const db = loadDb();
  if (endpoint) {
    db.publicSubscriptions = db.publicSubscriptions.filter((s) => s.endpoint !== endpoint);
    saveDb(db);
  }
  return { ok: true };
}

async function dispatchWebPushToList(
  subscriptions: StoredPushSubscription[],
  payload: Record<string, unknown>,
  onPrune: (expiredEndpoints: string[]) => void
): Promise<{ sent: number; failed: number }> {
  if (subscriptions.length === 0) return { sent: 0, failed: 0 };
  const db = loadDb();
  configureWebPush(db.vapidKeys);

  const expiredEndpoints: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            expirationTime: sub.expirationTime ?? null,
            keys: sub.keys,
          },
          JSON.stringify(payload),
          {
            TTL: 60 * 60 * 12,
            urgency: payload.severity === 'critical' || payload.severity === 'warning' ? 'high' : 'normal',
          }
        );
        sent += 1;
        sub.lastSuccessAt = new Date().toISOString();
      } catch (err: any) {
        failed += 1;
        const status = err?.statusCode;
        if (status === 404 || status === 410 || status === 403 || status === 401) {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  if (expiredEndpoints.length > 0) {
    onPrune(expiredEndpoints);
  }
  return { sent, failed };
}

function categoryEnabled(settings: NotificationSettings, category: NotificationCategory): boolean {
  if (category === 'order' || category === 'payment') return settings.notifyOrders;
  if (category === 'security') return settings.notifySecurity;
  if (category === 'support') return settings.notifySupport;
  return settings.notifyActivity;
}

export function emitAdminNotification(input: {
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  url?: string;
  meta?: Record<string, string | number | boolean>;
}): AdminNotificationEvent | null {
  const db = loadDb();
  if (!categoryEnabled(db.settings, input.category)) {
    return null;
  }

  const event: AdminNotificationEvent = {
    id: `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    category: input.category,
    severity: input.severity,
    title: input.title.slice(0, 120),
    body: input.body.slice(0, 280),
    url: input.url || '/owner/dashboard',
    read: false,
    createdAt: new Date().toISOString(),
    meta: input.meta,
  };

  db.events.unshift(event);
  db.events = db.events.slice(0, 250);
  saveDb(db);

  if (db.adminSubscriptions.length > 0) {
    const pushPayload = {
      id: event.id,
      title: event.title,
      body: event.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `echox-${event.category}-${event.id}`,
      url: event.url,
      severity: event.severity,
      requireInteraction: event.severity === 'critical' || event.severity === 'warning',
      renotify: true,
      timestamp: Date.now(),
    };

    void dispatchWebPushToList(db.adminSubscriptions, pushPayload, (expired) => {
      const current = loadDb();
      current.adminSubscriptions = current.adminSubscriptions.filter((s) => !expired.includes(s.endpoint));
      saveDb(current);
    });
  }

  return event;
}

export function emitSecurityAlertRateLimited(
  dedupeKey: string,
  input: {
    severity: NotificationSeverity;
    title: string;
    body: string;
    url?: string;
    meta?: Record<string, string | number | boolean>;
  },
  cooldownMs = 25000
): AdminNotificationEvent | null {
  const now = Date.now();
  const last = securityDebounceMap.get(dedupeKey) || 0;
  if (now - last < cooldownMs) {
    return null;
  }
  securityDebounceMap.set(dedupeKey, now);
  if (securityDebounceMap.size > 500) {
    const cutoff = now - 5 * 60 * 1000;
    securityDebounceMap.forEach((ts, k) => {
      if (ts < cutoff) securityDebounceMap.delete(k);
    });
  }

  return emitAdminNotification({
    category: 'security',
    severity: input.severity,
    title: input.title,
    body: input.body,
    url: input.url || '/owner/dashboard',
    meta: input.meta,
  });
}

export function emitPublicStoreNotification(input: {
  tag: string;
  title: string;
  body: string;
  url?: string;
}): void {
  const db = loadDb();
  const item: PublicStoreAnnouncement = {
    id: `pub_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    tag: input.tag.slice(0, 60),
    title: input.title.slice(0, 120),
    body: input.body.slice(0, 240),
    url: input.url || '/',
    createdAt: new Date().toISOString(),
  };
  db.publicAnnouncements.unshift(item);
  db.publicAnnouncements = db.publicAnnouncements.slice(0, 30);
  saveDb(db);

  if (db.settings.notifyStorefrontVisitors && db.publicSubscriptions.length > 0) {
    void dispatchWebPushToList(
      db.publicSubscriptions,
      {
        title: item.title,
        body: item.body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: `echox-store-${item.id}`,
        url: item.url || '/',
        severity: 'info',
        timestamp: Date.now(),
      },
      (expired) => {
        const current = loadDb();
        current.publicSubscriptions = current.publicSubscriptions.filter((s) => !expired.includes(s.endpoint));
        saveDb(current);
      }
    );
  }
}

export function getPublicAnnouncements(): PublicStoreAnnouncement[] {
  return loadDb().publicAnnouncements;
}

export function getAdminNotificationsOverview(sinceIso?: string) {
  const db = loadDb();
  const events = sinceIso
    ? db.events.filter((e) => e.createdAt > sinceIso)
    : db.events;
  const unreadCount = db.events.reduce((sum, e) => sum + (e.read ? 0 : 1), 0);

  return {
    vapidPublicKey: db.vapidKeys.publicKey,
    unreadCount,
    events,
    subscriptionsCount: db.adminSubscriptions.length,
    subscriptions: db.adminSubscriptions.map((s) => ({
      id: s.id,
      deviceLabel: s.deviceLabel || 'جهاز المالك',
      createdAt: s.createdAt,
      lastSuccessAt: s.lastSuccessAt,
    })),
    settings: db.settings,
  };
}

export function markAdminNotificationsRead(ids?: string[]): number {
  const db = loadDb();
  let updated = 0;
  db.events = db.events.map((e) => {
    if (!e.read && (!ids || ids.length === 0 || ids.includes(e.id))) {
      updated += 1;
      return { ...e, read: true };
    }
    return e;
  });
  if (updated > 0) saveDb(db);
  return db.events.reduce((sum, e) => sum + (e.read ? 0 : 1), 0);
}

export function clearAdminNotifications(): void {
  const db = loadDb();
  db.events = [];
  saveDb(db);
}

export async function sendTestAdminPush(endpoint?: string): Promise<{
  sent: number;
  failed: number;
  total: number;
}> {
  const db = loadDb();
  const targets = endpoint
    ? db.adminSubscriptions.filter((s) => s.endpoint === endpoint)
    : db.adminSubscriptions;

  const event: AdminNotificationEvent = {
    id: `notif_test_${Date.now()}`,
    category: 'activity',
    severity: 'success',
    title: '🔔 تجربة إشعارات ECHOX STORE',
    body: 'إشعارات الهاتف لمركز التحكم والطلبات والتنبيهات الأمنية مفعّلة وتعمل بنجاح!',
    url: '/owner/dashboard',
    read: false,
    createdAt: new Date().toISOString(),
  };

  db.events.unshift(event);
  db.events = db.events.slice(0, 250);
  saveDb(db);

  if (targets.length === 0) {
    return { sent: 0, failed: 0, total: 0 };
  }

  const res = await dispatchWebPushToList(
    targets,
    {
      id: event.id,
      title: event.title,
      body: event.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'echox-test-push',
      url: '/owner/dashboard',
      severity: 'success',
      requireInteraction: false,
      renotify: true,
      timestamp: Date.now(),
    },
    (expired) => {
      const current = loadDb();
      current.adminSubscriptions = current.adminSubscriptions.filter((s) => !expired.includes(s.endpoint));
      saveDb(current);
    }
  );

  return { sent: res.sent, failed: res.failed, total: targets.length };
}
