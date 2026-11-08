import React from 'react';
import { ShoppingBag, Heart, User, Phone } from 'lucide-react';

interface StoreNavigationProps {
  onNavigate: (view: string) => void;
  cartCount?: number;
  wishlistCount?: number;
}

export default function StoreNavigation({ onNavigate, wishlistCount }: StoreNavigationProps) {
  return (
    <div className="flex flex-col space-y-3 p-4 bg-[#0A0A0F] text-white">
      {/* روابط المتجر الأساسية */}
      <button 
        type="button"
        onClick={() => onNavigate('store')}
        className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition text-sm text-gray-300 cursor-pointer text-start"
      >
        <ShoppingBag className="w-4 h-4 text-[#F59E0B]" />
        <span>المتجر</span>
      </button>

      <button 
        type="button"
        onClick={() => onNavigate('wishlist')}
        className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition text-sm text-gray-300 cursor-pointer text-start"
      >
        <Heart className="w-4 h-4 text-[#F59E0B]" />
        <span>المفضلة ({wishlistCount || 0})</span>
      </button>

      <button 
        type="button"
        onClick={() => onNavigate('account')}
        className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition text-sm text-gray-300 cursor-pointer text-start"
      >
        <User className="w-4 h-4 text-[#F59E0B]" />
        <span>حسابي (تسجيل الدخول)</span>
      </button>

      <button 
        type="button"
        onClick={() => onNavigate('contact')}
        className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition text-sm text-gray-300 cursor-pointer text-start"
      >
        <Phone className="w-4 h-4 text-[#F59E0B]" />
        <span>اتصل بنا مباشرة</span>
      </button>

      {/* تم إخفاء زر "غرفة المالك" نهائياً من هنا لضمان السرية التامة */}
    </div>
  );
}
