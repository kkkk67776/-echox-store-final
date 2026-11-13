import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import argon2 from 'argon2';
import {
  getPublicPaymentConfig,
  syncCatalogSnapshot,
  updateAdminPaymentConfig,
  testOnlineGatewayConnection,
  processServerCheckout,
  submitBankTransferProof,
  adminVerifyPayment,
  adminProcessRefundOrCancel,
  createCustomerRefundOrCancelRequest,
  adminUpdateOrderStatus,
  adminSettleVendorPayout,
  getScopedVendorFinancials,
  getAdminPaymentOverview,
  handlePaymentWebhook,
  createSupportContribution,
  adminVerifySupportTransaction,
  hydratePaymentDbFromCloud,
  getActiveCatalogProductIds,
  isBankIdentityChange,
  isEnvLockedBank,
} from './server/paymentEngine';
import {
  atomicWriteJsonSync,
  flushCloudWrites,
  getDataFilePath,
  isCloudPersistenceEnabled,
  loadCloudJson,
  pushCloudJson,
} from './server/cloudPersistence';
import {
  adminSendChatReply,
  deleteChatThread,
  getChatThread,
  getPublicChatConfig,
  hydrateChatDbFromCloud,
  listAdminChatThreads,
  markThreadReadByOwner,
  recordCustomerChatExchange,
  updateChatConfig,
} from './server/chatEngine';

dotenv.config();

// Fix any mismatched container env vars
if (process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID === 'G-LLXC1GEL75') {
  process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID = 'ai-studio-echoxstore-9e1d54e8-7960-44b2-951a-524166c61a13';
}
if (process.env.VITE_FIREBASE_MEASUREMENT_ID === 'VITE_FIREBASE_API_KEY') {
  process.env.VITE_FIREBASE_MEASUREMENT_ID = 'G-LLXC1GEL75';
}

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '6mb' }));

function isHttpsRequest(req: Request): boolean {
  const proto = (req.headers['x-forwarded-proto'] as string) || '';
  return req.secure || proto.split(',')[0].trim().toLowerCase() === 'https';
}

function buildSessionCookie(req: Request, value: string, maxAgeSeconds: number): string {
  const secureFlag = isHttpsRequest(req) ? '; Secure' : '';
  return `__session=${value}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax; HttpOnly${secureFlag}`;
}

function getClientIp(req: Request): string {
  const cfIp = (req.headers['cf-connecting-ip'] as string) || '';
  if (cfIp.trim()) return cfIp.trim();
  const fwd = (req.headers['x-forwarded-for'] as string) || '';
  const first = fwd.split(',')[0].trim();
  return first || req.ip || req.socket.remoteAddress || '127.0.0.1';
}

function getRequestOrigin(req: Request): string {
  const configured = (process.env.SITE_URL || process.env.VITE_SITE_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;

  const protoHeader = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const proto = protoHeader.split(',')[0].trim();
  const hostHeader = (req.headers['x-forwarded-host'] as string) || req.get('host') || '';
  if (hostHeader && !hostHeader.includes('localhost') && !hostHeader.includes('127.0.0.1') && !hostHeader.includes('0.0.0.0')) {
    return `${proto}://${hostHeader}`.replace(/\/$/, '');
  }
  return 'https://echoxstore.pages.dev';
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getDynamicCatalogProductIds(): string[] {
  return getActiveCatalogProductIds();
}

// Security & SEO indexing headers middleware (compatible with iframe previews and Google Auth popups)
app.use((req: Request, res: Response, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  const p = req.path.toLowerCase();
  if (
    p.startsWith('/owner') ||
    p === '/my_orders' ||
    p === '/orders' ||
    p === '/account' ||
    p === '/wishlist' ||
    p.startsWith('/api/')
  ) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  next();
});

// Infrastructure health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    status: 'ok',
    service: 'echox-store-api',
    uptimeSeconds: Math.floor(process.uptime()),
    storageMode: isCloudPersistenceEnabled() ? 'upstash-redis+local-atomic' : 'local-atomic-disk',
    securityEngine: 'Argon2id + HMAC-SHA256',
    timestamp: new Date().toISOString(),
  });
});

// Google Search Console HTML file verification handler
app.get('/google:id.html', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`google-site-verification: google${req.params.id}.html`);
});

// Search Engine Optimization: dynamic domain-aware robots.txt and sitemap.xml
app.get('/robots.txt', (req: Request, res: Response) => {
  const origin = getRequestOrigin(req);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(`User-agent: *
Allow: /
Allow: /promise
Allow: /companies
Allow: /contact
Allow: /assets/
Disallow: /owner
Disallow: /owner/
Disallow: /owner_dashboard
Disallow: /my_orders
Disallow: /account
Disallow: /wishlist
Disallow: /api/

Sitemap: ${origin}/sitemap.xml
`);
});

app.get('/sitemap.xml', (req: Request, res: Response) => {
  const origin = getRequestOrigin(req);
  const lastmod = new Date().toISOString().slice(0, 10);
  const productIds = getDynamicCatalogProductIds();

  const staticRoutes = [
    { loc: '/', changefreq: 'daily', priority: '1.0', multilingual: true },
    { loc: '/promise', changefreq: 'monthly', priority: '0.8', multilingual: true },
    { loc: '/companies', changefreq: 'weekly', priority: '0.8', multilingual: true },
    { loc: '/contact', changefreq: 'monthly', priority: '0.7', multilingual: true },
    { loc: '/?category=power_tools', changefreq: 'weekly', priority: '0.8', multilingual: false },
    { loc: '/?category=auto_parts', changefreq: 'weekly', priority: '0.8', multilingual: false },
    { loc: '/?category=electronics', changefreq: 'weekly', priority: '0.8', multilingual: false },
  ];

  const productRoutes = productIds.map((id) => ({
    loc: `/?product=${encodeURIComponent(id)}`,
    changefreq: 'weekly',
    priority: '0.9',
    multilingual: true,
  }));

  const entries = [...staticRoutes, ...productRoutes]
    .map((entry) => {
      const fullUrl = `${origin}${entry.loc}`;
      const sep = entry.loc.includes('?') ? '&' : '?';
      const alternates = entry.multilingual
        ? `
    <xhtml:link rel="alternate" hreflang="ar-TN" href="${escapeXml(`${fullUrl}${sep}lang=ar`)}" />
    <xhtml:link rel="alternate" hreflang="fr-TN" href="${escapeXml(`${fullUrl}${sep}lang=fr`)}" />
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(`${fullUrl}${sep}lang=en`)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(fullUrl)}" />`
        : '';

      return `  <url>
    <loc>${escapeXml(fullUrl)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>${alternates}
  </url>`;
    })
    .join('\n');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`);
});

// Sovereign Security Config (zero plaintext secrets or default codes in source)
const OWNER_EMAIL = (process.env.ECHOX_OWNER_EMAIL || 'abdelkaderbahri570@gmail.com').trim().toLowerCase();

function loadOrCreateHmacSecret(): string {
  const fromEnv = (process.env.ECHOX_SECURITY_HMAC_SECRET || '').trim();
  if (fromEnv.length >= 16) return fromEnv;

  const secretFile = getDataFilePath('.hmac_secret');
  try {
    if (fs.existsSync(secretFile)) {
      const stored = fs.readFileSync(secretFile, 'utf-8').trim();
      if (stored.length >= 32) return stored;
    }
  } catch {}

  const generated = crypto.randomBytes(48).toString('hex');
  try {
    fs.writeFileSync(secretFile, generated, { encoding: 'utf-8', mode: 0o600 });
  } catch (err) {
    console.warn('[Security] Notice writing runtime HMAC key file:', err);
  }
  if (process.env.NODE_ENV === 'production') {
    console.warn('[Security] ECHOX_SECURITY_HMAC_SECRET env var not set; using locally generated secret.');
  }
  return generated;
}

const HMAC_SECRET = loadOrCreateHmacSecret();

// Pre-computed one-way Argon2id bootstrap hashes (zero plaintext credentials stored in code)
const DEFAULT_ACCESS_ARGON2 =
  (process.env.ECHOX_BOOTSTRAP_ACCESS_HASH || '').trim() ||
  '$argon2id$v=19$m=65536,t=3,p=4$L32cy6EOiWdqY6LxBDoknA$+xdvKFVg++rImusfx2U+XZKWvVIxHoIUEoyZL/vlpRw';
const DEFAULT_PIN_ARGON2 =
  (process.env.ECHOX_BOOTSTRAP_PIN_HASH || '').trim() ||
  '$argon2id$v=19$m=65536,t=3,p=4$QRoTtDau0g/bydokawO6JA$nMAQe1UMgspWQ5Q4LRIzmoSwqLqENN34vKGiok8KGg0';

// Per-IP Rate Limiter Store
interface RateLimitBucket {
  attempts: number;
  lockoutUntil: number;
  windowStart: number;
  lastSeen: number;
}

const ipRateBuckets = new Map<string, RateLimitBucket>();

function getBucket(namespace: string, ip: string): RateLimitBucket {
  const key = `${namespace}:${ip}`;
  let bucket = ipRateBuckets.get(key);
  if (!bucket) {
    bucket = { attempts: 0, lockoutUntil: 0, windowStart: Date.now(), lastSeen: Date.now() };
    ipRateBuckets.set(key, bucket);
  }
  bucket.lastSeen = Date.now();
  return bucket;
}

function checkLockout(namespace: string, ip: string): { locked: boolean; remainingSeconds: number; attempts: number } {
  const bucket = getBucket(namespace, ip);
  const now = Date.now();
  if (now < bucket.lockoutUntil) {
    return {
      locked: true,
      remainingSeconds: Math.ceil((bucket.lockoutUntil - now) / 1000),
      attempts: bucket.attempts,
    };
  }
  if (bucket.lockoutUntil > 0 && now >= bucket.lockoutUntil) {
    bucket.attempts = 0;
    bucket.lockoutUntil = 0;
  }
  return { locked: false, remainingSeconds: 0, attempts: bucket.attempts };
}

function recordFailedAttempt(namespace: string, ip: string, maxAttempts: number, lockoutMs: number): { locked: boolean; remainingSeconds: number; attemptsLeft: number } {
  const bucket = getBucket(namespace, ip);
  bucket.attempts += 1;
  if (bucket.attempts >= maxAttempts) {
    bucket.lockoutUntil = Date.now() + lockoutMs;
    return {
      locked: true,
      remainingSeconds: Math.ceil(lockoutMs / 1000),
      attemptsLeft: 0,
    };
  }
  return {
    locked: false,
    remainingSeconds: 0,
    attemptsLeft: Math.max(0, maxAttempts - bucket.attempts),
  };
}

function resetBucket(namespace: string, ip: string): void {
  ipRateBuckets.delete(`${namespace}:${ip}`);
}

function checkSlidingWindowLimit(namespace: string, ip: string, maxRequests: number, windowMs: number): { allowed: boolean; retryAfterSeconds: number } {
  const bucket = getBucket(namespace, ip);
  const now = Date.now();
  if (now - bucket.windowStart > windowMs) {
    bucket.windowStart = now;
    bucket.attempts = 0;
  }
  bucket.attempts += 1;
  if (bucket.attempts > maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.windowStart + windowMs - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

// Signed session helpers (supports both legacy sid.hmac and stateless v2 tokens across cold restarts)
function signSessionId(sessionId: string, issuedAt?: number, expiresAt?: number, codeVerified?: boolean): string {
  if (issuedAt && expiresAt) {
    const payload = `v2.${sessionId}.${issuedAt}.${expiresAt}.${codeVerified ? '1' : '0'}`;
    const hmac = crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
    return `${payload}.${hmac}`;
  }
  const hmac = crypto.createHmac('sha256', HMAC_SECRET).update(sessionId).digest('hex');
  return `${sessionId}.${hmac}`;
}

function verifySignedSessionDetailed(cookieVal: string): {
  sessionId: string;
  issuedAt?: number;
  expiresAt?: number;
  codeVerified?: boolean;
} | null {
  if (!cookieVal || !cookieVal.includes('.')) return null;
  const parts = cookieVal.split('.');
  if (parts.length === 6 && parts[0] === 'v2') {
    const [ver, sessionId, iatStr, expStr, cvStr, hmac] = parts;
    const payload = `${ver}.${sessionId}.${iatStr}.${expStr}.${cvStr}`;
    const expected = crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
    if (hmac.length === expected.length && crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected))) {
      const issuedAt = Number(iatStr);
      const expiresAt = Number(expStr);
      if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
        return null;
      }
      const minValidAfter = centralSecurityConfig?.min_session_valid_after || 0;
      if (issuedAt < minValidAfter) {
        return null;
      }
      return {
        sessionId,
        issuedAt,
        expiresAt,
        codeVerified: cvStr === '1',
      };
    }
    return null;
  }
  if (parts.length !== 2) return null;
  const [sessionId, hmac] = parts;
  const expected = crypto.createHmac('sha256', HMAC_SECRET).update(sessionId).digest('hex');
  if (hmac.length === expected.length && crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected))) {
    return { sessionId };
  }
  return null;
}

function verifySignedSession(cookieVal: string): string | null {
  return verifySignedSessionDetailed(cookieVal)?.sessionId || null;
}

function resolveSessionRecord(req: Request): {
  rawSessionId: string;
  email: string;
  owner: boolean;
  codeVerified: boolean;
  expiresAt: number;
} | null {
  const cookies = parseCookies(req);
  const cookieVal = cookies['__session'];
  if (!cookieVal) return null;
  const parsed = verifySignedSessionDetailed(cookieVal);
  if (!parsed) return null;

  const existing = activeSessions.get(parsed.sessionId);
  if (existing) {
    if (existing.expiresAt < Date.now()) {
      activeSessions.delete(parsed.sessionId);
      return null;
    }
    return {
      rawSessionId: parsed.sessionId,
      email: existing.email,
      owner: existing.owner,
      codeVerified: existing.codeVerified,
      expiresAt: existing.expiresAt,
    };
  }

  // Rehydrate valid stateless v2 token after serverless/free-tier process restart
  if (parsed.expiresAt && parsed.codeVerified) {
    const restored = {
      email: OWNER_EMAIL,
      owner: true,
      codeVerified: true,
      expiresAt: parsed.expiresAt,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Browser',
      createdAt: new Date(parsed.issuedAt || Date.now()).toISOString(),
    };
    activeSessions.set(parsed.sessionId, restored);
    return {
      rawSessionId: parsed.sessionId,
      email: restored.email,
      owner: restored.owner,
      codeVerified: restored.codeVerified,
      expiresAt: restored.expiresAt,
    };
  }

  return null;
}

const activeSessions = new Map<string, { email: string; owner: boolean; codeVerified: boolean; expiresAt: number; ip?: string; userAgent?: string; createdAt?: string }>();

// Periodic garbage collection for expired sessions and stale rate limit buckets
setInterval(() => {
  const now = Date.now();
  activeSessions.forEach((sess, key) => {
    if (sess.expiresAt < now) activeSessions.delete(key);
  });
  ipRateBuckets.forEach((bucket, key) => {
    if (now - bucket.lastSeen > 30 * 60 * 1000 && now > bucket.lockoutUntil) {
      ipRateBuckets.delete(key);
    }
  });
}, 10 * 60 * 1000).unref();

// ==========================================
// 🛡️ ARGON2ID CENTRALIZED SECURITY SYSTEM
// ==========================================
const CENTRAL_SECURITY_FILE = getDataFilePath('central_security_config.json');
const CLOUD_SECURITY_KEY = 'echox:central_security_config';

interface CentralSecurityConfig {
  access_code_argon2: string;
  pin_argon2: string;
  updated_at: string;
  min_session_valid_after?: number;
  history: Array<{ type: string; timestamp: string }>;
}

let centralSecurityConfig: CentralSecurityConfig | null = null;

function persistCentralSecurityConfig(cfg: CentralSecurityConfig): void {
  try {
    atomicWriteJsonSync(CENTRAL_SECURITY_FILE, cfg);
  } catch (err) {
    console.warn('[Security] Notice persisting central security config:', err);
  }
  pushCloudJson(CLOUD_SECURITY_KEY, cfg);
}

async function initCentralSecurityConfig(): Promise<CentralSecurityConfig> {
  if (isCloudPersistenceEnabled()) {
    const cloudCfg = await loadCloudJson<CentralSecurityConfig>(CLOUD_SECURITY_KEY);
    if (cloudCfg && cloudCfg.access_code_argon2 && cloudCfg.pin_argon2) {
      centralSecurityConfig = cloudCfg;
      try {
        atomicWriteJsonSync(CENTRAL_SECURITY_FILE, cloudCfg);
      } catch {}
      return cloudCfg;
    }
  }

  try {
    if (fs.existsSync(CENTRAL_SECURITY_FILE)) {
      const data = JSON.parse(fs.readFileSync(CENTRAL_SECURITY_FILE, 'utf-8'));
      if (data && data.access_code_argon2 && data.pin_argon2) {
        centralSecurityConfig = data;
        if (isCloudPersistenceEnabled()) {
          pushCloudJson(CLOUD_SECURITY_KEY, data);
        }
        return data;
      }
    }
  } catch (err) {
    console.warn('[Security] Notice reading central security config, initializing from Argon2id hashes:', err);
  }

  const config: CentralSecurityConfig = {
    access_code_argon2: DEFAULT_ACCESS_ARGON2,
    pin_argon2: DEFAULT_PIN_ARGON2,
    updated_at: new Date().toISOString(),
    history: [{ type: 'INITIALIZED', timestamp: new Date().toISOString() }]
  };

  persistCentralSecurityConfig(config);
  centralSecurityConfig = config;
  return config;
}

function parseCookies(req: Request): Record<string, string> {
  const list: Record<string, string> = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const name = parts[0]?.trim();
      const val = parts.slice(1).join('=').trim();
      if (name) list[name] = decodeURIComponent(val);
    });
  }
  return list;
}

// 3. createOwnerSession with Cryptographic Signature
app.post('/api/createOwnerSession', async (req: Request, res: Response) => {
  try {
    const { email } = req.body || {};

    if (!email || email.trim().toLowerCase() !== OWNER_EMAIL) {
      return res.status(403).json({ error: 'جلسة غير مصرح بها للمالك.' });
    }

    // Create session cookie with cryptographic signature
    const rawSessionId = `session_${crypto.randomBytes(32).toString('hex')}`;
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
    const expiresAt = Date.now() + fiveDaysMs;

    activeSessions.set(rawSessionId, {
      email: OWNER_EMAIL,
      owner: true,
      codeVerified: false,
      expiresAt
    });

    const signedCookie = signSessionId(rawSessionId);

    // Set secure __session signed cookie
    res.setHeader('Set-Cookie', [
      buildSessionCookie(req, signedCookie, 5 * 24 * 3600)
    ]);

    return res.json({
      success: true,
      message: 'تم إنشاء جلسة المالك الآمنة بنجاح.'
    });

  } catch (err: any) {
    console.error('Error in /api/createOwnerSession:', err);
    return res.status(500).json({ error: 'فشل إنشاء الجلسة الآمنة.' });
  }
});

// 4. owner/me (Route Guard Server Verification)
app.get('/api/owner/me', (req: Request, res: Response) => {
  const session = resolveSessionRecord(req);
  if (!session || session.email !== OWNER_EMAIL || !session.owner) {
    return res.status(401).json({ authenticated: false, error: 'جلسة منتهية أو غير مصرح بها.' });
  }

  return res.json({
    authenticated: true,
    email: session.email,
    owner: true,
    codeVerified: !!session.codeVerified,
    expiresAt: session.expiresAt
  });
});

// 5. verifySecurityCode (Verified directly against Argon2id PIN hash)
app.post('/api/security/verifyCode', async (req: Request, res: Response) => {
  try {
    const cookies = parseCookies(req);
    const cookieVal = cookies['__session'];

    if (!cookieVal) {
      return res.status(401).json({ error: 'يرجى تسجيل الدخول بحساب Google ورمز الهاتف أولاً.' });
    }

    const rawSessionId = verifySignedSession(cookieVal);
    if (!rawSessionId || !activeSessions.has(rawSessionId)) {
      return res.status(401).json({ error: 'جلسة غير صالحة.' });
    }

    const session = activeSessions.get(rawSessionId)!;
    const ip = getClientIp(req);
    const lockState = checkLockout('verifyCode', ip);
    if (lockState.locked) {
      return res.status(429).json({
        error: `تم قفل شيفرة الحماية مؤقتاً لحماية الحساب. يرجى الانتظار ${lockState.remainingSeconds} ثانية.`,
        locked: true,
        remainingSeconds: lockState.remainingSeconds
      });
    }

    if (!centralSecurityConfig) {
      await initCentralSecurityConfig();
    }

    const { code } = req.body || {};
    if (!code || String(code).trim().length === 0) {
      return res.status(400).json({ error: 'يرجى إدخال شيفرة الأمان السيادية.' });
    }

    let isMatch = false;
    try {
      isMatch = await argon2.verify(centralSecurityConfig!.pin_argon2, String(code).trim());
    } catch {}

    if (!isMatch) {
      const fail = recordFailedAttempt('verifyCode', ip, 3, 5 * 60 * 1000);
      if (fail.locked) {
        return res.status(429).json({
          error: 'تم تجاوز الحد الأقصى للمحاولات (3 محاولات خاطئة). تم تفعيل القفل الأمني لمدة 5 دقائق.',
          locked: true,
          remainingSeconds: fail.remainingSeconds
        });
      }

      return res.status(403).json({
        error: `شيفرة الأمان غير صحيحة! يتبقى لديك ${fail.attemptsLeft} ${fail.attemptsLeft === 1 ? 'محاولة واحدة' : 'محاولات'}.`,
        attemptsLeft: fail.attemptsLeft
      });
    }

    resetBucket('verifyCode', ip);
    session.codeVerified = true;

    return res.json({
      success: true,
      message: 'تم التحقق من شيفرة الحماية السيادية بنجاح وتم فك قفل لوحة المالك.',
      codeVerified: true
    });

  } catch (err: any) {
    console.error('Error in /api/security/verifyCode:', err);
    return res.status(500).json({ error: 'فشل التحقق من شيفرة الحماية.' });
  }
});

// 6. updateSecurityCode (Owner can change their PIN through Argon2id)
app.post('/api/security/updateCode', async (req: Request, res: Response) => {
  try {
    const cookies = parseCookies(req);
    const cookieVal = cookies['__session'];
    const rawSessionId = verifySignedSession(cookieVal);

    if (!rawSessionId) {
      return res.status(401).json({ error: 'غير مصرح.' });
    }

    const session = activeSessions.get(rawSessionId);
    if (!session || !session.codeVerified) {
      return res.status(403).json({ error: 'يجب تأكيد شيفرة الأمان الحالية أولاً.' });
    }

    if (!centralSecurityConfig) {
      await initCentralSecurityConfig();
    }

    const { currentCode, newCode } = req.body || {};
    if (!currentCode || !newCode || String(newCode).trim().length < 4) {
      return res.status(400).json({ error: 'الشيفرة الجديدة يجب أن تحتوي على 4 خانات على الأقل.' });
    }

    const isCurrentValid = await argon2.verify(centralSecurityConfig!.pin_argon2, String(currentCode).trim());
    if (!isCurrentValid) {
      return res.status(403).json({ error: 'شيفرة الأمان الحالية غير صحيحة.' });
    }

    const newHash = await argon2.hash(String(newCode).trim(), { type: argon2.argon2id });
    centralSecurityConfig!.pin_argon2 = newHash;
    centralSecurityConfig!.updated_at = new Date().toISOString();
    centralSecurityConfig!.history = [
      { type: 'PIN_CHANGED', timestamp: new Date().toISOString() },
      ...(centralSecurityConfig!.history || [])
    ].slice(0, 10);
    persistCentralSecurityConfig(centralSecurityConfig!);

    return res.json({
      success: true,
      message: 'تم تحديث شيفرة الحماية السيادية وتشفيرها بنجاح.'
    });

  } catch (err: any) {
    console.error('Error in /api/security/updateCode:', err);
    return res.status(500).json({ error: 'حدث خطأ أثناء تحديث شيفرة الأمان.' });
  }
});

// 7. emergencyLockdown (Panic button: instantly revokes all active sessions)
app.post('/api/security/emergencyLockdown', (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  try {
    const sessionCount = activeSessions.size;
    activeSessions.clear();
    if (centralSecurityConfig) {
      centralSecurityConfig.min_session_valid_after = Date.now() + 1;
      persistCentralSecurityConfig(centralSecurityConfig);
    }

    res.setHeader('Set-Cookie', [
      buildSessionCookie(req, '', 0)
    ]);

    console.warn(`[ECHOX_SECURITY_LOCKDOWN] Emergency Lockdown triggered! Revoked ${sessionCount} active sessions.`);

    return res.json({
      success: true,
      message: `تم تنفيذ القفل الأمني الفوري وإلغاء جميع الجلسات النشطة (${sessionCount} جلسة).`
    });

  } catch (err: any) {
    console.error('Error in emergencyLockdown:', err);
    return res.status(500).json({ error: 'تعذر تنفيذ القفل الأمني.' });
  }
});

// 8. securityStatus
app.get('/api/security/status', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const lockState = checkLockout('verifyCode', ip);

  return res.json({
    activeLayers: 4,
    defaultCodeAvailable: true,
    locked: lockState.locked,
    remainingSeconds: lockState.remainingSeconds,
    attemptsLeft: Math.max(0, 3 - lockState.attempts),
    encryptionAlgorithm: 'Argon2id + HMAC-SHA256'
  });
});

// 9. owner/logout
app.post('/api/owner/logout', (req: Request, res: Response) => {
  const cookies = parseCookies(req);
  const cookieVal = cookies['__session'];
  if (cookieVal) {
    const rawSessionId = verifySignedSession(cookieVal);
    if (rawSessionId) {
      activeSessions.delete(rawSessionId);
    }
  }
  res.setHeader('Set-Cookie', [
    buildSessionCookie(req, '', 0)
  ]);
  return res.json({ success: true, message: 'تم إنهاء جلسة المالك بنجاح.' });
});

// ==========================================
// 📱 OS-LEVEL PHONE LOCK (LEGACY COMPAT APIS)
// ==========================================
const OWNER_LOCK_FILE = getDataFilePath('owner_lock_config.json');

interface OwnerLockConfigData {
  lock_type: 'pattern' | 'pin';
  lock_hash: string;
  code_hash?: string;
  updated_at: string;
  failed_attempts: Array<{ timestamp: string; type: string }>;
}

function loadOwnerLockConfig(): OwnerLockConfigData | null {
  try {
    if (fs.existsSync(OWNER_LOCK_FILE)) {
      const content = fs.readFileSync(OWNER_LOCK_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (data && (data.lock_hash || data.code_hash)) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[LockConfig] Error reading lock config file:', err);
  }
  return null;
}

let ownerLockConfig = loadOwnerLockConfig();

// 1. GET /api/security/ownerLockConfig
app.get('/api/security/ownerLockConfig', (req: Request, res: Response) => {
  ownerLockConfig = loadOwnerLockConfig();
  const ip = getClientIp(req);
  const lockState = checkLockout('osLock', ip);

  if (!ownerLockConfig || (!ownerLockConfig.lock_hash && !ownerLockConfig.code_hash)) {
    return res.json({
      configured: false,
      lock_type: 'pin',
      lock_hash: '',
      code_hash: '',
      failed_attempts: [],
      lockedOut: lockState.locked,
      remainingSeconds: lockState.remainingSeconds,
      consecutiveFailures: lockState.attempts
    });
  }

  return res.json({
    configured: true,
    lock_type: ownerLockConfig.lock_type || 'pin',
    lock_hash: '',
    code_hash: '',
    failed_attempts: ownerLockConfig.failed_attempts || [],
    lockedOut: lockState.locked,
    remainingSeconds: lockState.remainingSeconds,
    consecutiveFailures: lockState.attempts
  });
});

// 2. POST /api/security/saveLockConfig (Admin authenticated)
app.post('/api/security/saveLockConfig', (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  try {
    const { lock_type = 'pattern', lock_hash, code_hash } = req.body || {};
    const finalHash = lock_hash || code_hash;

    if (!finalHash || typeof finalHash !== 'string' || finalHash.trim().length === 0) {
      return res.status(400).json({ error: 'الرمز المشفر (Hash) مطلوب.' });
    }

    const currentAttempts = ownerLockConfig?.failed_attempts || [];
    const newConfig: OwnerLockConfigData = {
      lock_type: lock_type === 'pin' ? 'pin' : 'pattern',
      lock_hash: finalHash.trim(),
      code_hash: finalHash.trim(),
      updated_at: new Date().toISOString(),
      failed_attempts: currentAttempts.slice(0, 5)
    };

    atomicWriteJsonSync(OWNER_LOCK_FILE, newConfig);
    ownerLockConfig = newConfig;

    return res.json({
      success: true,
      message: 'تم حفظ إعدادات قفل الهاتف المشفرة بنجاح.',
      config: { ...newConfig, lock_hash: '', code_hash: '' }
    });
  } catch (err: any) {
    console.error('Error saving lock config:', err);
    return res.status(500).json({ error: 'فشل حفظ إعدادات القفل.' });
  }
});

// 3. POST /api/security/verifyLockHash
app.post('/api/security/verifyLockHash', (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    const lockState = checkLockout('osLock', ip);
    if (lockState.locked) {
      return res.status(429).json({
        success: false,
        lockedOut: true,
        remainingSeconds: lockState.remainingSeconds,
        error: `المحاولات كثيرة، انتظر ${lockState.remainingSeconds} ثانية`
      });
    }

    ownerLockConfig = loadOwnerLockConfig();
    const storedHash = ownerLockConfig?.lock_hash || ownerLockConfig?.code_hash;

    if (!storedHash) {
      return res.status(400).json({ error: 'لم يتم إعداد قفل الهاتف بعد.' });
    }

    const { hash, type = 'pattern' } = req.body || {};
    if (!hash) {
      return res.status(400).json({ error: 'الرمز المدخل مطلوب.' });
    }

    const incomingBuf = Buffer.from(String(hash).trim().toLowerCase());
    const storedBuf = Buffer.from(storedHash.trim().toLowerCase());
    const isMatch = incomingBuf.length === storedBuf.length && crypto.timingSafeEqual(incomingBuf, storedBuf);

    if (!isMatch) {
      const fail = recordFailedAttempt('osLock', ip, 5, 30000);
      const currentAttempts = ownerLockConfig?.failed_attempts || [];
      const newAttempts = [
        { timestamp: new Date().toISOString(), type: String(type) },
        ...currentAttempts
      ].slice(0, 5);

      if (ownerLockConfig) {
        ownerLockConfig.failed_attempts = newAttempts;
        try {
          atomicWriteJsonSync(OWNER_LOCK_FILE, ownerLockConfig);
        } catch {}
      }

      if (fail.locked) {
        return res.status(429).json({
          success: false,
          lockedOut: true,
          remainingSeconds: fail.remainingSeconds,
          error: `المحاولات كثيرة، انتظر ${fail.remainingSeconds} ثانية`
        });
      }

      return res.status(401).json({
        success: false,
        lockedOut: false,
        remainingSeconds: 0,
        attemptsLeft: fail.attemptsLeft,
        error: 'الرمز غير صحيح'
      });
    }

    resetBucket('osLock', ip);

    const cookies = parseCookies(req);
    const cookieVal = cookies['__session'];
    if (cookieVal) {
      const rawSessionId = verifySignedSession(cookieVal);
      if (rawSessionId && activeSessions.has(rawSessionId)) {
        activeSessions.get(rawSessionId)!.codeVerified = true;
      }
    }

    return res.json({
      success: true,
      message: 'تم فك القفل بنجاح والدخول للوحة المالك.'
    });

  } catch (err: any) {
    console.error('Error verifying lock hash:', err);
    return res.status(500).json({ error: 'حدث خطأ أثناء فحص الرمز.' });
  }
});

// 4. POST /api/security/logFailedAttempt
app.post('/api/security/logFailedAttempt', (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    const { type = 'pattern' } = req.body || {};
    const fail = recordFailedAttempt('osLock', ip, 5, 30000);

    ownerLockConfig = loadOwnerLockConfig();
    const currentAttempts = ownerLockConfig?.failed_attempts || [];
    const newAttempts = [
      { timestamp: new Date().toISOString(), type: String(type) },
      ...currentAttempts
    ].slice(0, 5);

    if (ownerLockConfig) {
      ownerLockConfig.failed_attempts = newAttempts;
      try {
        atomicWriteJsonSync(OWNER_LOCK_FILE, ownerLockConfig);
      } catch {}
    }

    return res.json({
      success: true,
      consecutiveFailures: 5 - fail.attemptsLeft,
      lockedOut: fail.locked,
      remainingSeconds: fail.remainingSeconds,
      failed_attempts: newAttempts
    });
  } catch {
    return res.status(500).json({ error: 'Failed logging attempt' });
  }
});

// 5. POST /api/security/resetLockConfig (Admin authenticated)
app.post('/api/security/resetLockConfig', (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  try {
    if (fs.existsSync(OWNER_LOCK_FILE)) {
      fs.unlinkSync(OWNER_LOCK_FILE);
    }
    ownerLockConfig = null;
    resetBucket('osLock', getClientIp(req));

    return res.json({
      success: true,
      message: 'تم مسح رمز القفل وإعادة تعيين النظام.'
    });
  } catch {
    return res.status(500).json({ error: 'فشل إعادة التعيين.' });
  }
});

// 6. POST /api/security/logoutAllDevices (Admin authenticated)
app.post('/api/security/logoutAllDevices', (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  const count = activeSessions.size;
  activeSessions.clear();
  if (centralSecurityConfig) {
    centralSecurityConfig.min_session_valid_after = Date.now() + 1;
    persistCentralSecurityConfig(centralSecurityConfig);
  }
  res.setHeader('Set-Cookie', [
    buildSessionCookie(req, '', 0)
  ]);
  return res.json({
    success: true,
    message: `تم تسجيل الخروج بنجاح من جميع الأجهزة النشطة (${count} جلسة).`
  });
});

// ==========================================
// 🛡️ ARGON2ID ACCESS CODE & PIN ENDPOINTS
// ==========================================

// 1. Verify Secret Access Code (invoked from search bar)
app.post('/api/security/verifyAccessCode', async (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    const lockState = checkLockout('accessCode', ip);
    if (lockState.locked) {
      return res.status(429).json({
        success: false,
        lockedOut: true,
        remainingSeconds: lockState.remainingSeconds,
        error: `تم تجميد محاولات رمز الوصول، يرجى الانتظار ${lockState.remainingSeconds} ثانية.`
      });
    }

    if (!centralSecurityConfig) {
      await initCentralSecurityConfig();
    }

    const { code } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'رمز الوصول مطلوب.' });
    }

    const trimmed = code.trim();
    if (trimmed.length < 3) {
      return res.status(400).json({ success: false, error: 'رمز الوصول قصير جداً.' });
    }

    let isMatch = false;
    try {
      isMatch = await argon2.verify(centralSecurityConfig!.access_code_argon2, trimmed);
    } catch (e) {
      console.warn('Argon2 verify access code error:', e);
    }

    if (isMatch) {
      resetBucket('accessCode', ip);
      return res.json({
        success: true,
        message: 'تم التحقق من رمز الوصول بنجاح.'
      });
    }

    const fail = recordFailedAttempt('accessCode', ip, 5, 30000);
    if (fail.locked) {
      return res.status(429).json({
        success: false,
        lockedOut: true,
        remainingSeconds: fail.remainingSeconds,
        error: 'تجاوزت عدد المحاولات المسموح به. تم تجميد البوابة لمدة 30 ثانية.'
      });
    }

    return res.status(401).json({
      success: false,
      lockedOut: false,
      remainingSeconds: 0,
      attemptsLeft: fail.attemptsLeft,
      error: 'رمز الوصول غير صحيح.'
    });

  } catch (err: any) {
    console.error('Error in /api/security/verifyAccessCode:', err);
    return res.status(500).json({ error: 'خطأ في معالجة فحص رمز الوصول.' });
  }
});

// 2. Verify PIN with Argon2id
app.post('/api/security/verifyPin', async (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    const lockState = checkLockout('pin', ip);
    if (lockState.locked) {
      return res.status(429).json({
        success: false,
        lockedOut: true,
        remainingSeconds: lockState.remainingSeconds,
        error: `تم تجميد محاولات PIN، يرجى الانتظار ${lockState.remainingSeconds} ثانية.`
      });
    }

    if (!centralSecurityConfig) {
      await initCentralSecurityConfig();
    }

    const { pin } = req.body || {};
    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ success: false, error: 'رمز PIN مطلوب.' });
    }

    const trimmed = pin.trim();
    let isMatch = false;
    try {
      isMatch = await argon2.verify(centralSecurityConfig!.pin_argon2, trimmed);
    } catch (e) {
      console.warn('Argon2 verify pin notice:', e);
    }

    if (isMatch) {
      resetBucket('pin', ip);

      const rawSessionId = `admin_${crypto.randomBytes(32).toString('hex')}`;
      const issuedAt = Date.now();
      const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
      const expiresAt = issuedAt + fiveDaysMs;

      activeSessions.set(rawSessionId, {
        email: OWNER_EMAIL,
        owner: true,
        codeVerified: true,
        expiresAt,
        ip,
        userAgent: req.headers['user-agent'] || 'Browser',
        createdAt: new Date(issuedAt).toISOString()
      });

      const signedCookie = signSessionId(rawSessionId, issuedAt, expiresAt, true);
      res.setHeader('Set-Cookie', [
        buildSessionCookie(req, signedCookie, 5 * 24 * 3600)
      ]);

      return res.json({
        success: true,
        sessionId: rawSessionId,
        message: 'تم التحقق بنجاح والدخول إلى مركز التحكم.'
      });
    }

    const fail = recordFailedAttempt('pin', ip, 5, 30000);
    if (fail.locked) {
      return res.status(429).json({
        success: false,
        lockedOut: true,
        remainingSeconds: fail.remainingSeconds,
        error: 'تجاوزت عدد محاولات PIN المسموحة. تم قفل البوابة مؤقتاً لمدة 30 ثانية.'
      });
    }

    return res.status(401).json({
      success: false,
      lockedOut: false,
      remainingSeconds: 0,
      attemptsLeft: fail.attemptsLeft,
      error: `رمز PIN غير صحيح! المحاولات المتبقية: ${fail.attemptsLeft}`
    });

  } catch (err: any) {
    console.error('Error in /api/security/verifyPin:', err);
    return res.status(500).json({ error: 'خطأ أثناء التحقق من PIN.' });
  }
});

// 3. Update Access Code (Admin session + current PIN verification + rate limited)
app.post('/api/security/updateAccessCode', async (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  try {
    const ip = getClientIp(req);
    const rate = checkSlidingWindowLimit('updateAccessCode', ip, 10, 5 * 60 * 1000);
    if (!rate.allowed) {
      return res.status(429).json({ error: `محاولات كثيرة، يرجى الانتظار ${rate.retryAfterSeconds} ثانية.` });
    }

    if (!centralSecurityConfig) {
      await initCentralSecurityConfig();
    }

    const { currentPinOrCode, newCode } = req.body || {};
    if (!currentPinOrCode || !newCode) {
      return res.status(400).json({ error: 'الرمز الحالي والرمز الجديد كلاهما مطلوبان.' });
    }

    let isAuthorized = false;
    try {
      if (await argon2.verify(centralSecurityConfig!.pin_argon2, String(currentPinOrCode).trim())) {
        isAuthorized = true;
      }
    } catch {}

    if (!isAuthorized) {
      try {
        if (await argon2.verify(centralSecurityConfig!.access_code_argon2, String(currentPinOrCode).trim())) {
          isAuthorized = true;
        }
      } catch {}
    }

    if (!isAuthorized) {
      return res.status(401).json({ error: 'رمز التحقق الحالي غير صحيح.' });
    }

    const cleanNew = String(newCode).trim();
    if (cleanNew.length < 4) {
      return res.status(400).json({ error: 'يجب أن يتكون رمز الوصول الجديد من 4 خانات على الأقل.' });
    }

    const newHash = await argon2.hash(cleanNew, { type: argon2.argon2id });
    centralSecurityConfig!.access_code_argon2 = newHash;
    centralSecurityConfig!.updated_at = new Date().toISOString();
    centralSecurityConfig!.history = [
      { type: 'ACCESS_CODE_CHANGED', timestamp: new Date().toISOString() },
      ...(centralSecurityConfig!.history || [])
    ].slice(0, 10);

    persistCentralSecurityConfig(centralSecurityConfig!);
    resetBucket('accessCode', ip);

    return res.json({
      success: true,
      message: 'تم تحديث رمز الوصول السري بنجاح وتشفيره ببصمة Argon2id فورياً.'
    });

  } catch (err: any) {
    console.error('Error updating access code:', err);
    return res.status(500).json({ error: 'فشل حفظ رمز الوصول الجديد.' });
  }
});

// 4. Update PIN (Admin session + current PIN verification + rate limited)
app.post('/api/security/updatePin', async (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  try {
    const ip = getClientIp(req);
    const rate = checkSlidingWindowLimit('updatePin', ip, 10, 5 * 60 * 1000);
    if (!rate.allowed) {
      return res.status(429).json({ error: `محاولات كثيرة، يرجى الانتظار ${rate.retryAfterSeconds} ثانية.` });
    }

    if (!centralSecurityConfig) {
      await initCentralSecurityConfig();
    }

    const { currentPin, newPin } = req.body || {};
    if (!currentPin || !newPin) {
      return res.status(400).json({ error: 'رمز PIN الحالي والجديد مطلوبان.' });
    }

    const pinMatch = await argon2.verify(centralSecurityConfig!.pin_argon2, String(currentPin).trim());
    if (!pinMatch) {
      return res.status(401).json({ error: 'رمز PIN الحالي غير صحيح.' });
    }

    const cleanNew = String(newPin).trim();
    if (cleanNew.length !== 6 || !/^\d{6}$/.test(cleanNew)) {
      return res.status(400).json({ error: 'يجب أن يتكون رمز الـ PIN الجديد من 6 أرقام بالضبط.' });
    }

    const newHash = await argon2.hash(cleanNew, { type: argon2.argon2id });
    centralSecurityConfig!.pin_argon2 = newHash;
    centralSecurityConfig!.updated_at = new Date().toISOString();
    centralSecurityConfig!.history = [
      { type: 'PIN_CHANGED', timestamp: new Date().toISOString() },
      ...(centralSecurityConfig!.history || [])
    ].slice(0, 10);

    persistCentralSecurityConfig(centralSecurityConfig!);

    try {
      const legacyLock: OwnerLockConfigData = {
        lock_type: 'pin',
        lock_hash: newHash,
        code_hash: newHash,
        updated_at: new Date().toISOString(),
        failed_attempts: []
      };
      atomicWriteJsonSync(OWNER_LOCK_FILE, legacyLock);
      ownerLockConfig = legacyLock;
    } catch {}

    resetBucket('pin', ip);

    return res.json({
      success: true,
      message: 'تم تحديث رمز PIN بنجاح وتشفيره ببصمة Argon2id فورياً.'
    });

  } catch (err: any) {
    console.error('Error updating PIN:', err);
    return res.status(500).json({ error: 'فشل حفظ رمز الـ PIN الجديد.' });
  }
});

// 5. Active Sessions List (Admin authenticated)
app.get('/api/security/sessions', (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  const cookies = parseCookies(req);
  const currentCookie = cookies['__session'];
  const currentSessionId = currentCookie ? verifySignedSession(currentCookie) : null;

  const list: Array<{
    id: string;
    ip: string;
    userAgent: string;
    createdAt: string;
    isCurrent: boolean;
  }> = [];

  activeSessions.forEach((val, id) => {
    list.push({
      id: `${id.substring(0, 8)}...${id.substring(id.length - 4)}`,
      ip: val.ip || '127.0.0.1',
      userAgent: val.userAgent || 'Browser',
      createdAt: val.createdAt || new Date().toISOString(),
      isCurrent: id === currentSessionId
    });
  });

  return res.json({
    sessions: list,
    securityEngine: 'Argon2id + HMAC-SHA256'
  });
});

// 6. Security System Status
app.get('/api/security/systemStatus', (_req: Request, res: Response) => {
  return res.json({
    argon2idEnabled: true,
    hashingAlgorithm: 'Argon2id (m=65536, t=3, p=4)',
    serverSideEnforced: true,
    storageMode: isCloudPersistenceEnabled() ? 'upstash-redis+local-atomic' : 'local-atomic-disk',
    activeSessionsCount: activeSessions.size,
    accessCodeConfigured: true,
    pinConfigured: true,
    updatedAt: centralSecurityConfig?.updated_at || new Date().toISOString()
  });
});

// ==========================================
// 💳 ECHOX PROFESSIONAL PAYMENT SYSTEM APIS
// ==========================================

function requireAdminAuth(req: Request, res: Response): { email: string } | null {
  const session = resolveSessionRecord(req);
  if (!session) {
    res.status(401).json({ error: 'وصول مرفوض: جلسة مركز التحكم مطلوبة أو منتهية.' });
    return null;
  }
  if (session.email !== OWNER_EMAIL || !session.owner || !session.codeVerified) {
    res.status(403).json({ error: 'وصول غير مصرح به: صلاحيات مركز التحكم مطلوبة.' });
    return null;
  }
  return { email: session.email };
}

// 1. Public Payment Config (never exposes server secrets)
app.get('/api/payments/config', (_req: Request, res: Response) => {
  return res.json(getPublicPaymentConfig());
});

// 2. Catalog Price Sync (Admin only can overwrite catalog prices)
app.post('/api/admin/payments/catalog-sync', (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  const { products } = req.body || {};
  syncCatalogSnapshot(products);
  return res.json({ success: true });
});

// 3. Server-Verified Multi-Vendor Checkout (Rate limited per IP)
app.post('/api/payments/checkout', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const rate = checkSlidingWindowLimit('checkout', ip, 20, 60 * 1000);
  if (!rate.allowed) {
    return res.status(429).json({ success: false, error: `تم تجاوز حد الطلبات، يرجى الانتظار ${rate.retryAfterSeconds} ثانية.` });
  }
  try {
    const result = await processServerCheckout(req.body);
    if (!result.ok) {
      return res.status(result.statusCode || 400).json({ success: false, error: result.error });
    }
    return res.json({
      success: true,
      order: result.order,
      transaction: result.transaction,
      paymentUrl: result.paymentUrl,
    });
  } catch (err: any) {
    console.error('[Payments] Checkout error:', err);
    return res.status(500).json({ success: false, error: 'تعذر إتمام عملية الدفع على الخادم.' });
  }
});

// 4. Customer Submit Bank Transfer Proof (Rate limited per IP)
app.post('/api/payments/bank-transfer/proof', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const rate = checkSlidingWindowLimit('bankProof', ip, 20, 60 * 1000);
  if (!rate.allowed) {
    return res.status(429).json({ success: false, error: `تم تجاوز حد الإرسال، يرجى الانتظار ${rate.retryAfterSeconds} ثانية.` });
  }
  const cookies = parseCookies(req);
  const rawSid = cookies['__session'] ? verifySignedSession(cookies['__session']) : null;
  const isAdmin = Boolean(rawSid && activeSessions.get(rawSid)?.codeVerified);

  const result = submitBankTransferProof({
    ...(req.body || {}),
    isAdmin,
  });
  if (!result.ok) {
    return res.status(result.statusCode || 400).json({ success: false, error: result.error });
  }
  return res.json({ success: true, order: result.order });
});

// 5. Customer Request Cancellation / Refund
app.post('/api/payments/request-refund', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const rate = checkSlidingWindowLimit('refundReq', ip, 15, 60 * 1000);
  if (!rate.allowed) {
    return res.status(429).json({ success: false, error: `تم تجاوز الحد المسموح، يرجى الانتظار ${rate.retryAfterSeconds} ثانية.` });
  }
  const result = createCustomerRefundOrCancelRequest(req.body || {});
  if (!result.ok) {
    return res.status(result.statusCode || 400).json({ success: false, error: result.error });
  }
  return res.json({ success: true, refundRequest: result.refundRequest });
});

// 6. Server-Side Payment Webhook (Signature Verified + Idempotent Replay Guard)
app.post('/api/payments/webhook/:provider', async (req: Request, res: Response) => {
  const provider = req.params.provider || 'konnect';
  const sigHeader =
    (req.headers['x-konnect-signature'] as string) ||
    (req.headers['x-signature'] as string) ||
    (req.headers['x-webhook-signature'] as string);

  const result = await handlePaymentWebhook({
    provider,
    signatureHeader: sigHeader,
    rawBody: req.body,
  });
  return res.status(result.statusCode).json(result);
});

// 7. Scoped Vendor Financial Ledger View (Strict Vendor Data Isolation)
app.get('/api/vendor/:vendorId/financials', (req: Request, res: Response) => {
  const vendorId = String(req.params.vendorId || '').trim();
  if (!vendorId) {
    return res.status(400).json({ error: 'معرف البائع مطلوب.' });
  }
  return res.json(getScopedVendorFinancials(vendorId));
});

// 8. Independent Support ECHOX Endpoints (Rate limited per IP)
app.post('/api/support/contribute', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const rate = checkSlidingWindowLimit('supportContribute', ip, 15, 60 * 1000);
  if (!rate.allowed) {
    return res.status(429).json({ success: false, error: `تم تجاوز حد الطلبات، يرجى الانتظار ${rate.retryAfterSeconds} ثانية.` });
  }
  const result = createSupportContribution(req.body || {});
  if (!result.ok) {
    return res.status(result.statusCode || 400).json({ success: false, error: result.error });
  }
  return res.json({ success: true, supportTransaction: result.supportTransaction });
});

// 9. Admin Panel Payment Management Routes (Protected by requireAdminAuth)
app.get('/api/admin/payments/config', (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  return res.json(getPublicPaymentConfig());
});

app.put('/api/admin/payments/config', async (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  const body = req.body || {};

  // Step-Up Security Shield: Any change to bank account identity requires re-verifying PIN via Argon2id
  if (isBankIdentityChange(body.bankTransfer)) {
    if (isEnvLockedBank()) {
      return res.status(403).json({
        success: false,
        error: 'الحساب البنكي مقفول من متغيرات البيئة (LOCKED_BANK_IBAN) ولا يمكن تعديله من الموقع.',
      });
    }

    const ip = getClientIp(req);
    const lockState = checkLockout('bankPinConfirm', ip);
    if (lockState.locked) {
      return res.status(429).json({
        success: false,
        error: `تم قفل تعديل الحساب البنكي مؤقتاً، يرجى الانتظار ${lockState.remainingSeconds} ثانية.`,
      });
    }

    if (!centralSecurityConfig) {
      await initCentralSecurityConfig();
    }

    const confirmPin = typeof body.confirmPin === 'string' ? body.confirmPin.trim() : '';
    if (!confirmPin) {
      return res.status(403).json({
        success: false,
        requiresPinConfirmation: true,
        error: 'لتعديل بيانات الحساب البنكي أو فك تعليقه، يجب إدخال رمز الـ PIN الأمني للتأكيد.',
      });
    }

    let pinValid = false;
    try {
      pinValid = await argon2.verify(centralSecurityConfig!.pin_argon2, confirmPin);
    } catch {}

    if (!pinValid) {
      const fail = recordFailedAttempt('bankPinConfirm', ip, 3, 5 * 60 * 1000);
      return res.status(403).json({
        success: false,
        requiresPinConfirmation: true,
        error: fail.locked
          ? 'محاولات PIN خاطئة متعددة! تم تجميد تعديل الحساب البنكي لمدة 5 دقائق.'
          : `رمز الـ PIN التأكيدي غير صحيح! المحاولات المتبقية: ${fail.attemptsLeft}`,
      });
    }

    resetBucket('bankPinConfirm', ip);
  }

  const result = updateAdminPaymentConfig(body);
  if (!result.ok) {
    return res.status(400).json({ success: false, error: result.error });
  }
  return res.json({ success: true, config: result.config });
});

app.post('/api/admin/payments/test-gateway', async (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  const check = await testOnlineGatewayConnection();
  return res.json(check);
});

app.get('/api/admin/payments/overview', (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  return res.json(getAdminPaymentOverview());
});

app.post('/api/admin/payments/verify', (req: Request, res: Response) => {
  const admin = requireAdminAuth(req, res);
  if (!admin) return;
  const result = adminVerifyPayment({
    ...(req.body || {}),
    adminEmail: admin.email,
  });
  if (!result.ok) {
    return res.status(result.statusCode || 400).json({ success: false, error: result.error });
  }
  return res.json({ success: true, order: result.order, transaction: result.transaction });
});

app.post('/api/admin/payments/refund', (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  const result = adminProcessRefundOrCancel(req.body || {});
  if (!result.ok) {
    return res.status(result.statusCode || 400).json({ success: false, error: result.error });
  }
  return res.json({ success: true, order: result.order });
});

app.post('/api/admin/payments/vendor-payout', (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  const { vendorId, settlementNote } = req.body || {};
  if (!vendorId) {
    return res.status(400).json({ success: false, error: 'معرف البائع مطلوب.' });
  }
  const result = adminSettleVendorPayout(vendorId, settlementNote);
  return res.json({ success: true, ...result });
});

app.post('/api/admin/support/verify', (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  const { id, action } = req.body || {};
  const result = adminVerifySupportTransaction(id, action);
  if (!result.ok) {
    return res.status(result.statusCode || 400).json({ success: false, error: result.error });
  }
  return res.json({ success: true, supportTransaction: result.supportTransaction });
});

app.patch('/api/admin/orders/:orderId/status', (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  const { status, note } = req.body || {};
  const result = adminUpdateOrderStatus(req.params.orderId, status, note);
  if (!result.ok) {
    return res.status(result.statusCode || 409).json({ success: false, error: result.error });
  }
  return res.json({ success: true, order: result.order });
});

// 10. Live Customer Support Chat Routes
app.get('/api/chat/config', (_req: Request, res: Response) => {
  return res.json({ success: true, config: getPublicChatConfig() });
});

app.get('/api/chat/session/:sessionId', (req: Request, res: Response) => {
  const thread = getChatThread(req.params.sessionId);
  return res.json({ success: true, thread });
});

app.post('/api/chat/session/:sessionId/message', (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const rate = checkSlidingWindowLimit('supportChat', ip, 30, 60 * 1000);
  if (!rate.allowed) {
    return res.status(429).json({
      success: false,
      error: `تم تجاوز حد الرسائل، يرجى الانتظار ${rate.retryAfterSeconds} ثانية.`,
    });
  }
  const { language, customerLabel, customerText, autoReplyText, suggestedProducts, actionView } = req.body || {};
  const result = recordCustomerChatExchange({
    sessionId: req.params.sessionId,
    language,
    customerLabel,
    customerText,
    autoReplyText,
    suggestedProducts,
    actionView,
  });
  if (!result.ok) {
    return res.status(400).json({ success: false, error: result.error });
  }
  return res.json({ success: true, thread: result.thread });
});

app.get('/api/admin/chat/threads', (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  return res.json({ success: true, ...listAdminChatThreads() });
});

app.post('/api/admin/chat/threads/:sessionId/reply', (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  const { replyText } = req.body || {};
  const result = adminSendChatReply({
    sessionId: req.params.sessionId,
    replyText,
  });
  if (!result.ok) {
    return res.status(400).json({ success: false, error: result.error });
  }
  return res.json({ success: true, thread: result.thread, message: result.message });
});

app.post('/api/admin/chat/threads/:sessionId/read', (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  markThreadReadByOwner(req.params.sessionId);
  return res.json({ success: true });
});

app.delete('/api/admin/chat/threads/:sessionId', (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  deleteChatThread(req.params.sessionId);
  return res.json({ success: true });
});

app.put('/api/admin/chat/config', (req: Request, res: Response) => {
  if (!requireAdminAuth(req, res)) return;
  const updated = updateChatConfig(req.body || {});
  return res.json({ success: true, config: updated });
});

// --- PRODUCTION STATIC OR VITE DEV MIDDLEWARE ---
async function startServer() {
  await Promise.all([
    initCentralSecurityConfig().catch((err) => console.error('[Security] Init notice:', err)),
    hydratePaymentDbFromCloud().catch((err) => console.error('[PaymentEngine] Cloud hydrate notice:', err)),
    hydrateChatDbFromCloud().catch((err) => console.error('[ChatEngine] Cloud hydrate notice:', err)),
  ]);

  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(process.cwd(), 'dist');

  if (isProd && fs.existsSync(distDir)) {
    app.use(
      '/assets',
      express.static(path.join(distDir, 'assets'), {
        maxAge: '365d',
        immutable: true,
      })
    );
    app.use(express.static(distDir));
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, error: 'Endpoint not found' });
      }
      return res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ECHOX STORE] Full-Stack Server (${isProd ? 'production' : 'development'}) listening on http://0.0.0.0:${PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[ECHOX STORE] Received ${signal}, flushing cloud writes and shutting down cleanly...`);
    await flushCloudWrites();
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}

startServer();
