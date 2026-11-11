import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  X, 
  CheckCircle2, 
  Truck, 
  CreditCard, 
  Banknote, 
  Wallet, 
  MapPin, 
  Phone, 
  User, 
  Mail, 
  FileText,
  Copy,
  Check
} from 'lucide-react';
import { TUNISIAN_GOVERNORATES } from '../data/governorates';
import { Order } from '../types';

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
    cartTotal,
    createOrder,
    currentUser,
    setCurrentView
  } = useStore();

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [governorate, setGovernorate] = useState(TUNISIAN_GOVERNORATES[0].id);
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [street, setStreet] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'konnect' | 'flouci'>('cod');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const selectedGovObj = TUNISIAN_GOVERNORATES.find(g => g.id === governorate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !governorate || !city || !street) {
      alert(t.checkout.requiredFieldsAlert || 'يرجى ملء جميع الحقول الإلزامية للعنوان التونسي.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const order = createOrder({
        customerName: fullName,
        customerEmail: email,
        customerPhone: phone,
        shippingAddress: {
          id: `addr_${Date.now()}`,
          isDefault: true,
          fullName,
          phone,
          governorate,
          city,
          postalCode: postalCode || (selectedGovObj ? `${selectedGovObj.postalCodePrefix}00` : '1000'),
          street,
          notes
        },
        paymentMethod,
        carrierName: 'Aramex Tunisie Logistics',
        notes
      });
      setIsSubmitting(false);
      setCompletedOrder(order);
    }, 800);
  };

  const copyTracking = () => {
    if (completedOrder) {
      navigator.clipboard.writeText(completedOrder.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTrackOrderNow = () => {
    onClose();
    setCurrentView('my_orders');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative my-auto max-h-[95vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#E8E4DD] flex items-center justify-between bg-[#FAF8F5]">
          <h2 className="text-lg font-black text-slate-900">{t.checkout.title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-200/60"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 sm:p-8">
          {completedOrder ? (
            /* Order Success View */
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900">{t.checkout.successTitle}</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  {t.checkout.successMsg}
                </p>
              </div>

              {/* Tracking Number Card */}
              <div className="max-w-md mx-auto p-5 rounded-2xl bg-[#FAF8F5] border-2 border-[#E8E4DD] space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  {t.checkout.orderNumberIs}
                </span>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-black text-[#FF6B00] tracking-wider font-mono">
                    {completedOrder.trackingNumber}
                  </span>
                  <button
                    onClick={copyTracking}
                    className="p-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-600 text-xs flex items-center gap-1"
                    title="نسخ رقم التتبع"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  المبلغ الإجمالي المستحق عند الاستلام: <strong className="text-slate-900">{completedOrder.totalAmount.toFixed(3)} {t.cart.currency}</strong>
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
                <button
                  onClick={handleTrackOrderNow}
                  className="px-6 py-3 rounded-xl bg-[#0B0F17] hover:bg-[#FF6B00] text-white font-bold text-sm transition-colors shadow-sm"
                >
                  {t.checkout.trackOrderBtn}
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-colors"
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
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <MapPin className="w-4 h-4 text-[#FF6B00]" />
                  <span>{t.checkout.step1}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.checkout.fullName} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="الاسم واللقب الكامل"
                        className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6B00]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.checkout.phone} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="مثال: +216 21 511 162"
                        className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6B00]"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.checkout.governorate} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={governorate}
                      onChange={e => setGovernorate(e.target.value)}
                      className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6B00] bg-white"
                    >
                      {TUNISIAN_GOVERNORATES.map(gov => (
                        <option key={gov.id} value={gov.id}>
                          {language === 'fr' ? gov.nameFr : language === 'en' ? gov.nameEn : gov.nameAr} ({gov.deliveryEstimateDays})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.checkout.city} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="مثال: المرسى / سكرة"
                      className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6B00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.checkout.postalCode}
                    </label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={e => setPostalCode(e.target.value)}
                      placeholder="4 أرقام (مثال: 2070)"
                      className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6B00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.checkout.street} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={e => setStreet(e.target.value)}
                    placeholder="نهج، رقم الإقامة أو علامة مميزة بالقرب من المكان"
                    className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.checkout.notes}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="أي ملاحظات لساعي التوصيل (مثال: الاتصال قبل نصف ساعة)"
                    className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              {/* Step 2: Payment Method */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#FF6B00]" />
                  <span>{t.checkout.paymentMethod}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* COD */}
                  <label 
                    className={`p-4 rounded-2xl border-2 cursor-pointer flex flex-col justify-between transition-all ${
                      paymentMethod === 'cod' ? 'border-[#FF6B00] bg-[#FF6B00]/5 ring-2 ring-[#FF6B00]/10' : 'border-slate-200 hover:border-slate-300'
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
                      <p className="text-xs font-bold text-slate-900">{t.checkout.cod}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{t.checkout.codNote}</p>
                    </div>
                  </label>

                  {/* Konnect */}
                  <label 
                    className={`p-4 rounded-2xl border-2 cursor-pointer flex flex-col justify-between transition-all ${
                      paymentMethod === 'konnect' ? 'border-[#FF6B00] bg-[#FF6B00]/5 ring-2 ring-[#FF6B00]/10' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      <input 
                        type="radio" 
                        name="paymentMethod" 
                        checked={paymentMethod === 'konnect'} 
                        onChange={() => setPaymentMethod('konnect')} 
                        className="accent-[#FF6B00]" 
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{t.checkout.konnect || 'بوابة Konnect تونس'}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{t.checkout.konnectNote || 'بطاقات بنكية / E-Dinar البريد التونسي'}</p>
                    </div>
                  </label>

                  {/* Flouci */}
                  <label 
                    className={`p-4 rounded-2xl border-2 cursor-pointer flex flex-col justify-between transition-all ${
                      paymentMethod === 'flouci' ? 'border-[#FF6B00] bg-[#FF6B00]/5 ring-2 ring-[#FF6B00]/10' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Wallet className="w-5 h-5 text-purple-600" />
                      <input 
                        type="radio" 
                        name="paymentMethod" 
                        checked={paymentMethod === 'flouci'} 
                        onChange={() => setPaymentMethod('flouci')} 
                        className="accent-[#FF6B00]" 
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{t.checkout.flouci || 'محفظة Flouci الرقمية'}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{t.checkout.flouciNote || 'الدفع السريع بالهاتف في تونس'}</p>
                    </div>
                  </label>
                </div>

                <p className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  🔒 {t.checkout.securePaymentNote}
                </p>
              </div>

              {/* Order Total Review */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DD] flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">{t.checkout.totalPayable || 'المبلغ المطلوب سداده:'}</span>
                  <span className="text-xl font-black text-[#FF6B00] tabular-nums">
                    {cartTotal.toFixed(3)} {t.cart.currency}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || cart.length === 0}
                  className="py-3 px-6 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <span>{isSubmitting ? t.checkout.submitting : t.checkout.confirmOrder}</span>
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
};
