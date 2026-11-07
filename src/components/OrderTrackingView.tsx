import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Search, 
  Package, 
  Clock, 
  PhoneCall, 
  Truck, 
  CheckCircle, 
  XCircle, 
  MapPin, 
  CreditCard,
  MessageCircle
} from 'lucide-react';
import { getGovernorateName } from '../data/governorates';
import { OrderStatus } from '../types';

export const OrderTrackingView: React.FC = () => {
  const { orders, language, t, siteSettings } = useStore();

  const [inputCode, setInputCode] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<typeof orders[0] | null>(() => {
    // Default to the first demo order so user sees the active timeline immediately
    return orders[0] || null;
  });
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    const clean = inputCode.trim().toUpperCase();
    const found = orders.find(o => o.trackingNumber.toUpperCase() === clean);
    setSearchedOrder(found || null);
    setHasSearched(true);
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
    return statusSteps.findIndex(s => s.key === status);
  };

  const currentStepIndex = searchedOrder ? getStatusIndex(searchedOrder.status) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn">
      
      {/* Title & Search Box */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          {t.tracking.title}
        </h1>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">
          {t.tracking.subtitle}
        </p>

        <form onSubmit={handleSearch} className="max-w-md mx-auto flex gap-2 pt-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="مثال: ECH-TN-981240"
              value={inputCode}
              onChange={e => setInputCode(e.target.value)}
              className="w-full text-sm py-3 px-4 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6B00] shadow-xs text-center font-mono font-bold uppercase"
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-[#0B0F17] hover:bg-[#FF6B00] text-white font-bold text-sm rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            <span>{t.tracking.searchBtn}</span>
          </button>
        </form>

        {/* Demo order quick links */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-1">
          <span>أو جرب طلبات تجريبية:</span>
          {orders.slice(0, 2).map(o => (
            <button
              key={o.id}
              onClick={() => {
                setInputCode(o.trackingNumber);
                setSearchedOrder(o);
                setHasSearched(true);
              }}
              className="text-[#FF6B00] font-bold underline hover:opacity-80 font-mono"
            >
              {o.trackingNumber}
            </button>
          ))}
        </div>
      </div>

      {/* Result Container */}
      {searchedOrder ? (
        <div className="bg-white rounded-3xl border border-[#E8E4DD] shadow-md p-6 sm:p-8 space-y-8">
          
          {/* Order Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs text-slate-500 block">رقم التتبع السيادي:</span>
              <span className="text-xl sm:text-2xl font-black text-[#FF6B00] font-mono tracking-wider">
                {searchedOrder.trackingNumber}
              </span>
              <p className="text-xs text-slate-500 mt-1">
                تاريخ الطلب: {new Date(searchedOrder.createdAt).toLocaleDateString('ar-TN')} · الناقل: {searchedOrder.carrierName}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`tel:${siteSettings.supportPhone}`}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span>استفسار هاتفي</span>
              </a>
              <a
                href={`https://wa.me/${siteSettings.whatsappPhone}?text=استفسار%20بخصوص%20الطلب%20${searchedOrder.trackingNumber}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>واتساب</span>
              </a>
            </div>
          </div>

          {/* Stepper Timeline */}
          {searchedOrder.status === 'cancelled' ? (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-800">
              <XCircle className="w-6 h-6 text-red-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">هذا الطلب ملغى</p>
                <p className="text-xs text-red-700">تم إلغاء الطلب بناءً على رغبة الحريف أو عدم توفر المنتج.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">{t.tracking.orderTimeline}</h3>
              
              <div className="relative">
                {/* Horizontal progress bar for desktop */}
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
                              ? 'bg-emerald-50/60 border-emerald-300' 
                              : 'bg-slate-50 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCompleted ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                        }`}>
                          {isCompleted ? '✓' : idx + 1}
                        </div>
                        <span className="text-xs font-bold text-slate-900 leading-tight">
                          {step.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] bg-[#FF6B00] text-white px-2 py-0.5 rounded-full font-bold">
                            الحالة الحالية
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status History Logs */}
              {searchedOrder.statusHistory && searchedOrder.statusHistory.length > 0 && (
                <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E4DD] space-y-2 text-xs">
                  <span className="font-bold text-slate-800 block">سجل التحديثات الحية:</span>
                  <div className="space-y-1.5">
                    {searchedOrder.statusHistory.map((sh, i) => (
                      <div key={i} className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
                        <span className="font-mono text-[11px] text-slate-400">
                          {new Date(sh.timestamp).toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {t.orderStatus[sh.status] || sh.status}:
                        </span>
                        <span>{sh.note || 'تم تحديث المرحلة بنجاح'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2-Column: Delivery Info & Itemized Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            
            {/* Delivery Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#FF6B00]" />
                <span>{t.tracking.deliveryAddress}</span>
              </h3>
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-slate-200 text-xs space-y-1.5 text-slate-700">
                <p><strong className="text-slate-900">المستلم:</strong> {searchedOrder.customerName}</p>
                <p><strong className="text-slate-900">الهاتف:</strong> <span dir="ltr">{searchedOrder.customerPhone}</span></p>
                <p><strong className="text-slate-900">الولاية:</strong> {getGovernorateName(searchedOrder.shippingAddress.governorate, language)}</p>
                <p><strong className="text-slate-900">المدينة / الترقيم:</strong> {searchedOrder.shippingAddress.city} ({searchedOrder.shippingAddress.postalCode})</p>
                <p><strong className="text-slate-900">النهج:</strong> {searchedOrder.shippingAddress.street}</p>
                {searchedOrder.notes && (
                  <p className="pt-1 text-[#FF6B00]"><strong className="text-slate-900">ملاحظات:</strong> {searchedOrder.notes}</p>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#FF6B00]" />
                <span>{t.tracking.orderDetails}</span>
              </h3>
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-slate-200 text-xs divide-y divide-slate-200">
                {searchedOrder.items.map((it, i) => (
                  <div key={i} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <img 
                        src={it.productImage || '/assets/aistudio/file_0000000048188243bc0b721218c854fc_ea3ea21d.png'} 
                        alt="item" 
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover bg-white border border-slate-200 shrink-0" 
                      />
                      <div>
                        <p className="font-bold text-slate-900">
                          {typeof it.productName === 'string' ? it.productName : (it.productName?.[language] || it.productName?.ar || '')}
                        </p>
                        <p className="text-slate-500 text-[11px]">{it.quantity} × {it.unitPrice.toFixed(3)} {t.cart.currency}</p>
                      </div>
                    </div>
                    <span className="font-black text-slate-900 tabular-nums">
                      {it.totalPrice.toFixed(3)} {t.cart.currency}
                    </span>
                  </div>
                ))}

                <div className="pt-3 mt-2 space-y-1">
                  <div className="flex justify-between font-bold text-slate-900 text-sm">
                    <span>{t.tracking.total}</span>
                    <span className="text-[#FF6B00] tabular-nums">{searchedOrder.totalAmount.toFixed(3)} {t.cart.currency}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>طريقة الدفع:</span>
                    <span className="font-bold text-slate-700">
                      {searchedOrder.paymentMethod === 'cod' ? 'دفع عند الاستلام' : searchedOrder.paymentMethod}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      ) : hasSearched ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-red-200 text-slate-700 space-y-2">
          <p className="font-bold text-red-600">{t.tracking.orderNotFound}</p>
          <p className="text-xs text-slate-500">يرجى التأكد من كتابة الرمز كاملاً بصيغة: ECH-TN-XXXXXX</p>
        </div>
      ) : null}

    </div>
  );
};
