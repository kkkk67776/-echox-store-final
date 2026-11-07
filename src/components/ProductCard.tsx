import React from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { Heart, ShoppingBag, Eye, Star } from 'lucide-react';
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

  const isWishlisted = wishlist.includes(product.id);
  const discountPercent = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="group bg-white rounded-2xl border border-[#E8E4DD] hover:border-[#D0C9BD] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden relative">
      {/* 1. Image Container */}
      <div 
        onClick={() => setSelectedProductId(product.id)}
        className="relative w-full aspect-4/3 bg-[#F4F1EA] overflow-hidden cursor-pointer"
      >
        <img 
          src={product.images[0] || '/assets/aistudio/file_0000000048188243bc0b721218c854fc_ea3ea21d.png'} 
          alt={product.name[language]}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className={`absolute top-3 ${language === 'ar' ? 'right-3' : 'left-3'} bg-[#FF6B00] text-white text-[11px] font-black px-2.5 py-1 rounded-md shadow-xs`}>
            -{discountPercent}%
          </div>
        )}

        {/* Wishlist Quick Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          aria-label="Toggle Wishlist"
          className={`absolute top-3 ${language === 'ar' ? 'left-3' : 'right-3'} w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all shadow-xs ${
            isWishlisted ? 'text-red-500' : 'text-slate-500 hover:text-red-500'
          }`}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500' : ''}`} />
        </button>

        {/* Quick View Overlay on Hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="bg-white/95 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
            <Eye className="w-3.5 h-3.5" />
            <span>معاينة وتفاصيل</span>
          </span>
        </div>
      </div>

      {/* 2. Product Information */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata: Company · Origin Governorate · Stock */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5 font-medium flex-wrap">
            <span className="text-[#FF6B00] font-semibold">{product.companyName}</span>
            <span aria-hidden="true">·</span>
            <span>{getGovernorateName(product.governorate, language)}</span>
            <span aria-hidden="true">·</span>
            <span className={product.stock > 0 ? 'text-emerald-700' : 'text-red-600'}>
              {product.stock > 0 ? t.product.inStock : t.product.outOfStock}
            </span>
          </div>

          {/* Product Title */}
          <h3 
            onClick={() => setSelectedProductId(product.id)}
            className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#FF6B00] transition-colors line-clamp-2 cursor-pointer leading-snug mb-2"
          >
            {product.name[language]}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-3">
            <div className="flex items-center text-amber-500">
              <Star className="w-3.5 h-3.5 fill-amber-500" />
            </div>
            <span className="font-bold text-slate-800">{product.rating}</span>
            <span className="text-slate-400">({product.reviewCount})</span>
          </div>
        </div>

        {/* Pricing & Add to Cart Action */}
        <div className="pt-3 border-t border-[#F0ECE1] flex items-center justify-between gap-2 mt-auto">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
                {product.price.toFixed(3)}
              </span>
              <span className="text-xs font-bold text-slate-600">{t.cart.currency}</span>
            </div>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-slate-400 line-through tabular-nums block">
                {product.originalPrice.toFixed(3)} {t.cart.currency}
              </span>
            )}
          </div>

          <button
            onClick={() => addToCart(product, 1)}
            disabled={product.stock <= 0}
            className="h-10 px-3.5 sm:px-4 rounded-xl bg-[#0B0F17] hover:bg-[#FF6B00] text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{t.product.addToCart}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
