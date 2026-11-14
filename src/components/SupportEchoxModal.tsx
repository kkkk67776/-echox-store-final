import React, { useState } from 'react';
import {
  X,
  HeartHandshake,
  Banknote,
  Building2,
  CreditCard,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  Upload,
  ExternalLink,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { contributeToEchox, getPaymentStatusTone } from '../lib/payments';
import { PaymentMethodType, SupportTransaction } from '../types';

const QUICK_AMOUNTS = [10, 25, 50, 100];

export const SupportEchoxModal: React.FC = () => {
  const {
    isSupportModalOpen,
    setIsSupportModalOpen,
    paymentConfig,
    language,
    t,
  } = useStore();

  const [amountInput, setAmountInput] = useState<string>('25');
  const [supporterName, setSupporterName] = useState('');
  const [supporterPhone, setSupporterPhone] = useState('');
  const [note, setNote] = useState('');

  const codEnabled = paymentConfig?.methods?.cod?.enabled !== false;
  const bankEnabled = paymentConfig?.methods?.bank_transfer?.enabled === true;
  const onlineReady =
    paymentConfig?.methods?.online_payment?.enabled === true &&
    paymentConfig?.methods?.online_payment?.readyForLive === true;

  const initialMethod: PaymentMethodType = bankEnabled
    ? 'bank_transfer'
    : codEnabled
    ? 'cod'
    : 'online_payment';

  const [method, setMethod] = useState<PaymentMethodType>(initialMethod);
  const [proofRef, setProofRef] = useState('');
  const [proofSender, setProofSender] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [receipt, setReceipt] = useState<SupportTransaction | null>(null);
  const [gatewayPayUrl, setGatewayPayUrl] = useState<string | undefined>(undefined);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isSupportModalOpen) return null;

  const bankInfo = paymentConfig.methods.bank_transfer;
  const currency = paymentConfig.currency || t.cart.currency;
  const bankInstructions =
    bankInfo.instructions?.[language] ||
    bankInfo.instructions?.ar ||
    bankInfo.instructions?.fr ||
    bankInfo.instructions?.en ||
    '';

  const handleCopy = (key: string, val: string) => {
    navigator.clipboard?.writeText(val).catch(() => {});
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const resetAndClose = () => {
    setReceipt(null);
    setGatewayPayUrl(undefined);
    setErrorMsg('');
    setProofRef('');
    setProofSender('');
    setNote('');
    setIsSupportModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedAmount = parseFloat(amountInput);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg(
        language === 'ar'
          ? 'يرجى إدخال مبلغ دعم صالح أكبر من الصفر.'
          : language === 'fr'
          ? 'Veuillez saisir un montant valide supérieur à 0.'
          : 'Please enter a valid positive support amount.'
      );
      return;
    }

    if (method === 'online_payment' && !onlineReady) {
      setErrorMsg(t.payments.onlineNotConfigured);
      return;
    }

    setSubmitting(true);
    const res = await contributeToEchox({
      amount: parsedAmount,
      method,
      supporterName: supporterName.trim() || undefined,
      supporterPhone: supporterPhone.trim() || undefined,
      note: note.trim() || undefined,
      transferProof:
        method === 'bank_transfer' && proofRef.trim()
          ? {
              referenceNumber: proofRef.trim(),
              senderName: proofSender.trim() || supporterName.trim() || 'Supporter',
              transferDate: new Date().toISOString().split('T')[0],
            }
          : undefined,
    });
    setSubmitting(false);

    if (!res.ok || !res.supportTransaction) {
      setErrorMsg(
        res.error ||
          (language === 'ar'
            ? 'تعذر تسجيل مساهمة الدعم حالياً.'
            : language === 'fr'
            ? 'Impossible d’enregistrer la contribution.'
            : 'Unable to record contribution.')
      );
      return;
    }

    setReceipt(res.supportTransaction);
    setGatewayPayUrl(res.paymentUrl);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={resetAndClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#0F172A] rounded-3xl border border-[#E2E8F0] dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-[#0F172A] dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#0F172A] text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#FF6B00] text-white flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black">{t.supportEchox.title}</h2>
              <p className="text-[11px] text-slate-300 leading-snug">
                {language === 'ar'
                  ? 'مساهمة مستقلة لتطوير منصة ECHOX'
                  : language === 'fr'
                  ? 'Contribution indépendante pour ECHOX'
                  : 'Independent platform support contribution'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close support modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {receipt ? (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base font-black text-emerald-800 dark:text-emerald-300">
                  {t.supportEchox.successTitle}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {t.supportEchox.receiptRef}{' '}
                  <strong className="font-mono text-[#FF6B00]">{receipt.supportReference}</strong>
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <span className="text-sm font-black tabular-nums">
                    {receipt.amount.toFixed(3)} {receipt.currency}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getPaymentStatusTone(
                      receipt.status
                    )}`}
                  >
                    {(t.payments.statuses as Record<string, string>)[receipt.status] || receipt.status}
                  </span>
                </div>
              </div>

              {receipt.method === 'online_payment' && gatewayPayUrl && gatewayPayUrl.startsWith('https://') && (
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-center space-y-2.5">
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    {language === 'ar'
                      ? 'تم تجهيز جلسة الدفع المؤمّنة لمساهمتك. اضغط لإتمام السداد عبر البوابة.'
                      : language === 'fr'
                      ? 'Session de paiement prête. Cliquez pour finaliser votre contribution.'
                      : 'Secure payment session ready. Click below to complete your contribution.'}
                  </p>
                  <a
                    href={gatewayPayUrl}
                    target={typeof window !== 'undefined' && window.self !== window.top ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold"
                  >
                    <span>{language === 'ar' ? 'إتمام الدفع الإلكتروني الآمن الآن' : language === 'fr' ? 'Finaliser le paiement' : 'Complete Online Payment'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {receipt.method === 'bank_transfer' && bankEnabled && (
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 space-y-2 text-xs">
                  <div className="font-black flex items-center gap-1.5 text-[#0F172A] dark:text-white">
                    <Building2 className="w-4 h-4 text-[#FF6B00]" />
                    <span>{t.payments.bankDetailsTitle}</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">{t.payments.beneficiary}:</span>
                      <span className="font-bold">{bankInfo.accountHolder}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">{t.payments.bankName}:</span>
                      <span className="font-bold">{bankInfo.bankName}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="font-mono font-bold text-[#0F172A] dark:text-white truncate" dir="ltr">
                        {bankInfo.ibanOrRib}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy('iban', bankInfo.ibanOrRib)}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {copiedField === 'iban' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'iban' ? t.payments.copied : t.payments.copy}</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="font-mono font-bold text-[#FF6B00]" dir="ltr">
                        {receipt.supportReference}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy('ref', receipt.supportReference)}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {copiedField === 'ref' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'ref' ? t.payments.copied : t.payments.copy}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#FF6B00] shrink-0 mt-0.5" />
                <span>{t.supportEchox.independentNotice}</span>
              </div>

              <button
                type="button"
                onClick={resetAndClose}
                className="w-full py-2.5 rounded-xl bg-[#0F172A] dark:bg-slate-700 hover:bg-[#FF6B00] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'إغلاق' : language === 'fr' ? 'Fermer' : 'Close'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t.supportEchox.subtitle}
              </p>

              {/* Amount selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold block">{t.supportEchox.amountLabel}</label>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmountInput(amt.toString())}
                      className={`py-2 rounded-xl text-xs font-black tabular-nums border transition-all cursor-pointer ${
                        parseFloat(amountInput) === amt
                          ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-xs'
                          : 'bg-[#F8FAFC] dark:bg-[#1E293B] border-[#E2E8F0] dark:border-slate-700 hover:border-[#FF6B00]'
                      }`}
                    >
                      {amt} {currency}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder={t.supportEchox.customAmountPlaceholder}
                  className="w-full text-sm font-black tabular-nums py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1E293B] focus:outline-hidden focus:border-[#FF6B00]"
                  dir="ltr"
                />
              </div>

              {/* Supporter Optional Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    {t.supportEchox.supporterName}
                  </label>
                  <input
                    type="text"
                    value={supporterName}
                    onChange={(e) => setSupporterName(e.target.value)}
                    placeholder="ECHOX Supporter"
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent focus:outline-hidden focus:border-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    {t.supportEchox.supporterPhone}
                  </label>
                  <input
                    type="tel"
                    value={supporterPhone}
                    onChange={(e) => setSupporterPhone(e.target.value)}
                    placeholder="+216 ..."
                    dir="ltr"
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent focus:outline-hidden focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  {t.supportEchox.supporterNote}
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="..."
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent focus:outline-hidden focus:border-[#FF6B00]"
                />
              </div>

              {/* Payment method choice */}
              <div className="space-y-2">
                <label className="text-xs font-bold block">{t.supportEchox.chooseMethod}</label>
                <div className="space-y-2">
                  {bankEnabled && (
                    <label
                      className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                        method === 'bank_transfer'
                          ? 'border-[#FF6B00] bg-[#FF6B00]/5'
                          : 'border-[#E2E8F0] dark:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="supportMethod"
                        checked={method === 'bank_transfer'}
                        onChange={() => setMethod('bank_transfer')}
                        className="accent-[#FF6B00]"
                      />
                      <Building2 className="w-4 h-4 text-[#FF6B00] shrink-0" />
                      <div className="text-xs">
                        <span className="font-bold block">{t.payments.bankTransferLabel}</span>
                        <span className="text-[11px] text-slate-500">{bankInfo.bankName}</span>
                      </div>
                    </label>
                  )}

                  {codEnabled && (
                    <label
                      className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                        method === 'cod'
                          ? 'border-[#FF6B00] bg-[#FF6B00]/5'
                          : 'border-[#E2E8F0] dark:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="supportMethod"
                        checked={method === 'cod'}
                        onChange={() => setMethod('cod')}
                        className="accent-[#FF6B00]"
                      />
                      <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="text-xs">
                        <span className="font-bold block">{t.payments.codLabel}</span>
                      </div>
                    </label>
                  )}

                  {onlineReady ? (
                    <label
                      className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                        method === 'online_payment'
                          ? 'border-[#FF6B00] bg-[#FF6B00]/5'
                          : 'border-[#E2E8F0] dark:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="supportMethod"
                        checked={method === 'online_payment'}
                        onChange={() => setMethod('online_payment')}
                        className="accent-[#FF6B00]"
                      />
                      <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold">{t.payments.onlinePaymentLabel}</span>
                    </label>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 shrink-0" />
                      <span>{t.payments.onlineNotConfigured}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bank transfer details + optional proof */}
              {method === 'bank_transfer' && bankEnabled && (
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-600 dark:text-slate-300">
                      {t.payments.beneficiary}: {bankInfo.accountHolder}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('iban_pre', bankInfo.ibanOrRib)}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'iban_pre' ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedField === 'iban_pre' ? t.payments.copied : t.payments.copy} RIB/IBAN</span>
                    </button>
                  </div>
                  <p className="font-mono text-[11px] font-bold text-[#0F172A] dark:text-white" dir="ltr">
                    {bankInfo.ibanOrRib}
                  </p>
                  {bankInstructions && (
                    <p className="text-[11px] text-slate-500 leading-relaxed">{bankInstructions}</p>
                  )}

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={proofRef}
                      onChange={(e) => setProofRef(e.target.value)}
                      placeholder={t.payments.proofRefPlaceholder}
                      className="w-full text-[11px] py-1.5 px-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0F172A]"
                    />
                    <input
                      type="text"
                      value={proofSender}
                      onChange={(e) => setProofSender(e.target.value)}
                      placeholder={t.payments.proofSenderPlaceholder}
                      className="w-full text-[11px] py-1.5 px-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0F172A]"
                    />
                  </div>
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <Upload className="w-3.5 h-3.5 shrink-0 mt-0.5 hidden" />
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{t.supportEchox.independentNotice}</span>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || (!codEnabled && !bankEnabled && !onlineReady)}
                className="w-full py-3 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <HeartHandshake className="w-4 h-4" />}
                <span>{t.supportEchox.submitBtn}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
