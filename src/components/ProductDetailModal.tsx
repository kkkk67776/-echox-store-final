import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  X, 
  Star, 
  ShoppingBag, 
  Truck, 
  ShieldCheck, 
  Building2, 
  MapPin, 
  Heart, 
  Share2, 
  CheckCircle,
  Plus,
  Minus,
  MessageSquare
} from 'lucide-react';
import { getGovernorateName } from '../data/governorates';

export const ProductDetailModal: React.FC = () => {
  const { 
    selectedProductId, 
    setSelectedProductId, 
    products, 
    language, 
    t, 
    addToCart, 
    wishlist, 
    toggleWishlist, 
    addProductReview,
    setIsCartOpen
  } = useStore();

  const product = products.find(p => p.id === selectedProductId);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewSuccess, setShowReviewSuccess] = useState(false);

  if (!product) return null;

  const isWishlisted = wishlist.includes(product.id);
  const discountPercent = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const relatedProducts = products
    .filter(p => p.id !== product.id && p.category === product.category)
    .slice(0, 3);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewAuthor.trim() || !reviewComment.trim()) return;

    addProductReview(product.id, {
      authorName: reviewAuthor.trim(),
      rating: reviewRating,
      comment: reviewComment.trim(),
      verifiedPurchase: true
    });

    setReviewAuthor('');
    setReviewComment('');
    setShowReviewSuccess(true);
    setTimeout(() => setShowReviewSuccess(false), 3000);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    setSelectedProductId(null);
    setIsCartOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div 
        className="bg-white dark:bg-[#0F172A] w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative my-auto max-h-[92vh] flex flex-col text-[#0F172A] dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => setSelectedProductId(null)}
          aria-label="Close modal"
          className="absolute top-4 left-4 sm:top-5 sm:left-5 z-20 w-10 h-10 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white flex items-center justify-center shadow-md transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-5 sm:p-8 space-y-8">
          
          {/* Main 2-Column Product Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Column 1: Multi-Image Gallery (7 cols on desktop) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="relative aspect-4/3 rounded-2xl bg-[#F5F2EB] dark:bg-[#1E293B] overflow-hidden border border-[#E8E4DD] dark:border-slate-700">
                <img 
                  src={product.images[activeImageIndex] || product.images[0]} 
                  alt={product.name[language]}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center transition-all duration-300"
                />

                {discountPercent > 0 && (
                  <span className={`absolute top-4 ${language === 'ar' ? 'right-4' : 'left-4'} bg-[#FF6B00] text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-sm`}>
                    -{discountPercent}% {t.product.discountOff}
                  </span>
                )}
              </div>

              {/* Thumbnails row */}
              {product.images.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        activeImageIndex === idx ? 'border-[#FF6B00] ring-2 ring-[#FF6B00]/20' : 'border-[#E8E4DD] dark:border-slate-700 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img 
                        src={img} 
                        alt="Thumbnail" 
                        referrerPolicy="no-referrer" 
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Trust Badges Strip */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                <div className="p-3 bg-slate-50 dark:bg-[#1E293B] rounded-xl text-xs space-y-1 border border-transparent dark:border-slate-800">
                  <ShieldCheck className="w-5 h-5 text-[#FF6B00] mx-auto" />
                  <p className="font-bold text-slate-800 dark:text-slate-100">ضمان أصلي 100%</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">مرفق بشهادة المصنع</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#1E293B] rounded-xl text-xs space-y-1 border border-transparent dark:border-slate-800">
                  <Truck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <p className="font-bold text-slate-800 dark:text-slate-100">توصيل 24 ولاية</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">خلال 24-48 ساعة</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#1E293B] rounded-xl text-xs space-y-1 border border-transparent dark:border-slate-800">
                  <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto" />
                  <p className="font-bold text-slate-800 dark:text-slate-100">معاينة قبل الدفع</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">دفع عند الاستلام</p>
                </div>
              </div>
            </div>

            {/* Column 2: Product Purchase Module (5 cols on desktop) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Company & Governorate meta */}
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 font-semibold text-[#FF6B00]">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{product.companyName}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{getGovernorateName(product.governorate, language)}</span>
                </span>
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">
                {product.name[language]}
              </h1>

              {/* Ratings and Reviews count */}
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-amber-500' : 'text-slate-300 dark:text-slate-600'}`} 
                    />
                  ))}
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200">{product.rating}</span>
                <span className="text-slate-500 dark:text-slate-400">({product.reviewCount} {t.product.reviewSingular})</span>
              </div>

              {/* Price Block */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1E293B] border border-[#E8E4DD] dark:border-slate-800 space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                    {product.price.toFixed(3)}
                  </span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t.cart.currency}</span>
                  
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-sm text-slate-400 line-through tabular-nums mr-2">
                      {product.originalPrice.toFixed(3)} {t.cart.currency}
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                  {product.stock > 0 
                    ? `✓ ${t.product.inStock} (${product.stock} ${t.product.inStockCount || 'قطع متاحة للتسليم الفوري'})` 
                    : `✕ ${t.product.outOfStock}`}
                </p>
              </div>

              {/* Quantity Stepper & Actions */}
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t.product.quantity}</span>
                  <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-[#0F172A]">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 text-sm font-bold tabular-nums text-slate-900">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="p-2 text-slate-600 hover:bg-slate-100 transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Wishlist Button */}
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-red-500 transition-colors"
                    aria-label="Wishlist"
                  >
                    <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => addToCart(product, quantity)}
                    disabled={product.stock <= 0}
                    className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{t.product.addToCart}</span>
                  </button>
                  <button
                    onClick={handleBuyNow}
                    disabled={product.stock <= 0}
                    className="py-3 px-4 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <span>{t.product.buyNow}</span>
                  </button>
                </div>
              </div>

              {/* Specs Table */}
              {product.specs && product.specs.length > 0 && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                  <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800">
                    {t.product.specs}
                  </div>
                  <div className="divide-y divide-slate-100 bg-white">
                    {product.specs.map((spec, i) => (
                      <div key={i} className="grid grid-cols-2 px-4 py-2.5">
                        <span className="text-slate-500 font-medium">{spec.key[language]}</span>
                        <span className="font-semibold text-slate-900">{spec.value[language]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Description Section */}
          <div className="pt-6 border-t border-slate-200 space-y-3">
            <h2 className="text-lg font-bold text-slate-900">{t.product.description}</h2>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-3xl">
              {product.description[language]}
            </p>
          </div>

          {/* Customer Reviews & Add Review Section */}
          <div className="pt-6 border-t border-slate-200 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#FF6B00]" />
                <span>{t.product.reviews}</span>
              </h2>
              <span className="text-xs text-slate-500">
                {product.reviews.length} {t.product.reviewSingular}
              </span>
            </div>

            {/* Existing Reviews List */}
            <div className="space-y-3">
              {product.reviews.length === 0 ? (
                <p className="text-sm text-slate-500 py-3">{t.product.noReviewsYet}</p>
              ) : (
                product.reviews.map(rev => (
                  <div key={rev.id} className="p-4 rounded-xl bg-[#FAF8F5] border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{rev.authorName}</span>
                        {rev.verifiedPurchase && (
                          <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                            {t.product.verifiedPurchase}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-500' : 'text-slate-300'}`} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700">{rev.comment}</p>
                    <span className="text-[11px] text-slate-400 block">{rev.date}</span>
                  </div>
                ))
              )}
            </div>

            {/* Add Review Form */}
            <div className="p-5 rounded-2xl bg-white border border-[#E8E4DD] space-y-4">
              <h3 className="text-sm font-bold text-slate-900">{t.product.addReviewTitle}</h3>
              {showReviewSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold">
                  {t.product.reviewSubmitted}
                </div>
              )}
              <form onSubmit={handleReviewSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t.product.yourName}</label>
                    <input 
                      type="text" 
                      required 
                      value={reviewAuthor} 
                      onChange={e => setReviewAuthor(e.target.value)} 
                      placeholder={t.product.namePlaceholder} 
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#FF6B00]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t.product.yourRating}</label>
                    <select 
                      value={reviewRating} 
                      onChange={e => setReviewRating(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#FF6B00] bg-white"
                    >
                      <option value="5">{t.product.rating5}</option>
                      <option value="4">{t.product.rating4}</option>
                      <option value="3">{t.product.rating3}</option>
                      <option value="2">{t.product.rating2}</option>
                      <option value="1">{t.product.rating1}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.product.yourComment}</label>
                  <textarea 
                    required 
                    rows={2} 
                    value={reviewComment} 
                    onChange={e => setReviewComment(e.target.value)} 
                    placeholder={t.product.commentPlaceholder} 
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#FF6B00]" 
                  />
                </div>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-xl bg-[#0B0F17] hover:bg-[#FF6B00] text-white text-xs font-bold transition-colors"
                >
                  {t.product.submitReview}
                </button>
              </form>
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <h2 className="text-base font-bold text-slate-900">{t.product.relatedProducts}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {relatedProducts.map(rel => (
                  <div 
                    key={rel.id} 
                    onClick={() => {
                      setSelectedProductId(rel.id);
                      setActiveImageIndex(0);
                    }}
                    className="p-3 rounded-xl border border-[#E8E4DD] hover:border-[#FF6B00] bg-[#FAF8F5] cursor-pointer transition-all flex items-center gap-3"
                  >
                    <img 
                      src={rel.images[0]} 
                      alt={rel.name[language]} 
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-lg object-cover" 
                    />
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-900 truncate">{rel.name[language]}</p>
                      <p className="text-xs font-black text-[#FF6B00] tabular-nums">{rel.price.toFixed(3)} {t.cart.currency}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
