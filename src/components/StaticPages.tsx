import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  ShieldCheck, 
  Award, 
  RefreshCw, 
  Headphones, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Send, 
  CheckCircle2,
  BarChart3,
  X,
  Loader2
} from 'lucide-react';
import { getGovernorateName } from '../data/governorates';
import {
  fetchScopedVendorFinancials,
  getPaymentStatusTone,
  ScopedVendorFinancialsResponse
} from '../lib/payments';

// 1. The Promise Page (الوعد)
export const PromiseView: React.FC = () => {
  const { language, t, siteSettings, setCurrentView } = useStore();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12 animate-fadeIn text-slate-900 dark:text-slate-100">
      <div className="text-center space-y-4">
        <span className="text-xs font-black uppercase tracking-widest text-[#FF6B00] bg-[#FF6B00]/10 px-3.5 py-1.5 rounded-full">
          {t.staticExtras.promiseBadge}
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
          {t.promisePage.title}
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          {t.promisePage.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-[#E8E4DD] dark:border-slate-800 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.promisePage.point1Title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{t.promisePage.point1Desc}</p>
        </div>

        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-[#E8E4DD] dark:border-slate-800 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.promisePage.point2Title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{t.promisePage.point2Desc}</p>
        </div>

        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-[#E8E4DD] dark:border-slate-800 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.promisePage.point3Title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{t.promisePage.point3Desc}</p>
        </div>

        <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-[#E8E4DD] dark:border-slate-800 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Headphones className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.promisePage.point4Title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{t.promisePage.point4Desc}</p>
        </div>
      </div>

      <div className="bg-[#0B0F17] dark:bg-[#1E293B] border border-slate-800 rounded-3xl p-8 text-center text-white space-y-4">
        <h2 className="text-xl sm:text-2xl font-black">{t.staticExtras.promiseCtaTitle}</h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
          {t.staticExtras.promiseCtaDesc}
        </p>
        <button
          onClick={() => {
            setCurrentView('store');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="px-6 py-3 bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
        >
          {t.staticExtras.promiseCtaBtn}
        </button>
      </div>
    </div>
  );
};

// 2. Partner Companies Page (الشركات)
export const CompaniesView: React.FC = () => {
  const { companies, products, language, t, setSelectedProductId } = useStore();
  const [selectedVendorName, setSelectedVendorName] = useState<string>('');
  const [vendorFinancials, setVendorFinancials] = useState<ScopedVendorFinancialsResponse | null>(null);
  const [loadingVendor, setLoadingVendor] = useState(false);
  const [vendorError, setVendorError] = useState<string | null>(null);

  const openVendorLedger = async (vendorId: string, vendorName: string) => {
    setSelectedVendorName(vendorName);
    setVendorFinancials(null);
    setVendorError(null);
    setLoadingVendor(true);
    try {
      const data = await fetchScopedVendorFinancials(vendorId);
      setVendorFinancials(data);
    } catch (err: any) {
      setVendorError(err?.message || 'تعذر تحميل السجل المالي للبائع.');
    } finally {
      setLoadingVendor(false);
    }
  };

  const closeVendorLedger = () => {
    setVendorFinancials(null);
    setSelectedVendorName('');
    setVendorError(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-10 animate-fadeIn">
      <div className="text-center space-y-3">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          {t.companiesPage.title}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          {t.companiesPage.subtitle}
        </p>
      </div>

      <div className="space-y-8">
        {companies.map(comp => {
          const compProducts = products.filter(p => p.companyId === comp.id);
          return (
            <div key={comp.id} className="bg-white dark:bg-[#0F172A] rounded-3xl border border-[#E8E4DD] dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                <div className="flex items-center gap-4">
                  <img 
                    src={comp.logo} 
                    alt={comp.name} 
                    className="w-16 h-16 rounded-2xl object-contain bg-slate-50 p-1.5 border border-slate-200" 
                  />
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">{comp.name}</h2>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#FF6B00]" />
                        <span>{comp.address} ({getGovernorateName(comp.governorate, language)})</span>
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => openVendorLedger(comp.id, comp.name)}
                    className="px-3.5 py-2 rounded-xl bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 text-[#FF6B00] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>
                      {language === 'ar'
                        ? 'السجل المالي للبائع'
                        : language === 'fr'
                        ? 'Relevé financier vendeur'
                        : 'Vendor Financials'}
                    </span>
                  </button>
                  <a 
                    href={`tel:${comp.phone}`} 
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span dir="ltr">{comp.phone}</span>
                  </a>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {comp.description[language]}
              </p>

              {/* Company Products */}
              {compProducts.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {t.staticExtras.companyProductsPrefix} {comp.name}:
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {compProducts.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => setSelectedProductId(p.id)}
                        className="p-3 rounded-2xl bg-[#FAF8F5] dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 hover:border-[#FF6B00] cursor-pointer flex items-center gap-3 transition-all"
                      >
                        <img 
                          src={p.images[0]} 
                          alt="thumb" 
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-xl object-cover bg-white" 
                        />
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.name[language]}</p>
                          <p className="text-xs font-black text-[#FF6B00] tabular-nums">{p.price.toFixed(3)} {t.cart.currency}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scoped Vendor Financial Ledger Modal (Strictly Isolated per vendorId) */}
      {(loadingVendor || vendorFinancials || vendorError) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={closeVendorLedger}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-[#0F172A] rounded-3xl border border-[#E2E8F0] dark:border-slate-800 shadow-2xl overflow-hidden max-h-[88vh] flex flex-col text-[#0F172A] dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 bg-[#0F172A] text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-5 h-5 text-[#FF6B00]" />
                <div>
                  <h3 className="text-sm font-black">{selectedVendorName}</h3>
                  <p className="text-[11px] text-slate-300">
                    {language === 'ar'
                      ? 'سجل مالي معزول الخاص بمنتجات هذا البائع فقط'
                      : language === 'fr'
                      ? 'Journal financier strictement isolé pour ce vendeur'
                      : 'Strictly isolated financial ledger for this vendor only'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeVendorLedger}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {loadingVendor ? (
                <div className="py-10 flex flex-col items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-[#FF6B00]" />
                  <span>جارٍ جلب البيانات المالية الخاصة بالبائع...</span>
                </div>
              ) : vendorError ? (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 font-bold">
                  {vendorError}
                </div>
              ) : vendorFinancials ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 block">إجمالي المبيعات</span>
                      <strong className="text-sm font-black font-mono tabular-nums">
                        {vendorFinancials.grossTotal.toFixed(3)} {vendorFinancials.currency}
                      </strong>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 block">عمولة المنصة المقتطعة</span>
                      <strong className="text-sm font-black text-[#FF6B00] font-mono tabular-nums">
                        {vendorFinancials.commissionTotal.toFixed(3)} {vendorFinancials.currency}
                      </strong>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 block">رصيد معلق (قبل تأكيد الدفع)</span>
                      <strong className="text-sm font-black text-amber-600 font-mono tabular-nums">
                        {vendorFinancials.netPending.toFixed(3)} {vendorFinancials.currency}
                      </strong>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block">صافي مؤهل للصرف</span>
                      <strong className="text-sm font-black text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">
                        {vendorFinancials.netEligible.toFixed(3)} {vendorFinancials.currency}
                      </strong>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 sm:col-span-2">
                      <span className="text-[10px] text-slate-500 block">تمت تسويته وصرفه</span>
                      <strong className="text-sm font-black text-blue-600 font-mono tabular-nums">
                        {vendorFinancials.netSettled.toFixed(3)} {vendorFinancials.currency}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-600 dark:text-slate-300">
                      الطلبات الفرعية الخاصة بهذا البائع ({vendorFinancials.subOrders.length})
                    </h4>
                    {vendorFinancials.subOrders.length === 0 ? (
                      <div className="p-6 text-center rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] text-xs text-slate-500">
                        لا توجد طلبات فرعية مسجلة لهذا البائع حتى الآن.
                      </div>
                    ) : (
                      vendorFinancials.subOrders.map((sub) => (
                        <div
                          key={sub.subOrderId}
                          className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-[#FF6B00]">{sub.trackingNumber}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPaymentStatusTone(sub.orderPaymentStatus)}`}>
                                {(t.payments.statuses as Record<string, string>)[sub.orderPaymentStatus] || sub.orderPaymentStatus}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {sub.items.length} منتجات • الوسيلة: {sub.paymentMethod}
                            </span>
                          </div>
                          <div className="text-end font-mono tabular-nums">
                            <div className="font-black">{sub.netVendorAmount.toFixed(3)} {vendorFinancials.currency} صافي</div>
                            <div className="text-[10px] text-slate-400">
                              الإجمالي {sub.grossAmount.toFixed(3)} • العمولة {sub.commissionAmount.toFixed(3)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 3. Contact Us Page (اتصل بنا)
export const ContactView: React.FC = () => {
  const { siteSettings, sendInquiry, language, t } = useStore();
  const [senderName, setSenderName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName || !phone || !message) return;

    sendInquiry({
      senderName,
      phone,
      email: email || 'contact@client.tn',
      subject: subject || 'استفسار عام',
      message
    });

    setSentSuccess(true);
    setSenderName('');
    setPhone('');
    setEmail('');
    setSubject('');
    setMessage('');
    setTimeout(() => setSentSuccess(false), 5000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8 animate-fadeIn text-slate-900 dark:text-slate-100">
      <div className="text-center space-y-3">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          {t.contactModal.title}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
          {t.contactModal.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Quick Contacts Box */}
        <div className="md:col-span-1 bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-[#E8E4DD] dark:border-slate-800 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">{t.staticExtras.contactChannelsTitle}</h3>
            <div className="space-y-4 text-xs">
              <a
                href={`tel:${siteSettings.supportPhone}`}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1E293B] hover:bg-[#FF6B00]/10 flex items-center gap-3 transition-colors border border-slate-200 dark:border-slate-700"
              >
                <div className="w-8 h-8 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{t.staticExtras.phoneShortLabel}</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono" dir="ltr">{siteSettings.supportPhone}</span>
                </div>
              </a>

              <a
                href={`https://wa.me/${siteSettings.whatsappPhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 flex items-center gap-3 transition-colors border border-emerald-200 dark:border-emerald-800/50"
              >
                <div className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0">
                  <svg
                    viewBox="0 0 32 32"
                    className="w-4 h-4 fill-current"
                    aria-hidden="true"
                  >
                    <path d="M16.004 2.667C8.64 2.667 2.667 8.64 2.667 16c0 2.352.616 4.648 1.787 6.672L2.667 29.333l6.832-1.792A13.28 13.28 0 0 0 16.004 29.333C23.368 29.333 29.333 23.36 29.333 16S23.368 2.667 16.004 2.667zm7.768 18.88c-.325.917-1.912 1.749-2.648 1.856-.672.101-1.525.144-2.464-.155-.568-.181-1.296-.421-2.224-.821-3.912-1.688-6.464-5.637-6.659-5.899-.195-.261-1.589-2.115-1.589-4.035 0-1.92 1.005-2.864 1.363-3.253.357-.389.779-.485 1.037-.485.261 0 .52.003.747.013.24.011.563-.091.88.672.325.784 1.107 2.704 1.203 2.901.096.197.16.427.032.688-.128.261-.192.427-.389.656-.197.229-.413.512-.589.688-.197.197-.403.411-.173.805.229.395 1.021 1.685 2.192 2.731 1.507 1.344 2.779 1.76 3.173 1.957.395.197.624.165.853-.099.229-.261.989-1.155 1.253-1.552.261-.395.523-.328.88-.197.357.131 2.277 1.075 2.667 1.269.389.197.651.293.747.456.096.165.096.949-.229 1.867z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-400 block">{t.staticExtras.directContactShortLabel}</span>
                  <span className="font-bold text-emerald-950 dark:text-emerald-300 font-mono" dir="ltr">+{siteSettings.whatsappPhone.replace(/\D/g, '')}</span>
                </div>
              </a>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1E293B] flex items-center gap-3 border border-slate-200 dark:border-slate-700">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{t.staticExtras.officialEmailLabel}</span>
                  <span className="font-bold text-slate-900 dark:text-white text-[11px] truncate block" dir="ltr">{siteSettings.officialEmail}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1E293B] flex items-center gap-3 border border-slate-200 dark:border-slate-700">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{t.staticExtras.hqLabel}</span>
                  <span className="font-bold text-slate-900 dark:text-white text-[11px]">
                    {(siteSettings.addressMultilingual && siteSettings.addressMultilingual[language]) || siteSettings.address}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <div className="md:col-span-2 bg-white dark:bg-[#0F172A] p-6 sm:p-8 rounded-3xl border border-[#E8E4DD] dark:border-slate-800 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{t.contactModal.formTitle}</h2>

          {sentSuccess && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{t.contactModal.sentSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t.checkout.fullName} *</label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  placeholder={t.staticExtras.namePlaceholder}
                  className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white focus:outline-hidden focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t.checkout.phone} *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+216 21 000 000"
                  className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white focus:outline-hidden focus:border-[#FF6B00]"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t.contactModal.subject}</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder={t.staticExtras.subjectPlaceholder}
                className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white focus:outline-hidden focus:border-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t.contactModal.message} *</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t.staticExtras.messagePlaceholder}
                className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white focus:outline-hidden focus:border-[#FF6B00]"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{t.contactModal.sendBtn}</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
