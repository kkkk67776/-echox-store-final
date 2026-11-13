import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  Search,
  Package,
  Clock,
  PhoneCall,
  XCircle,
  MapPin,
  MessageCircle,
  Landmark,
  Copy,
  Check,
  Upload,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { getGovernorateName } from '../data/governorates';
import { Order, OrderStatus } from '../types';
import {
  getPaymentStatusTone,
  submitBankTransferProofClient,
  submitRefundOrCancelRequest,
  trackOrderServer,
} from '../lib/payments';

export const OrderTrackingView: React.FC = () => {
  const { orders, language, t, siteSettings, paymentConfig, updateOrderInState } = useStore();

  const [inputCode, setInputCode] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(() => {
    return orders[0] || null;
  });
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Proof upload for bank transfer orders tracked here
  const [proofRef, setProofRef] = useState('');
  const [proofSender, setProofSender] = useState('');
  const [proofDate, setProofDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [proofNotes, setProofNotes] = useState('');
  const [proofImageData, setProofImageData] = useState<string | undefined>(undefined);
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Refund / Cancel request state
  const [showRefundBox, setShowRefundBox] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const activeOrder = searchedOrder
    ? orders.find((o) => o.id === searchedOrder.id || o.trackingNumber === searchedOrder.trackingNumber) || searchedOrder
    : null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    const clean = inputCode.trim().toUpperCase();
    const localFound = orders.find(
      (o) =>
        o.trackingNumber.toUpperCase() === clean ||
        (o.paymentReference && o.paymentReference.toUpperCase() === clean)
    );
    setSearchedOrder(localFound || null);
    setHasSearched(true);
    setActionSuccess('');
    setActionError('');

    const srv = await trackOrderServer(clean);
    if (srv.ok && srv.order) {
      setSearchedOrder(srv.order);
      updateOrderInState(srv.order);
    }
  };

  const handleCopy = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleProofFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setActionError('Receipt image must be under 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setProofImageData(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    setActionError('');
    setActionSuccess('');
    setProofSubmitting(true);
    const res = await submitBankTransferProofClient({
      trackingNumber: activeOrder.trackingNumber,
      customerPhone: activeOrder.customerPhone,
      referenceNumber: proofRef.trim(),
      senderName: proofSender.trim() || activeOrder.customerName,
      transferDate: proofDate,
      receiptImageDataUrl: proofImageData,
      notes: proofNotes.trim() || undefined,
    });
    setProofSubmitting(false);

    if (!res.ok || !res.order) {
      setActionError(res.error || 'تعذر إرسال إثبات التحويل.');
      return;
    }

    setSearchedOrder(res.order);
    updateOrderInState(res.order);
    setProofRef('');
    setProofNotes('');
    setActionSuccess(t.payments.proofSubmittedNotice);
  };

  const handleRefundRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder || !refundReason.trim()) return;
    setActionError('');
    setActionSuccess('');
    setRefundSubmitting(true);
    const res = await submitRefundOrCancelRequest({
      trackingNumber: activeOrder.trackingNumber,
      customerPhone: activeOrder.customerPhone,
      reason: refundReason.trim(),
    });
    setRefundSubmitting(false);
    if (!res.ok) {
      setActionError(res.error || 'تعذر إرسال طلب الإلغاء / الاسترجاع.');
      return;
    }
    setShowRefundBox(false);
    setRefundReason('');
    setActionSuccess(
      language === 'ar'
        ? 'تم تسجيل طلب الإلغاء / الاسترجاع وإشعار مركز التحكم للمراجعة.'
        : 'Cancellation / refund request logged for Admin Panel review.'
    );
  };

  const statusSteps: { key: OrderStatus; label: string }[] = [
    { key: 'new', label: t.orderStatus.new },
    { key: 'under_confirmation', label: t.orderStatus.under_confirmation },
    { key: 'preparing', label: t.orderStatus.preparing },
    { key: 'out_for_delivery', label: t.orderStatus.out_for_delivery },
    { key: 'delivered', label: t.orderStatus.delivered },
  ];

  const getStatusIndex = (status: OrderStatus) => {
    if (status === 'cancelled') return -1;
    return statusSteps.findIndex((s) => s.key === status);
  };

  const currentStepIndex = activeOrder ? getStatusIndex(activeOrder.status) : 0;
  const bankInfo = paymentConfig.methods.bank_transfer;
  const currencyLabel = activeOrder?.currency || paymentConfig.currency || t.cart.currency;

  const formatPaymentMethodLabel = (method: string) => {
    if (method === 'cod') return t.payments.codLabel;
    if (method === 'bank_transfer') return t.payments.bankTransferLabel;
    if (method === 'online_payment') return t.payments.onlinePaymentLabel;
    return method;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn text-slate-900 dark:text-slate-100">
      {/* Title & Search Box */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          {t.tracking.title}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
          {t.tracking.subtitle}
        </p>

        <form onSubmit={handleSearch} className="max-w-md mx-auto flex gap-2 pt-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="ECH-TN-981240 / ECH-REF-..."
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="w-full text-sm py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1E293B] focus:outline-hidden focus:border-[#FF6B00] shadow-xs text-center font-mono font-bold uppercase"
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-[#0B0F17] dark:bg-[#FF6B00] hover:bg-[#FF6B00] text-white font-bold text-sm rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>{t.tracking.searchBtn}</span>
          </button>
        </form>

        {/* Quick order samples */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 pt-1">
          <span>{language === 'ar' ? 'طلبات مسجلة:' : 'Recent:'}</span>
          {orders.slice(0, 3).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                setInputCode(o.trackingNumber);
                setSearchedOrder(o);
                setHasSearched(true);
                setActionSuccess('');
                setActionError('');
              }}
              className="text-[#FF6B00] font-bold underline hover:opacity-80 font-mono cursor-pointer"
            >
              {o.trackingNumber}
            </button>
          ))}
        </div>
      </div>

      {/* Result Container */}
      {activeOrder ? (
        <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-[#E2E8F0] dark:border-slate-800 shadow-md p-6 sm:p-8 space-y-8">
          {/* Order Header + Independent Payment Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 block">رقم التتبع:</span>
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-xl sm:text-2xl font-black text-[#FF6B00] font-mono tracking-wider">
                  {activeOrder.trackingNumber}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${getPaymentStatusTone(
                    activeOrder.paymentStatus
                  )}`}
                >
                  {(t.payments.statuses as Record<string, string>)[activeOrder.paymentStatus] ||
                    activeOrder.paymentStatus}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {new Date(activeOrder.createdAt).toLocaleDateString(language === 'ar' ? 'ar-TN' : 'en-GB')} ·{' '}
                {activeOrder.carrierName}
                {activeOrder.paymentReference ? ` · Ref: ${activeOrder.paymentReference}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`tel:${siteSettings.supportPhone}`}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span>{language === 'ar' ? 'اتصال' : 'Call'}</span>
              </a>
              <a
                href={`https://wa.me/${siteSettings.whatsappPhone}?text=Order%20${activeOrder.trackingNumber}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
              {activeOrder.status !== 'cancelled' && activeOrder.paymentStatus !== 'Refunded' && (
                <button
                  type="button"
                  onClick={() => setShowRefundBox(!showRefundBox)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-red-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t.payments.requestRefund}</span>
                </button>
              )}
            </div>
          </div>

          {actionSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}
          {actionError && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Optional Refund / Cancellation Form */}
          {showRefundBox && (
            <form
              onSubmit={handleRefundRequest}
              className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 space-y-3"
            >
              <h4 className="text-xs font-black">{t.payments.requestRefund}</h4>
              <input
                type="text"
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder={t.payments.refundReasonPlaceholder}
                className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0F172A] outline-none focus:border-[#FF6B00]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRefundBox(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500"
                >
                  {t.ownerDashboard.buttons.cancel}
                </button>
                <button
                  type="submit"
                  disabled={refundSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                >
                  {t.ownerDashboard.buttons.confirm}
                </button>
              </div>
            </form>
          )}

          {/* Bank Transfer Action Box if Bank Transfer */}
          {activeOrder.paymentMethod === 'bank_transfer' &&
            activeOrder.paymentStatus !== 'Paid' &&
            activeOrder.paymentStatus !== 'Cancelled' &&
            activeOrder.paymentStatus !== 'Refunded' && (
              <div className="p-5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-black">
                    <Landmark className="w-4 h-4 text-[#FF6B00]" />
                    <span>{t.payments.bankDetailsTitle}</span>
                  </div>
                  {activeOrder.paymentReference && (
                    <button
                      type="button"
                      onClick={() => handleCopy('trk_ref', activeOrder.paymentReference!)}
                      className="text-[11px] font-mono font-bold text-[#FF6B00] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{activeOrder.paymentReference}</span>
                      {copiedKey === 'trk_ref' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">{t.payments.beneficiary}</span>
                    <strong className="text-slate-900 dark:text-white">{bankInfo.accountHolder}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">{t.payments.bankName}</span>
                    <strong className="text-slate-900 dark:text-white">{bankInfo.bankName}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block">{t.payments.accountOrIban}</span>
                      <span className="font-mono font-bold text-[11px] break-all" dir="ltr">
                        {bankInfo.ibanOrRib}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('trk_iban', bankInfo.ibanOrRib)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
                    >
                      {copiedKey === 'trk_iban' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {activeOrder.transferProof ? (
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-300 space-y-1">
                    <p className="font-bold">
                      {t.payments.proofSubmittedNotice} ({activeOrder.transferProof.referenceNumber})
                    </p>
                    <p className="text-[11px] opacity-85">
                      {activeOrder.transferProof.senderName} · {activeOrder.transferProof.transferDate}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitProof} className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-xs font-bold flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-[#FF6B00]" />
                      <span>{t.payments.uploadProofTitle}</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        required
                        value={proofRef}
                        onChange={(e) => setProofRef(e.target.value)}
                        placeholder={t.payments.proofRefPlaceholder}
                        className="text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0F172A] font-mono outline-none focus:border-[#FF6B00]"
                      />
                      <input
                        type="text"
                        required
                        value={proofSender}
                        onChange={(e) => setProofSender(e.target.value)}
                        placeholder={t.payments.proofSenderPlaceholder}
                        className="text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0F172A] outline-none focus:border-[#FF6B00]"
                      />
                      <input
                        type="date"
                        value={proofDate}
                        onChange={(e) => setProofDate(e.target.value)}
                        className="text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0F172A] outline-none focus:border-[#FF6B00]"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProofFile}
                        className="text-[11px] text-slate-500 flex-1"
                      />
                      <button
                        type="submit"
                        disabled={proofSubmitting}
                        className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold cursor-pointer shrink-0"
                      >
                        {proofSubmitting ? t.checkout.submitting : t.payments.submitProofBtn}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

          {/* Stepper Timeline */}
          {activeOrder.status === 'cancelled' ? (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 flex items-center gap-3 text-red-800 dark:text-red-300">
              <XCircle className="w-6 h-6 text-red-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">{t.orderStatus.cancelled}</p>
                <p className="text-xs opacity-80">{activeOrder.refundReason || 'تم إلغاء الطلب.'}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t.tracking.orderTimeline}</h3>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {statusSteps.map((step, idx) => {
                  const isCompleted = idx <= currentStepIndex;
                  const isCurrent = idx === currentStepIndex;

                  return (
                    <div
                      key={step.key}
                      className={`p-3 rounded-2xl border transition-all text-center flex flex-col items-center justify-between gap-2 ${
                        isCurrent
                          ? 'bg-[#FF6B00]/10 border-[#FF6B00] ring-2 ring-[#FF6B00]/20'
                          : isCompleted
                          ? 'bg-emerald-50/60 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-60'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCompleted ? 'bg-emerald-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {isCompleted ? '✓' : idx + 1}
                      </div>
                      <span className="text-xs font-bold leading-tight">{step.label}</span>
                    </div>
                  );
                })}
              </div>

              {activeOrder.statusHistory && activeOrder.statusHistory.length > 0 && (
                <div className="bg-[#F8FAFC] dark:bg-[#1E293B] p-4 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 space-y-2 text-xs">
                  <div className="space-y-1.5">
                    {activeOrder.statusHistory.map((sh, i) => (
                      <div key={i} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
                        <span className="font-mono text-[11px] text-slate-400">
                          {new Date(sh.timestamp).toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {t.orderStatus[sh.status] || sh.status}:
                        </span>
                        <span>{sh.note || 'تم التحديث'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delivery Info & Itemized Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#FF6B00]" />
                <span>{t.tracking.deliveryAddress}</span>
              </h3>
              <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
                <p><strong>{t.checkout.fullName}:</strong> {activeOrder.customerName}</p>
                <p><strong>{t.checkout.phone}:</strong> <span dir="ltr" className="font-mono">{activeOrder.customerPhone}</span></p>
                <p><strong>{t.checkout.governorate}:</strong> {getGovernorateName(activeOrder.shippingAddress.governorate, language)}</p>
                <p><strong>{t.checkout.city}:</strong> {activeOrder.shippingAddress.city} ({activeOrder.shippingAddress.postalCode})</p>
                <p><strong>{t.checkout.street}:</strong> {activeOrder.shippingAddress.street}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-[#FF6B00]" />
                <span>{t.tracking.orderDetails}</span>
              </h3>
              <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 text-xs divide-y divide-slate-200 dark:divide-slate-700">
                {activeOrder.items.map((it, i) => (
                  <div key={i} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={it.productImage || '/assets/images/echox-logo.webp'}
                        alt="item"
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
                      />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {typeof it.productName === 'string'
                            ? it.productName
                            : it.productName?.[language] || it.productName?.ar || ''}
                        </p>
                        <p className="text-slate-500 text-[11px] font-mono">
                          {it.quantity} × {it.unitPrice.toFixed(3)} {currencyLabel}
                        </p>
                      </div>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white tabular-nums font-mono">
                      {it.totalPrice.toFixed(3)} {currencyLabel}
                    </span>
                  </div>
                ))}

                <div className="pt-3 mt-2 space-y-1.5">
                  <div className="flex justify-between font-bold text-sm">
                    <span>{t.tracking.total}</span>
                    <span className="text-[#FF6B00] tabular-nums font-mono">
                      {activeOrder.totalAmount.toFixed(3)} {currencyLabel}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{t.checkout.paymentMethod}:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {formatPaymentMethodLabel(activeOrder.paymentMethod)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{t.tracking.paymentStatus}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {(t.payments.statuses as Record<string, string>)[activeOrder.paymentStatus] ||
                        activeOrder.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : hasSearched ? (
        <div className="p-8 text-center bg-white dark:bg-[#0F172A] rounded-3xl border border-red-200 dark:border-red-500/30 text-slate-700 dark:text-slate-300 space-y-2">
          <p className="font-bold text-red-600">{t.tracking.orderNotFound}</p>
          <p className="text-xs text-slate-500">ECH-TN-XXXXXX</p>
        </div>
      ) : null}
    </div>
  );
};
