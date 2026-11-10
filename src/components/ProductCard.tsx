import React from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { Heart, ShoppingBag, Star, Check } from 'lucide-react';
import { getGovernorateName } from '../data/governorates';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { 
    language, 
    t, 
    setSelectedProductId, 
    addToCart, 
    wishlist, 
    toggleWishlist 
  } = useStore();

  const [isAddedRecently, setIsAddedRecently] = React.useState(false);
  const isWishlisted = wishlist.includes(product.id);
  const discountPercent = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
    setIsAddedRecently(true);
    setTimeout(() => setIsAddedRecently(false), 1200);
  };

  const prodName = product.name?.[language] || (typeof (product as any).name === 'string' ? (product as any).name : product.name?.ar);

  return (
    <div className="group bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl border border-[#E2E8F0] dark:border-slate-800 hover:border-[#CBD5E1] dark:hover:border-slate-700 p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-200 hover:shadow-md relative overflow-hidden">
      
      <div>
        {/* 1. حاوية الصورة المربعة بنسبة (1:1) بزوايا دائرية ناعمة (Squircle) وخلفية بيضاء */}
        <div 
          onClick={() => setSelectedProductId(product.id)}
          className="relative w-full aspect-square bg-white dark:bg-[#0F172A] rounded-2xl overflow-hidden cursor-pointer p-2 flex items-center justify-center border border-[#F1F5F9] dark:border-slate-700/60"
        >
          <img 
            src={product.images[0] || '/assets/aistudio/file_0000000048188243bc0b721218c854fc_ea3ea21d.png'} 
            alt={prodName}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />

          {/* شارة التخفيض المئوية بلون الشعار */}
          {discountPercent > 0 && (
            <div className={`absolute top-2 ${language === 'ar' ? 'right-2' : 'left-2'} bg-[#FF6B00] text-white text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 rounded-md shadow-xs`}>
              -{discountPercent}%
            </div>
          )}

          {/* زر المفضلة السريع */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            aria-label="Toggle Wishlist"
            className={`absolute top-2 ${language === 'ar' ? 'left-2' : 'right-2'} w-7 h-7 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 flex items-center justify-center transition-all shadow-xs cursor-pointer ${
              isWishlisted ? 'text-red-500' : 'text-slate-400 hover:text-red-500'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-red-500' : ''}`} />
          </button>
        </div>

        {/* 2. بيانات المنتج الأساسية */}
        <div className="pt-2 px-0.5">
          {/* الشركة والمنشأ */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-1 gap-1">
            <span className="text-[#FF6B00] truncate">{product.companyName}</span>
            <span className="truncate text-slate-400 dark:text-slate-500">{getGovernorateName(product.governorate, language)}</span>
          </div>

          {/* اسم المنتج في سطرين كحد أقصى */}
          <h3 
            onClick={() => setSelectedProductId(product.id)}
            className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-slate-100 group-hover:text-[#FF6B00] transition-colors line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] leading-snug cursor-pointer mb-1.5"
            title={prodName}
          >
            {prodName}
          </h3>

          {/* تقييم النجوم الخفيف */}
          <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 mb-2">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
            <span className="font-bold text-[#0F172A] dark:text-slate-200">{product.rating || '4.9'}</span>
            <span className="text-[10px] text-slate-400">({product.reviewCount || 12})</span>
          </div>

          {/* الأسعار بالدينار التونسي */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm sm:text-base font-black text-[#FF6B00] tabular-nums font-mono">
              {product.price.toFixed(3)}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-400">{t.cart.currency}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-[10px] sm:text-xs text-slate-400 line-through tabular-nums">
                {product.originalPrice.toFixed(3)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. زر أضف للسلة العريض وسهل الضغط بالإبهام */}
      <div className="pt-2 mt-auto">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={product.stock <= 0}
          className={`w-full py-2 sm:py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
            isAddedRecently 
              ? 'bg-emerald-600 text-white' 
              : 'bg-[#FF6B00] hover:bg-[#E05E00] text-white'
          }`}
        >
          {isAddedRecently ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>تمت الإضافة ✓</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{t.product.addToCart}</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
