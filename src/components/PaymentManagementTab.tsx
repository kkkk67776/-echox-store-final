import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Building2,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Eye,
  X,
  RotateCcw,
  Users,
  HeartHandshake,
  History,
  Lock,
  Check,
  XCircle,
  Loader2,
  FileImage,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  AdminPaymentOverviewResponse,
  fetchAdminPaymentOverview,
  getPaymentStatusTone,
  processAdminRefundOrCancel,
  saveAdminPaymentConfig,
  settleAdminVendorPayout,
  syncAdminCatalogToPaymentEngine,
  testAdminOnlineGateway,
  verifyAdminPaymentAction,
  verifyAdminSupportTransaction,
} from '../lib/payments';
import { Order, PaymentStatus } from '../types';

type SubTab = 'settings' | 'transactions' | 'vendors' | 'support' | 'logs';

export const PaymentManagementTab: React.FC = () => {
  const {
    products,
    siteSettings,
    updateSiteSettings,
    paymentConfig,
    refreshPaymentConfig,
    updateOrderInState,
    language,
    t,
  } = useStore();

  const [subTab, setSubTab] = useState<SubTab>('settings');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AdminPaymentOverviewResponse | null>(null);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Settings form state
  const [currency, setCurrency] = useState<'TND' | 'EUR' | 'USD'>(paymentConfig.currency || 'TND');
  const [commissionRate, setCommissionRate] = useState<string>(
    String(paymentConfig.commissionRatePercent ?? 10)
  );
  const [taxRate, setTaxRate] = useState<string>(String(paymentConfig.taxRatePercent ?? 0));
  const [shippingFee, setShippingFee] = useState<string>(String(siteSettings.standardShippingFee ?? 8));
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<string>(
    String(siteSettings.freeShippingThreshold ?? 200)
  );

  const [codEnabled, setCodEnabled] = useState<boolean>(paymentConfig.methods.cod.enabled);
  const [bankEnabled, setBankEnabled] = useState<boolean>(
    paymentConfig.methods.bank_transfer.enabled
  );
  const [bankHolder, setBankHolder] = useState<string>(
    paymentConfig.methods.bank_transfer.accountHolder || ''
  );
  const [bankName, setBankName] = useState<string>(
    paymentConfig.methods.bank_transfer.bankName || ''
  );
  const [bankIban, setBankIban] = useState<string>(
    paymentConfig.methods.bank_transfer.ibanOrRib || ''
  );
  const [bankSwift, setBankSwift] = useState<string>(
    paymentConfig.methods.bank_transfer.swiftCode || ''
  );
  const [bankInstAr, setBankInstAr] = useState<string>(
    paymentConfig.methods.bank_transfer.instructions?.ar || ''
  );
  const [bankInstFr, setBankInstFr] = useState<string>(
    paymentConfig.methods.bank_transfer.instructions?.fr || ''
  );
  const [bankInstEn, setBankInstEn] = useState<string>(
    paymentConfig.methods.bank_transfer.instructions?.en || ''
  );

  const [onlineEnabled, setOnlineEnabled] = useState<boolean>(
    paymentConfig.methods.online_payment.enabled
  );
  const [onlineProvider, setOnlineProvider] = useState<'konnect' | 'flouci' | 'stripe_custom'>(
    paymentConfig.methods.online_payment.provider || 'konnect'
  );
  const [onlineMode, setOnlineMode] = useState<'sandbox' | 'live'>(
    paymentConfig.methods.online_payment.mode || 'sandbox'
  );
  // Write-only credentials: never pre-populated from server
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [walletIdInput, setWalletIdInput] = useState('');
  const [webhookSecretInput, setWebhookSecretInput] = useState('');
  const [bankConfirmPin, setBankConfirmPin] = useState('');

  const [savingConfig, setSavingConfig] = useState(false);
  const [testingGateway, setTestingGateway] = useState(false);
  const [gatewayTestResult, setGatewayTestResult] = useState<{
    ok: boolean;
    message: string;
    checkedAt: string;
  } | null>(null);

  // Transactions filter & modals
  const [txFilter, setTxFilter] = useState<string>('all');
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [previewProofImage, setPreviewProofImage] = useState<string | null>(null);
  const [rejectReasonPrompt, setRejectReasonPrompt] = useState<{
    orderId: string;
    txId?: string;
    mode: 'verify_reject' | 'refund' | 'cancel';
  } | null>(null);
  const [reasonText, setReasonText] = useState('');

  const showBanner = (type: 'ok' | 'err', text: string) => {
    setBannerMsg({ type, text });
    setTimeout(() => setBannerMsg(null), 6000);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await syncAdminCatalogToPaymentEngine(
        products.map((p) => ({
          id: p.id,
          price: p.price,
          companyId: p.companyId,
          companyName: p.companyName,
          active: p.active,
        }))
      );
      const data = await fetchAdminPaymentOverview();
      setOverview(data);

      const cfg = data.config;
      setCurrency(cfg.currency);
      setCommissionRate(String(cfg.commissionRatePercent));
      setTaxRate(String(cfg.taxRatePercent));
      setCodEnabled(cfg.methods.cod.enabled);
      setBankEnabled(cfg.methods.bank_transfer.enabled);
      setBankHolder(cfg.methods.bank_transfer.accountHolder);
      setBankName(cfg.methods.bank_transfer.bankName);
      setBankIban(cfg.methods.bank_transfer.ibanOrRib);
      setBankSwift(cfg.methods.bank_transfer.swiftCode || '');
      setBankInstAr(cfg.methods.bank_transfer.instructions?.ar || '');
      setBankInstFr(cfg.methods.bank_transfer.instructions?.fr || '');
      setBankInstEn(cfg.methods.bank_transfer.instructions?.en || '');
      setOnlineEnabled(cfg.methods.online_payment.enabled);
      setOnlineProvider(cfg.methods.online_payment.provider);
      setOnlineMode(cfg.methods.online_payment.mode);
    } catch (err: any) {
      showBanner('err', err?.message || 'تعذر تحميل بيانات المدفوعات من الخادم.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    const parsedComm = parseFloat(commissionRate);
    const parsedTax = parseFloat(taxRate);
    const parsedShipFee = parseFloat(shippingFee);
    const parsedFreeThresh = parseFloat(freeShippingThreshold);

    const payload: any = {
      currency,
      commissionRatePercent: Number.isFinite(parsedComm) ? parsedComm : 10,
      taxRatePercent: Number.isFinite(parsedTax) ? parsedTax : 0,
      standardShippingFee: Number.isFinite(parsedShipFee) ? parsedShipFee : 8,
      freeShippingThreshold: Number.isFinite(parsedFreeThresh) ? parsedFreeThresh : 200,
      codEnabled,
      bankTransfer: {
        enabled: bankEnabled,
        accountHolder: bankHolder.trim(),
        bankName: bankName.trim(),
        ibanOrRib: bankIban.trim(),
        swiftCode: bankSwift.trim(),
        instructions: {
          ar: bankInstAr.trim(),
          fr: bankInstFr.trim(),
          en: bankInstEn.trim(),
        },
      },
      onlinePayment: {
        enabled: onlineEnabled,
        provider: onlineProvider,
        mode: onlineMode,
      },
    };

    if (apiKeyInput.trim()) payload.onlinePayment.apiKey = apiKeyInput.trim();
    if (walletIdInput.trim()) payload.onlinePayment.walletId = walletIdInput.trim();
    if (webhookSecretInput.trim()) payload.onlinePayment.webhookSecret = webhookSecretInput.trim();

    const bankMeta = overview?.config?.methods?.bank_transfer || paymentConfig.methods.bank_transfer;
    const bankChanged =
      bankHolder.trim() !== (bankMeta.accountHolder || '').trim() ||
      bankName.trim() !== (bankMeta.bankName || '').trim() ||
      bankIban.trim() !== (bankMeta.ibanOrRib || '').trim() ||
      bankSwift.trim() !== (bankMeta.swiftCode || '').trim() ||
      Boolean(bankMeta.tamperDetected && bankEnabled);

    if (bankChanged) {
      if (bankMeta.lockedByEnv) {
        setSavingConfig(false);
        showBanner('err', 'الحساب البنكي مقفول عبر متغير البيئة LOCKED_BANK_IBAN ولا يمكن تغييره من لوحة التحكم.');
        return;
      }
      if (!bankConfirmPin.trim()) {
        setSavingConfig(false);
        showBanner('err', 'لحماية حسابك البنكي من الاختراق، يرجى إدخال رمز الـ PIN الأمني لتأكيد التعديل.');
        return;
      }
      payload.confirmPin = bankConfirmPin.trim();
    }

    const res = await saveAdminPaymentConfig(payload);
    setSavingConfig(false);

    if (!res.ok) {
      showBanner('err', res.error || 'تعذر حفظ إعدادات الدفع.');
      return;
    }

    // Clear write-only secret inputs after save
    setApiKeyInput('');
    setWalletIdInput('');
    setWebhookSecretInput('');
    setBankConfirmPin('');

    // Keep SiteSettings shipping & bank flag aligned
    updateSiteSettings({
      standardShippingFee: Number.isFinite(parsedShipFee) ? parsedShipFee : siteSettings.standardShippingFee,
      freeShippingThreshold: Number.isFinite(parsedFreeThresh)
        ? parsedFreeThresh
        : siteSettings.freeShippingThreshold,
      enableCOD: codEnabled,
      enableBankTransfer: bankEnabled,
    });

    await refreshPaymentConfig();
    await loadAll();
    showBanner(
      'ok',
      language === 'ar'
        ? 'تم حفظ إعدادات الدفع والمالية وتشفير المفاتيح خادمياً بنجاح ✓'
        : language === 'fr'
        ? 'Paramètres de paiement enregistrés sur le serveur ✓'
        : 'Payment configuration saved securely on server ✓'
    );
  };

  const handleTestGateway = async () => {
    setTestingGateway(true);
    setGatewayTestResult(null);
    const res = await testAdminOnlineGateway();
    setTestingGateway(false);
    setGatewayTestResult(res);
  };

  const handleVerifyPayment = async (
    orderId: string | undefined,
    txId: string | undefined,
    action: 'approve' | 'reject',
    reason?: string
  ) => {
    const key = orderId || txId || '';
    setActionBusyId(key);
    const res = await verifyAdminPaymentAction({
      orderId,
      transactionId: txId,
      action,
      reason,
    });
    setActionBusyId(null);

    if (!res.ok) {
      showBanner('err', res.error || 'تعذر تنفيذ إجراء التحقق.');
      return;
    }
    if (res.order) {
      updateOrderInState(res.order);
    }
    await loadAll();
    showBanner(
      'ok',
      action === 'approve'
        ? 'تم تأكيد الدفع وتحديث مستحقات البائعين ✓'
        : 'تم رفض إثبات التحويل وإبلاغ الطلب.'
    );
  };

  const handleProcessRefund = async (
    orderId: string,
    action: 'refund' | 'cancel' | 'reject_refund',
    reason?: string
  ) => {
    setActionBusyId(orderId);
    const res = await processAdminRefundOrCancel({ orderId, action, reason });
    setActionBusyId(null);

    if (!res.ok) {
      showBanner('err', res.error || 'تعذر تنفيذ الاسترجاع / الإلغاء.');
      return;
    }
    if (res.order) {
      updateOrderInState(res.order);
    }
    await loadAll();
    showBanner('ok', 'تم تحديث حالة الطلب والاسترجاع المالي بنجاح ✓');
  };

  const handleSettleVendor = async (vendorId: string, vendorName: string) => {
    setActionBusyId(vendorId);
    const res = await settleAdminVendorPayout(
      vendorId,
      `Manual bank/cash payout recorded by Admin Panel for ${vendorName}`
    );
    setActionBusyId(null);
    if (!res.ok) {
      showBanner('err', res.error || 'تعذر تسجيل تسوية البائع.');
      return;
    }
    await loadAll();
    showBanner(
      'ok',
      `تم تسجيل تسوية مستحقات (${vendorName}) بمبلغ ${(res.settledTotal || 0).toFixed(3)} ${
        overview?.config.currency || 'TND'
      } ✓`
    );
  };

  const handleVerifySupport = async (id: string, action: 'approve' | 'reject') => {
    setActionBusyId(id);
    const res = await verifyAdminSupportTransaction(id, action);
    setActionBusyId(null);
    if (!res.ok) {
      showBanner('err', res.error || 'تعذر تحديث مساهمة الدعم.');
      return;
    }
    await loadAll();
    showBanner('ok', 'تم تحديث حالة مساهمة الدعم بنجاح ✓');
  };

  const currentCfg = overview?.config || paymentConfig;
  const serverOrders: Order[] = overview?.orders || [];
  const transactions = overview?.transactions || [];
  const pendingRefundRequests = (overview?.refundRequests || []).filter(
    (r) => r.status === 'requested'
  );

  // Merge orders with transactions for complete lookup
  const filteredTransactions = transactions.filter((tx) =>
    txFilter === 'all' ? true : tx.status === txFilter
  );

  const totalGrossRevenue = transactions
    .filter((tx) => tx.status === 'Paid')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const awaitingVerificationCount = transactions.filter(
    (tx) => tx.status === 'Payment Verification' || tx.status === 'Awaiting Bank Transfer'
  ).length;
  const totalVendorEligible = (overview?.vendorSummaries || []).reduce(
    (sum, v) => sum + v.netEligible,
    0
  );

  return (
    <div className="space-y-4">
      {/* Banner notification */}
      {bannerMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn ${
            bannerMsg.type === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerMsg.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{bannerMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMsg(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Financial Snapshot KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
            {language === 'ar' ? 'المدفوعات المؤكدة (Paid)' : 'Confirmed Paid'}
          </span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1 block">
            {totalGrossRevenue.toFixed(3)} {currentCfg.currency}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
            {language === 'ar' ? 'بانتظار التحقق / التحويل' : 'Awaiting Verification'}
          </span>
          <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-1 block">
            {awaitingVerificationCount}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
            {language === 'ar' ? 'مستحقات البائعين المؤهلة' : 'Vendor Eligible Payouts'}
          </span>
          <span className="text-lg font-black text-[#FF6B00] font-mono tabular-nums mt-1 block">
            {totalVendorEligible.toFixed(3)} {currentCfg.currency}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
            {language === 'ar' ? 'دعم ECHOX المستقل (Paid)' : 'Support ECHOX (Paid)'}
          </span>
          <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono tabular-nums mt-1 block">
            {(overview?.supportTotalPaid || 0).toFixed(3)} {currentCfg.currency}
          </span>
        </div>
      </div>

      {/* Sub-Tabs Hairline Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0] dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            {
              id: 'settings' as SubTab,
              label: language === 'ar' ? 'وسائل الدفع والبوابات' : 'Methods & Gateways',
              icon: CreditCard,
            },
            {
              id: 'transactions' as SubTab,
              label:
                (language === 'ar' ? 'المعاملات وإثباتات التحويل' : 'Transactions & Proofs') +
                ` (${transactions.length})`,
              icon: Banknote,
            },
            {
              id: 'vendors' as SubTab,
              label:
                (language === 'ar' ? 'حسابات البائعين' : 'Vendor Ledgers') +
                ` (${overview?.vendorSummaries?.length || 0})`,
              icon: Users,
            },
            {
              id: 'support' as SubTab,
              label:
                (language === 'ar' ? 'سجل ادعم ECHOX' : 'Support ECHOX') +
                ` (${overview?.supportTransactions?.length || 0})`,
              icon: HeartHandshake,
            },
            {
              id: 'logs' as SubTab,
              label: language === 'ar' ? 'سجل التدقيق المالي' : 'Financial Logs',
              icon: History,
            },
          ].map((item) => {
            const Icon = item.icon;
            const active = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSubTab(item.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                  active
                    ? 'bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A]'
                    : 'bg-[#F8FAFC] dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700 hover:border-[#FF6B00]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={loadAll}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 hover:border-[#FF6B00] cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
        </button>
      </div>

      {/* SUB-TAB 1: PAYMENT METHODS & SETTINGS */}
      {subTab === 'settings' && (
        <form onSubmit={handleSaveConfig} className="space-y-4">
          {/* General Financial Rules */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-black flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
              <span>
                {language === 'ar'
                  ? 'العملة، الضرائب، العمولات، وإعدادات الشحن'
                  : 'Currency, Tax, Platform Commission & Shipping Rules'}
              </span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] font-bold block mb-1">
                  {language === 'ar' ? 'العملة' : 'Currency'}
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'TND' | 'EUR' | 'USD')}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] font-bold"
                >
                  <option value="TND">TND (د.ت)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1">
                  {language === 'ar' ? 'عمولة المنصة (%)' : 'Commission %'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] font-mono font-bold"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1">
                  {language === 'ar' ? 'الضريبة / TVA (%)' : 'Tax Rate %'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="40"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] font-mono font-bold"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1">
                  {language === 'ar' ? 'معلوم الشحن القياسي' : 'Shipping Fee'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] font-mono font-bold"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1">
                  {language === 'ar' ? 'عتبة الشحن المجاني' : 'Free Ship Min'}
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={freeShippingThreshold}
                  onChange={(e) => setFreeShippingThreshold(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] font-mono font-bold"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* 1. Cash on Delivery Card */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black">{t.payments.codLabel}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t.payments.codDesc}
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
              <input
                type="checkbox"
                checked={codEnabled}
                onChange={(e) => setCodEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#FF6B00] cursor-pointer"
              />
              <span>{codEnabled ? 'مفعّل' : 'معطّل'}</span>
            </label>
          </div>

          {/* 2. Bank Transfer Configuration */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-black">{t.payments.bankTransferLabel}</h4>
                    {currentCfg.methods.bank_transfer.lockedByEnv ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>مقفول عبر الخادم (LOCKED_BANK_IBAN)</span>
                      </span>
                    ) : currentCfg.methods.bank_transfer.tamperDetected ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>تنبيه تلاعب: تم تعليق التحويلات تلقائياً</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>محمي بختم HMAC + تأكيد PIN</span>
                      </span>
                    )}
                    {currentCfg.methods.bank_transfer.ibanFingerprint && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        بصمة الحساب: {currentCfg.methods.bank_transfer.ibanFingerprint}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t.payments.bankTransferDesc}
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={bankEnabled}
                  onChange={(e) => setBankEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#FF6B00] cursor-pointer"
                />
                <span>{bankEnabled ? 'مفعّل' : 'معطّل'}</span>
              </label>
            </div>

            {currentCfg.methods.bank_transfer.tamperDetected && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-[11px] font-bold text-red-700 dark:text-red-300">
                اكتشف النظام تعديلاً غير مصرح به على بيانات الحساب البنكي خارج مركز التحكم، ولحماية أموالك تم إيقاف عرض الحساب تلقائياً. أعد إدخال حسابك الصحيح مع رمز الـ PIN الأمني ثم احفظ التغييرات لاستعادة التفعيل.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div>
                <label className="text-[11px] font-bold block mb-1">{t.payments.beneficiary}</label>
                <input
                  type="text"
                  value={bankHolder}
                  disabled={Boolean(currentCfg.methods.bank_transfer.lockedByEnv)}
                  onChange={(e) => setBankHolder(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1">{t.payments.bankName}</label>
                <input
                  type="text"
                  value={bankName}
                  disabled={Boolean(currentCfg.methods.bank_transfer.lockedByEnv)}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1">{t.payments.accountOrIban}</label>
                <input
                  type="text"
                  value={bankIban}
                  disabled={Boolean(currentCfg.methods.bank_transfer.lockedByEnv)}
                  onChange={(e) => setBankIban(e.target.value)}
                  dir="ltr"
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] font-mono disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1">{t.payments.swiftCode}</label>
                <input
                  type="text"
                  value={bankSwift}
                  disabled={Boolean(currentCfg.methods.bank_transfer.lockedByEnv)}
                  onChange={(e) => setBankSwift(e.target.value)}
                  dir="ltr"
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] font-mono disabled:opacity-60"
                />
              </div>
            </div>

            {!currentCfg.methods.bank_transfer.lockedByEnv && (
              bankHolder.trim() !== (currentCfg.methods.bank_transfer.accountHolder || '').trim() ||
              bankName.trim() !== (currentCfg.methods.bank_transfer.bankName || '').trim() ||
              bankIban.trim() !== (currentCfg.methods.bank_transfer.ibanOrRib || '').trim() ||
              bankSwift.trim() !== (currentCfg.methods.bank_transfer.swiftCode || '').trim() ||
              currentCfg.methods.bank_transfer.tamperDetected
            ) && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>تحقق أمني إضافي: أدخل رمز الـ PIN الخاص بمركز التحكم لتأكيد تغيير الحساب البنكي</span>
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={12}
                  value={bankConfirmPin}
                  onChange={(e) => setBankConfirmPin(e.target.value)}
                  placeholder="أدخل رمز PIN للتأكيد"
                  dir="ltr"
                  className="sm:w-48 text-xs py-2 px-3 rounded-xl border border-amber-400 dark:border-amber-600 bg-white dark:bg-[#0F172A] font-mono font-bold text-center"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold block mb-1">تعليمات التحويل (عربي)</label>
                <textarea
                  rows={2}
                  value={bankInstAr}
                  onChange={(e) => setBankInstAr(e.target.value)}
                  className="w-full text-[11px] py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold block mb-1">Instructions (FR)</label>
                <textarea
                  rows={2}
                  value={bankInstFr}
                  onChange={(e) => setBankInstFr(e.target.value)}
                  dir="ltr"
                  className="w-full text-[11px] py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold block mb-1">Instructions (EN)</label>
                <textarea
                  rows={2}
                  value={bankInstEn}
                  onChange={(e) => setBankInstEn(e.target.value)}
                  dir="ltr"
                  className="w-full text-[11px] py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A]"
                />
              </div>
            </div>
          </div>

          {/* 3. Online Payment Gateway (Strictly Gated on Server Secrets) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-black">{t.payments.onlinePaymentLabel}</h4>
                    {currentCfg.methods.online_payment.readyForLive ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        مفاتيح البوابة جاهزة
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>بانتظار بيانات البوابة الحقيقية</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t.payments.onlinePaymentDesc}
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold shrink-0">
                <input
                  type="checkbox"
                  checked={onlineEnabled}
                  onChange={(e) => setOnlineEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#FF6B00] cursor-pointer"
                />
                <span>{onlineEnabled ? 'مفعّل' : 'معطّل افتراضياً'}</span>
              </label>
            </div>

            {!currentCfg.methods.online_payment.readyForLive && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  يبقى الدفع الإلكتروني <strong>معطلاً افتراضياً</strong> ولا يقبل أي معاملات حتى يتم إدخال مفتاح API ومعرّف المحفظة الحقيقيين وحفظهما على الخادم. يتم قبول التحقق النهائي فقط عبر Webhook موقّع.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div>
                <label className="text-[11px] font-bold block mb-1">مزوّد البوابة (Gateway Provider)</label>
                <select
                  value={onlineProvider}
                  onChange={(e) => setOnlineProvider(e.target.value as any)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] font-bold"
                >
                  <option value="konnect">Konnect Tunisia (متوافق مع API الرسمي)</option>
                  <option value="flouci">Flouci Tunisia</option>
                  <option value="stripe_custom">Custom / Stripe Bridge</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1">بيئة التشغيل (Mode)</label>
                <select
                  value={onlineMode}
                  onChange={(e) => setOnlineMode(e.target.value as any)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] font-bold"
                >
                  <option value="sandbox">Sandbox (بيئة الاختبار)</option>
                  <option value="live">Live (الإنتاج الفعلي)</option>
                </select>
              </div>
            </div>

            {/* Write-Only Server Secrets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold flex items-center justify-between mb-1">
                  <span>API Key (للكتابة فقط)</span>
                  {currentCfg.methods.online_payment.hasApiKey && (
                    <span className="text-[10px] text-emerald-600 font-mono">
                      ✓ {currentCfg.methods.online_payment.apiKeyMasked}
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={
                    currentCfg.methods.online_payment.hasApiKey
                      ? '•••••••• (اتركه فارغاً للإبقاء على الحالي)'
                      : 'أدخل API Key الحقيقي...'
                  }
                  dir="ltr"
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold flex items-center justify-between mb-1">
                  <span>Wallet / Receiver ID</span>
                  {currentCfg.methods.online_payment.hasWalletId && (
                    <span className="text-[10px] text-emerald-600 font-mono">
                      ✓ {currentCfg.methods.online_payment.walletIdMasked}
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  value={walletIdInput}
                  onChange={(e) => setWalletIdInput(e.target.value)}
                  placeholder={
                    currentCfg.methods.online_payment.hasWalletId
                      ? '•••••••• (اتركه فارغاً للإبقاء على الحالي)'
                      : 'أدخل Receiver Wallet ID...'
                  }
                  dir="ltr"
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold flex items-center justify-between mb-1">
                  <span>Webhook Secret (HMAC)</span>
                  {currentCfg.methods.online_payment.hasWebhookSecret && (
                    <span className="text-[10px] text-emerald-600 font-mono">✓ مهيأ</span>
                  )}
                </label>
                <input
                  type="password"
                  value={webhookSecretInput}
                  onChange={(e) => setWebhookSecretInput(e.target.value)}
                  placeholder="مفتاح التحقق HMAC للـ Webhook..."
                  dir="ltr"
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={handleTestGateway}
                disabled={testingGateway}
                className="px-4 py-2 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-600 hover:border-[#FF6B00] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {testingGateway ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-[#FF6B00]" />
                )}
                <span>اختبار اتصال البوابة الخادمي</span>
              </button>

              {gatewayTestResult && (
                <span
                  className={`text-[11px] font-bold px-3 py-1 rounded-xl border ${
                    gatewayTestResult.ok
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
                  }`}
                >
                  {gatewayTestResult.message}
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingConfig}
              className="px-6 py-3 rounded-2xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ جميع إعدادات الدفع والمالية</span>
            </button>
          </div>
        </form>
      )}

      {/* SUB-TAB 2: TRANSACTIONS & BANK TRANSFER PROOFS */}
      {subTab === 'transactions' && (
        <div className="space-y-4">
          {/* Pending Customer Refund Requests */}
          {pendingRefundRequests.length > 0 && (
            <div className="p-4 rounded-3xl bg-purple-500/5 border border-purple-500/20 space-y-3">
              <h4 className="text-xs font-black text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" />
                <span>طلبات إلغاء واسترجاع معلقة من الحرفاء ({pendingRefundRequests.length})</span>
              </h4>
              <div className="space-y-2">
                {pendingRefundRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-2xl bg-white dark:bg-[#0F172A] border border-purple-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#FF6B00]">{req.trackingNumber}</span>
                      <span className="mx-2 text-slate-400">•</span>
                      <span className="font-bold tabular-nums">
                        {req.amount.toFixed(3)} {currentCfg.currency}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">{req.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={actionBusyId === req.orderId}
                        onClick={() => handleProcessRefund(req.orderId, 'refund', req.reason)}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold cursor-pointer"
                      >
                        موافقة واسترجاع
                      </button>
                      <button
                        type="button"
                        disabled={actionBusyId === req.orderId}
                        onClick={() => handleProcessRefund(req.orderId, 'reject_refund')}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold cursor-pointer"
                      >
                        رفض الطلب
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {(
              [
                'all',
                'Payment Verification',
                'Awaiting Bank Transfer',
                'Cash on Delivery',
                'Paid',
                'Pending Payment',
                'Payment Failed',
                'Refunded',
                'Cancelled',
              ] as const
            ).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setTxFilter(st)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                  txFilter === st
                    ? 'bg-[#FF6B00] text-white'
                    : 'bg-[#F8FAFC] dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700'
                }`}
              >
                {st === 'all'
                  ? 'كل المعاملات'
                  : (t.payments.statuses as Record<string, string>)[st as PaymentStatus] || st}
              </button>
            ))}
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs text-slate-500">
              لا توجد معاملات مالية ضمن هذا التصنيف بعد.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => {
                const linkedOrder = serverOrders.find((o) => o.id === tx.orderId);
                const proof = tx.transferProof || linkedOrder?.transferProof;
                return (
                  <div
                    key={tx.id}
                    className="p-4 rounded-3xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-black text-xs bg-white dark:bg-[#0F172A] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                          {tx.trackingNumber}
                        </span>
                        <span className="font-mono text-[11px] text-[#FF6B00] font-bold">
                          {tx.paymentReference}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getPaymentStatusTone(
                            tx.status
                          )}`}
                        >
                          {(t.payments.statuses as Record<string, string>)[tx.status] || tx.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black tabular-nums text-[#0F172A] dark:text-white">
                          {tx.amount.toFixed(3)} {tx.currency}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(tx.updatedAt).toLocaleString('ar-TN')}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs flex flex-wrap items-center justify-between gap-2 text-slate-600 dark:text-slate-300">
                      <div>
                        <span>الحريف: </span>
                        <strong className="text-[#0F172A] dark:text-white">
                          {linkedOrder?.customerName || '—'}
                        </strong>
                        <span className="mx-2">•</span>
                        <span>الوسيلة: </span>
                        <strong>{tx.method}</strong>
                        {linkedOrder && (
                          <>
                            <span className="mx-2">•</span>
                            <span>
                              حالة التوصيل:{' '}
                              <strong>
                                {(t.orderStatus as Record<string, string>)[linkedOrder.status] ||
                                  linkedOrder.status}
                              </strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bank Transfer Proof Block */}
                    {proof && (
                      <div className="p-3 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 block">
                            إثبات التحويل المرفق:
                          </span>
                          <div>
                            المرجع البنكي: <strong className="font-mono">{proof.referenceNumber}</strong> •
                            المحوّل: <strong>{proof.senderName}</strong> • التاريخ:{' '}
                            <span className="font-mono">{proof.transferDate}</span>
                          </div>
                          {proof.notes && (
                            <p className="text-[11px] text-slate-500">{proof.notes}</p>
                          )}
                        </div>
                        {proof.receiptImageDataUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewProofImage(proof.receiptImageDataUrl || null)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <FileImage className="w-3.5 h-3.5" />
                            <span>عرض صورة الوصل</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Admin Verification & Lifecycle Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      {(tx.status === 'Payment Verification' ||
                        tx.status === 'Awaiting Bank Transfer' ||
                        tx.status === 'Cash on Delivery' ||
                        tx.status === 'Pending Payment') && (
                        <button
                          type="button"
                          disabled={actionBusyId === tx.orderId || actionBusyId === tx.id}
                          onClick={() => handleVerifyPayment(tx.orderId, tx.id, 'approve')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            {tx.method === 'cod'
                              ? 'تأكيد استلام المبلغ النقدي (Paid)'
                              : 'اعتماد الدفع وتأكيده (Paid)'}
                          </span>
                        </button>
                      )}

                      {(tx.status === 'Payment Verification' ||
                        tx.status === 'Awaiting Bank Transfer') && (
                        <button
                          type="button"
                          onClick={() =>
                            setRejectReasonPrompt({
                              orderId: tx.orderId,
                              txId: tx.id,
                              mode: 'verify_reject',
                            })
                          }
                          className="px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>رفض الإثبات</span>
                        </button>
                      )}

                      {tx.status === 'Paid' && (
                        <button
                          type="button"
                          onClick={() =>
                            setRejectReasonPrompt({
                              orderId: tx.orderId,
                              mode: 'refund',
                            })
                          }
                          className="px-3.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>استرجاع المبلغ (Refund)</span>
                        </button>
                      )}

                      {tx.status !== 'Cancelled' && tx.status !== 'Refunded' && tx.status !== 'Paid' && (
                        <button
                          type="button"
                          onClick={() =>
                            setRejectReasonPrompt({
                              orderId: tx.orderId,
                              mode: 'cancel',
                            })
                          }
                          className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold cursor-pointer"
                        >
                          إلغاء مالي للطلب
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: MULTI-VENDOR FINANCIAL LEDGERS */}
      {subTab === 'vendors' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              تُحسب عمولة المنصة وصافي مستحقات كل بائع تلقائياً على الخادم عند تقسيم كل طلب حسب{' '}
              <code>companyId</code>. تتم تسوية التحويلات البنكية للبائعين يدوياً وتسجيلها هنا ما لم يتم ربط مزوّد تحويل آلي معتمد لاحقاً.
            </span>
          </div>

          {!overview?.vendorSummaries?.length ? (
            <div className="p-8 text-center rounded-3xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs text-slate-500">
              لا توجد سجلات مالية للبائعين بعد. ستظهر هنا تلقائياً عند إتمام أي طلب متعدد أو أحادي البائعين.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {overview.vendorSummaries.map((vs) => (
                <div
                  key={vs.vendorId}
                  className="p-4 rounded-3xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black">{vs.vendorName}</h4>
                      <span className="text-[11px] font-mono text-slate-400">{vs.vendorId}</span>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700">
                      {vs.entriesCount} عمليات
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 block">إجمالي المبيعات</span>
                      <strong className="font-mono tabular-nums">
                        {vs.grossTotal.toFixed(3)} {currentCfg.currency}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 block">عمولة المنصة</span>
                      <strong className="font-mono tabular-nums text-[#FF6B00]">
                        {vs.commissionTotal.toFixed(3)} {currentCfg.currency}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 block">معلق (غير مؤكد)</span>
                      <strong className="font-mono tabular-nums text-amber-600">
                        {vs.netPending.toFixed(3)} {currentCfg.currency}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block">
                        صافي مؤهل للصرف
                      </span>
                      <strong className="font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                        {vs.netEligible.toFixed(3)} {currentCfg.currency}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 sm:col-span-2">
                      <span className="text-[10px] text-slate-400 block">تمت تسويته وصرفه</span>
                      <strong className="font-mono tabular-nums text-blue-600">
                        {vs.netSettled.toFixed(3)} {currentCfg.currency}
                      </strong>
                    </div>
                  </div>

                  {vs.netEligible > 0 && (
                    <button
                      type="button"
                      disabled={actionBusyId === vs.vendorId}
                      onClick={() => handleSettleVendor(vs.vendorId, vs.vendorName)}
                      className="w-full py-2 rounded-xl bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] hover:bg-[#FF6B00] hover:text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      {actionBusyId === vs.vendorId
                        ? 'جارٍ تسجيل التسوية...'
                        : `تسجيل تسوية وصرف (${vs.netEligible.toFixed(3)} ${currentCfg.currency})`}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: INDEPENDENT SUPPORT ECHOX LOG */}
      {subTab === 'support' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-xs text-[#FF6B00] font-bold flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 shrink-0" />
            <span>{t.supportEchox.independentNotice}</span>
          </div>

          {!overview?.supportTransactions?.length ? (
            <div className="p-8 text-center rounded-3xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs text-slate-500">
              لا توجد مساهمات مسجلة في "ادعم ECHOX" حتى الآن.
            </div>
          ) : (
            <div className="space-y-2.5">
              {overview.supportTransactions.map((sup) => (
                <div
                  key={sup.id}
                  className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-[#FF6B00]">
                        {sup.supportReference}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPaymentStatusTone(
                          sup.status
                        )}`}
                      >
                        {(t.payments.statuses as Record<string, string>)[sup.status] || sup.status}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(sup.createdAt).toLocaleString('ar-TN')}
                      </span>
                    </div>
                    <div>
                      الداعم: <strong>{sup.supporterName || 'Anonymous'}</strong>
                      {sup.supporterPhone && (
                        <span className="mx-2 font-mono" dir="ltr">
                          {sup.supporterPhone}
                        </span>
                      )}
                      <span> • الوسيلة: {sup.method}</span>
                    </div>
                    {sup.note && <p className="text-[11px] text-slate-500">{sup.note}</p>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-black tabular-nums">
                      {sup.amount.toFixed(3)} {sup.currency}
                    </span>
                    {sup.status !== 'Paid' && sup.status !== 'Cancelled' && (
                      <>
                        <button
                          type="button"
                          disabled={actionBusyId === sup.id}
                          onClick={() => handleVerifySupport(sup.id, 'approve')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                        >
                          تأكيد الاستلام
                        </button>
                        <button
                          type="button"
                          disabled={actionBusyId === sup.id}
                          onClick={() => handleVerifySupport(sup.id, 'reject')}
                          className="px-2.5 py-1.5 rounded-xl bg-red-500/10 text-red-600 text-[11px] font-bold cursor-pointer"
                        >
                          رفض
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 5: AUDIT LOGS */}
      {subTab === 'logs' && (
        <div className="space-y-2">
          {!overview?.activityLogs?.length ? (
            <div className="p-8 text-center rounded-3xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs text-slate-500">
              سجل التدقيق المالي فارغ حالياً.
            </div>
          ) : (
            overview.activityLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded-lg bg-[#0F172A] text-white dark:bg-white dark:text-[#0F172A]">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400">actor: {log.actor}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">{log.details}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {typeof log.amount === 'number' && (
                    <span className="font-mono font-bold text-[#FF6B00] tabular-nums">
                      {log.amount.toFixed(3)} {currentCfg.currency}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(log.timestamp).toLocaleString('ar-TN')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Receipt Image Lightbox */}
      {previewProofImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
          onClick={() => setPreviewProofImage(null)}
        >
          <div
            className="max-w-xl w-full bg-white dark:bg-[#0F172A] rounded-3xl p-4 space-y-3 border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black">معاينة وصل التحويل البنكي</span>
              <button
                type="button"
                onClick={() => setPreviewProofImage(null)}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewProofImage}
              alt="Transfer Receipt"
              className="w-full max-h-[70vh] object-contain rounded-2xl bg-slate-100 dark:bg-slate-900"
            />
          </div>
        </div>
      )}

      {/* Modal: Reason input for Reject / Refund / Cancel */}
      {rejectReasonPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => {
            setRejectReasonPrompt(null);
            setReasonText('');
          }}
        >
          <div
            className="max-w-md w-full bg-white dark:bg-[#0F172A] rounded-3xl p-5 border border-[#E2E8F0] dark:border-slate-700 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-black">
              {rejectReasonPrompt.mode === 'verify_reject'
                ? 'سبب رفض إثبات التحويل البنكي'
                : rejectReasonPrompt.mode === 'refund'
                ? 'تأكيد الاسترجاع المالي (Refund)'
                : 'تأكيد الإلغاء المالي للطلب'}
            </h4>
            <textarea
              rows={3}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="أدخل السبب أو الملاحظة..."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectReasonPrompt(null);
                  setReasonText('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = rejectReasonPrompt;
                  const reason = reasonText.trim();
                  setRejectReasonPrompt(null);
                  setReasonText('');
                  if (target.mode === 'verify_reject') {
                    await handleVerifyPayment(target.orderId, target.txId, 'reject', reason);
                  } else {
                    await handleProcessRefund(target.orderId, target.mode, reason);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer"
              >
                تأكيد التنفيذ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
