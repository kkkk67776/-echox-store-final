import type {
  FinancialActivityLog,
  Order,
  OrderStatus,
  PaymentMethodType,
  PaymentStatus,
  PaymentSystemPublicConfig,
  PaymentTransaction,
  RefundRequest,
  SupportTransaction,
  TransferProof,
  VendorLedgerEntry,
  VendorSubOrder,
} from '../types';

export interface AdminPaymentOverviewResponse {
  config: PaymentSystemPublicConfig;
  orders: Order[];
  transactions: PaymentTransaction[];
  vendorLedgers: VendorLedgerEntry[];
  vendorSummaries: Array<{
    vendorId: string;
    vendorName: string;
    grossTotal: number;
    commissionTotal: number;
    netPending: number;
    netEligible: number;
    netSettled: number;
    entriesCount: number;
  }>;
  refundRequests: RefundRequest[];
  supportTransactions: SupportTransaction[];
  supportTotalPaid: number;
  activityLogs: FinancialActivityLog[];
}

export interface ScopedVendorFinancialsResponse {
  vendorId: string;
  currency: string;
  grossTotal: number;
  commissionTotal: number;
  netPending: number;
  netEligible: number;
  netSettled: number;
  subOrders: Array<
    VendorSubOrder & {
      orderPaymentStatus: PaymentStatus;
      orderTrackingStatus: OrderStatus;
      paymentMethod: PaymentMethodType;
    }
  >;
  ledgerEntries: VendorLedgerEntry[];
}

export const DEFAULT_PUBLIC_PAYMENT_CONFIG: PaymentSystemPublicConfig = {
  currency: 'TND',
  commissionRatePercent: 10,
  taxRatePercent: 0,
  standardShippingFee: 7,
  freeShippingThreshold: 150,
  methods: {
    cod: { enabled: true },
    bank_transfer: {
      enabled: true,
      accountHolder: 'ECHOX STORE TUNISIE SUARL',
      bankName: 'BIAT — Banque Internationale Arabe de Tunisie',
      ibanOrRib: 'TN59 0800 0000 1234 5678 9012',
      swiftCode: 'BIATTNTT',
      instructions: {
        ar: 'يرجى إجراء التحويل بالمبلغ الدقيق مع إدراج الرقم المرجعي للطلب في خانة البيان، ثم إرسال إثبات التحويل.',
        fr: 'Veuillez effectuer le virement du montant exact en mentionnant la référence dans le motif, puis soumettre le justificatif.',
        en: 'Transfer the exact amount with the order reference in the transfer note, then submit your transfer proof.',
      },
    },
    online_payment: {
      enabled: false,
      provider: 'konnect',
      mode: 'sandbox',
      hasApiKey: false,
      hasWalletId: false,
      hasWebhookSecret: false,
      readyForLive: false,
    },
  },
  updatedAt: new Date().toISOString(),
};

export function canOrderShipClient(order: Pick<Order, 'paymentMethod' | 'paymentStatus'>): boolean {
  if (order.paymentMethod === 'cod') return true;
  return order.paymentStatus === 'Paid' || order.paymentStatus === 'paid';
}

export function getPaymentStatusTone(status: PaymentStatus): string {
  switch (status) {
    case 'Paid':
    case 'paid':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    case 'Cash on Delivery':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30';
    case 'Awaiting Bank Transfer':
    case 'Pending Payment':
    case 'pending':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
    case 'Payment Verification':
      return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30';
    case 'Refunded':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30';
    case 'Cancelled':
      return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-400/30';
    case 'Payment Failed':
    case 'failed':
      return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

export async function fetchPublicPaymentConfig(): Promise<PaymentSystemPublicConfig> {
  const res = await fetch('/api/payments/config', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load payment config');
  return res.json();
}

export async function trackOrderServer(code: string): Promise<{ ok: boolean; order?: Order; error?: string }> {
  const res = await fetch(`/api/payments/track/${encodeURIComponent(code)}`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    return { ok: false, error: data.error || 'Order not found' };
  }
  return { ok: true, order: data.order };
}

export async function submitServerCheckout(payload: {
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  shippingAddress: Order['shippingAddress'];
  items: Array<{
    productId: string;
    productName: { ar: string; fr: string; en: string };
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
  clientRequestId?: string;
}): Promise<{ ok: boolean; order?: Order; transaction?: PaymentTransaction; paymentUrl?: string; error?: string }> {
  const res = await fetch('/api/payments/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    return { ok: false, error: data.error || 'Checkout validation failed' };
  }
  return { ok: true, order: data.order, transaction: data.transaction, paymentUrl: data.paymentUrl };
}

export async function verifyGatewayReturnClient(params: {
  tracking?: string;
  paymentRef?: string;
  provider?: string;
}): Promise<{
  ok: boolean;
  kind?: 'order' | 'support';
  paymentStatus?: PaymentStatus;
  order?: Order;
  supportTransaction?: SupportTransaction;
  error?: string;
}> {
  const qs = new URLSearchParams();
  if (params.tracking) qs.set('tracking', params.tracking);
  if (params.paymentRef) qs.set('payment_ref', params.paymentRef);
  if (params.provider) qs.set('provider', params.provider);
  const res = await fetch(`/api/payments/verify-return?${qs.toString()}`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    return { ok: false, error: data.error || 'Return verification failed' };
  }
  return {
    ok: true,
    kind: data.kind,
    paymentStatus: data.paymentStatus,
    order: data.order,
    supportTransaction: data.supportTransaction,
  };
}

export async function submitBankTransferProofClient(payload: {
  trackingNumber: string;
  customerPhone?: string;
  referenceNumber: string;
  senderName: string;
  transferDate?: string;
  receiptImageDataUrl?: string;
  notes?: string;
}): Promise<{ ok: boolean; order?: Order; error?: string }> {
  const res = await fetch('/api/payments/bank-transfer/proof', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    return { ok: false, error: data.error || 'Failed submitting transfer proof' };
  }
  return { ok: true, order: data.order };
}

export async function submitRefundOrCancelRequest(payload: {
  trackingNumber: string;
  customerPhone?: string;
  reason: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/payments/request-refund', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    return { ok: false, error: data.error || 'Request failed' };
  }
  return { ok: true };
}

export async function contributeToEchox(payload: {
  amount: number;
  method: PaymentMethodType;
  supporterName?: string;
  supporterPhone?: string;
  supporterEmail?: string;
  note?: string;
  transferProof?: Partial<TransferProof>;
}): Promise<{ ok: boolean; supportTransaction?: SupportTransaction; paymentUrl?: string; error?: string }> {
  const res = await fetch('/api/support/contribute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    return { ok: false, error: data.error || 'Support contribution failed' };
  }
  return { ok: true, supportTransaction: data.supportTransaction, paymentUrl: data.paymentUrl };
}

export async function fetchScopedVendorFinancials(vendorId: string): Promise<ScopedVendorFinancialsResponse> {
  const res = await fetch(`/api/vendor/${encodeURIComponent(vendorId)}/financials`);
  if (!res.ok) throw new Error('Failed loading vendor ledger');
  return res.json();
}

// ==========================================
// ADMIN PAYMENT MANAGEMENT API WRAPPERS
// ==========================================

export async function fetchAdminPaymentOverview(): Promise<AdminPaymentOverviewResponse> {
  const res = await fetch('/api/admin/payments/overview', { credentials: 'include', cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Unauthorized');
  return data;
}

export async function fetchAdminOrders(): Promise<Order[]> {
  const res = await fetch('/api/admin/orders', { credentials: 'include', cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Unauthorized');
  return Array.isArray(data.orders) ? data.orders : [];
}

export async function createAdminManualOrderServer(payload: Partial<Order>): Promise<{ ok: boolean; order?: Order; error?: string }> {
  const res = await fetch('/api/admin/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    return { ok: false, error: data.error || 'Failed to save manual order' };
  }
  return { ok: true, order: data.order };
}

export async function deleteAdminOrderServer(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    return { ok: false, error: data.error || 'Failed to delete order' };
  }
  return { ok: true };
}

export async function saveAdminPaymentConfig(payload: any): Promise<{ ok: boolean; config?: PaymentSystemPublicConfig; error?: string }> {
  const res = await fetch('/api/admin/payments/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    return { ok: false, error: data.error || 'Failed to save payment config' };
  }
  return { ok: true, config: data.config };
}

export async function testAdminOnlineGateway(): Promise<{ ok: boolean; message: string; checkedAt: string }> {
  const res = await fetch('/api/admin/payments/test-gateway', {
    method: 'POST',
    credentials: 'include',
  });
  return res.json();
}

export async function verifyAdminPaymentAction(payload: {
  orderId?: string;
  transactionId?: string;
  action: 'approve' | 'reject';
  reason?: string;
}): Promise<{ ok: boolean; order?: Order; transaction?: PaymentTransaction; error?: string }> {
  const res = await fetch('/api/admin/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    return { ok: false, error: data.error || 'Verification failed' };
  }
  return { ok: true, order: data.order, transaction: data.transaction };
}

export async function processAdminRefundOrCancel(payload: {
  orderId: string;
  action: 'refund' | 'cancel' | 'reject_refund';
  reason?: string;
}): Promise<{ ok: boolean; order?: Order; error?: string }> {
  const res = await fetch('/api/admin/payments/refund', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    return { ok: false, error: data.error || 'Refund/cancellation failed' };
  }
  return { ok: true, order: data.order };
}

export async function settleAdminVendorPayout(vendorId: string, settlementNote?: string): Promise<{
  ok: boolean;
  settledCount?: number;
  settledTotal?: number;
  error?: string;
}> {
  const res = await fetch('/api/admin/payments/vendor-payout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ vendorId, settlementNote }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    return { ok: false, error: data.error || 'Payout settlement failed' };
  }
  return { ok: true, settledCount: data.settledCount, settledTotal: data.settledTotal };
}

export async function verifyAdminSupportTransaction(id: string, action: 'approve' | 'reject'): Promise<{
  ok: boolean;
  supportTransaction?: SupportTransaction;
  error?: string;
}> {
  const res = await fetch('/api/admin/support/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ id, action }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    return { ok: false, error: data.error || 'Support verification failed' };
  }
  return { ok: true, supportTransaction: data.supportTransaction };
}

export async function syncAdminCatalogToPaymentEngine(
  products: Array<{ id: string; price: number; companyId?: string; companyName?: string; active?: boolean }>
): Promise<void> {
  try {
    await fetch('/api/admin/payments/catalog-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ products }),
    });
  } catch {
    // Silent sync attempt only when admin session active
  }
}
