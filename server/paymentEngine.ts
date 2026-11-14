import crypto from 'crypto';
import fs from 'fs';
import {
  atomicWriteJsonSync,
  getDataFilePath,
  isCloudPersistenceEnabled,
  loadCloudJson,
  pushCloudJson,
} from './cloudPersistence';
import type {
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethodType,
  PaymentStatus,
  PaymentSystemPublicConfig,
  PaymentTransaction,
  VendorLedgerEntry,
  VendorSubOrder,
  RefundRequest,
  SupportTransaction,
  FinancialActivityLog,
  TransferProof,
} from '../src/types/index';

const PAYMENT_DATA_FILE = getDataFilePath('payment_system_data.json');
const CLOUD_PAYMENT_KEY = 'echox:payment_system_data';

interface ServerSecretsConfig {
  apiKey: string;
  walletId: string;
  webhookSecret: string;
}

interface InternalPaymentConfig extends PaymentSystemPublicConfig {
  secrets: ServerSecretsConfig;
  bankIntegritySeal?: string;
  shipping: {
    standardShippingFee: number;
    freeShippingThreshold: number;
  };
}

interface ProductCatalogEntry {
  id: string;
  price: number;
  companyId: string;
  companyName: string;
  active: boolean;
}

interface PaymentSystemDatabase {
  config: InternalPaymentConfig;
  catalog: Record<string, ProductCatalogEntry>;
  orders: Order[];
  transactions: PaymentTransaction[];
  vendorLedgers: VendorLedgerEntry[];
  refundRequests: RefundRequest[];
  supportTransactions: SupportTransaction[];
  activityLogs: FinancialActivityLog[];
  processedWebhookKeys: string[];
  recentCheckoutRequests?: Array<{ key: string; orderId: string; paymentUrl?: string; createdAt: number }>;
}

function maskSecret(val: string): string | undefined {
  if (!val || val.trim().length === 0) return undefined;
  const trimmed = val.trim();
  if (trimmed.length <= 4) return '••••';
  return `••••${trimmed.slice(-4)}`;
}

const DEFAULT_CATALOG: Record<string, ProductCatalogEntry> = {
  prod_titan_drill: {
    id: 'prod_titan_drill',
    price: 345.0,
    companyId: 'comp_echox',
    companyName: 'ECHOX Distribution Tunisie',
    active: true,
  },
  prod_aether_headlight: {
    id: 'prod_aether_headlight',
    price: 680.0,
    companyId: 'comp_atlas',
    companyName: 'Atlas Mécanique & Pièces Sfax',
    active: true,
  },
  prod_fluke_multimeter: {
    id: 'prod_fluke_multimeter',
    price: 520.0,
    companyId: 'comp_med_elec',
    companyName: 'Méditerranée Électronique & Mesure',
    active: true,
  },
};

function createInitialDb(): PaymentSystemDatabase {
  const now = new Date().toISOString();
  return {
    config: {
      currency: 'TND',
      commissionRatePercent: 10,
      taxRatePercent: 0,
      shipping: {
        standardShippingFee: 7.0,
        freeShippingThreshold: 150.0,
      },
      methods: {
        cod: { enabled: true },
        bank_transfer: {
          enabled: true,
          accountHolder: 'ECHOX STORE TUNISIE SUARL',
          bankName: 'BIAT — Banque Internationale Arabe de Tunisie',
          ibanOrRib: 'TN59 0800 0000 1234 5678 9012',
          swiftCode: 'BIATTNTT',
          instructions: {
            ar: 'يرجى إجراء التحويل بالمبلغ الدقيق مع إدراج الرقم المرجعي للطلب في خانة البيان (Motif)، ثم إرسال إثبات التحويل للمراجعة والاعتماد.',
            fr: 'Veuillez effectuer le virement du montant exact en mentionnant la référence unique dans le motif, puis soumettre votre justificatif pour validation.',
            en: 'Please transfer the exact total amount including the unique order reference in the transfer note, then submit your transfer proof for admin verification.',
          },
        },
        online_payment: {
          enabled: false, // Disabled by default until live credentials & webhook secret are configured & verified
          provider: 'konnect',
          mode: 'sandbox',
          hasApiKey: false,
          hasWalletId: false,
          hasWebhookSecret: false,
          readyForLive: false,
        },
      },
      secrets: {
        apiKey: process.env.KONNECT_API_KEY || '',
        walletId: process.env.KONNECT_WALLET_ID || '',
        webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || '',
      },
      bankIntegritySeal: '',
      updatedAt: now,
    },
    catalog: { ...DEFAULT_CATALOG },
    orders: [],
    transactions: [],
    vendorLedgers: [],
    refundRequests: [],
    supportTransactions: [],
    activityLogs: [
      {
        id: `log_init_${Date.now()}`,
        action: 'PAYMENT_ENGINE_INITIALIZED',
        actor: 'system',
        details: 'Initialized ECHOX STORE multi-vendor payment engine (COD & Bank Transfer active, Online Gateway disabled pending credentials).',
        timestamp: now,
      },
    ],
    processedWebhookKeys: [],
  };
}

function mergeDatabaseSnapshot(raw: Partial<PaymentSystemDatabase>): PaymentSystemDatabase {
  const def = createInitialDb();
  return {
    ...def,
    ...raw,
    config: {
      ...def.config,
      ...(raw.config || {}),
      shipping: {
        ...def.config.shipping,
        ...(raw.config?.shipping || {}),
      },
      methods: {
        cod: { ...def.config.methods.cod, ...(raw.config?.methods?.cod || {}) },
        bank_transfer: {
          ...def.config.methods.bank_transfer,
          ...(raw.config?.methods?.bank_transfer || {}),
          instructions: {
            ...def.config.methods.bank_transfer.instructions,
            ...(raw.config?.methods?.bank_transfer?.instructions || {}),
          },
        },
        online_payment: {
          ...def.config.methods.online_payment,
          ...(raw.config?.methods?.online_payment || {}),
        },
      },
      secrets: {
        ...def.config.secrets,
        ...(raw.config?.secrets || {}),
      },
    },
    catalog: { ...DEFAULT_CATALOG, ...(raw.catalog || {}) },
    orders: Array.isArray(raw.orders) ? raw.orders : [],
    transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
    vendorLedgers: Array.isArray(raw.vendorLedgers) ? raw.vendorLedgers : [],
    refundRequests: Array.isArray(raw.refundRequests) ? raw.refundRequests : [],
    supportTransactions: Array.isArray(raw.supportTransactions) ? raw.supportTransactions : [],
    activityLogs: Array.isArray(raw.activityLogs) ? raw.activityLogs : def.activityLogs,
    processedWebhookKeys: Array.isArray(raw.processedWebhookKeys) ? raw.processedWebhookKeys : [],
  };
}

function loadDatabase(): PaymentSystemDatabase {
  try {
    if (fs.existsSync(PAYMENT_DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PAYMENT_DATA_FILE, 'utf-8'));
      return mergeDatabaseSnapshot(raw);
    }
  } catch (err) {
    console.warn('[PaymentEngine] Notice loading payment DB, initializing fresh file:', err);
  }
  const initial = createInitialDb();
  saveDatabase(initial);
  return initial;
}

function saveDatabase(db: PaymentSystemDatabase): void {
  try {
    atomicWriteJsonSync(PAYMENT_DATA_FILE, db);
  } catch (err) {
    console.error('[PaymentEngine] Error persisting payment DB:', err);
  }
  pushCloudJson(CLOUD_PAYMENT_KEY, db);
}

let paymentDb: PaymentSystemDatabase = loadDatabase();

let cachedFallbackSecret: string | null = null;

function getBankIntegritySecret(): string {
  const fromEnv = (process.env.ECHOX_SECURITY_HMAC_SECRET || '').trim();
  if (fromEnv.length >= 16) return fromEnv;
  if (cachedFallbackSecret) return cachedFallbackSecret;

  const secretFile = getDataFilePath('.hmac_secret');
  try {
    if (fs.existsSync(secretFile)) {
      const stored = fs.readFileSync(secretFile, 'utf-8').trim();
      if (stored.length >= 16) {
        cachedFallbackSecret = stored;
        return stored;
      }
    }
  } catch {}

  const generated = crypto.randomBytes(48).toString('hex');
  try {
    fs.writeFileSync(secretFile, generated, { encoding: 'utf-8', mode: 0o600 });
  } catch {}
  cachedFallbackSecret = generated;
  return generated;
}

function getCanonicalBankFields(bank: {
  accountHolder?: string;
  bankName?: string;
  ibanOrRib?: string;
  swiftCode?: string;
}): string {
  return [
    (bank.accountHolder || '').trim(),
    (bank.bankName || '').trim(),
    (bank.ibanOrRib || '').trim(),
    (bank.swiftCode || '').trim(),
  ].join('|');
}

function computeBankSealWithKey(
  bank: {
    accountHolder?: string;
    bankName?: string;
    ibanOrRib?: string;
    swiftCode?: string;
  },
  secret: string
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`bank:${getCanonicalBankFields(bank)}`)
    .digest('hex');
}

function computeBankSeal(bank: {
  accountHolder?: string;
  bankName?: string;
  ibanOrRib?: string;
  swiftCode?: string;
}): string {
  return computeBankSealWithKey(bank, getBankIntegritySecret());
}

function computeIbanFingerprint(ibanOrRib: string): string {
  const clean = (ibanOrRib || '').replace(/\s+/g, '').toUpperCase();
  if (!clean) return 'NONE';
  const digest = crypto.createHash('sha256').update(clean).digest('hex').slice(0, 8).toUpperCase();
  return `${digest.slice(0, 4)}-${digest.slice(4, 8)}`;
}

function ensureInitialBankSeal(): void {
  const legacySeal = computeBankSealWithKey(paymentDb.config.methods.bank_transfer, 'echox-bank-local-seal-v1');
  if (!paymentDb.config.bankIntegritySeal || paymentDb.config.bankIntegritySeal === legacySeal) {
    paymentDb.config.bankIntegritySeal = computeBankSeal(paymentDb.config.methods.bank_transfer);
    saveDatabase(paymentDb);
  }
}

ensureInitialBankSeal();

export async function hydratePaymentDbFromCloud(): Promise<void> {
  if (!isCloudPersistenceEnabled()) return;
  const remote = await loadCloudJson<Partial<PaymentSystemDatabase>>(CLOUD_PAYMENT_KEY);
  if (remote && typeof remote === 'object') {
    paymentDb = mergeDatabaseSnapshot(remote);
    const legacySeal = computeBankSealWithKey(paymentDb.config.methods.bank_transfer, 'echox-bank-local-seal-v1');
    if (!paymentDb.config.bankIntegritySeal || paymentDb.config.bankIntegritySeal === legacySeal) {
      paymentDb.config.bankIntegritySeal = computeBankSeal(paymentDb.config.methods.bank_transfer);
    }
    try {
      atomicWriteJsonSync(PAYMENT_DATA_FILE, paymentDb);
    } catch (err) {
      console.warn('[PaymentEngine] Notice syncing cloud snapshot to local file:', err);
    }
  } else {
    pushCloudJson(CLOUD_PAYMENT_KEY, paymentDb);
  }
}

export function isEnvLockedBank(): boolean {
  return Boolean((process.env.LOCKED_BANK_IBAN || '').trim().length >= 8);
}

export function getVerifiedBankTransferPublic(): PaymentSystemPublicConfig['methods']['bank_transfer'] {
  const cfg = paymentDb.config;
  const rawBank = cfg.methods.bank_transfer;

  // Layer 1: Immutable Environment Variable Override
  const envIban = (process.env.LOCKED_BANK_IBAN || '').trim();
  if (envIban.length >= 8) {
    const accountHolder = (process.env.LOCKED_BANK_HOLDER || rawBank.accountHolder || '').trim();
    const bankName = (process.env.LOCKED_BANK_NAME || rawBank.bankName || '').trim();
    const swiftCode = (process.env.LOCKED_BANK_SWIFT || rawBank.swiftCode || '').trim();
    return {
      ...rawBank,
      accountHolder,
      bankName,
      ibanOrRib: envIban,
      swiftCode,
      integrityVerified: true,
      lockedByEnv: true,
      tamperDetected: false,
      ibanFingerprint: computeIbanFingerprint(envIban),
    };
  }

  // Layer 2: HMAC-SHA256 Seal Verification against disk/DB tampering
  const expectedSeal = computeBankSeal(rawBank);
  const storedSeal = (cfg.bankIntegritySeal || '').trim();
  const sealValid =
    storedSeal.length === expectedSeal.length &&
    crypto.timingSafeEqual(Buffer.from(storedSeal), Buffer.from(expectedSeal));

  if (!sealValid) {
    return {
      ...rawBank,
      enabled: false,
      ibanOrRib: '⚠️ تم تعليق التحويل البنكي تلقائياً لاكتشاف تعديل غير مصرّح به',
      integrityVerified: false,
      lockedByEnv: false,
      tamperDetected: true,
      ibanFingerprint: 'TAMPERED',
    };
  }

  return {
    ...rawBank,
    integrityVerified: true,
    lockedByEnv: false,
    tamperDetected: false,
    ibanFingerprint: computeIbanFingerprint(rawBank.ibanOrRib),
  };
}

export function isBankIdentityChange(incoming?: Partial<InternalPaymentConfig['methods']['bank_transfer']>): boolean {
  if (!incoming) return false;
  const current = paymentDb.config.methods.bank_transfer;
  const check = (nextVal: string | undefined, curVal: string | undefined) =>
    typeof nextVal === 'string' && nextVal.trim() !== (curVal || '').trim();
  return (
    check(incoming.ibanOrRib, current.ibanOrRib) ||
    check(incoming.accountHolder, current.accountHolder) ||
    check(incoming.bankName, current.bankName) ||
    check(incoming.swiftCode, current.swiftCode) ||
    (incoming.enabled === true && getVerifiedBankTransferPublic().tamperDetected === true)
  );
}

export function getActiveCatalogProductIds(): string[] {
  const activeIds = Object.values(paymentDb.catalog || {})
    .filter((item) => item && item.id && item.active !== false)
    .map((item) => String(item.id));
  return Array.from(new Set([...Object.keys(DEFAULT_CATALOG), ...activeIds]));
}

function appendActivity(
  action: string,
  actor: FinancialActivityLog['actor'],
  details: string,
  targetId?: string,
  amount?: number
): void {
  const entry: FinancialActivityLog = {
    id: `flog_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    action,
    actor,
    targetId,
    details,
    amount,
    timestamp: new Date().toISOString(),
  };
  paymentDb.activityLogs = [entry, ...paymentDb.activityLogs].slice(0, 300);
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function normalizePhone(phone: string): string {
  return (phone || '').replace(/\D/g, '').slice(-8);
}

function sanitizeReceiptImageDataUrl(raw?: string): { ok: boolean; value?: string; error?: string } {
  if (!raw || typeof raw !== 'string') return { ok: true, value: undefined };
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: undefined };
  if (trimmed.length > 4_800_000) {
    return { ok: false, error: 'حجم صورة وصل التحويل كبير جداً (الحد الأقصى 3.5 ميغابايت).' };
  }
  const rasterMatch = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i.test(trimmed);
  if (!rasterMatch) {
    return { ok: false, error: 'صيغة صورة الوصل غير مدعومة لأسباب أمنية. يرجى رفع صورة PNG أو JPG أو WEBP فقط.' };
  }
  return { ok: true, value: trimmed.replace(/\s+/g, '') };
}

function isSafeHttpsUrl(rawUrl?: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const u = new URL(rawUrl);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

function toMinorUnits(amount: number, currency: string): number {
  return currency === 'TND' ? Math.round(amount * 1000) : Math.round(amount * 100);
}

export function normalizePaymentMethod(method: PaymentMethodType): 'cod' | 'bank_transfer' | 'online_payment' {
  if (method === 'bank_transfer') return 'bank_transfer';
  if (method === 'online_payment' || method === 'konnect' || method === 'flouci') return 'online_payment';
  return 'cod';
}

export function isOnlineGatewayReady(): boolean {
  const s = paymentDb.config.secrets;
  const provider = paymentDb.config.methods.online_payment.provider || 'konnect';
  const hasBasicKeys = Boolean(s.apiKey && s.apiKey.trim().length >= 8 && s.walletId && s.walletId.trim().length >= 4);
  if (!hasBasicKeys) return false;
  if (provider === 'stripe_custom') {
    return Boolean(s.webhookSecret && s.webhookSecret.trim().length >= 8);
  }
  return true;
}

export function getPublicPaymentConfig(): PaymentSystemPublicConfig {
  const cfg = paymentDb.config;
  const ready = isOnlineGatewayReady();
  const provider = cfg.methods.online_payment.provider || 'konnect';
  return {
    currency: cfg.currency,
    commissionRatePercent: cfg.commissionRatePercent,
    taxRatePercent: cfg.taxRatePercent,
    standardShippingFee: cfg.shipping.standardShippingFee,
    freeShippingThreshold: cfg.shipping.freeShippingThreshold,
    methods: {
      cod: { enabled: !!cfg.methods.cod.enabled },
      bank_transfer: getVerifiedBankTransferPublic(),
      online_payment: {
        enabled: !!cfg.methods.online_payment.enabled && ready,
        provider,
        mode: cfg.methods.online_payment.mode || 'sandbox',
        hasApiKey: Boolean(cfg.secrets.apiKey && cfg.secrets.apiKey.trim().length > 0),
        hasWalletId: Boolean(cfg.secrets.walletId && cfg.secrets.walletId.trim().length > 0),
        hasWebhookSecret: Boolean(cfg.secrets.webhookSecret && cfg.secrets.webhookSecret.trim().length > 0),
        apiKeyMasked: maskSecret(cfg.secrets.apiKey),
        walletIdMasked: maskSecret(cfg.secrets.walletId),
        readyForLive: ready,
        lastConnectionCheck: cfg.methods.online_payment.lastConnectionCheck,
        webhookPath: `/api/payments/webhook/${provider}`,
      },
    },
    updatedAt: cfg.updatedAt,
  };
}

export function syncCatalogSnapshot(
  products: Array<{ id: string; price: number; companyId?: string; companyName?: string; active?: boolean }>,
  options?: { replaceAll?: boolean }
): void {
  if (!Array.isArray(products)) return;
  const seenIds = new Set<string>();
  for (const p of products) {
    if (!p || !p.id || typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price < 0) continue;
    seenIds.add(p.id);
    paymentDb.catalog[p.id] = {
      id: p.id,
      price: round3(p.price),
      companyId: p.companyId || 'comp_echox',
      companyName: p.companyName || 'ECHOX Distribution Tunisie',
      active: p.active !== false,
    };
  }
  if (options?.replaceAll) {
    Object.keys(paymentDb.catalog).forEach((catId) => {
      if (!seenIds.has(catId) && paymentDb.catalog[catId]) {
        paymentDb.catalog[catId].active = false;
      }
    });
  }
  saveDatabase(paymentDb);
}

export function updateAdminPaymentConfig(payload: {
  currency?: 'TND' | 'EUR' | 'USD';
  commissionRatePercent?: number;
  taxRatePercent?: number;
  standardShippingFee?: number;
  freeShippingThreshold?: number;
  codEnabled?: boolean;
  bankTransfer?: Partial<InternalPaymentConfig['methods']['bank_transfer']>;
  onlinePayment?: {
    enabled?: boolean;
    provider?: 'konnect' | 'flouci' | 'stripe_custom';
    mode?: 'sandbox' | 'live';
    apiKey?: string;
    walletId?: string;
    webhookSecret?: string;
  };
}): { ok: boolean; error?: string; config?: PaymentSystemPublicConfig } {
  const cfg = paymentDb.config;

  if (payload.currency && ['TND', 'EUR', 'USD'].includes(payload.currency)) {
    cfg.currency = payload.currency;
  }
  if (typeof payload.commissionRatePercent === 'number') {
    if (payload.commissionRatePercent < 0 || payload.commissionRatePercent > 50) {
      return { ok: false, error: 'نسبة عمولة المنصة يجب أن تكون بين 0% و 50%.' };
    }
    cfg.commissionRatePercent = round3(payload.commissionRatePercent);
  }
  if (typeof payload.taxRatePercent === 'number') {
    if (payload.taxRatePercent < 0 || payload.taxRatePercent > 40) {
      return { ok: false, error: 'نسبة الضريبة يجب أن تكون بين 0% و 40%.' };
    }
    cfg.taxRatePercent = round3(payload.taxRatePercent);
  }
  if (typeof payload.standardShippingFee === 'number' && payload.standardShippingFee >= 0) {
    cfg.shipping.standardShippingFee = round3(payload.standardShippingFee);
  }
  if (typeof payload.freeShippingThreshold === 'number' && payload.freeShippingThreshold >= 0) {
    cfg.shipping.freeShippingThreshold = round3(payload.freeShippingThreshold);
  }
  if (typeof payload.codEnabled === 'boolean') {
    cfg.methods.cod.enabled = payload.codEnabled;
  }
  if (payload.bankTransfer) {
    const identityChanged = isBankIdentityChange(payload.bankTransfer);
    if (identityChanged && isEnvLockedBank()) {
      return {
        ok: false,
        error: 'الحساب البنكي مقفول من متغيرات البيئة (LOCKED_BANK_IBAN) لحمايته من الاختراق ولا يمكن تغييره من اللوحة.',
      };
    }

    const prevIbanMask = maskSecret(cfg.methods.bank_transfer.ibanOrRib) || 'NONE';
    cfg.methods.bank_transfer = {
      ...cfg.methods.bank_transfer,
      ...payload.bankTransfer,
      instructions: {
        ...cfg.methods.bank_transfer.instructions,
        ...(payload.bankTransfer.instructions || {}),
      },
    };
    cfg.bankIntegritySeal = computeBankSeal(cfg.methods.bank_transfer);

    if (identityChanged) {
      const nextIbanMask = maskSecret(cfg.methods.bank_transfer.ibanOrRib) || 'NONE';
      appendActivity(
        'BANK_ACCOUNT_MODIFIED',
        'admin',
        `PIN-verified bank account update (${prevIbanMask} -> ${nextIbanMask}, fingerprint: ${computeIbanFingerprint(cfg.methods.bank_transfer.ibanOrRib)}).`
      );
    }
  }
  if (payload.onlinePayment) {
    if (payload.onlinePayment.provider) {
      cfg.methods.online_payment.provider = payload.onlinePayment.provider;
    }
    if (payload.onlinePayment.mode) {
      cfg.methods.online_payment.mode = payload.onlinePayment.mode;
    }
    if (typeof payload.onlinePayment.apiKey === 'string' && payload.onlinePayment.apiKey.trim().length > 0) {
      cfg.secrets.apiKey = payload.onlinePayment.apiKey.trim();
    }
    if (typeof payload.onlinePayment.walletId === 'string' && payload.onlinePayment.walletId.trim().length > 0) {
      cfg.secrets.walletId = payload.onlinePayment.walletId.trim();
    }
    if (typeof payload.onlinePayment.webhookSecret === 'string' && payload.onlinePayment.webhookSecret.trim().length > 0) {
      cfg.secrets.webhookSecret = payload.onlinePayment.webhookSecret.trim();
    }
    if (typeof payload.onlinePayment.enabled === 'boolean') {
      if (payload.onlinePayment.enabled && !isOnlineGatewayReady()) {
        return {
          ok: false,
          error: 'تعذر تفعيل الدفع الإلكتروني: يجب إدخال مفتاح API ومعرّف المحفظة الحقيقيين (Wallet ID & API Key) على الخادم أولاً.',
        };
      }
      cfg.methods.online_payment.enabled = payload.onlinePayment.enabled;
    }
  }

  cfg.updatedAt = new Date().toISOString();
  appendActivity('PAYMENT_CONFIG_UPDATED', 'admin', 'Updated payment settings / methods / rates from Admin Panel.');
  saveDatabase(paymentDb);
  return { ok: true, config: getPublicPaymentConfig() };
}

export async function testOnlineGatewayConnection(): Promise<{ ok: boolean; message: string; checkedAt: string }> {
  const checkedAt = new Date().toISOString();
  const provider = paymentDb.config.methods.online_payment.provider || 'konnect';
  const mode = paymentDb.config.methods.online_payment.mode || 'sandbox';

  if (!isOnlineGatewayReady()) {
    const msg =
      provider === 'stripe_custom'
        ? 'Gateway credentials missing: Custom/Stripe Bridge requires API Key, Wallet ID, and Webhook HMAC Secret.'
        : 'Gateway credentials missing: Configure real Provider API Key/App Token and Wallet ID/App Secret on server first.';
    paymentDb.config.methods.online_payment.lastConnectionCheck = { checkedAt, ok: false, message: msg };
    saveDatabase(paymentDb);
    return { ok: false, message: msg, checkedAt };
  }

  if (provider === 'konnect') {
    const baseUrl =
      mode === 'live'
        ? 'https://api.konnect.network/api/v2/payments/test-check'
        : 'https://api.sandbox.konnect.network/api/v2/payments/test-check';
    try {
      const resp = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'x-api-key': paymentDb.config.secrets.apiKey,
        },
        signal: AbortSignal.timeout(10000),
      });
      if (resp.status === 401 || resp.status === 403) {
        const msg = `Konnect rejected credentials (HTTP ${resp.status}). Verify API Key matches ${mode} environment.`;
        paymentDb.config.methods.online_payment.lastConnectionCheck = { checkedAt, ok: false, message: msg };
        saveDatabase(paymentDb);
        return { ok: false, message: msg, checkedAt };
      }
      const msg = `Konnect endpoint reachable (${mode}) and API key accepted (HTTP ${resp.status}).`;
      paymentDb.config.methods.online_payment.lastConnectionCheck = { checkedAt, ok: true, message: msg };
      appendActivity('GATEWAY_TEST_PASSED', 'admin', msg);
      saveDatabase(paymentDb);
      return { ok: true, message: msg, checkedAt };
    } catch (err: any) {
      const msg = `Konnect connection check failed: ${err?.message || 'Network error'}`;
      paymentDb.config.methods.online_payment.lastConnectionCheck = { checkedAt, ok: false, message: msg };
      saveDatabase(paymentDb);
      return { ok: false, message: msg, checkedAt };
    }
  }

  if (provider === 'flouci') {
    if (paymentDb.config.currency !== 'TND') {
      const msg = 'Flouci Tunisia supports TND currency only. Change store currency to TND first.';
      paymentDb.config.methods.online_payment.lastConnectionCheck = { checkedAt, ok: false, message: msg };
      saveDatabase(paymentDb);
      return { ok: false, message: msg, checkedAt };
    }
    try {
      const resp = await fetch('https://developers.flouci.com/api/verify_payment/test_check', {
        method: 'GET',
        headers: {
          apppublic: paymentDb.config.secrets.apiKey,
          appsecret: paymentDb.config.secrets.walletId,
        },
        signal: AbortSignal.timeout(10000),
      });
      if (resp.status === 401 || resp.status === 403) {
        const msg = `Flouci rejected App Token / App Secret (HTTP ${resp.status}).`;
        paymentDb.config.methods.online_payment.lastConnectionCheck = { checkedAt, ok: false, message: msg };
        saveDatabase(paymentDb);
        return { ok: false, message: msg, checkedAt };
      }
      const msg = `Flouci endpoint reachable and credentials format accepted (HTTP ${resp.status}).`;
      paymentDb.config.methods.online_payment.lastConnectionCheck = { checkedAt, ok: true, message: msg };
      appendActivity('GATEWAY_TEST_PASSED', 'admin', msg);
      saveDatabase(paymentDb);
      return { ok: true, message: msg, checkedAt };
    } catch (err: any) {
      const msg = `Flouci connection check failed: ${err?.message || 'Network error'}`;
      paymentDb.config.methods.online_payment.lastConnectionCheck = { checkedAt, ok: false, message: msg };
      saveDatabase(paymentDb);
      return { ok: false, message: msg, checkedAt };
    }
  }

  const msg = `Custom/Stripe Bridge configured with HMAC Webhook secret. Note: automatic checkout redirect requires Konnect or Flouci.`;
  paymentDb.config.methods.online_payment.lastConnectionCheck = { checkedAt, ok: true, message: msg };
  saveDatabase(paymentDb);
  return { ok: true, message: msg, checkedAt };
}

function sanitizeOrigin(rawOrigin?: string): string {
  const fallback = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://echox-store.onrender.com').trim().replace(/\/$/, '');
  if (!rawOrigin || typeof rawOrigin !== 'string') return fallback;
  try {
    const u = new URL(rawOrigin.trim());
    if (u.protocol === 'https:' || u.protocol === 'http:') {
      return `${u.protocol}//${u.host}`;
    }
  } catch {}
  return fallback;
}

async function initiateGatewaySession(params: {
  amount: number;
  currency: 'TND' | 'EUR' | 'USD';
  trackingRef: string;
  description: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  origin?: string;
}): Promise<{ ok: boolean; statusCode?: number; error?: string; externalPaymentId?: string; paymentUrl?: string; provider?: string }> {
  const cfg = paymentDb.config;
  const provider = cfg.methods.online_payment.provider || 'konnect';
  const mode = cfg.methods.online_payment.mode || 'sandbox';
  const origin = sanitizeOrigin(params.origin);
  const amountMinor = toMinorUnits(params.amount, params.currency);

  const successUrl = `${origin}/?payment_return=success&provider=${encodeURIComponent(provider)}&tracking=${encodeURIComponent(params.trackingRef)}`;
  const failUrl = `${origin}/?payment_return=fail&provider=${encodeURIComponent(provider)}&tracking=${encodeURIComponent(params.trackingRef)}`;

  if (provider === 'konnect') {
    const endpoint =
      mode === 'live'
        ? 'https://api.konnect.network/api/v2/payments/init-payment'
        : 'https://api.sandbox.konnect.network/api/v2/payments/init-payment';
    try {
      const initRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': cfg.secrets.apiKey,
        },
        body: JSON.stringify({
          receiverWalletId: cfg.secrets.walletId,
          token: params.currency,
          amount: amountMinor,
          type: 'immediate',
          description: params.description,
          acceptedPaymentMethods: ['wallet', 'bank_card', 'e-DINAR'],
          lifespan: 20,
          checkoutForm: true,
          addPaymentFeesToAmount: false,
          orderId: params.trackingRef,
          firstName: params.customerName.trim(),
          phoneNumber: params.customerPhone.trim(),
          email: params.customerEmail?.trim() || undefined,
          webhook: `${origin}/api/payments/webhook/konnect`,
          successUrl,
          failUrl,
          silentWebhook: true,
        }),
        signal: AbortSignal.timeout(10000),
      });
      const initJson: any = await initRes.json().catch(() => ({}));
      if (!initRes.ok || !isSafeHttpsUrl(initJson?.payUrl)) {
        appendActivity(
          'ONLINE_GATEWAY_INIT_FAILED',
          'system',
          `Konnect init failed for ${params.trackingRef}: HTTP ${initRes.status} ${JSON.stringify(initJson)}`
        );
        saveDatabase(paymentDb);
        return {
          ok: false,
          statusCode: 502,
          error: initJson?.message || 'فشل إنشاء جلسة الدفع الإلكتروني مع بوابة Konnect. يرجى التحقق من المفاتيح أو اختيار وسيلة أخرى.',
        };
      }
      return {
        ok: true,
        provider: 'konnect',
        externalPaymentId: String(initJson.paymentRef || ''),
        paymentUrl: initJson.payUrl,
      };
    } catch (err: any) {
      appendActivity('ONLINE_GATEWAY_NETWORK_ERROR', 'system', `Konnect init network failure: ${err?.message}`);
      saveDatabase(paymentDb);
      return {
        ok: false,
        statusCode: 502,
        error: 'تعذر الاتصال ببوابة Konnect حالياً. يرجى استخدام التحويل البنكي أو الدفع عند الاستلام.',
      };
    }
  }

  if (provider === 'flouci') {
    if (params.currency !== 'TND') {
      return {
        ok: false,
        statusCode: 400,
        error: 'بوابة Flouci Tunisia تقبل عملة الدينار التونسي (TND) فقط.',
      };
    }
    try {
      const initRes = await fetch('https://developers.flouci.com/api/generate_payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_token: cfg.secrets.apiKey,
          app_secret: cfg.secrets.walletId,
          amount: amountMinor,
          accept_card: 'true',
          session_timeout_secs: 1200,
          success_link: successUrl,
          fail_link: failUrl,
          developer_tracking_id: params.trackingRef,
        }),
        signal: AbortSignal.timeout(10000),
      });
      const initJson: any = await initRes.json().catch(() => ({}));
      const payLink = initJson?.result?.link;
      const payId = initJson?.result?.payment_id;
      if (!initRes.ok || !initJson?.result?.success || !isSafeHttpsUrl(payLink)) {
        appendActivity(
          'ONLINE_GATEWAY_INIT_FAILED',
          'system',
          `Flouci init failed for ${params.trackingRef}: HTTP ${initRes.status} ${JSON.stringify(initJson)}`
        );
        saveDatabase(paymentDb);
        return {
          ok: false,
          statusCode: 502,
          error: 'فشل إنشاء جلسة الدفع عبر بوابة Flouci. يرجى التحقق من App Token و App Secret في مركز التحكم.',
        };
      }
      return {
        ok: true,
        provider: 'flouci',
        externalPaymentId: String(payId || ''),
        paymentUrl: payLink,
      };
    } catch (err: any) {
      appendActivity('ONLINE_GATEWAY_NETWORK_ERROR', 'system', `Flouci init network failure: ${err?.message}`);
      saveDatabase(paymentDb);
      return {
        ok: false,
        statusCode: 502,
        error: 'تعذر الاتصال ببوابة Flouci حالياً. يرجى استخدام التحويل البنكي أو الدفع عند الاستلام.',
      };
    }
  }

  return {
    ok: false,
    statusCode: 400,
    error: 'البوابة المختارة (Custom Bridge) تتطلب ربط رابط دفع خارجي مخصص؛ يرجى اختيار Konnect أو Flouci للدفع المباشر.',
  };
}

async function verifyGatewayPaymentRef(params: {
  provider: string;
  payRef: string;
  expectedAmount: number;
  expectedCurrency: string;
}): Promise<{ ok: boolean; status: 'completed' | 'pending' | 'failed'; reason?: string; statusCode?: number }> {
  const cfg = paymentDb.config;
  const secrets = cfg.secrets;
  const expectedMinor = toMinorUnits(params.expectedAmount, params.expectedCurrency);

  if (params.provider === 'konnect') {
    if (!secrets.apiKey) return { ok: false, status: 'failed', reason: 'Missing Konnect API key', statusCode: 503 };
    const baseUrl =
      cfg.methods.online_payment.mode === 'live'
        ? `https://api.konnect.network/api/v2/payments/${encodeURIComponent(params.payRef)}`
        : `https://api.sandbox.konnect.network/api/v2/payments/${encodeURIComponent(params.payRef)}`;
    try {
      const checkRes = await fetch(baseUrl, {
        headers: { 'x-api-key': secrets.apiKey },
        signal: AbortSignal.timeout(10000),
      });
      const checkJson: any = await checkRes.json().catch(() => ({}));
      if (!checkRes.ok || !checkJson?.payment) {
        return { ok: false, status: 'failed', reason: `Konnect returned HTTP ${checkRes.status}`, statusCode: 502 };
      }
      const pStatus = String(checkJson.payment.status || '').toLowerCase();
      const paidAmount = Number(checkJson.payment.amount);
      const paidToken = String(checkJson.payment.token || params.expectedCurrency).toUpperCase();

      if (paidToken !== String(params.expectedCurrency).toUpperCase()) {
        return { ok: false, status: 'failed', reason: `Currency mismatch (${paidToken} != ${params.expectedCurrency})`, statusCode: 403 };
      }
      if (Number.isFinite(paidAmount) && Math.abs(paidAmount - expectedMinor) > 1) {
        return {
          ok: false,
          status: 'failed',
          reason: `Amount tamper mismatch (${paidAmount} != ${expectedMinor})`,
          statusCode: 403,
        };
      }
      if (pStatus === 'completed' || pStatus === 'paid') {
        return { ok: true, status: 'completed' };
      }
      if (pStatus === 'pending') {
        return { ok: true, status: 'pending' };
      }
      return { ok: true, status: 'failed', reason: `Konnect status=${pStatus}` };
    } catch {
      return { ok: false, status: 'failed', reason: 'Failed to reach Konnect verification API', statusCode: 502 };
    }
  }

  if (params.provider === 'flouci') {
    if (!secrets.apiKey || !secrets.walletId) {
      return { ok: false, status: 'failed', reason: 'Missing Flouci credentials', statusCode: 503 };
    }
    try {
      const checkRes = await fetch(`https://developers.flouci.com/api/verify_payment/${encodeURIComponent(params.payRef)}`, {
        method: 'GET',
        headers: {
          apppublic: secrets.apiKey,
          appsecret: secrets.walletId,
        },
        signal: AbortSignal.timeout(10000),
      });
      const checkJson: any = await checkRes.json().catch(() => ({}));
      const result = checkJson?.result;
      if (!checkRes.ok || !result) {
        return { ok: false, status: 'failed', reason: `Flouci returned HTTP ${checkRes.status}`, statusCode: 502 };
      }
      const fStatus = String(result.status || '').toUpperCase();
      if (fStatus === 'SUCCESS') {
        if (typeof result.amount === 'number' && Math.abs(result.amount - expectedMinor) > 1) {
          return {
            ok: false,
            status: 'failed',
            reason: `Flouci amount tamper mismatch (${result.amount} != ${expectedMinor})`,
            statusCode: 403,
          };
        }
        return { ok: true, status: 'completed' };
      }
      if (fStatus === 'PENDING' || fStatus === 'CREATED') {
        return { ok: true, status: 'pending' };
      }
      return { ok: true, status: 'failed', reason: `Flouci status=${fStatus}` };
    } catch {
      return { ok: false, status: 'failed', reason: 'Failed to reach Flouci verification API', statusCode: 502 };
    }
  }

  return { ok: false, status: 'failed', reason: 'Unsupported provider verification', statusCode: 400 };
}

export interface ServerCheckoutInput {
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  shippingAddress: Order['shippingAddress'];
  items: Array<{
    productId: string;
    productName: OrderItem['productName'];
    productImage?: string;
    unitPrice: number;
    quantity: number;
    companyId?: string;
    companyName?: string;
  }>;
  couponCode?: string;
  paymentMethod: PaymentMethodType;
  clientExpectedTotal?: number;
  carrierName?: string;
  notes?: string;
  transferProof?: Partial<TransferProof>;
  origin?: string;
  clientRequestId?: string;
}

export async function processServerCheckout(input: ServerCheckoutInput): Promise<{
  ok: boolean;
  statusCode?: number;
  error?: string;
  order?: Order;
  transaction?: PaymentTransaction;
  paymentUrl?: string;
}> {
  if (!input || !Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, statusCode: 400, error: 'السلة فارغة — لا يمكن إتمام الطلب.' };
  }
  if (!input.customerName?.trim() || !input.customerPhone?.trim() || !input.shippingAddress?.street?.trim()) {
    return { ok: false, statusCode: 400, error: 'يرجى إكمال بيانات المستلم وعنوان التوصيل.' };
  }
  const phoneDigits = (input.customerPhone || '').replace(/\D/g, '');
  if (phoneDigits.length < 6 || phoneDigits.length > 15) {
    return { ok: false, statusCode: 400, error: 'يرجى إدخال رقم هاتف صحيح (بين 6 و15 رقماً).' };
  }
  if (input.customerEmail && input.customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customerEmail.trim())) {
    return { ok: false, statusCode: 400, error: 'صيغة البريد الإلكتروني غير صحيحة.' };
  }

  // Idempotency replay protection against double-clicks
  const reqKey = (input.clientRequestId || '').trim();
  if (reqKey && reqKey.length >= 8) {
    const nowMs = Date.now();
    paymentDb.recentCheckoutRequests = (paymentDb.recentCheckoutRequests || []).filter(
      (r) => nowMs - r.createdAt < 10 * 60 * 1000
    );
    const existingReq = paymentDb.recentCheckoutRequests.find((r) => r.key === reqKey);
    if (existingReq) {
      const existingOrder = paymentDb.orders.find((o) => o.id === existingReq.orderId);
      const existingTxn = paymentDb.transactions.find((t) => t.orderId === existingReq.orderId);
      if (existingOrder && existingTxn) {
        return {
          ok: true,
          order: existingOrder,
          transaction: existingTxn,
          paymentUrl: existingReq.paymentUrl,
        };
      }
    }
  }

  const normalizedMethod = normalizePaymentMethod(input.paymentMethod);
  const cfg = paymentDb.config;

  if (normalizedMethod === 'cod' && !cfg.methods.cod.enabled) {
    return { ok: false, statusCode: 400, error: 'وسيلة الدفع عند الاستلام معطلة حالياً من مركز التحكم.' };
  }
  if (normalizedMethod === 'bank_transfer') {
    const bankPublic = getVerifiedBankTransferPublic();
    if (bankPublic.tamperDetected) {
      appendActivity('BANK_INTEGRITY_TAMPER_BLOCKED', 'system', 'Blocked bank transfer checkout due to failed HMAC integrity seal on bank account settings.');
      saveDatabase(paymentDb);
      return {
        ok: false,
        statusCode: 403,
        error: 'تم تعليق التحويل البنكي مؤقتاً لعدم تطابق ختم الأمان الخاص بالحساب البنكي. يرجى التواصل مع الإدارة.',
      };
    }
    if (!bankPublic.enabled) {
      return { ok: false, statusCode: 400, error: 'وسيلة التحويل البنكي معطلة حالياً من مركز التحكم.' };
    }
  }
  if (normalizedMethod === 'online_payment') {
    if (!cfg.methods.online_payment.enabled || !isOnlineGatewayReady()) {
      return {
        ok: false,
        statusCode: 400,
        error: 'الدفع الإلكتروني غير مفعّل بعد: يرجى إعداد مفاتيح البوابة المعتمدة في مركز التحكم أو اختيار الدفع عند الاستلام / التحويل البنكي.',
      };
    }
  }

  // Server-authoritative item price & quantity verification
  const verifiedItems: OrderItem[] = [];
  for (const rawItem of input.items) {
    const qty = Math.floor(Number(rawItem.quantity));
    if (!Number.isFinite(qty) || qty <= 0 || qty > 1000) {
      return { ok: false, statusCode: 400, error: `كمية غير صالحة للمنتج ${rawItem.productId}.` };
    }

    const catalogItem = paymentDb.catalog[rawItem.productId];
    let authoritativeUnitPrice: number;
    let authoritativeVendorId: string;
    let authoritativeVendorName: string;

    if (catalogItem) {
      if (!catalogItem.active) {
        return { ok: false, statusCode: 400, error: `المنتج ${rawItem.productId} غير متاح حالياً للشراء.` };
      }
      // Tampering protection: reject if client forged lower/different unit price
      if (typeof rawItem.unitPrice === 'number' && Math.abs(rawItem.unitPrice - catalogItem.price) > 0.01) {
        appendActivity(
          'TAMPER_PRICE_REJECTED',
          'system',
          `Rejected checkout tampering attempt on ${rawItem.productId}: client=${rawItem.unitPrice}, server=${catalogItem.price}`,
          rawItem.productId
        );
        saveDatabase(paymentDb);
        return { ok: false, statusCode: 400, error: 'تم رفض الطلب: السعر المرسل لا يطابق السعر المعتمد على الخادم.' };
      }
      authoritativeUnitPrice = catalogItem.price;
      authoritativeVendorId = catalogItem.companyId;
      authoritativeVendorName = catalogItem.companyName;
    } else {
      // Dynamic product added by admin in local storefront session; ensure positive valid price and sync
      const submittedPrice = Number(rawItem.unitPrice);
      if (!Number.isFinite(submittedPrice) || submittedPrice <= 0) {
        return { ok: false, statusCode: 400, error: 'سعر المنتج غير صالح.' };
      }
      authoritativeUnitPrice = round3(submittedPrice);
      authoritativeVendorId = rawItem.companyId || 'comp_echox';
      authoritativeVendorName = rawItem.companyName || 'ECHOX Distribution Tunisie';
      paymentDb.catalog[rawItem.productId] = {
        id: rawItem.productId,
        price: authoritativeUnitPrice,
        companyId: authoritativeVendorId,
        companyName: authoritativeVendorName,
        active: true,
      };
    }

    verifiedItems.push({
      productId: rawItem.productId,
      productName: rawItem.productName,
      productImage: rawItem.productImage || '',
      companyId: authoritativeVendorId,
      companyName: authoritativeVendorName,
      unitPrice: authoritativeUnitPrice,
      quantity: qty,
      totalPrice: round3(authoritativeUnitPrice * qty),
    });
  }

  const subtotal = round3(verifiedItems.reduce((sum, it) => sum + it.totalPrice, 0));
  const cleanCoupon = (input.couponCode || '').trim().toUpperCase();
  const discountRate = cleanCoupon === 'ECHOX2026' || cleanCoupon === 'ECHOX10' ? 0.1 : 0;
  const discount = round3(subtotal * discountRate);
  const netItemsTotal = Math.max(0, round3(subtotal - discount));
  const taxAmount = round3(netItemsTotal * (cfg.taxRatePercent / 100));
  const shippingFee = subtotal >= cfg.shipping.freeShippingThreshold ? 0 : round3(cfg.shipping.standardShippingFee);
  const totalAmount = round3(netItemsTotal + taxAmount + shippingFee);

  if (typeof input.clientExpectedTotal === 'number' && Math.abs(input.clientExpectedTotal - totalAmount) > 0.05) {
    appendActivity(
      'TAMPER_TOTAL_REJECTED',
      'system',
      `Rejected mismatched checkout total: client=${input.clientExpectedTotal}, server=${totalAmount}`
    );
    saveDatabase(paymentDb);
    return { ok: false, statusCode: 400, error: 'تم رفض الطلب لعدم تطابق المبلغ الإجمالي المحسوب خادمياً.' };
  }

  const now = new Date().toISOString();
  const orderId = `ord_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
  const trackingNumber = `ECH-TN-${Math.floor(100000 + Math.random() * 900000)}`;
  const paymentReference = `ECH-REF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const transactionId = `txn_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  // Split multi-vendor items into vendor sub-orders + commission calculation
  const groupedByVendor = new Map<string, { vendorName: string; items: OrderItem[] }>();
  for (const item of verifiedItems) {
    const vId = item.companyId || 'comp_echox';
    const vName = item.companyName || 'ECHOX Distribution Tunisie';
    if (!groupedByVendor.has(vId)) {
      groupedByVendor.set(vId, { vendorName: vName, items: [] });
    }
    groupedByVendor.get(vId)!.items.push(item);
  }

  const subOrders: VendorSubOrder[] = [];
  let platformCommissionTotal = 0;

  groupedByVendor.forEach((group, vendorId) => {
    const rawGross = round3(group.items.reduce((s, it) => s + it.totalPrice, 0));
    const proratedDiscount = subtotal > 0 ? round3(discount * (rawGross / subtotal)) : 0;
    const grossAfterDiscount = Math.max(0, round3(rawGross - proratedDiscount));
    const commAmount = round3(grossAfterDiscount * (cfg.commissionRatePercent / 100));
    const netVendor = round3(grossAfterDiscount - commAmount);
    platformCommissionTotal = round3(platformCommissionTotal + commAmount);

    const subOrderId = `sub_${Date.now()}_${vendorId.slice(-6)}_${crypto.randomBytes(2).toString('hex')}`;
    subOrders.push({
      subOrderId,
      masterOrderId: orderId,
      trackingNumber,
      vendorId,
      vendorName: group.vendorName,
      items: group.items,
      grossAmount: grossAfterDiscount,
      commissionRate: cfg.commissionRatePercent,
      commissionAmount: commAmount,
      netVendorAmount: netVendor,
      payoutStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    });
  });

  // Determine initial payment status
  let initialPaymentStatus: PaymentStatus = 'Cash on Delivery';
  let submittedProof: TransferProof | undefined;

  if (normalizedMethod === 'bank_transfer') {
    if (input.transferProof && input.transferProof.referenceNumber?.trim()) {
      const cleanImg = sanitizeReceiptImageDataUrl(input.transferProof.receiptImageDataUrl);
      if (!cleanImg.ok) {
        return { ok: false, statusCode: 400, error: cleanImg.error };
      }
      initialPaymentStatus = 'Payment Verification';
      submittedProof = {
        referenceNumber: input.transferProof.referenceNumber.trim(),
        senderName: (input.transferProof.senderName || input.customerName).trim(),
        transferDate: input.transferProof.transferDate || now.split('T')[0],
        receiptImageDataUrl: cleanImg.value,
        notes: input.transferProof.notes?.trim(),
        submittedAt: now,
      };
    } else {
      initialPaymentStatus = 'Awaiting Bank Transfer';
    }
  } else if (normalizedMethod === 'online_payment') {
    initialPaymentStatus = 'Pending Payment';
  }

  // If online payment is configured and enabled, initialize external gateway session cleanly
  let externalPaymentId: string | undefined;
  let paymentUrl: string | undefined;

  if (normalizedMethod === 'online_payment') {
    const gatewayInit = await initiateGatewaySession({
      amount: totalAmount,
      currency: cfg.currency,
      trackingRef: trackingNumber,
      description: `ECHOX Store Order ${trackingNumber}`,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      origin: input.origin,
    });
    if (!gatewayInit.ok) {
      return {
        ok: false,
        statusCode: gatewayInit.statusCode || 502,
        error: gatewayInit.error,
      };
    }
    externalPaymentId = gatewayInit.externalPaymentId;
    paymentUrl = gatewayInit.paymentUrl;
  }

  const order: Order = {
    id: orderId,
    trackingNumber,
    customerId: input.customerId,
    customerName: input.customerName.trim(),
    customerEmail: input.customerEmail?.trim() || '',
    customerPhone: input.customerPhone.trim(),
    shippingAddress: input.shippingAddress,
    items: verifiedItems,
    subtotal,
    discount,
    taxAmount,
    shippingFee,
    totalAmount,
    platformCommissionTotal,
    currency: cfg.currency,
    status: 'new',
    paymentMethod: normalizedMethod,
    paymentStatus: initialPaymentStatus,
    paymentReference,
    transferProof: submittedProof,
    subOrders,
    transactionId,
    carrierName: input.carrierName || 'Aramex Express Tunisie',
    createdAt: now,
    updatedAt: now,
    notes: input.notes?.trim() || '',
    statusHistory: [
      {
        status: 'new',
        timestamp: now,
        note:
          normalizedMethod === 'bank_transfer'
            ? `تم تسجيل الطلب (${trackingNumber}) — مرجع التحويل: ${paymentReference}`
            : normalizedMethod === 'online_payment'
            ? `تم تسجيل الطلب (${trackingNumber}) — بانتظار تأكيد الدفع عبر بوابة ${cfg.methods.online_payment.provider}`
            : 'تم تسجيل الطلب بنجاح عبر منصة ECHOX STORE (الدفع عند الاستلام)',
      },
    ],
  };

  const transaction: PaymentTransaction = {
    id: transactionId,
    orderId,
    trackingNumber,
    paymentReference,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    method: normalizedMethod,
    provider: normalizedMethod === 'online_payment' ? cfg.methods.online_payment.provider : undefined,
    externalPaymentId,
    amount: totalAmount,
    currency: cfg.currency,
    taxAmount,
    commissionTotal: platformCommissionTotal,
    status: initialPaymentStatus,
    transferProof: submittedProof,
    createdAt: now,
    updatedAt: now,
  };

  const ledgerEntries: VendorLedgerEntry[] = subOrders.map(sub => ({
    id: `vled_${sub.subOrderId}`,
    vendorId: sub.vendorId,
    vendorName: sub.vendorName,
    orderId,
    subOrderId: sub.subOrderId,
    trackingNumber,
    grossAmount: sub.grossAmount,
    commissionAmount: sub.commissionAmount,
    netAmount: sub.netVendorAmount,
    paymentStatus: initialPaymentStatus,
    payoutStatus: 'pending',
    createdAt: now,
    updatedAt: now,
  }));

  paymentDb.orders = [order, ...paymentDb.orders];
  paymentDb.transactions = [transaction, ...paymentDb.transactions];
  paymentDb.vendorLedgers = [...ledgerEntries, ...paymentDb.vendorLedgers];
  if (reqKey && reqKey.length >= 8) {
    paymentDb.recentCheckoutRequests = [
      { key: reqKey, orderId, paymentUrl, createdAt: Date.now() },
      ...(paymentDb.recentCheckoutRequests || []).slice(0, 99),
    ];
  }
  appendActivity(
    'ORDER_PAYMENT_CREATED',
    'customer',
    `Order ${trackingNumber} (${normalizedMethod}) created with status "${initialPaymentStatus}" & ${subOrders.length} vendor sub-order(s).`,
    orderId,
    totalAmount
  );
  saveDatabase(paymentDb);

  return { ok: true, order, transaction, paymentUrl };
}

export function submitBankTransferProof(payload: {
  trackingNumber: string;
  customerPhone?: string;
  referenceNumber: string;
  senderName: string;
  transferDate?: string;
  receiptImageDataUrl?: string;
  notes?: string;
  isAdmin?: boolean;
}): { ok: boolean; statusCode?: number; error?: string; order?: Order } {
  const cleanTrack = (payload.trackingNumber || '').trim().toUpperCase();
  const order = paymentDb.orders.find(o => o.trackingNumber.toUpperCase() === cleanTrack);
  if (!order) {
    return { ok: false, statusCode: 404, error: 'لم يتم العثور على الطلب بهذا الرقم.' };
  }
  if (!payload.isAdmin) {
    const orderPhone = normalizePhone(order.customerPhone);
    const reqPhone = normalizePhone(payload.customerPhone || '');
    if (orderPhone && reqPhone !== orderPhone) {
      return { ok: false, statusCode: 403, error: 'رقم الهاتف لا يطابق رقم الطلب المسجل.' };
    }
  }
  if (order.paymentMethod !== 'bank_transfer') {
    return { ok: false, statusCode: 400, error: 'هذا الطلب ليس من نوع التحويل البنكي.' };
  }
  if (order.paymentStatus === 'Paid' || order.paymentStatus === 'Refunded' || order.paymentStatus === 'Cancelled') {
    return { ok: false, statusCode: 400, error: `لا يمكن تعديل إثبات الدفع لحالة (${order.paymentStatus}).` };
  }
  if (!payload.referenceNumber?.trim() || !payload.senderName?.trim()) {
    return { ok: false, statusCode: 400, error: 'يرجى إدخال رقم العملية البنكية واسم المحوّل.' };
  }

  const cleanImg = sanitizeReceiptImageDataUrl(payload.receiptImageDataUrl);
  if (!cleanImg.ok) {
    return { ok: false, statusCode: 400, error: cleanImg.error };
  }

  const now = new Date().toISOString();
  const proof: TransferProof = {
    referenceNumber: payload.referenceNumber.trim(),
    senderName: payload.senderName.trim(),
    transferDate: payload.transferDate || now.split('T')[0],
    receiptImageDataUrl: cleanImg.value,
    notes: payload.notes?.trim(),
    submittedAt: now,
  };

  order.transferProof = proof;
  order.paymentStatus = 'Payment Verification';
  order.updatedAt = now;

  const txn = paymentDb.transactions.find(t => t.orderId === order.id);
  if (txn) {
    txn.transferProof = proof;
    txn.status = 'Payment Verification';
    txn.updatedAt = now;
  }

  paymentDb.vendorLedgers.forEach(l => {
    if (l.orderId === order.id) {
      l.paymentStatus = 'Payment Verification';
      l.updatedAt = now;
    }
  });

  appendActivity(
    'BANK_TRANSFER_PROOF_SUBMITTED',
    payload.isAdmin ? 'admin' : 'customer',
    `Submitted bank transfer proof (${proof.referenceNumber}) for ${order.trackingNumber}. Awaiting Admin verification.`,
    order.id,
    order.totalAmount
  );
  saveDatabase(paymentDb);
  return { ok: true, order };
}

export function adminVerifyPayment(payload: {
  orderId?: string;
  transactionId?: string;
  action: 'approve' | 'reject';
  reason?: string;
  adminEmail?: string;
}): { ok: boolean; statusCode?: number; error?: string; order?: Order; transaction?: PaymentTransaction } {
  const txn = paymentDb.transactions.find(
    t => (payload.transactionId && t.id === payload.transactionId) || (payload.orderId && t.orderId === payload.orderId)
  );
  const order = paymentDb.orders.find(
    o => (payload.orderId && o.id === payload.orderId) || (txn && o.id === txn.orderId)
  );

  if (!order && !txn) {
    return { ok: false, statusCode: 404, error: 'المعاملة المالية غير موجودة.' };
  }

  const now = new Date().toISOString();
  const nextStatus: PaymentStatus = payload.action === 'approve' ? 'Paid' : 'Payment Failed';

  if (order) {
    if (order.paymentStatus === 'Refunded' || order.paymentStatus === 'Cancelled' || order.status === 'cancelled') {
      return { ok: false, statusCode: 400, error: 'لا يمكن اعتماد أو تعديل معاملة لطلب ملغى أو مسترجع مسبقاً.' };
    }
    order.paymentStatus = nextStatus;
    order.updatedAt = now;
    if (order.subOrders) {
      order.subOrders.forEach(sub => {
        sub.payoutStatus = payload.action === 'approve' ? 'eligible' : 'pending';
        sub.updatedAt = now;
      });
    }
  }

  if (txn) {
    if (txn.status === 'Refunded' || txn.status === 'Cancelled') {
      return { ok: false, statusCode: 400, error: 'لا يمكن تعديل معاملة ملغاة أو مسترجعة.' };
    }
    txn.status = nextStatus;
    txn.failureReason = payload.action === 'reject' ? (payload.reason || 'Rejected by Admin') : undefined;
    txn.verifiedByAdmin = payload.adminEmail || 'Admin Panel';
    txn.verifiedAt = now;
    txn.updatedAt = now;
  }

  const targetOrderId = order?.id || txn?.orderId || '';
  paymentDb.vendorLedgers.forEach(entry => {
    if (entry.orderId === targetOrderId) {
      entry.paymentStatus = nextStatus;
      entry.payoutStatus = payload.action === 'approve' ? 'eligible' : 'pending';
      entry.updatedAt = now;
    }
  });

  appendActivity(
    payload.action === 'approve' ? 'PAYMENT_APPROVED_PAID' : 'PAYMENT_REJECTED_FAILED',
    'admin',
    `${payload.action === 'approve' ? 'Marked Paid' : 'Rejected payment'} for ${order?.trackingNumber || txn?.trackingNumber}${payload.reason ? ` (${payload.reason})` : ''}.`,
    targetOrderId,
    txn?.amount || order?.totalAmount
  );
  saveDatabase(paymentDb);
  return { ok: true, order, transaction: txn };
}

export function adminProcessRefundOrCancel(payload: {
  orderId: string;
  action: 'refund' | 'cancel' | 'reject_refund';
  reason?: string;
}): { ok: boolean; statusCode?: number; error?: string; order?: Order } {
  const order = paymentDb.orders.find(o => o.id === payload.orderId || o.trackingNumber === payload.orderId);
  if (!order) {
    return { ok: false, statusCode: 404, error: 'الطلب غير موجود بالنظام المالي.' };
  }

  const now = new Date().toISOString();
  const txn = paymentDb.transactions.find(t => t.orderId === order.id);

  if (payload.action === 'reject_refund') {
    const req = paymentDb.refundRequests.find(r => r.orderId === order.id && r.status === 'requested');
    if (req) {
      req.status = 'rejected';
      req.adminNote = payload.reason || 'تم رفض طلب الاسترجاع من مركز التحكم';
      req.updatedAt = now;
    }
    appendActivity('REFUND_REQUEST_REJECTED', 'admin', `Rejected refund request for ${order.trackingNumber}.`, order.id);
    saveDatabase(paymentDb);
    return { ok: true, order };
  }

  const isRefund = payload.action === 'refund';
  if (isRefund && order.paymentStatus === 'Refunded') {
    return { ok: false, statusCode: 400, error: 'تم استرجاع مبلغ هذا الطلب مسبقاً.' };
  }
  if (!isRefund && order.paymentStatus === 'Cancelled' && order.status === 'cancelled') {
    return { ok: false, statusCode: 400, error: 'هذا الطلب ملغى مسبقاً.' };
  }
  const nextPayStatus: PaymentStatus = isRefund ? 'Refunded' : 'Cancelled';

  order.paymentStatus = nextPayStatus;
  order.status = 'cancelled';
  order.refundReason = payload.reason || (isRefund ? 'تم استرجاع المبلغ من مركز التحكم' : 'تم إلغاء الطلب والدفع');
  order.updatedAt = now;
  order.statusHistory = [
    ...order.statusHistory,
    { status: 'cancelled', timestamp: now, note: order.refundReason },
  ];

  if (order.subOrders) {
    order.subOrders.forEach(s => {
      s.payoutStatus = 'reversed';
      s.updatedAt = now;
    });
  }

  if (txn) {
    txn.status = nextPayStatus;
    txn.refundAmount = isRefund ? txn.amount : 0;
    txn.refundReason = order.refundReason;
    txn.updatedAt = now;
  }

  paymentDb.vendorLedgers.forEach(entry => {
    if (entry.orderId === order.id) {
      entry.paymentStatus = nextPayStatus;
      entry.payoutStatus = 'reversed';
      entry.updatedAt = now;
    }
  });

  const existingReq = paymentDb.refundRequests.find(r => r.orderId === order.id);
  if (existingReq) {
    existingReq.status = 'processed';
    existingReq.adminNote = order.refundReason;
    existingReq.updatedAt = now;
  } else if (isRefund) {
    paymentDb.refundRequests = [
      {
        id: `ref_${Date.now()}`,
        orderId: order.id,
        trackingNumber: order.trackingNumber,
        transactionId: txn?.id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        amount: order.totalAmount,
        reason: order.refundReason || 'Admin Refund',
        status: 'processed',
        createdAt: now,
        updatedAt: now,
      },
      ...paymentDb.refundRequests,
    ];
  }

  appendActivity(
    isRefund ? 'PAYMENT_REFUNDED' : 'PAYMENT_CANCELLED',
    'admin',
    `${isRefund ? 'Refunded' : 'Cancelled'} order ${order.trackingNumber} and reversed vendor ledger balances.`,
    order.id,
    order.totalAmount
  );
  saveDatabase(paymentDb);
  return { ok: true, order };
}

export function createCustomerRefundOrCancelRequest(payload: {
  trackingNumber: string;
  customerPhone?: string;
  reason: string;
}): { ok: boolean; statusCode?: number; error?: string; refundRequest?: RefundRequest } {
  const cleanTrack = (payload.trackingNumber || '').trim().toUpperCase();
  const order = paymentDb.orders.find(o => o.trackingNumber.toUpperCase() === cleanTrack);
  if (!order) {
    return { ok: false, statusCode: 404, error: 'الطلب غير موجود.' };
  }
  const orderPhone = normalizePhone(order.customerPhone);
  const reqPhone = normalizePhone(payload.customerPhone || '');
  if (orderPhone && reqPhone !== orderPhone) {
    return { ok: false, statusCode: 403, error: 'رقم الهاتف غير مطابق للطلب.' };
  }

  const now = new Date().toISOString();
  const req: RefundRequest = {
    id: `refreq_${Date.now()}`,
    orderId: order.id,
    trackingNumber: order.trackingNumber,
    transactionId: order.transactionId,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    amount: order.totalAmount,
    reason: payload.reason?.trim() || 'طلب إلغاء / استرجاع من الحريف',
    status: 'requested',
    createdAt: now,
    updatedAt: now,
  };

  paymentDb.refundRequests = [req, ...paymentDb.refundRequests];
  appendActivity('CUSTOMER_REFUND_REQUESTED', 'customer', `Refund/cancellation requested for ${order.trackingNumber}: ${req.reason}`, order.id, order.totalAmount);
  saveDatabase(paymentDb);
  return { ok: true, refundRequest: req };
}

export function canOrderShip(order: Pick<Order, 'paymentMethod' | 'paymentStatus'>): boolean {
  const norm = normalizePaymentMethod(order.paymentMethod);
  if (norm === 'cod') return true;
  return order.paymentStatus === 'Paid' || order.paymentStatus === 'paid';
}

export function adminUpdateOrderStatus(orderId: string, status: OrderStatus, note?: string): {
  ok: boolean;
  statusCode?: number;
  error?: string;
  order?: Order;
} {
  const order = paymentDb.orders.find(o => o.id === orderId || o.trackingNumber === orderId);
  if (!order) {
    return { ok: false, statusCode: 404, error: 'الطلب غير موجود.' };
  }

  if (order.status === 'cancelled' && status !== 'cancelled') {
    return {
      ok: false,
      statusCode: 409,
      error: 'لا يمكن شحن أو تفعيل طلب ملغى مالياً.',
    };
  }

  const shippingStatuses: OrderStatus[] = ['preparing', 'out_for_delivery', 'delivered'];
  if (shippingStatuses.includes(status) && !canOrderShip(order)) {
    return {
      ok: false,
      statusCode: 409,
      error: 'لا يمكن شحن أو تجهيز أو تسليم هذا الطلب قبل تأكيد حالة الدفع كـ "مدفوع" (Paid).',
    };
  }

  const now = new Date().toISOString();
  order.status = status;
  order.updatedAt = now;
  order.statusHistory = [
    ...order.statusHistory,
    { status, timestamp: now, note: note || `Updated shipping status to ${status}` },
  ];

  // Logical COD lifecycle settlement: once COD parcel is delivered, mark payment Paid & unlock vendor earnings
  if (
    status === 'delivered' &&
    normalizePaymentMethod(order.paymentMethod) === 'cod' &&
    order.paymentStatus !== 'Paid' &&
    order.paymentStatus !== 'paid' &&
    order.paymentStatus !== 'Refunded' &&
    order.paymentStatus !== 'Cancelled'
  ) {
    order.paymentStatus = 'Paid';
    const txn = paymentDb.transactions.find(t => t.orderId === order.id);
    if (txn) {
      txn.status = 'Paid';
      txn.verifiedByAdmin = 'COD Auto-Settlement on Delivery';
      txn.verifiedAt = now;
      txn.updatedAt = now;
    }
    if (order.subOrders) {
      order.subOrders.forEach(sub => {
        if (sub.payoutStatus === 'pending') sub.payoutStatus = 'eligible';
        sub.updatedAt = now;
      });
    }
    paymentDb.vendorLedgers.forEach(entry => {
      if (entry.orderId === order.id && entry.payoutStatus === 'pending') {
        entry.paymentStatus = 'Paid';
        entry.payoutStatus = 'eligible';
        entry.updatedAt = now;
      } else if (entry.orderId === order.id) {
        entry.paymentStatus = 'Paid';
        entry.updatedAt = now;
      }
    });
    appendActivity('COD_COLLECTED_ON_DELIVERY', 'system', `Marked COD order ${order.trackingNumber} Paid upon delivery and unlocked vendor balances.`, order.id, order.totalAmount);
  }

  appendActivity('ORDER_STATUS_UPDATED', 'admin', `Order ${order.trackingNumber} transitioned to "${status}".`, order.id);
  saveDatabase(paymentDb);
  return { ok: true, order };
}

export function adminSettleVendorPayout(vendorId: string, settlementNote?: string): {
  ok: boolean;
  settledCount: number;
  settledTotal: number;
} {
  const now = new Date().toISOString();
  let settledCount = 0;
  let settledTotal = 0;

  paymentDb.vendorLedgers.forEach(entry => {
    if (entry.vendorId === vendorId && entry.payoutStatus === 'eligible') {
      entry.payoutStatus = 'settled';
      entry.settledAt = now;
      entry.settlementNote = settlementNote || 'Settled manually from Admin Panel';
      entry.updatedAt = now;
      settledCount++;
      settledTotal = round3(settledTotal + entry.netAmount);
    }
  });

  paymentDb.orders.forEach(o => {
    o.subOrders?.forEach(sub => {
      if (sub.vendorId === vendorId && sub.payoutStatus === 'eligible') {
        sub.payoutStatus = 'settled';
        sub.updatedAt = now;
      }
    });
  });

  if (settledCount > 0) {
    appendActivity(
      'VENDOR_PAYOUT_SETTLED',
      'admin',
      `Marked ${settledCount} ledger item(s) settled for vendor ${vendorId} (${settledTotal.toFixed(3)} ${paymentDb.config.currency}). Note: bank payouts are settled manually outside automated split.`,
      vendorId,
      settledTotal
    );
    saveDatabase(paymentDb);
  }

  return { ok: true, settledCount, settledTotal };
}

export function getScopedVendorFinancials(vendorId: string) {
  // STRICT VENDOR ISOLATION: only entries and sub-orders matching exact vendorId
  const entries = paymentDb.vendorLedgers.filter(e => e.vendorId === vendorId);
  const grossTotal = round3(entries.filter(e => e.payoutStatus !== 'reversed').reduce((s, e) => s + e.grossAmount, 0));
  const commissionTotal = round3(entries.filter(e => e.payoutStatus !== 'reversed').reduce((s, e) => s + e.commissionAmount, 0));
  const netPending = round3(entries.filter(e => e.payoutStatus === 'pending').reduce((s, e) => s + e.netAmount, 0));
  const netEligible = round3(entries.filter(e => e.payoutStatus === 'eligible').reduce((s, e) => s + e.netAmount, 0));
  const netSettled = round3(entries.filter(e => e.payoutStatus === 'settled').reduce((s, e) => s + e.netAmount, 0));

  const subOrders = paymentDb.orders.flatMap(o =>
    (o.subOrders || [])
      .filter(s => s.vendorId === vendorId)
      .map(s => ({
        ...s,
        orderPaymentStatus: o.paymentStatus,
        orderTrackingStatus: o.status,
        paymentMethod: o.paymentMethod,
      }))
  );

  return {
    vendorId,
    currency: paymentDb.config.currency,
    grossTotal,
    commissionTotal,
    netPending,
    netEligible,
    netSettled,
    subOrders,
    ledgerEntries: entries,
  };
}

export function adminCreateManualOrder(input: Partial<Order>): {
  ok: boolean;
  statusCode?: number;
  error?: string;
  order?: Order;
} {
  const customerName = (input.customerName || '').trim();
  const customerPhone = (input.customerPhone || '').trim();
  const amount = round3(Number(input.totalAmount ?? input.subtotal ?? 0));

  if (!customerName || !customerPhone || !Number.isFinite(amount) || amount < 0) {
    return { ok: false, statusCode: 400, error: 'بيانات الطلب اليدوي غير مكتملة أو غير صالحة.' };
  }

  const now = new Date().toISOString();
  const orderId = input.id && input.id.startsWith('ord_')
    ? input.id
    : `ord_manual_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
  const trackingNumber =
    (input.trackingNumber || '').trim().toUpperCase() ||
    `ECH-TN-${Math.floor(100000 + Math.random() * 900000)}`;
  const paymentMethod = normalizePaymentMethod(input.paymentMethod || 'cod');
  const paymentStatus: PaymentStatus =
    input.paymentStatus ||
    (paymentMethod === 'cod' ? 'Cash on Delivery' : 'Pending Payment');

  const created: Order = {
    id: orderId,
    trackingNumber,
    customerName,
    customerEmail: (input.customerEmail || '').trim(),
    customerPhone,
    shippingAddress: input.shippingAddress || {
      id: `addr_${Date.now()}`,
      isDefault: true,
      fullName: customerName,
      phone: customerPhone,
      governorate: 'tunis',
      city: 'تونس العاصمة',
      postalCode: '1000',
      street: 'طلب مباشر عبر الهاتف / واتساب',
    },
    items:
      Array.isArray(input.items) && input.items.length > 0
        ? input.items
        : [
            {
              productId: 'manual_item',
              productName: {
                ar: 'طلب هاتفي مباشر',
                fr: 'Commande directe',
                en: 'Direct Order',
              },
              productImage: '/assets/images/echox-logo.webp',
              unitPrice: amount,
              quantity: 1,
              totalPrice: amount,
            },
          ],
    subtotal: round3(Number(input.subtotal ?? amount)),
    discount: round3(Number(input.discount ?? 0)),
    taxAmount: round3(Number(input.taxAmount ?? 0)),
    shippingFee: round3(Number(input.shippingFee ?? 0)),
    totalAmount: amount,
    currency: paymentDb.config.currency,
    status: input.status || 'new',
    paymentMethod,
    paymentStatus,
    carrierName: (input.carrierName || '').trim() || 'LivriTN Logistics',
    createdAt: now,
    updatedAt: now,
    notes: (input.notes || '').trim() || 'تم التسجيل يدوياً من لوحة التحكم',
    statusHistory: [
      {
        status: input.status || 'new',
        timestamp: now,
        note: 'تم تسجيل الطلب يدوياً عبر الهاتف / واتساب',
      },
    ],
  };

  paymentDb.orders = [created, ...paymentDb.orders.filter(o => o.id !== created.id)];
  appendActivity(
    'MANUAL_ORDER_CREATED',
    'admin',
    `Admin recorded manual order ${created.trackingNumber} for ${created.customerName}.`,
    created.id,
    created.totalAmount
  );
  saveDatabase(paymentDb);
  return { ok: true, order: created };
}

export function adminDeleteOrder(orderId: string): {
  ok: boolean;
  statusCode?: number;
  error?: string;
} {
  const cleanId = (orderId || '').trim();
  const target = paymentDb.orders.find(o => o.id === cleanId || o.trackingNumber === cleanId);
  if (!target) {
    return { ok: false, statusCode: 404, error: 'الطلب غير موجود على الخادم.' };
  }

  paymentDb.orders = paymentDb.orders.filter(o => o.id !== target.id);
  paymentDb.transactions = paymentDb.transactions.filter(t => t.orderId !== target.id);
  paymentDb.vendorLedgers = paymentDb.vendorLedgers.filter(v => v.orderId !== target.id);
  paymentDb.refundRequests = paymentDb.refundRequests.filter(r => r.orderId !== target.id);

  appendActivity(
    'ORDER_DELETED',
    'admin',
    `Admin deleted order ${target.trackingNumber} (${target.customerName}).`,
    target.id,
    target.totalAmount
  );
  saveDatabase(paymentDb);
  return { ok: true };
}

export function trackPublicOrder(code: string): {
  ok: boolean;
  statusCode?: number;
  error?: string;
  order?: Order;
} {
  const clean = (code || '').trim().toUpperCase();
  if (!clean || clean.length < 4) {
    return { ok: false, statusCode: 400, error: 'يرجى إدخال رقم تتبع صالح.' };
  }
  const found = paymentDb.orders.find(
    o =>
      o.trackingNumber.toUpperCase() === clean ||
      (o.paymentReference && o.paymentReference.toUpperCase() === clean)
  );
  if (!found) {
    return { ok: false, statusCode: 404, error: 'لم يتم العثور على طلب بهذا الرمز.' };
  }
  return { ok: true, order: found };
}

export function getAdminPaymentOverview() {
  const vendorIds = Array.from(new Set(paymentDb.vendorLedgers.map(e => e.vendorId)));
  const vendorSummaries = vendorIds.map(vId => {
    const first = paymentDb.vendorLedgers.find(e => e.vendorId === vId);
    const scoped = getScopedVendorFinancials(vId);
    return {
      vendorId: vId,
      vendorName: first?.vendorName || vId,
      grossTotal: scoped.grossTotal,
      commissionTotal: scoped.commissionTotal,
      netPending: scoped.netPending,
      netEligible: scoped.netEligible,
      netSettled: scoped.netSettled,
      entriesCount: scoped.ledgerEntries.length,
    };
  });

  const supportTotalPaid = round3(
    paymentDb.supportTransactions
      .filter(s => s.status === 'Paid')
      .reduce((sum, s) => sum + s.amount, 0)
  );

  return {
    config: getPublicPaymentConfig(),
    orders: paymentDb.orders,
    transactions: paymentDb.transactions,
    vendorLedgers: paymentDb.vendorLedgers,
    vendorSummaries,
    refundRequests: paymentDb.refundRequests,
    supportTransactions: paymentDb.supportTransactions,
    supportTotalPaid,
    activityLogs: paymentDb.activityLogs,
  };
}

function markOrderPaymentFromGateway(txn: PaymentTransaction, nextStatus: PaymentStatus, sourceTag: string, failureReason?: string): Order | undefined {
  const now = new Date().toISOString();
  // Terminal / Paid immutability guard: never downgrade already Paid, Refunded, or Cancelled records
  if (txn.status === 'Refunded' || txn.status === 'Cancelled') return paymentDb.orders.find(o => o.id === txn.orderId);
  if (txn.status === 'Paid' && nextStatus !== 'Paid') return paymentDb.orders.find(o => o.id === txn.orderId);

  txn.status = nextStatus;
  txn.failureReason = nextStatus === 'Payment Failed' ? failureReason : undefined;
  txn.updatedAt = now;

  const order = paymentDb.orders.find(o => o.id === txn.orderId);
  if (order && order.paymentStatus !== 'Refunded' && order.paymentStatus !== 'Cancelled') {
    if (!(order.paymentStatus === 'Paid' && nextStatus !== 'Paid')) {
      order.paymentStatus = nextStatus;
      order.updatedAt = now;
      if (nextStatus === 'Paid') {
        order.statusHistory = [
          ...order.statusHistory,
          { status: order.status, timestamp: now, note: `تم تأكيد الدفع الإلكتروني تلقائياً (${sourceTag})` },
        ];
      }
      if (order.subOrders) {
        order.subOrders.forEach(s => {
          s.payoutStatus = nextStatus === 'Paid' ? 'eligible' : 'pending';
          s.updatedAt = now;
        });
      }
    }
  }

  paymentDb.vendorLedgers.forEach(entry => {
    if (entry.orderId === txn.orderId) {
      if (!(entry.paymentStatus === 'Paid' && nextStatus !== 'Paid')) {
        entry.paymentStatus = nextStatus;
        entry.payoutStatus = nextStatus === 'Paid' ? 'eligible' : 'pending';
        entry.updatedAt = now;
      }
    }
  });

  return order;
}

export async function handlePaymentWebhook(payload: {
  provider: string;
  method?: 'GET' | 'POST';
  signatureHeader?: string;
  rawBody: any;
  rawBodyText?: string;
  query?: Record<string, any>;
}): Promise<{ ok: boolean; statusCode: number; message: string; idempotentDuplicate?: boolean }> {
  const { provider, method = 'POST', signatureHeader, rawBody, rawBodyText, query } = payload;
  const secrets = paymentDb.config.secrets;
  const mergedInput = {
    ...(query || {}),
    ...(rawBody && typeof rawBody === 'object' ? rawBody : {}),
  };

  // Konnect silentWebhook uses GET ?payment_ref=... and does not carry an HMAC header;
  // security relies on server-to-server Konnect API verification. For POST webhooks with webhookSecret, verify raw HMAC bytes.
  const isSilentKonnectGet = method === 'GET' && provider === 'konnect' && Boolean(mergedInput.payment_ref);

  if (!isSilentKonnectGet && secrets.webhookSecret && secrets.webhookSecret.trim().length > 0) {
    if (!signatureHeader) {
      appendActivity('WEBHOOK_UNAUTHORIZED', 'webhook', `Rejected ${provider} webhook missing signature header.`);
      saveDatabase(paymentDb);
      return { ok: false, statusCode: 401, message: 'Missing webhook signature header.' };
    }
    const cleanSig = signatureHeader.trim().replace(/^sha256=/i, '');
    const wireText =
      typeof rawBodyText === 'string' && rawBodyText.length > 0
        ? rawBodyText
        : typeof rawBody === 'string'
        ? rawBody
        : JSON.stringify(rawBody || {});
    const expectedHmac = crypto
      .createHmac('sha256', secrets.webhookSecret.trim())
      .update(wireText)
      .digest('hex');

    const sigBuf = Buffer.from(cleanSig);
    const expBuf = Buffer.from(expectedHmac);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      appendActivity('WEBHOOK_SIGNATURE_INVALID', 'webhook', `Rejected ${provider} webhook with invalid HMAC signature.`);
      saveDatabase(paymentDb);
      return { ok: false, statusCode: 403, message: 'Invalid webhook signature.' };
    }
  } else if (!secrets.apiKey) {
    appendActivity('WEBHOOK_REJECTED_UNCONFIGURED', 'webhook', `Rejected ${provider} webhook because gateway credentials are not configured.`);
    saveDatabase(paymentDb);
    return { ok: false, statusCode: 503, message: 'Gateway not configured on server.' };
  }

  const payRefParam = mergedInput?.payment_ref || mergedInput?.paymentRef || mergedInput?.payment_id || '';
  const trackingOrRef = mergedInput?.orderId || mergedInput?.trackingNumber || mergedInput?.developer_tracking_id || payRefParam;
  if (!trackingOrRef) {
    return { ok: false, statusCode: 400, message: 'Missing payment or order identifier in webhook payload.' };
  }

  const eventId =
    mergedInput?.eventId ||
    mergedInput?.id ||
    `${provider}:${payRefParam || trackingOrRef}:${mergedInput?.status || method}`;

  if (eventId && paymentDb.processedWebhookKeys.includes(eventId)) {
    return { ok: true, statusCode: 200, message: 'Duplicate webhook safely ignored (idempotent).', idempotentDuplicate: true };
  }

  // Locate either an Order PaymentTransaction OR an independent SupportTransaction
  const txn = paymentDb.transactions.find(
    t => t.trackingNumber === trackingOrRef || t.externalPaymentId === trackingOrRef || t.paymentReference === trackingOrRef || (payRefParam && t.externalPaymentId === payRefParam)
  );
  const supTxn = !txn
    ? paymentDb.supportTransactions.find(
        s => s.supportReference === trackingOrRef || s.externalPaymentId === trackingOrRef || (payRefParam && s.externalPaymentId === payRefParam)
      )
    : undefined;

  if (!txn && !supTxn) {
    return { ok: false, statusCode: 404, message: 'Transaction not found.' };
  }

  const targetAmount = txn ? txn.amount : supTxn!.amount;
  const targetCurrency = txn ? txn.currency : supTxn!.currency;
  const targetExternalRef = (txn?.externalPaymentId || supTxn?.externalPaymentId || payRefParam || '').trim();

  // Prevent paymentRef swap attack
  if (
    payRefParam &&
    (txn?.externalPaymentId || supTxn?.externalPaymentId) &&
    payRefParam !== (txn?.externalPaymentId || supTxn?.externalPaymentId)
  ) {
    appendActivity('TAMPER_WEBHOOK_REF_MISMATCH', 'webhook', `Rejected mismatched payment_ref (${payRefParam}) on ${trackingOrRef}.`);
    saveDatabase(paymentDb);
    return { ok: false, statusCode: 403, message: 'Payment reference mismatch.' };
  }

  let verifiedStatus: 'completed' | 'pending' | 'failed' = 'failed';

  if ((provider === 'konnect' || provider === 'flouci') && targetExternalRef) {
    const check = await verifyGatewayPaymentRef({
      provider,
      payRef: targetExternalRef,
      expectedAmount: targetAmount,
      expectedCurrency: targetCurrency,
    });
    if (!check.ok) {
      if (check.statusCode === 403) {
        appendActivity('TAMPER_WEBHOOK_AMOUNT_MISMATCH', 'webhook', `${provider} security violation on ${trackingOrRef}: ${check.reason}`);
        saveDatabase(paymentDb);
        return { ok: false, statusCode: 403, message: check.reason || 'Payment integrity verification failed.' };
      }
      return { ok: false, statusCode: check.statusCode || 502, message: check.reason || 'Gateway verification error.' };
    }
    verifiedStatus = check.status;
  } else if (secrets.webhookSecret) {
    const incomingStatus = String(mergedInput?.status || '').toLowerCase();
    verifiedStatus =
      incomingStatus === 'completed' || incomingStatus === 'paid' || incomingStatus === 'succeeded' || incomingStatus === 'success'
        ? 'completed'
        : incomingStatus === 'pending'
        ? 'pending'
        : 'failed';
  }

  if (verifiedStatus === 'pending') {
    return { ok: true, statusCode: 200, message: 'Payment is still pending confirmation.' };
  }

  const nextStatus: PaymentStatus = verifiedStatus === 'completed' ? 'Paid' : 'Payment Failed';
  const targetRefLabel = txn ? txn.trackingNumber : supTxn!.supportReference;

  if (txn) {
    markOrderPaymentFromGateway(txn, nextStatus, `${provider} webhook`);
  } else if (supTxn) {
    if (supTxn.status !== 'Refunded' && supTxn.status !== 'Cancelled' && !(supTxn.status === 'Paid' && nextStatus !== 'Paid')) {
      supTxn.status = nextStatus;
      supTxn.updatedAt = new Date().toISOString();
    }
  }

  if (eventId) {
    paymentDb.processedWebhookKeys = [eventId, ...paymentDb.processedWebhookKeys].slice(0, 500);
  }

  appendActivity(
    'WEBHOOK_PROCESSED',
    'webhook',
    `${provider} webhook updated ${targetRefLabel} to ${nextStatus}.`,
    txn ? txn.orderId : supTxn!.id,
    targetAmount
  );
  saveDatabase(paymentDb);
  return { ok: true, statusCode: 200, message: `Webhook processed: ${nextStatus}` };
}

export async function verifyGatewayReturn(params: {
  tracking?: string;
  paymentRef?: string;
  provider?: string;
}): Promise<{
  ok: boolean;
  statusCode?: number;
  kind?: 'order' | 'support';
  paymentStatus?: PaymentStatus;
  order?: Order;
  supportTransaction?: SupportTransaction;
  error?: string;
}> {
  const cleanTrack = (params.tracking || '').trim().toUpperCase();
  const cleanPayRef = (params.paymentRef || '').trim();

  const txn = paymentDb.transactions.find(
    t =>
      (cleanTrack && (t.trackingNumber.toUpperCase() === cleanTrack || t.paymentReference.toUpperCase() === cleanTrack)) ||
      (cleanPayRef && t.externalPaymentId === cleanPayRef)
  );
  const supTxn = !txn
    ? paymentDb.supportTransactions.find(
        s =>
          (cleanTrack && s.supportReference.toUpperCase() === cleanTrack) ||
          (cleanPayRef && s.externalPaymentId === cleanPayRef)
      )
    : undefined;

  if (!txn && !supTxn) {
    return { ok: false, statusCode: 404, error: 'لم يتم العثور على المعاملة للتحقق منها.' };
  }

  const targetStatus = txn ? txn.status : supTxn!.status;
  const targetProvider = (params.provider || txn?.provider || supTxn?.provider || paymentDb.config.methods.online_payment.provider || 'konnect').toLowerCase();
  const extRef = txn?.externalPaymentId || supTxn?.externalPaymentId || cleanPayRef;

  if (targetStatus === 'Paid') {
    return {
      ok: true,
      kind: txn ? 'order' : 'support',
      paymentStatus: 'Paid',
      order: txn ? paymentDb.orders.find(o => o.id === txn.orderId) : undefined,
      supportTransaction: supTxn,
    };
  }

  if ((targetProvider === 'konnect' || targetProvider === 'flouci') && extRef) {
    const check = await verifyGatewayPaymentRef({
      provider: targetProvider,
      payRef: extRef,
      expectedAmount: txn ? txn.amount : supTxn!.amount,
      expectedCurrency: txn ? txn.currency : supTxn!.currency,
    });
    if (check.ok && check.status === 'completed') {
      if (txn) {
        const order = markOrderPaymentFromGateway(txn, 'Paid', `${targetProvider} return verify`);
        appendActivity('GATEWAY_RETURN_VERIFIED_PAID', 'system', `Verified ${txn.trackingNumber} as Paid on return.`, txn.orderId, txn.amount);
        saveDatabase(paymentDb);
        return { ok: true, kind: 'order', paymentStatus: 'Paid', order };
      } else if (supTxn) {
        supTxn.status = 'Paid';
        supTxn.updatedAt = new Date().toISOString();
        appendActivity('SUPPORT_RETURN_VERIFIED_PAID', 'system', `Verified support ${supTxn.supportReference} as Paid on return.`, supTxn.id, supTxn.amount);
        saveDatabase(paymentDb);
        return { ok: true, kind: 'support', paymentStatus: 'Paid', supportTransaction: supTxn };
      }
    }
    if (check.ok && check.status === 'failed') {
      if (txn) {
        const order = markOrderPaymentFromGateway(txn, 'Payment Failed', `${targetProvider} return verify`, check.reason);
        saveDatabase(paymentDb);
        return { ok: true, kind: 'order', paymentStatus: 'Payment Failed', order };
      } else if (supTxn) {
        supTxn.status = 'Payment Failed';
        supTxn.updatedAt = new Date().toISOString();
        saveDatabase(paymentDb);
        return { ok: true, kind: 'support', paymentStatus: 'Payment Failed', supportTransaction: supTxn };
      }
    }
  }

  return {
    ok: true,
    kind: txn ? 'order' : 'support',
    paymentStatus: targetStatus,
    order: txn ? paymentDb.orders.find(o => o.id === txn.orderId) : undefined,
    supportTransaction: supTxn,
  };
}

// ==========================================
// INDEPENDENT SUPPORT ECHOX ENGINE
// ==========================================
export async function createSupportContribution(payload: {
  amount: number;
  method: PaymentMethodType;
  supporterName?: string;
  supporterPhone?: string;
  supporterEmail?: string;
  note?: string;
  transferProof?: Partial<TransferProof>;
  origin?: string;
}): Promise<{ ok: boolean; statusCode?: number; error?: string; supportTransaction?: SupportTransaction; paymentUrl?: string }> {
  const amt = round3(Number(payload.amount));
  if (!Number.isFinite(amt) || amt <= 0 || amt > 50000) {
    return { ok: false, statusCode: 400, error: 'يرجى إدخال مبلغ دعم صالح (بين 0.5 و 50,000).' };
  }

  const method = normalizePaymentMethod(payload.method);
  const cfg = paymentDb.config;
  if (method === 'cod' && !cfg.methods.cod.enabled) {
    return { ok: false, statusCode: 400, error: 'الدفع النقدي غير مفعّل حالياً.' };
  }
  if (method === 'bank_transfer') {
    const bankPublic = getVerifiedBankTransferPublic();
    if (bankPublic.tamperDetected || !bankPublic.enabled) {
      return { ok: false, statusCode: 400, error: 'التحويل البنكي غير متاح حالياً.' };
    }
  }
  if (method === 'online_payment' && (!cfg.methods.online_payment.enabled || !isOnlineGatewayReady())) {
    return { ok: false, statusCode: 400, error: 'الدفع الإلكتروني غير مفعّل بعد في مركز التحكم.' };
  }

  const now = new Date().toISOString();
  const supportRef = `ECH-SUP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  let initialStatus: PaymentStatus = 'Cash on Delivery';
  let proof: TransferProof | undefined;

  if (method === 'bank_transfer') {
    if (payload.transferProof?.referenceNumber?.trim()) {
      const cleanImg = sanitizeReceiptImageDataUrl(payload.transferProof.receiptImageDataUrl);
      if (!cleanImg.ok) {
        return { ok: false, statusCode: 400, error: cleanImg.error };
      }
      initialStatus = 'Payment Verification';
      proof = {
        referenceNumber: payload.transferProof.referenceNumber.trim(),
        senderName: (payload.transferProof.senderName || payload.supporterName || 'داعم ECHOX').trim(),
        transferDate: payload.transferProof.transferDate || now.split('T')[0],
        receiptImageDataUrl: cleanImg.value,
        notes: payload.transferProof.notes?.trim(),
        submittedAt: now,
      };
    } else {
      initialStatus = 'Awaiting Bank Transfer';
    }
  } else if (method === 'online_payment') {
    initialStatus = 'Pending Payment';
  }

  let paymentUrl: string | undefined;
  let externalPaymentId: string | undefined;
  let provider: string | undefined;

  if (method === 'online_payment') {
    const gatewayInit = await initiateGatewaySession({
      amount: amt,
      currency: cfg.currency,
      trackingRef: supportRef,
      description: `ECHOX Platform Support ${supportRef}`,
      customerName: payload.supporterName?.trim() || 'ECHOX Supporter',
      customerPhone: payload.supporterPhone?.trim() || '00000000',
      customerEmail: payload.supporterEmail,
      origin: payload.origin,
    });
    if (!gatewayInit.ok) {
      return { ok: false, statusCode: gatewayInit.statusCode || 502, error: gatewayInit.error };
    }
    paymentUrl = gatewayInit.paymentUrl;
    externalPaymentId = gatewayInit.externalPaymentId;
    provider = gatewayInit.provider;
  }

  const supTxn: SupportTransaction = {
    id: `sup_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    supportReference: supportRef,
    supporterName: payload.supporterName?.trim() || 'داعم ECHOX',
    supporterEmail: payload.supporterEmail?.trim() || '',
    supporterPhone: payload.supporterPhone?.trim() || '',
    note: payload.note?.trim() || '',
    amount: amt,
    currency: cfg.currency,
    method,
    provider,
    externalPaymentId,
    status: initialStatus,
    transferProof: proof,
    createdAt: now,
    updatedAt: now,
  };

  paymentDb.supportTransactions = [supTxn, ...paymentDb.supportTransactions];
  appendActivity(
    'SUPPORT_CONTRIBUTION_CREATED',
    'customer',
    `Independent Support ECHOX contribution (${supportRef}) created via ${method}. Isolated from orders/commissions.`,
    supTxn.id,
    amt
  );
  saveDatabase(paymentDb);

  return { ok: true, supportTransaction: supTxn, paymentUrl };
}

export function adminVerifySupportTransaction(id: string, action: 'approve' | 'reject'): {
  ok: boolean;
  statusCode?: number;
  error?: string;
  supportTransaction?: SupportTransaction;
} {
  const sup = paymentDb.supportTransactions.find(s => s.id === id || s.supportReference === id);
  if (!sup) {
    return { ok: false, statusCode: 404, error: 'معاملة الدعم غير موجودة.' };
  }
  if (sup.status === 'Refunded' || sup.status === 'Cancelled') {
    return { ok: false, statusCode: 400, error: 'لا يمكن تعديل معاملة دعم ملغاة أو مسترجعة.' };
  }
  const now = new Date().toISOString();
  sup.status = action === 'approve' ? 'Paid' : 'Payment Failed';
  sup.updatedAt = now;
  appendActivity(
    action === 'approve' ? 'SUPPORT_CONTRIBUTION_PAID' : 'SUPPORT_CONTRIBUTION_FAILED',
    'admin',
    `Admin ${action === 'approve' ? 'verified Paid' : 'rejected'} Support ECHOX transaction ${sup.supportReference}.`,
    sup.id,
    sup.amount
  );
  saveDatabase(paymentDb);
  return { ok: true, supportTransaction: sup };
}
