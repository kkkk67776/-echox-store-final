import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import argon2 from 'argon2';

dotenv.config();

// Fix any mismatched container env vars
if (process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID === 'G-LLXC1GEL75') {
  process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID = 'ai-studio-echoxstore-9e1d54e8-7960-44b2-951a-524166c61a13';
}
if (process.env.VITE_FIREBASE_MEASUREMENT_ID === 'VITE_FIREBASE_API_KEY') {
  process.env.VITE_FIREBASE_MEASUREMENT_ID = 'G-LLXC1GEL75';
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Google Search Console HTML file verification handler
app.get('/google:id.html', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`google-site-verification: google${req.params.id}.html`);
});

// Search Engine Optimization: robots.txt and sitemap.xml
app.get('/robots.txt', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /
Sitemap: https://ais-pre-h73tzqybodmt5v2ji4xgqc-519756359948.europe-west2.run.app/sitemap.xml
`);
});

app.get('/sitemap.xml', (_req: Request, res: Response) => {
  const sitemapPath = path.resolve(process.cwd(), 'public', 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    res.setHeader('Content-Type', 'application/xml');
    return res.sendFile(sitemapPath);
  }
  res.status(404).send('Not found');
});

// Sovereign Security Config
const OWNER_EMAIL = 'abdelkaderbahri570@gmail.com';
const OWNER_PHONE_E164 = '+21621511162';
const HMAC_SECRET = process.env.ECHOX_SECURITY_HMAC_SECRET || 'echox_sovereign_570_tunisia_armor_hmac_key_2026';

// Persistent Sovereign Master Security Code (Default: "570216")
const SECURITY_FILE = path.resolve(process.cwd(), 'sovereign_security.json');

function hashSecurityCode(code: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${code.trim()}:${HMAC_SECRET}`).digest('hex');
}

function loadSecurityConfig(): { salt: string; hash: string } {
  try {
    if (fs.existsSync(SECURITY_FILE)) {
      const data = JSON.parse(fs.readFileSync(SECURITY_FILE, 'utf-8'));
      if (data.salt && data.hash) return data;
    }
  } catch (e) {
    console.warn('[Security] Notice loading security file, initializing default:', e);
  }

  // Initialize with Sovereign Master Key: "570216"
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashSecurityCode('570216', salt);
  const cfg = { salt, hash };
  try {
    fs.writeFileSync(SECURITY_FILE, JSON.stringify(cfg, null, 2));
  } catch (err) {
    console.warn('[Security] Notice writing security file:', err);
  }
  return cfg;
}

let securityConfig = loadSecurityConfig();

// Brute-force protection for security code
let failedCodeAttempts = 0;
let codeLockoutUntil = 0;

// Signed session helpers
function signSessionId(sessionId: string): string {
  const hmac = crypto.createHmac('sha256', HMAC_SECRET).update(sessionId).digest('hex');
  return `${sessionId}.${hmac}`;
}

function verifySignedSession(cookieVal: string): string | null {
  if (!cookieVal || !cookieVal.includes('.')) return null;
  const parts = cookieVal.split('.');
  if (parts.length !== 2) return null;
  const [sessionId, hmac] = parts;
  const expected = crypto.createHmac('sha256', HMAC_SECRET).update(sessionId).digest('hex');
  if (hmac.length === expected.length && crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected))) {
    return sessionId;
  }
  return null;
}

const activeSessions = new Map<string, { email: string; owner: boolean; codeVerified: boolean; expiresAt: number; ip?: string; userAgent?: string; createdAt?: string }>();

// ==========================================
// 🛡️ ARGON2ID CENTRALIZED SECURITY SYSTEM
// ==========================================
const CENTRAL_SECURITY_FILE = path.resolve(process.cwd(), 'central_security_config.json');

interface CentralSecurityConfig {
  access_code_argon2: string; // Argon2id hash for search access code (default: '#echox_vault_99')
  pin_argon2: string;         // Argon2id hash for PIN code (default: '570216')
  updated_at: string;
  history: Array<{ type: string; timestamp: string }>;
}

let centralSecurityConfig: CentralSecurityConfig | null = null;
let accessCodeLockoutUntil = 0;
let accessCodeFailedAttempts = 0;
let pinLockoutUntil = 0;
let pinFailedAttempts = 0;

async function initCentralSecurityConfig(): Promise<CentralSecurityConfig> {
  try {
    if (fs.existsSync(CENTRAL_SECURITY_FILE)) {
      const data = JSON.parse(fs.readFileSync(CENTRAL_SECURITY_FILE, 'utf-8'));
      if (data && data.access_code_argon2 && data.pin_argon2) {
        centralSecurityConfig = data;
        return data;
      }
    }
  } catch (err) {
    console.warn('[Security] Notice reading central security config, generating initial hashes:', err);
  }

  // Generate initial Argon2id hashes for default credentials
  const accessHash = await argon2.hash('#echox_vault_99', { type: argon2.argon2id });
  const pinHash = await argon2.hash('570216', { type: argon2.argon2id });

  const config: CentralSecurityConfig = {
    access_code_argon2: accessHash,
    pin_argon2: pinHash,
    updated_at: new Date().toISOString(),
    history: [{ type: 'INITIALIZED', timestamp: new Date().toISOString() }]
  };

  try {
    fs.writeFileSync(CENTRAL_SECURITY_FILE, JSON.stringify(config, null, 2));
  } catch (err) {
    console.warn('[Security] Notice writing central security config:', err);
  }

  centralSecurityConfig = config;
  return config;
}

initCentralSecurityConfig().catch(console.error);

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
      `__session=${signedCookie}; Path=/; Max-Age=${5 * 24 * 3600}; SameSite=Lax; HttpOnly`
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
  const cookies = parseCookies(req);
  const cookieVal = cookies['__session'];

  if (!cookieVal) {
    return res.status(401).json({ authenticated: false, error: 'لا توجد جلسة cookie صالحة.' });
  }

  const rawSessionId = verifySignedSession(cookieVal);
  if (!rawSessionId) {
    return res.status(401).json({ authenticated: false, error: 'توقيع الجلسة غير صالح أو تم التلاعب به.' });
  }

  const session = activeSessions.get(rawSessionId);
  if (!session || session.expiresAt < Date.now() || session.email !== OWNER_EMAIL || !session.owner) {
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

// 5. verifySecurityCode (Stage 4 Sovereign Master Passcode)
app.post('/api/security/verifyCode', (req: Request, res: Response) => {
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

    // Check Lockout
    const now = Date.now();
    if (now < codeLockoutUntil) {
      const remainingSecs = Math.ceil((codeLockoutUntil - now) / 1000);
      return res.status(429).json({ 
        error: `تم قفل شيفرة الحماية مؤقتاً لحماية الحساب. يرجى الانتظار ${remainingSecs} ثانية.`,
        locked: true,
        remainingSeconds: remainingSecs
      });
    }

    const { code } = req.body || {};
    if (!code || String(code).trim().length === 0) {
      return res.status(400).json({ error: 'يرجى إدخال شيفرة الأمان السيادية.' });
    }

    const inputHash = hashSecurityCode(String(code).trim(), securityConfig.salt);
    const isMatch = (inputHash.length === securityConfig.hash.length) &&
      crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(securityConfig.hash));

    if (!isMatch) {
      failedCodeAttempts++;
      if (failedCodeAttempts >= 3) {
        codeLockoutUntil = Date.now() + (5 * 60 * 1000); // 5 minutes lock
        return res.status(429).json({
          error: 'تم تجاوز الحد الأقصى للمحاولات (3 محاولات خاطئة). تم تفعيل القفل الأمني لمدة 5 دقائق.',
          locked: true,
          remainingSeconds: 300
        });
      }

      const attemptsLeft = 3 - failedCodeAttempts;
      return res.status(403).json({
        error: `شيفرة الأمان غير صحيحة! يتبقى لديك ${attemptsLeft} ${attemptsLeft === 1 ? 'محاولة واحدة' : 'محاولات'}.`,
        attemptsLeft
      });
    }

    // Success: Unlock Session
    failedCodeAttempts = 0;
    codeLockoutUntil = 0;
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

// 6. updateSecurityCode (Owner can change their master code)
app.post('/api/security/updateCode', (req: Request, res: Response) => {
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

    const { currentCode, newCode } = req.body || {};
    if (!currentCode || !newCode || String(newCode).trim().length < 4) {
      return res.status(400).json({ error: 'الشيفرة الجديدة يجب أن تحتوي على 4 خانات على الأقل.' });
    }

    // Verify current code
    const currentHash = hashSecurityCode(String(currentCode).trim(), securityConfig.salt);
    const isCurrentValid = (currentHash.length === securityConfig.hash.length) &&
      crypto.timingSafeEqual(Buffer.from(currentHash), Buffer.from(securityConfig.hash));

    if (!isCurrentValid) {
      return res.status(403).json({ error: 'شيفرة الأمان الحالية غير صحيحة.' });
    }

    // Generate new salt and hash
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = hashSecurityCode(String(newCode).trim(), newSalt);
    securityConfig = { salt: newSalt, hash: newHash };

    try {
      fs.writeFileSync(SECURITY_FILE, JSON.stringify(securityConfig, null, 2));
    } catch (e) {
      console.warn('Error saving security config to disk:', e);
    }

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
  try {
    const cookies = parseCookies(req);
    const cookieVal = cookies['__session'];
    const rawSessionId = verifySignedSession(cookieVal);

    if (!rawSessionId) {
      return res.status(401).json({ error: 'غير مصرح.' });
    }

    // Purge ALL active sessions immediately
    const sessionCount = activeSessions.size;
    activeSessions.clear();

    res.setHeader('Set-Cookie', [
      '__session=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly'
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
  const now = Date.now();
  const locked = now < codeLockoutUntil;
  const remainingSeconds = locked ? Math.ceil((codeLockoutUntil - now) / 1000) : 0;
  const attemptsLeft = Math.max(0, 3 - failedCodeAttempts);

  return res.json({
    activeLayers: 4,
    defaultCodeAvailable: true,
    locked,
    remainingSeconds,
    attemptsLeft,
    encryptionAlgorithm: 'SHA-256 + HMAC-SHA256'
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
    '__session=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly'
  ]);
  return res.json({ success: true, message: 'تم إنهاء جلسة المالك بنجاح.' });
});

// ==========================================
// 📱 OS-LEVEL PHONE LOCK (PATTERN & PIN) APIS
// ==========================================
const OWNER_LOCK_FILE = path.resolve(process.cwd(), 'owner_lock_config.json');

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
let osLockoutUntil = 0;
let consecutiveOsFailures = 0;

// 1. GET /api/security/ownerLockConfig
app.get('/api/security/ownerLockConfig', (_req: Request, res: Response) => {
  ownerLockConfig = loadOwnerLockConfig();
  const now = Date.now();
  const lockedOut = now < osLockoutUntil;
  const remainingSeconds = lockedOut ? Math.ceil((osLockoutUntil - now) / 1000) : 0;

  if (!ownerLockConfig || (!ownerLockConfig.lock_hash && !ownerLockConfig.code_hash)) {
    return res.json({
      configured: false,
      lock_type: 'pattern',
      lock_hash: '',
      code_hash: '',
      failed_attempts: [],
      lockedOut: false,
      remainingSeconds: 0,
      consecutiveFailures: 0
    });
  }

  return res.json({
    configured: true,
    lock_type: ownerLockConfig.lock_type || 'pattern',
    lock_hash: ownerLockConfig.lock_hash || ownerLockConfig.code_hash || '',
    code_hash: ownerLockConfig.code_hash || ownerLockConfig.lock_hash || '',
    failed_attempts: ownerLockConfig.failed_attempts || [],
    lockedOut,
    remainingSeconds,
    consecutiveFailures: consecutiveOsFailures
  });
});

// 2. POST /api/security/saveLockConfig
app.post('/api/security/saveLockConfig', (req: Request, res: Response) => {
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

    fs.writeFileSync(OWNER_LOCK_FILE, JSON.stringify(newConfig, null, 2));
    ownerLockConfig = newConfig;
    consecutiveOsFailures = 0;
    osLockoutUntil = 0;

    return res.json({
      success: true,
      message: 'تم حفظ إعدادات قفل الهاتف المشفرة بنجاح.',
      config: newConfig
    });
  } catch (err: any) {
    console.error('Error saving lock config:', err);
    return res.status(500).json({ error: 'فشل حفظ إعدادات القفل.' });
  }
});

// 3. POST /api/security/verifyLockHash
app.post('/api/security/verifyLockHash', (req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (now < osLockoutUntil) {
      const remainingSecs = Math.ceil((osLockoutUntil - now) / 1000);
      return res.status(429).json({
        success: false,
        lockedOut: true,
        remainingSeconds: remainingSecs,
        error: `المحاولات كثيرة، انتظر ${remainingSecs} ثانية`
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

    const isMatch = hash.trim().toLowerCase() === storedHash.trim().toLowerCase();

    if (!isMatch) {
      consecutiveOsFailures++;
      const currentAttempts = ownerLockConfig?.failed_attempts || [];
      const newAttempts = [
        { timestamp: new Date().toISOString(), type: String(type) },
        ...currentAttempts
      ].slice(0, 5);

      if (ownerLockConfig) {
        ownerLockConfig.failed_attempts = newAttempts;
        try {
          fs.writeFileSync(OWNER_LOCK_FILE, JSON.stringify(ownerLockConfig, null, 2));
        } catch (e) {
          console.warn('Notice writing failed attempt:', e);
        }
      }

      if (consecutiveOsFailures >= 5) {
        osLockoutUntil = Date.now() + 30000; // 30 seconds lockout
        return res.status(429).json({
          success: false,
          lockedOut: true,
          remainingSeconds: 30,
          error: 'المحاولات كثيرة، انتظر 30 ثانية'
        });
      }

      return res.status(401).json({
        success: false,
        lockedOut: false,
        remainingSeconds: 0,
        attemptsLeft: Math.max(0, 5 - consecutiveOsFailures),
        error: 'الرمز غير صحيح'
      });
    }

    // Success! Reset failure count
    consecutiveOsFailures = 0;
    osLockoutUntil = 0;

    // Also mark active session as verified if cookie exists
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
    const { type = 'pattern' } = req.body || {};
    consecutiveOsFailures++;

    ownerLockConfig = loadOwnerLockConfig();
    const currentAttempts = ownerLockConfig?.failed_attempts || [];
    const newAttempts = [
      { timestamp: new Date().toISOString(), type: String(type) },
      ...currentAttempts
    ].slice(0, 5);

    if (ownerLockConfig) {
      ownerLockConfig.failed_attempts = newAttempts;
      try {
        fs.writeFileSync(OWNER_LOCK_FILE, JSON.stringify(ownerLockConfig, null, 2));
      } catch (e) {
        console.warn('Notice writing failed attempt log:', e);
      }
    }

    const now = Date.now();
    let lockedOut = false;
    let remainingSeconds = 0;

    if (consecutiveOsFailures >= 5) {
      osLockoutUntil = now + 30000;
      lockedOut = true;
      remainingSeconds = 30;
    }

    return res.json({
      success: true,
      consecutiveFailures: consecutiveOsFailures,
      lockedOut,
      remainingSeconds,
      failed_attempts: newAttempts
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed logging attempt' });
  }
});

// 5. POST /api/security/resetLockConfig
app.post('/api/security/resetLockConfig', (_req: Request, res: Response) => {
  try {
    if (fs.existsSync(OWNER_LOCK_FILE)) {
      fs.unlinkSync(OWNER_LOCK_FILE);
    }
    ownerLockConfig = null;
    consecutiveOsFailures = 0;
    osLockoutUntil = 0;

    return res.json({
      success: true,
      message: 'تم مسح رمز القفل وإعادة تعيين النظام.'
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'فشل إعادة التعيين.' });
  }
});

// 6. POST /api/security/logoutAllDevices
app.post('/api/security/logoutAllDevices', (_req: Request, res: Response) => {
  const count = activeSessions.size;
  activeSessions.clear();
  res.setHeader('Set-Cookie', [
    '__session=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly'
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
    const now = Date.now();
    if (now < accessCodeLockoutUntil) {
      const remainingSeconds = Math.ceil((accessCodeLockoutUntil - now) / 1000);
      return res.status(429).json({
        success: false,
        lockedOut: true,
        remainingSeconds,
        error: `تم تجميد محاولات رمز الوصول، يرجى الانتظار ${remainingSeconds} ثانية.`
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

    // Argon2id verification
    let isMatch = false;
    try {
      isMatch = await argon2.verify(centralSecurityConfig!.access_code_argon2, trimmed);
    } catch (e) {
      console.warn('Argon2 verify access code error:', e);
    }

    if (isMatch) {
      accessCodeFailedAttempts = 0;
      accessCodeLockoutUntil = 0;
      return res.json({
        success: true,
        message: 'تم التحقق من رمز الوصول بنجاح.'
      });
    }

    // Failed attempt
    accessCodeFailedAttempts++;
    if (accessCodeFailedAttempts >= 5) {
      accessCodeLockoutUntil = Date.now() + 30000;
      return res.status(429).json({
        success: false,
        lockedOut: true,
        remainingSeconds: 30,
        error: 'تجاوزت عدد المحاولات المسموح به. تم تجميد البوابة لمدة 30 ثانية.'
      });
    }

    return res.status(401).json({
      success: false,
      lockedOut: false,
      remainingSeconds: 0,
      attemptsLeft: Math.max(0, 5 - accessCodeFailedAttempts),
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
    const now = Date.now();
    if (now < pinLockoutUntil) {
      const remainingSeconds = Math.ceil((pinLockoutUntil - now) / 1000);
      return res.status(429).json({
        success: false,
        lockedOut: true,
        remainingSeconds,
        error: `تم تجميد محاولات PIN، يرجى الانتظار ${remainingSeconds} ثانية.`
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
      pinFailedAttempts = 0;
      pinLockoutUntil = 0;

      const rawSessionId = `admin_${crypto.randomBytes(32).toString('hex')}`;
      const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
      const expiresAt = Date.now() + fiveDaysMs;

      activeSessions.set(rawSessionId, {
        email: OWNER_EMAIL,
        owner: true,
        codeVerified: true,
        expiresAt,
        ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'Browser',
        createdAt: new Date().toISOString()
      });

      const signedCookie = signSessionId(rawSessionId);
      res.setHeader('Set-Cookie', [
        `__session=${signedCookie}; Path=/; Max-Age=${5 * 24 * 3600}; SameSite=Lax; HttpOnly`
      ]);

      return res.json({
        success: true,
        sessionId: rawSessionId,
        message: 'تم التحقق بنجاح والدخول إلى مركز التحكم.'
      });
    }

    pinFailedAttempts++;
    if (pinFailedAttempts >= 5) {
      pinLockoutUntil = Date.now() + 30000;
      return res.status(429).json({
        success: false,
        lockedOut: true,
        remainingSeconds: 30,
        error: 'تجاوزت عدد محاولات PIN المسموحة. تم قفل البوابة مؤقتاً لمدة 30 ثانية.'
      });
    }

    return res.status(401).json({
      success: false,
      lockedOut: false,
      remainingSeconds: 0,
      attemptsLeft: Math.max(0, 5 - pinFailedAttempts),
      error: `رمز PIN غير صحيح! المحاولات المتبقية: ${Math.max(0, 5 - pinFailedAttempts)}`
    });

  } catch (err: any) {
    console.error('Error in /api/security/verifyPin:', err);
    return res.status(500).json({ error: 'خطأ أثناء التحقق من PIN.' });
  }
});

// 3. Update Access Code
app.post('/api/security/updateAccessCode', async (req: Request, res: Response) => {
  try {
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

    fs.writeFileSync(CENTRAL_SECURITY_FILE, JSON.stringify(centralSecurityConfig, null, 2));

    accessCodeFailedAttempts = 0;
    accessCodeLockoutUntil = 0;

    return res.json({
      success: true,
      message: 'تم تحديث رمز الوصول السري بنجاح وتشفيره ببصمة Argon2id فورياً.'
    });

  } catch (err: any) {
    console.error('Error updating access code:', err);
    return res.status(500).json({ error: 'فشل حفظ رمز الوصول الجديد.' });
  }
});

// 4. Update PIN
app.post('/api/security/updatePin', async (req: Request, res: Response) => {
  try {
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

    fs.writeFileSync(CENTRAL_SECURITY_FILE, JSON.stringify(centralSecurityConfig, null, 2));

    try {
      const legacyLock: OwnerLockConfigData = {
        lock_type: 'pin',
        lock_hash: newHash,
        code_hash: newHash,
        updated_at: new Date().toISOString(),
        failed_attempts: []
      };
      fs.writeFileSync(OWNER_LOCK_FILE, JSON.stringify(legacyLock, null, 2));
      ownerLockConfig = legacyLock;
    } catch {}

    pinFailedAttempts = 0;
    pinLockoutUntil = 0;

    return res.json({
      success: true,
      message: 'تم تحديث رمز PIN بنجاح وتشفيره ببصمة Argon2id فورياً.'
    });

  } catch (err: any) {
    console.error('Error updating PIN:', err);
    return res.status(500).json({ error: 'فشل حفظ رمز الـ PIN الجديد.' });
  }
});

// 5. Active Sessions List
app.get('/api/security/sessions', (req: Request, res: Response) => {
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
      ip: (val as any).ip || '127.0.0.1',
      userAgent: (val as any).userAgent || 'Browser',
      createdAt: (val as any).createdAt || new Date().toISOString(),
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
    activeSessionsCount: activeSessions.size,
    accessCodeConfigured: true,
    pinConfigured: true,
    updatedAt: centralSecurityConfig?.updated_at || new Date().toISOString()
  });
});

// --- VITE MIDDLEWARE INTEGRATION ---
async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ECHOX STORE] Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
