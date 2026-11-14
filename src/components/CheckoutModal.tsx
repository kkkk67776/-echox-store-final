import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  X,
  CheckCircle2,
  CreditCard,
  Banknote,
  Landmark,
  MapPin,
  Copy,
  Check,
  Upload,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { TUNISIAN_GOVERNORATES } from '../data/governorates';
import { Order, PaymentMethodType } from '../types';
import { getPaymentStatusTone, submitBankTransferProofClient } from '../lib/payments';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const {
    cart,
    language,
    t,
    cartSubtotal,
    cartShippingFee,
    cartDiscountAmount,
    cartTaxAmount,
    cartTotal,
    paymentConfig,
    refreshPaymentConfig,
    createServerOrder,
    updateOrderInState,
    currentUser,
    setCurrentView,
  } = useStore();

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [governorate, setGovernorate] = useState(TUNISIAN_GOVERNORATES[0].id);
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [street, setStreet] = useState('');
  const [notes, setNotes] = useState('');

  const codEnabled = paymentConfig?.methods?.cod?.enabled ?? true;
  const bankEnabled = paymentConfig?.methods?.bank_transfer?.enabled ?? true;
  const onlineEnabled = Boolean(
    paymentConfig?.methods?.online_payment?.enabled && paymentConfig?.methods?.online_payment?.readyForLive
  );

  const getFirstAvailableMethod = (): PaymentMethodType => {
    if (codEnabled) return 'cod';
    if (bankEnabled) return 'bank_transfer';
    if (onlineEnabled) return 'online_payment';
    return 'cod';
  };

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>(getFirstAvailableMethod);
  const [clientRequestId, setClientRequestId] = useState<string>(
    () => `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [gatewayPayUrl, setGatewayPayUrl] = useState<string | undefined>(undefined);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Proof of transfer fields (used either post-checkout on Bank Transfer confirmation or inline)
  const [proofRef, setProofRef] = useState('');
  const [proofSender, setProofSender] = useState('');
  const [proofDate, setProofDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [proofNotes, setProofNotes] = useState('');
  const [proofImageData, setProofImageData] = useState<string | undefined>(undefined);
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const [proofSuccessMsg, setProofSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      refreshPaymentConfig();
      setErrorMsg('');
      if (!completedOrder) {
        setClientRequestId(`chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!completedOrder) {
      setClientRequestId(`chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    }
  }, [cart.length, paymentMethod]);

  useEffect(() => {
    if (paymentMethod === 'cod' && !codEnabled) setPaymentMethod(getFirstAvailableMethod());
    if (paymentMethod === 'bank_transfer' && !bankEnabled) setPaymentMethod(getFirstAvailableMethod());
    if (paymentMethod === 'online_payment' && !onlineEnabled) setPaymentMethod(getFirstAvailableMethod());
  }, [codEnabled, bankEnabled, onlineEnabled]);

  if (!isOpen) return null;

  const selectedGovObj = TUNISIAN_GOVERNORATES.find((g) => g.id === governorate);
  const currencyLabel = paymentConfig?.currency || t.cart.currency || 'TND';
  const bankInfo = paymentConfig.methods.bank_transfer;
  const hasAnyMethod = codEnabled || bankEnabled || onlineEnabled;

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.type.includes('svg')) {
      setErrorMsg(
        language === 'ar'
          ? 'يرجى رفع صورة وصل صالحة (PNG / JPG / WEBP فقط).'
          : 'Please upload a valid receipt image (PNG / JPG / WEBP only).'
      );
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg(
        language === 'ar'
          ? 'حجم صورة الإثبات يجب أن لا يتجاوز 3 ميغابايت.'
          : 'Receipt image size must be less than 3 MB.'
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProofImageData(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!hasAnyMethod) {
      setErrorMsg(t.payments.noMethodsEnabled);
      return;
    }

    if (!fullName.trim() || !phone.trim() || !governorate || !city.trim() || !street.trim()) {
      setErrorMsg(t.checkout.requiredFieldsAlert);
      return;
    }

    setIsSubmitting(true);
    const result = await createServerOrder({
      customerName: fullName.trim(),
      customerEmail: email.trim() || undefined,
      customerPhone: phone.trim(),
      shippingAddress: {
        id: `addr_${Date.now()}`,
        isDefault: true,
        fullName: fullName.trim(),
        phone: phone.trim(),
        governorate,
        city: city.trim(),
        postalCode: postalCode.trim() || (selectedGovObj ? `${selectedGovObj.postalCodePrefix}00` : '1000'),
        street: street.trim(),
        notes: notes.trim() || undefined,
      },
      paymentMethod,
      carrierName: 'Aramex Tunisie Logistics',
      notes: notes.trim() || undefined,
      clientRequestId,
    });
    setIsSubmitting(false);

    if (!result.ok || !result.order) {
      setErrorMsg(result.error || 'تعذر تسجيل الطلب على الخادم.');
      return;
    }

    setCompletedOrder(result.order);
    setGatewayPayUrl(result.paymentUrl);
    setProofSender(fullName.trim());
  };

  const handlePostOrderProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completedOrder) return;
    if (!proofRef.trim() || !proofSender.trim()) {
      setErrorMsg(
        language === 'ar'
          ? 'يرجى إدخال رقم العملية البنكية واسم المحوّل.'
          : 'Please enter transaction reference and sender name.'
      );
      return;
    }

    setErrorMsg('');
    setProofSubmitting(true);
    const res = await submitBankTransferProofClient({
      trackingNumber: completedOrder.trackingNumber,
      customerPhone: completedOrder.customerPhone,
      referenceNumber: proofRef.trim(),
      senderName: proofSender.trim(),
      transferDate: proofDate,
      receiptImageDataUrl: proofImageData,
      notes: proofNotes.trim() || undefined,
    });
    setProofSubmitting(false);

    if (!res.ok || !res.order) {
      setErrorMsg(res.error || 'فشل إرسال إثبات التحويل.');
      return;
    }

    setCompletedOrder(res.order);
    updateOrderInState(res.order);
    setProofSuccessMsg(t.payments.proofSubmittedNotice);
  };

  const handleTrackOrderNow = () => {
    setCompletedOrder(null);
    onClose();
    setCurrentView('my_orders');
  };

  const handleCloseModal = () => {
    setCompletedOrder(null);
    setProofSuccessMsg('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div
        className="bg-white dark:bg-[#0F172A] w-full max-w-3xl rounded-3xl shadow-2xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden relative my-auto max-h-[95vh] flex flex-col text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between bg-[#F8FAFC] dark:bg-[#1E293B]">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{t.checkout.title}</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              ECHOX Store — {language === 'ar' ? 'حساب ومصادقة خادمية دقيقة' : language === 'fr' ? 'Calcul vérifié côté serveur' : 'Server-verified checkout'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 sm:p-8 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {completedOrder ? (
            /* Order Confirmation & Payment Status Screen */
            <div className="py-2 space-y-6">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">{t.checkout.successTitle}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  {t.checkout.successMsg}
                </p>
              </div>

              {/* Order Reference & Independent Payment Status Summary */}
              <div className="max-w-xl mx-auto p-5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      {t.checkout.orderNumberIs}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-black text-[#FF6B00] font-mono tracking-wider">
                        {completedOrder.trackingNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy('tracking', completedOrder.trackingNumber)}
                        className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs cursor-pointer"
                        title={t.payments.copy}
                      >
                        {copiedKey === 'tracking' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="sm:text-end">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      {t.tracking.paymentStatus}
                    </span>
                    <span
                      className={`inline-block mt-1 px-2.5 py-1 rounded-lg border text-xs font-bold ${getPaymentStatusTone(
                        completedOrder.paymentStatus
                      )}`}
                    >
                      {(t.payments.statuses as Record<string, string>)[completedOrder.paymentStatus] ||
                        completedOrder.paymentStatus}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">{t.payments.totalAmount}:</span>
                  <strong className="text-base font-black text-slate-900 dark:text-white tabular-nums font-mono">
                    {completedOrder.totalAmount.toFixed(3)} {completedOrder.currency || currencyLabel}
                  </strong>
                </div>

                {completedOrder.paymentReference && (
                  <div className="flex items-center justify-between gap-2 text-xs bg-white dark:bg-[#0F172A] p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400">{t.payments.referenceNumber}:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {completedOrder.paymentReference}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy('ref', completedOrder.paymentReference!)}
                        className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold hover:border-[#FF6B00] cursor-pointer"
                      >
                        {copiedKey === 'ref' ? t.payments.copied : t.payments.copy}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Online Gateway Redirect Box */}
              {completedOrder.paymentMethod === 'online_payment' && gatewayPayUrl && gatewayPayUrl.startsWith('https://') && (
                <div className="max-w-xl mx-auto p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 space-y-3 text-center">
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    {language === 'ar'
                      ? 'تم تجهيز جلسة الدفع المؤمّنة. اضغط للمتابعة لإتمام السداد وسيتم إرجاعك تلقائياً لتأكيد الطلب.'
                      : language === 'fr'
                      ? 'Session de paiement sécurisée prête. Cliquez pour finaliser le paiement puis revenir automatiquement.'
                      : 'Secure online payment session created. Proceed to complete payment and return automatically.'}
                  </p>
                  <a
                    href={gatewayPayUrl}
                    target={typeof window !== 'undefined' && window.self !== window.top ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold"
                  >
                    <span>{language === 'ar' ? 'الانتقال لبوابة الدفع المؤمّنة' : language === 'fr' ? 'Payer en ligne maintenant' : 'Continue to Payment Gateway'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Bank Transfer Instructions & Proof Upload on Confirmation */}
              {completedOrder.paymentMethod === 'bank_transfer' && (
                <div className="max-w-xl mx-auto space-y-4">
                  <div className="p-5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
                      <Landmark className="w-4 h-4 text-[#FF6B00]" />
                      <span>{t.payments.bankDetailsTitle}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block">{t.payments.beneficiary}</span>
                        <span className="font-bold text-slate-900 dark:text-white">{bankInfo.accountHolder}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block">{t.payments.bankName}</span>
                        <span className="font-bold text-slate-900 dark:text-white">{bankInfo.bankName}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 block">{t.payments.accountOrIban}</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white break-all" dir="ltr">
                          {bankInfo.ibanOrRib}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('iban', bankInfo.ibanOrRib)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold hover:border-[#FF6B00] shrink-0 cursor-pointer"
                      >
                        {copiedKey === 'iban' ? t.payments.copied : t.payments.copy}
                      </button>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{t.payments.totalAmount}</span>
                        <span className="font-mono font-black text-[#FF6B00] tabular-nums">
                          {completedOrder.totalAmount.toFixed(3)} {currencyLabel}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('amt', completedOrder.totalAmount.toFixed(3))}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold hover:border-[#FF6B00] shrink-0 cursor-pointer"
                      >
                        {copiedKey === 'amt' ? t.payments.copied : t.payments.copy}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed bg-amber-500/5 border border-amber-500/20 rounded-xl p-2.5">
                      {bankInfo.instructions?.[language] || bankInfo.instructions?.ar}
                    </p>
                  </div>

                  {/* Submit Transfer Proof Form */}
                  {proofSuccessMsg ? (
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{proofSuccessMsg}</span>
                    </div>
                  ) : (
                    <form
                      onSubmit={handlePostOrderProofSubmit}
                      className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 space-y-3"
                    >
                      <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Upload className="w-4 h-4 text-[#FF6B00]" />
                        <span>{t.payments.uploadProofTitle}</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          value={proofRef}
                          onChange={(e) => setProofRef(e.target.value)}
                          placeholder={t.payments.proofRefPlaceholder}
                          className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent font-mono outline-none focus:border-[#FF6B00]"
                        />
                        <input
                          type="text"
                          required
                          value={proofSender}
                          onChange={(e) => setProofSender(e.target.value)}
                          placeholder={t.payments.proofSenderPlaceholder}
                          className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent outline-none focus:border-[#FF6B00]"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">{t.payments.proofDateLabel}</label>
                          <input
                            type="date"
                            value={proofDate}
                            onChange={(e) => setProofDate(e.target.value)}
                            className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent outline-none focus:border-[#FF6B00]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">{t.payments.proofImageLabel}</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProofFileChange}
                            className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-300 file:text-xs file:font-bold"
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        value={proofNotes}
                        onChange={(e) => setProofNotes(e.target.value)}
                        placeholder={t.checkout.notes}
                        className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent outline-none focus:border-[#FF6B00]"
                      />
                      <button
                        type="submit"
                        disabled={proofSubmitting}
                        className="w-full py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {proofSubmitting ? t.checkout.submitting : t.payments.submitProofBtn}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTrackOrderNow}
                  className="px-6 py-3 rounded-xl bg-[#0B0F17] dark:bg-[#FF6B00] hover:bg-[#FF6B00] text-white font-bold text-sm transition-colors cursor-pointer"
                >
                  {t.checkout.trackOrderBtn}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm transition-colors cursor-pointer"
                >
                  {t.checkout.continueShopping}
                </button>
              </div>
            </div>
          ) : (
            /* Checkout Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Address Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <MapPin className="w-4 h-4 text-[#FF6B00]" />
                  <span>{t.checkout.step1}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t.checkout.fullName} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t.checkout.fullNamePlaceholder}
                      className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent focus:outline-hidden focus:border-[#FF6B00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t.checkout.phone} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t.checkout.phonePlaceholder}
                      className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent focus:outline-hidden focus:border-[#FF6B00] font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t.checkout.governorate} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={governorate}
                      onChange={(e) => setGovernorate(e.target.value)}
                      className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:border-[#FF6B00] bg-white dark:bg-[#1E293B]"
                    >
                      {TUNISIAN_GOVERNORATES.map((gov) => (
                        <option key={gov.id} value={gov.id}>
                          {language === 'fr' ? gov.nameFr : language === 'en' ? gov.nameEn : gov.nameAr} ({gov.deliveryEstimateDays})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t.checkout.city} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={t.checkout.cityPlaceholder}
                      className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent focus:outline-hidden focus:border-[#FF6B00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t.checkout.postalCode}
                    </label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder={t.checkout.postalCodePlaceholder}
                      className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent focus:outline-hidden focus:border-[#FF6B00] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.checkout.street} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder={t.checkout.streetPlaceholder}
                    className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent focus:outline-hidden focus:border-[#FF6B00]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t.checkout.email}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      dir="ltr"
                      className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent focus:outline-hidden focus:border-[#FF6B00] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t.checkout.notes}
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t.checkout.notesPlaceholder}
                      className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent focus:outline-hidden focus:border-[#FF6B00]"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Enabled Payment Methods Only */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#FF6B00]" />
                  <span>{t.checkout.paymentMethod}</span>
                </h3>

                {!hasAnyMethod ? (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
                    {t.payments.noMethodsEnabled}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {codEnabled && (
                      <label
                        className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                          paymentMethod === 'cod'
                            ? 'border-[#FF6B00] bg-[#FF6B00]/5 ring-2 ring-[#FF6B00]/15'
                            : 'border-[#E2E8F0] dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Banknote className="w-5 h-5 text-emerald-600" />
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === 'cod'}
                            onChange={() => setPaymentMethod('cod')}
                            className="accent-[#FF6B00]"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{t.payments.codLabel}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{t.payments.codDesc}</p>
                        </div>
                      </label>
                    )}

                    {bankEnabled && (
                      <label
                        className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                          paymentMethod === 'bank_transfer'
                            ? 'border-[#FF6B00] bg-[#FF6B00]/5 ring-2 ring-[#FF6B00]/15'
                            : 'border-[#E2E8F0] dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Landmark className="w-5 h-5 text-amber-600" />
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === 'bank_transfer'}
                            onChange={() => setPaymentMethod('bank_transfer')}
                            className="accent-[#FF6B00]"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{t.payments.bankTransferLabel}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{t.payments.bankTransferDesc}</p>
                        </div>
                      </label>
                    )}

                    {onlineEnabled ? (
                      <label
                        className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                          paymentMethod === 'online_payment'
                            ? 'border-[#FF6B00] bg-[#FF6B00]/5 ring-2 ring-[#FF6B00]/15'
                            : 'border-[#E2E8F0] dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <CreditCard className="w-5 h-5 text-blue-600" />
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === 'online_payment'}
                            onChange={() => setPaymentMethod('online_payment')}
                            className="accent-[#FF6B00]"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{t.payments.onlinePaymentLabel}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            {t.payments.onlinePaymentDesc} ({paymentConfig.methods.online_payment.provider.toUpperCase()})
                          </p>
                        </div>
                      </label>
                    ) : (
                      <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 opacity-75 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                          <CreditCard className="w-5 h-5 text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Disabled</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{t.payments.onlinePaymentLabel}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{t.payments.onlineNotConfigured}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bank Transfer Info Preview ONLY when Bank Transfer is Selected */}
                {paymentMethod === 'bank_transfer' && bankEnabled && (
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <Landmark className="w-4 h-4 text-[#FF6B00]" />
                      <span>{t.payments.bankDetailsTitle}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400">{t.payments.beneficiary}: </span>
                        <strong className="text-slate-800 dark:text-slate-200">{bankInfo.accountHolder}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">{t.payments.bankName}: </span>
                        <strong className="text-slate-800 dark:text-slate-200">{bankInfo.bankName}</strong>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#0F172A] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]" dir="ltr">
                        {bankInfo.ibanOrRib}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy('pre_iban', bankInfo.ibanOrRib)}
                        className="text-[11px] font-bold text-[#FF6B00] hover:underline cursor-pointer shrink-0"
                      >
                        {copiedKey === 'pre_iban' ? t.payments.copied : t.payments.copy}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {bankInfo.instructions?.[language] || bankInfo.instructions?.ar}
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t.checkout.securePaymentNote}</span>
                </p>
              </div>

              {/* Financial Summary & Submit */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-black text-slate-900 dark:text-white">{t.payments.orderSummary}</h4>
                <div className="space-y-1.5 text-xs border-b border-slate-200 dark:border-slate-700 pb-3">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{t.payments.subtotal} ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
                    <span className="font-mono tabular-nums font-bold">{cartSubtotal.toFixed(3)} {currencyLabel}</span>
                  </div>
                  {cartDiscountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>{t.payments.discount}</span>
                      <span className="font-mono tabular-nums font-bold">-{cartDiscountAmount.toFixed(3)} {currencyLabel}</span>
                    </div>
                  )}
                  {cartTaxAmount > 0 && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>{t.payments.tax} ({paymentConfig.taxRatePercent}%)</span>
                      <span className="font-mono tabular-nums font-bold">{cartTaxAmount.toFixed(3)} {currencyLabel}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{t.payments.shipping}</span>
                    <span className="font-mono tabular-nums font-bold">
                      {cartShippingFee === 0 ? t.cart.freeShipping : `${cartShippingFee.toFixed(3)} ${currencyLabel}`}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">{t.payments.totalAmount}:</span>
                    <span className="text-xl font-black text-[#FF6B00] tabular-nums font-mono">
                      {cartTotal.toFixed(3)} {currencyLabel}
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || cart.length === 0 || !hasAnyMethod}
                    className="py-3 px-6 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{isSubmitting ? t.checkout.submitting : t.checkout.confirmOrder}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
