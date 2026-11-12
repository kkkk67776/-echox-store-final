import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
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

const PAYMENT_DATA_FILE = path.resolve(process.cwd(), 'payment_system_data.json');

interface ServerSecretsConfig {
  apiKey: string;
  walletId: string;
  webhookSecret: string;
}

interface InternalPaymentConfig extends PaymentSystemPublicConfig {
  secrets: ServerSecretsConfig;
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

function loadDatabase(): PaymentSystemDatabase {
  try {
    if (fs.existsSync(PAYMENT_DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PAYMENT_DATA_FILE, 'utf-8'));
      const def = createInitialDb();
      const merged: PaymentSystemDatabase = {
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
      return merged;
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
    fs.writeFileSync(PAYMENT_DATA_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('[PaymentEngine] Error persisting payment DB:', err);
  }
}

let paymentDb: PaymentSystemDatabase = loadDatabase();

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

export function normalizePaymentMethod(method: PaymentMethodType): 'cod' | 'bank_transfer' | 'online_payment' {
  if (method === 'bank_transfer') return 'bank_transfer';
  if (method === 'online_payment' || method === 'konnect' || method === 'flouci') return 'online_payment';
  return 'cod';
}

export function isOnlineGatewayReady(): boolean {
  const s = paymentDb.config.secrets;
  return Boolean(s.apiKey && s.apiKey.trim().length >= 8 && s.walletId && s.walletId.trim().length >= 4);
}

export function getPublicPaymentConfig(): PaymentSystemPublicConfig {
  const cfg = paymentDb.config;
  const ready = isOnlineGatewayReady();
  return {
    currency: cfg.currency,
    commissionRatePercent: cfg.commissionRatePercent,
    taxRatePercent: cfg.taxRatePercent,
    methods: {
      cod: { enabled: !!cfg.methods.cod.enabled },
      bank_transfer: {
        ...cfg.methods.bank_transfer,
      },
      online_payment: {
        enabled: !!cfg.methods.online_payment.enabled && ready,
        provider: cfg.methods.online_payment.provider || 'konnect',
        mode: cfg.methods.online_payment.mode || 'sandbox',
        hasApiKey: Boolean(cfg.secrets.apiKey && cfg.secrets.apiKey.trim().length > 0),
        hasWalletId: Boolean(cfg.secrets.walletId && cfg.secrets.walletId.trim().length > 0),
        hasWebhookSecret: Boolean(cfg.secrets.webhookSecret && cfg.secrets.webhookSecret.trim().length > 0),
        apiKeyMasked: maskSecret(cfg.secrets.apiKey),
        walletIdMasked: maskSecret(cfg.secrets.walletId),
        readyForLive: ready,
        lastConnectionCheck: cfg.methods.online_payment.lastConnectionCheck,
      },
    },
    updatedAt: cfg.updatedAt,
  };
}

export function syncCatalogSnapshot(products: Array<{ id: string; price: number; companyId?: string; companyName?: string; active?: boolean }>): void {
  if (!Array.isArray(products)) return;
  for (const p of products) {
    if (!p || !p.id || typeof p.price !== 'number' || p.price < 0) continue;
    paymentDb.catalog[p.id] = {
      id: p.id,
      price: round3(p.price),
      companyId: p.companyId || 'comp_echox',
      companyName: p.companyName || 'ECHOX Distribution Tunisie',
      active: p.active !== false,
    };
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
    cfg.methods.bank_transfer = {
      ...cfg.methods.bank_transfer,
      ...payload.bankTransfer,
      instructions: {
        ...cfg.methods.bank_transfer.instructions,
        ...(payload.bankTransfer.instructions || {}),
      },
    };
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
  if (!isOnlineGatewayReady()) {
    const msg = 'Gateway credentials missing: Configure real Provider API Key and Wallet ID on server first.';
    paymentDb.config.methods.online_payment.lastConnectionCheck = { checkedAt, ok: false, message: msg };
    saveDatabase(paymentDb);
    return { ok: false, message: msg, checkedAt };
  }

  const provider = paymentDb.config.methods.online_payment.provider;
  const mode = paymentDb.config.methods.online_payment.mode;

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
      });
      // A 404 or 401 distinguishes valid API key format vs rejected key
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

  const msg = `Custom gateway (${provider}) credentials saved; live handshake depends on external webhook endpoint validation.`;
  paymentDb.config.methods.online_payment.lastConnectionCheck = { checkedAt, ok: true, message: msg };
  saveDatabase(paymentDb);
  return { ok: true, message: msg, checkedAt };
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

  const normalizedMethod = normalizePaymentMethod(input.paymentMethod);
  const cfg = paymentDb.config;

  if (normalizedMethod === 'cod' && !cfg.methods.cod.enabled) {
    return { ok: false, statusCode: 400, error: 'وسيلة الدفع عند الاستلام معطلة حالياً من مركز التحكم.' };
  }
  if (normalizedMethod === 'bank_transfer' && !cfg.methods.bank_transfer.enabled) {
    return { ok: false, statusCode: 400, error: 'وسيلة التحويل البنكي معطلة حالياً من مركز التحكم.' };
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
      initialPaymentStatus = 'Payment Verification';
      submittedProof = {
        referenceNumber: input.transferProof.referenceNumber.trim(),
        senderName: (input.transferProof.senderName || input.customerName).trim(),
        transferDate: input.transferProof.transferDate || now.split('T')[0],
        receiptImageDataUrl: input.transferProof.receiptImageDataUrl,
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
    if (cfg.methods.online_payment.provider === 'konnect') {
      const endpoint =
        cfg.methods.online_payment.mode === 'live'
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
            token: cfg.currency,
            amount: cfg.currency === 'TND' ? Math.round(totalAmount * 1000) : Math.round(totalAmount * 100),
            type: 'immediate',
            description: `ECHOX Store Order ${trackingNumber}`,
            acceptedPaymentMethods: ['wallet', 'bank_card', 'e-DINAR'],
            orderId: trackingNumber,
            firstName: input.customerName.trim(),
            phoneNumber: input.customerPhone.trim(),
            email: input.customerEmail?.trim() || undefined,
            silentWebhook: true,
          }),
        });
        const initJson: any = await initRes.json().catch(() => ({}));
        if (!initRes.ok || !initJson?.payUrl) {
          appendActivity(
            'ONLINE_GATEWAY_INIT_FAILED',
            'system',
            `Konnect init failed for ${trackingNumber}: HTTP ${initRes.status} ${JSON.stringify(initJson)}`
          );
          saveDatabase(paymentDb);
          return {
            ok: false,
            statusCode: 502,
            error: initJson?.message || 'فشل إنشاء جلسة الدفع الإلكتروني مع المزود. يرجى التحقق من بيانات البوابة أو استخدام الدفع عند الاستلام / التحويل البنكي.',
          };
        }
        externalPaymentId = initJson.paymentRef;
        paymentUrl = initJson.payUrl;
      } catch (err: any) {
        appendActivity('ONLINE_GATEWAY_NETWORK_ERROR', 'system', `Konnect init network failure: ${err?.message}`);
        saveDatabase(paymentDb);
        return {
          ok: false,
          statusCode: 502,
          error: 'تعذر الاتصال ببوابة الدفع الإلكتروني حالياً. يرجى استخدام الدفع عند الاستلام أو التحويل البنكي.',
        };
      }
    } else {
      return {
        ok: false,
        statusCode: 400,
        error: 'مزود الدفع المختار غير مكتمل التفعيل على الخادم.',
      };
    }
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

  const now = new Date().toISOString();
  const proof: TransferProof = {
    referenceNumber: payload.referenceNumber.trim(),
    senderName: payload.senderName.trim(),
    transferDate: payload.transferDate || now.split('T')[0],
    receiptImageDataUrl: payload.receiptImageDataUrl,
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
    if (order.paymentStatus === 'Refunded') {
      return { ok: false, statusCode: 400, error: 'لا يمكن اعتماد معاملة مسترجعة مسبقاً.' };
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

export async function handlePaymentWebhook(payload: {
  provider: string;
  signatureHeader?: string;
  rawBody: any;
}): Promise<{ ok: boolean; statusCode: number; message: string; idempotentDuplicate?: boolean }> {
  const { provider, signatureHeader, rawBody } = payload;
  const secrets = paymentDb.config.secrets;

  // Enforce secret verification if webhookSecret is configured OR query official provider API
  if (secrets.webhookSecret && secrets.webhookSecret.trim().length > 0) {
    if (!signatureHeader) {
      appendActivity('WEBHOOK_UNAUTHORIZED', 'webhook', `Rejected ${provider} webhook missing signature header.`);
      saveDatabase(paymentDb);
      return { ok: false, statusCode: 401, message: 'Missing webhook signature header.' };
    }
    const serialized = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {});
    const expectedHmac = crypto
      .createHmac('sha256', secrets.webhookSecret)
      .update(serialized)
      .digest('hex');

    const sigBuf = Buffer.from(signatureHeader.trim());
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

  const eventId =
    rawBody?.eventId ||
    rawBody?.id ||
    `${provider}:${rawBody?.payment_ref || rawBody?.paymentRef || rawBody?.orderId || ''}:${rawBody?.status || ''}`;

  if (eventId && paymentDb.processedWebhookKeys.includes(eventId)) {
    return { ok: true, statusCode: 200, message: 'Duplicate webhook safely ignored (idempotent).', idempotentDuplicate: true };
  }

  const trackingOrRef = rawBody?.orderId || rawBody?.trackingNumber || rawBody?.payment_ref || rawBody?.paymentRef;
  if (!trackingOrRef) {
    return { ok: false, statusCode: 400, message: 'Missing payment or order identifier in webhook payload.' };
  }

  const txn = paymentDb.transactions.find(
    t => t.trackingNumber === trackingOrRef || t.externalPaymentId === trackingOrRef || t.paymentReference === trackingOrRef
  );
  if (!txn) {
    return { ok: false, statusCode: 404, message: 'Transaction not found.' };
  }

  // When Konnect provider is used and apiKey exists, perform authoritative server-side verification lookup
  let verifiedStatus: 'completed' | 'failed' = 'failed';
  if (provider === 'konnect' && secrets.apiKey && (txn.externalPaymentId || rawBody?.payment_ref)) {
    const payRef = txn.externalPaymentId || rawBody.payment_ref;
    const baseUrl =
      paymentDb.config.methods.online_payment.mode === 'live'
        ? `https://api.konnect.network/api/v2/payments/${encodeURIComponent(payRef)}`
        : `https://api.sandbox.konnect.network/api/v2/payments/${encodeURIComponent(payRef)}`;
    try {
      const checkRes = await fetch(baseUrl, {
        headers: { 'x-api-key': secrets.apiKey },
      });
      const checkJson: any = await checkRes.json().catch(() => ({}));
      const pStatus = checkJson?.payment?.status;
      if (checkRes.ok && (pStatus === 'completed' || pStatus === 'paid')) {
        verifiedStatus = 'completed';
      } else {
        verifiedStatus = 'failed';
      }
    } catch {
      return { ok: false, statusCode: 502, message: 'Failed to verify payment with Konnect server API.' };
    }
  } else if (secrets.webhookSecret) {
    const incomingStatus = String(rawBody?.status || '').toLowerCase();
    verifiedStatus = incomingStatus === 'completed' || incomingStatus === 'paid' || incomingStatus === 'succeeded'
      ? 'completed'
      : 'failed';
  }

  const now = new Date().toISOString();
  const nextStatus: PaymentStatus = verifiedStatus === 'completed' ? 'Paid' : 'Payment Failed';
  txn.status = nextStatus;
  txn.updatedAt = now;

  const order = paymentDb.orders.find(o => o.id === txn.orderId);
  if (order) {
    order.paymentStatus = nextStatus;
    order.updatedAt = now;
    if (order.subOrders) {
      order.subOrders.forEach(s => {
        s.payoutStatus = verifiedStatus === 'completed' ? 'eligible' : 'pending';
        s.updatedAt = now;
      });
    }
  }

  paymentDb.vendorLedgers.forEach(entry => {
    if (entry.orderId === txn.orderId) {
      entry.paymentStatus = nextStatus;
      entry.payoutStatus = verifiedStatus === 'completed' ? 'eligible' : 'pending';
      entry.updatedAt = now;
    }
  });

  if (eventId) {
    paymentDb.processedWebhookKeys = [eventId, ...paymentDb.processedWebhookKeys].slice(0, 500);
  }

  appendActivity(
    'WEBHOOK_PROCESSED',
    'webhook',
    `${provider} webhook updated ${txn.trackingNumber} to ${nextStatus}.`,
    txn.orderId,
    txn.amount
  );
  saveDatabase(paymentDb);
  return { ok: true, statusCode: 200, message: `Webhook processed: ${nextStatus}` };
}

// ==========================================
// INDEPENDENT SUPPORT ECHOX ENGINE
// ==========================================
export function createSupportContribution(payload: {
  amount: number;
  method: PaymentMethodType;
  supporterName?: string;
  supporterPhone?: string;
  supporterEmail?: string;
  note?: string;
  transferProof?: Partial<TransferProof>;
}): { ok: boolean; statusCode?: number; error?: string; supportTransaction?: SupportTransaction } {
  const amt = round3(Number(payload.amount));
  if (!Number.isFinite(amt) || amt <= 0) {
    return { ok: false, statusCode: 400, error: 'يرجى إدخال مبلغ دعم صالح أكبر من صفر.' };
  }

  const method = normalizePaymentMethod(payload.method);
  const cfg = paymentDb.config;
  if (method === 'cod' && !cfg.methods.cod.enabled) {
    return { ok: false, statusCode: 400, error: 'الدفع النقدي غير مفعّل حالياً.' };
  }
  if (method === 'bank_transfer' && !cfg.methods.bank_transfer.enabled) {
    return { ok: false, statusCode: 400, error: 'التحويل البنكي غير مفعّل حالياً.' };
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
      initialStatus = 'Payment Verification';
      proof = {
        referenceNumber: payload.transferProof.referenceNumber.trim(),
        senderName: (payload.transferProof.senderName || payload.supporterName || 'داعم ECHOX').trim(),
        transferDate: payload.transferProof.transferDate || now.split('T')[0],
        receiptImageDataUrl: payload.transferProof.receiptImageDataUrl,
        notes: payload.transferProof.notes?.trim(),
        submittedAt: now,
      };
    } else {
      initialStatus = 'Awaiting Bank Transfer';
    }
  } else if (method === 'online_payment') {
    initialStatus = 'Pending Payment';
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

  return { ok: true, supportTransaction: supTxn };
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
