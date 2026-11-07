import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowLeft, 
  ArrowRight, 
  Tag, 
  CheckCircle2, 
  Truck 
} from 'lucide-react';

interface CartDrawerProps {
  onOpenCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onOpenCheckout }) => {
  const { 
    isCartOpen, 
    setIsCartOpen, 
    cart, 
    removeFromCart, 
    updateCartQuantity, 
    language, 
    t, 
    cartSubtotal, 
    cartShippingFee, 
    cartDiscountAmount, 
    cartTotal,
    couponCode,
    applyCoupon,
    siteSettings
  } = useStore();

  const [inputCoupon, setInputCoupon] = useState('');
  const [couponError, setCouponError] = useState(false);
  const [couponSuccess, setCouponSuccess] = useState(false);

  if (!isCartOpen) return null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCoupon.trim()) return;
    const success = applyCoupon(inputCoupon);
    if (success) {
      setCouponSuccess(true);
      setCouponError(false);
      setInputCoupon('');
    } else {
      setCouponError(true);
      setCouponSuccess(false);
    }
  };

  const freeDeliveryThreshold = siteSettings.freeShippingThreshold;
  const progressToFreeDelivery = Math.min(100, (cartSubtotal / freeDeliveryThreshold) * 100);
  const amountLeftForFreeDelivery = Math.max(0, freeDeliveryThreshold - cartSubtotal);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-[#E8E4DD] animate-slideLeft"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#E8E4DD] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#FF6B00]" />
            <h2 className="text-base font-bold text-slate-900">{t.cart.title}</h2>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-200/60 transition-colors"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Delivery Meter */}
        <div className="p-4 bg-[#FAF8F5]/80 border-b border-[#E8E4DD] space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1">
              <Truck className="w-4 h-4 text-[#FF6B00]" />
              {amountLeftForFreeDelivery === 0 ? (
                <span className="text-emerald-700 font-bold">تهانينا! مؤهل للتوصيل المجاني لكافة ولايات تونس ✓</span>
              ) : (
                <span>أضف <strong className="text-[#FF6B00] tabular-nums">{amountLeftForFreeDelivery.toFixed(3)} {t.cart.currency}</strong> لتحصل على توصيل مجاني!</span>
              )}
            </span>
            <span className="text-[11px] text-slate-500 tabular-nums">{Math.round(progressToFreeDelivery)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#FF6B00] transition-all duration-500 rounded-full"
              style={{ width: `${progressToFreeDelivery}%` }}
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-[#F0ECE1]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-slate-700">{t.cart.empty}</p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-xs font-bold text-[#FF6B00] hover:underline"
              >
                {t.cart.startShopping}
              </button>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="py-3.5 flex items-center gap-3">
                <img 
                  src={item.product.images[0] || '/assets/aistudio/file_0000000048188243bc0b721218c854fc_ea3ea21d.png'} 
                  alt={item.product.name[language]}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                />
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {item.product.name[language]}
                  </h4>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span className="font-black text-slate-900 tabular-nums">
                      {item.product.price.toFixed(3)} {t.cart.currency}
                    </span>
                    <span className="text-[11px] text-slate-400">× {item.quantity}</span>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                      <button
                        onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                        className="p-1 text-slate-600 hover:bg-slate-100"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2.5 text-xs font-bold tabular-nums text-slate-900">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                        className="p-1 text-slate-600 hover:bg-slate-100"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Totals and Checkout CTA */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-[#E8E4DD] bg-[#FAF8F5] space-y-4">
            
            {/* Promo code form */}
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="كود الخصم (جرب ECHOX2026)"
                  value={inputCoupon}
                  onChange={e => setInputCoupon(e.target.value)}
                  className="w-full text-xs py-2 px-3 pl-8 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6B00]"
                />
                <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
              <button
                type="submit"
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                {t.cart.applyCoupon}
              </button>
            </form>
            {couponSuccess && (
              <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t.cart.couponApplied}
              </p>
            )}
            {couponError && (
              <p className="text-[11px] text-red-600 font-bold">
                {t.cart.invalidCoupon}
              </p>
            )}

            {/* Price Calculations */}
            <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200">
              <div className="flex justify-between">
                <span>{t.cart.subtotal}</span>
                <span className="font-bold text-slate-900 tabular-nums">{cartSubtotal.toFixed(3)} {t.cart.currency}</span>
              </div>
              {cartDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>{t.cart.discount}</span>
                  <span className="tabular-nums">-{cartDiscountAmount.toFixed(3)} {t.cart.currency}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{t.cart.shipping}</span>
                <span className="font-bold tabular-nums">
                  {cartShippingFee === 0 ? (
                    <span className="text-emerald-700">{t.cart.freeShipping}</span>
                  ) : (
                    `${cartShippingFee.toFixed(3)} ${t.cart.currency}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>{t.cart.total}</span>
                <span className="text-[#FF6B00] text-base tabular-nums">{cartTotal.toFixed(3)} {t.cart.currency}</span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              onClick={() => {
                setIsCartOpen(false);
                onOpenCheckout();
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>{t.cart.proceedToCheckout}</span>
              {language === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
