import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Truck,
  Banknote,
  Headphones,
  Check,
  Plus
} from 'lucide-react';
import { TUNISIAN_GOVERNORATES } from '../data/governorates';
import { Product } from '../types';

export const StorefrontView: React.FC = () => {
  const { 
    products, 
    language, 
    t, 
    searchQuery, 
    selectedCategory, 
    setSelectedCategory,
    setSelectedProductId,
    addToCart,
    banners
  } = useStore();

  const [selectedGovFilter, setSelectedGovFilter] = useState<string>('all');
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    addToCart(product, 1);
    setAddedItemIds(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItemIds(prev => ({ ...prev, [product.id]: false }));
    }, 1200);
  };

  // Filter products by category, search query, active status, and governorate
  const filteredProducts = products.filter(product => {
    if (!product.active) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = product.name[language]?.toLowerCase().includes(q) ||
        product.name.ar.toLowerCase().includes(q) ||
        product.name.fr.toLowerCase().includes(q);
      const matchComp = product.companyName?.toLowerCase().includes(q);
      const matchDesc = product.description[language]?.toLowerCase().includes(q);
      if (!matchName && !matchComp && !matchDesc) return false;
    }

    // Category filter
    if (selectedCategory !== 'all' && product.category !== selectedCategory) {
      return false;
    }

    // Governorate filter
    if (selectedGovFilter !== 'all' && product.governorate !== selectedGovFilter) {
      return false;
    }

    return true;
  });

  // مجموعات خاصة بنمط Google Play
  const suggestedForYou = products.slice(0, 8);
  const topTrending = products.slice().sort((a, b) => (b.rating || 5) - (a.rating || 5)).slice(0, 6);
  const powerToolsOnly = products.filter(p => p.category === 'power_tools');
  const autoPartsOnly = products.filter(p => p.category === 'auto_parts');

  const isBrowsingAll = selectedCategory === 'all' && !searchQuery.trim() && selectedGovFilter === 'all';

  return (
    <div className="space-y-6 sm:space-y-8 pb-24 bg-white dark:bg-[#0B0F17] transition-colors">
      
      {/* 1. إعلان ترويجي مصغر ذكي ومدمج (Compact Smart Banner) */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 pt-2">
        {banners && banners.filter(b => b.active).length > 0 ? (
          <div className="space-y-2">
            {banners.filter(b => b.active).map(b => {
              const displayTag =
                b.id === 'banner_1' || b.tag === 'عروض حصرية'
                  ? t.storefront?.defaultBannerTag || b.tag
                  : b.tag || t.storefront?.defaultBannerTag;
              const displayTitle =
                b.id === 'banner_1' || b.title === 'عروض وتخفيضات اليوم على كافة المعدات وقطع الغيار'
                  ? t.storefront?.defaultBannerTitle || b.title
                  : b.title;
              const displaySubtitle =
                b.id === 'banner_1' || b.subtitle === 'توصيل سريع لكافة الـ24 ولاية والدفع عند المعاينة والاستلام'
                  ? t.storefront?.defaultBannerSubtitle || b.subtitle
                  : b.subtitle;
              return (
                <div 
                  key={b.id} 
                  className={`rounded-3xl bg-gradient-to-r ${b.bgGradient || 'from-[#FF6B00] via-[#F97316] to-[#EA580C]'} text-white p-3 sm:p-4 shadow-xs flex items-center justify-between gap-3 overflow-hidden relative`}
                >
                  <div className="flex items-center gap-2.5 z-10">
                    <span className="w-8 h-8 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-white text-[#FF6B00] px-2.5 py-0.5 rounded-full shadow-2xs">
                          {displayTag}
                        </span>
                        <span className="text-xs sm:text-sm font-black text-white">
                          {displayTitle}
                        </span>
                      </div>
                      {displaySubtitle && (
                        <p className="text-[11px] text-white/90 hidden xs:block mt-0.5">
                          {displaySubtitle}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="absolute -left-10 -bottom-10 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none"></div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl bg-gradient-to-r from-[#FF6B00] via-[#F97316] to-[#EA580C] text-white p-3 sm:p-4 shadow-xs flex items-center justify-between gap-3 overflow-hidden relative">
            <div className="flex items-center gap-2.5 z-10">
              <span className="w-8 h-8 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </span>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white text-[#FF6B00] px-2.5 py-0.5 rounded-full shadow-2xs">
                    {t.storefront?.defaultBannerTag || 'عروض حصرية'}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-white">
                    {t.storefront?.defaultBannerTitle || 'عروض وتخفيضات اليوم على كافة المعدات وقطع الغيار'}
                  </span>
                </div>
                <p className="text-[11px] text-white/90 hidden xs:block mt-0.5">
                  {t.storefront?.defaultBannerSubtitle || 'توصيل سريع لكافة الـ24 ولاية والدفع عند المعاينة والاستلام'}
                </p>
              </div>
            </div>
            <div className="absolute -left-10 -bottom-10 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none"></div>
          </div>
        )}
      </div>

      {/* إذا كان المستخدم يتصفح الكل ولم يقم ببحث مخصص: اعرض أقسام Google Play الأفقية والقوائم الرأسية */}
      {isBrowsingAll && (
        <>
          {/* 2. القسم الأفقي الأول: مقترحة لك (Recommended / For You Carousel) */}
          <section className="max-w-7xl mx-auto px-2.5 sm:px-4 space-y-3 w-full max-w-full overflow-hidden">
            {/* Header مع سهم جانبي للمزيد */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-slate-100 leading-tight">
                  {t.storefront?.suggestedForYou || 'مقترحة لك'}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {t.storefront?.suggestedDesc || 'استناداً إلى نشاطك الأخير والأجهزة الأكثر ملائمة لورشتك'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCategory('power_tools')}
                className="flex items-center gap-1 text-xs font-bold text-[#FF6B00] hover:text-[#E05E00] p-1 rounded-full hover:bg-[#FF6B00]/10 transition-colors cursor-pointer"
                title={t.storefront?.more || 'المزيد'}
              >
                <span className="hidden sm:inline">{t.storefront?.more || 'المزيد'}</span>
                <ArrowLeft className={`w-4 h-4 ${language !== 'ar' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* شريط التمرير الأفقي لبطاقات المنتجات المربعة (Horizontal Carousel) */}
            <div className="w-full max-w-full overflow-hidden">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x w-full max-w-full">
              {suggestedForYou.map((product) => {
                const prodName = product.name[language] || product.name.ar;
                const isAdded = addedItemIds[product.id];
                return (
                  <div
                    key={product.id}
                    onClick={() => setSelectedProductId(product.id)}
                    className="w-36 sm:w-44 shrink-0 snap-start bg-[#F8FAFC] dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 hover:border-[#CBD5E1] dark:hover:border-slate-700 p-2 flex flex-col justify-between cursor-pointer group transition-all hover:shadow-md"
                  >
                    <div>
                      {/* حاوية الصورة المربعة بنسبة 1:1 وزوايا دائرية ناعمة */}
                      <div className="aspect-square w-full bg-white dark:bg-[#0F172A] rounded-xl overflow-hidden p-2 flex items-center justify-center border border-[#F1F5F9] dark:border-slate-700/60 relative">
                        <img
                          src={product.images[0] || '/assets/images/echox-logo.webp'}
                          alt={prodName}
                          loading="lazy"
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className={`absolute top-1.5 ${language === 'ar' ? 'right-1.5' : 'left-1.5'} bg-[#FF6B00] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md`}>
                            {t.storefront?.discountBadge || 'تخفيض'}
                          </span>
                        )}
                      </div>

                      {/* تفاصيل المنتج أسفل البطاقة */}
                      <div className="pt-2">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block truncate">
                          {product.companyName}
                        </span>
                        <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100 line-clamp-2 leading-tight group-hover:text-[#FF6B00] transition-colors min-h-[1.9rem] my-0.5">
                          {prodName}
                        </h3>
                        <div className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                          <span className="font-bold text-[#0F172A] dark:text-slate-200">{product.rating || '4.9'}</span>
                        </div>
                      </div>
                    </div>

                    {/* السعر وزر الإضافة السريع */}
                    <div className="pt-1.5 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-1">
                      <div>
                        <span className="text-xs sm:text-sm font-black text-[#FF6B00] font-mono block leading-none">
                          {product.price.toFixed(3)}
                        </span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">{t.cart.currency}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleQuickAdd(e, product)}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                          isAdded ? 'bg-emerald-600 text-white' : 'bg-[#FF6B00] hover:bg-[#E05E00] text-white shadow-xs'
                        }`}
                        title={t.product?.addToCart || 'أضف للسلة'}
                      >
                        {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </section>

          {/* 3. القائمة الرأسية المدمجة (Google Play Top Charts Ranked List) */}
          <section className="max-w-7xl mx-auto px-2.5 sm:px-4 space-y-3 w-full max-w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00]">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-slate-100 leading-tight">
                    {t.storefront?.topTrending || 'أفضل الترتيبات • الأكثر طلباً'}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {t.storefront?.topTrendingDesc || 'القطع والأدوات الأكثر مبيعاً وتقييماً من الحرفيين في تونس'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="flex items-center gap-1 text-xs font-bold text-[#FF6B00] hover:text-[#E05E00] p-1 rounded-full hover:bg-[#FF6B00]/10 transition-colors cursor-pointer"
                title={t.storefront?.all || 'الكل'}
              >
                <span className="hidden sm:inline">{t.storefront?.all || 'الكل'}</span>
                <ArrowLeft className={`w-4 h-4 ${language !== 'ar' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* قائمة مرتبة عمودياً في أعمدة متناسقة (Top Charts Style) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {topTrending.map((product, index) => {
                const prodName = product.name[language] || product.name.ar;
                const isAdded = addedItemIds[product.id];
                return (
                  <div
                    key={product.id}
                    onClick={() => setSelectedProductId(product.id)}
                    className="p-2.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 hover:border-[#CBD5E1] dark:hover:border-slate-700 flex items-center justify-between gap-3 cursor-pointer group transition-all hover:shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* رقم الترتيب */}
                      <span className="w-5 text-sm font-black text-slate-400 dark:text-slate-500 font-mono text-center shrink-0">
                        {index + 1}
                      </span>

                      {/* الصورة المصغرة المربعة بزوايا دائرية ناعمة */}
                      <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/60 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                        <img
                          src={product.images[0] || '/assets/images/echox-logo.webp'}
                          alt={prodName}
                          loading="lazy"
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>

                      {/* الاسم والقسم والتقييم */}
                      <div className="min-w-0 truncate">
                        <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-slate-100 truncate group-hover:text-[#FF6B00] transition-colors">
                          {prodName}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate mt-0.5">
                          <span className="text-[#FF6B00]">{product.companyName}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                            <span className="text-slate-700 dark:text-slate-300">{product.rating || '4.9'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* السعر وزر الطلب / الإضافة */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs sm:text-sm font-black text-[#FF6B00] font-mono">
                        {product.price.toFixed(3)} {t.cart.currency}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleQuickAdd(e, product)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                          isAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#FF6B00] hover:bg-[#E05E00] text-white shadow-xs'
                        }`}
                      >
                        {isAdded ? (t.storefront?.quickAdded || 'تم ✓') : (t.storefront?.quickAdd || 'أضف')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4. القسم الأفقي الثاني: أدوات ومعدات ورشات (Power Tools Carousel) */}
          {powerToolsOnly.length > 0 && (
            <section className="max-w-7xl mx-auto px-2.5 sm:px-4 space-y-3 w-full max-w-full overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-slate-100 leading-tight">
                    {t.storefront?.powerToolsTitle || 'أدوات ومعدات ميكانيكية وكهربائية'}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {t.storefront?.powerToolsDesc || 'مثاقب، مناشير، ومعدات ورشات معتمدة بضمان رسمي'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCategory('power_tools')}
                  className="flex items-center gap-1 text-xs font-bold text-[#FF6B00] hover:text-[#E05E00] p-1 rounded-full hover:bg-[#FF6B00]/10 transition-colors cursor-pointer"
                >
                  <span className="hidden sm:inline">{t.storefront?.more || 'المزيد'}</span>
                  <ArrowLeft className={`w-4 h-4 ${language !== 'ar' ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <div className="w-full max-w-full overflow-hidden">
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x w-full max-w-full">
                {powerToolsOnly.map((product) => {
                  const prodName = product.name[language] || product.name.ar;
                  const isAdded = addedItemIds[product.id];
                  return (
                    <div
                      key={product.id}
                      onClick={() => setSelectedProductId(product.id)}
                      className="w-36 sm:w-44 shrink-0 snap-start bg-[#F8FAFC] dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 hover:border-[#CBD5E1] dark:hover:border-slate-700 p-2 flex flex-col justify-between cursor-pointer group transition-all hover:shadow-md"
                    >
                      <div>
                        <div className="aspect-square w-full bg-white dark:bg-[#0F172A] rounded-xl overflow-hidden p-2 flex items-center justify-center border border-[#F1F5F9] dark:border-slate-700/60">
                          <img
                            src={product.images[0] || '/assets/images/echox-logo.webp'}
                            alt={prodName}
                            loading="lazy"
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        <div className="pt-2">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block truncate">
                            {product.companyName}
                          </span>
                          <h3 className="text-xs font-bold text-[#0F172A] dark:text-slate-100 line-clamp-2 leading-tight group-hover:text-[#FF6B00] transition-colors min-h-[1.9rem] my-0.5">
                            {prodName}
                          </h3>
                          <div className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                            <span className="font-bold text-[#0F172A] dark:text-slate-200">{product.rating || '4.9'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-1">
                        <div>
                          <span className="text-xs sm:text-sm font-black text-[#FF6B00] font-mono block leading-none">
                            {product.price.toFixed(3)}
                          </span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">{t.cart.currency}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleQuickAdd(e, product)}
                          className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                            isAdded ? 'bg-emerald-600 text-white' : 'bg-[#FF6B00] hover:bg-[#E05E00] text-white shadow-xs'
                          }`}
                        >
                          {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* 5. شريط الفلترة واختيار الولاية التونسية */}
      <section className="max-w-7xl mx-auto px-2.5 sm:px-4 w-full max-w-full">
        <div className="flex items-center justify-between gap-2 bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 p-2 sm:p-2.5 rounded-2xl">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B00]"></span>
            <span className="text-xs font-bold text-[#0F172A] dark:text-slate-100">
              {t.storefront?.allProducts || 'كافة المعروضات'} ({filteredProducts.length})
            </span>
          </div>

          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
            <select
              value={selectedGovFilter}
              onChange={e => setSelectedGovFilter(e.target.value)}
              className="text-xs py-1 px-2.5 rounded-full border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-[#0F172A] font-bold text-[#0F172A] dark:text-slate-100 focus:outline-none focus:border-[#FF6B00] cursor-pointer shadow-2xs"
            >
              <option value="all">{t.storefront?.allGovernorates || 'كافة ولايات تونس (الكل)'}</option>
              {TUNISIAN_GOVERNORATES.map(gov => (
                <option key={gov.id} value={gov.id}>
                  {language === 'fr' ? gov.nameFr : language === 'en' ? gov.nameEn : `${t.storefront?.governoratePrefix || 'ولاية'} ${gov.nameAr}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 6. شبكة المنتجات الكاملة في عمودين متجاورين (2-Column Grid on Mobile) */}
      <main className="max-w-7xl mx-auto px-2.5 sm:px-4 w-full max-w-full">
        {filteredProducts.length === 0 ? (
          <div className="py-12 text-center bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl border border-[#E2E8F0] dark:border-slate-800 p-6 space-y-3">
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">{t.storefront?.noProductsFound || 'لا توجد منتجات مطابقة لبحثك أو الفلتر'}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.storefront?.noProductsDesc || 'جرب اختيار تصنيف آخر أو تفريغ شريط البحث'}</p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSelectedGovFilter('all');
              }}
              className="text-xs font-bold text-[#FF6B00] hover:underline cursor-pointer"
            >
              {t.storefront?.resetFilters || 'إعادة ضبط الفلاتر وعرض كافة المنتجات'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-5">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      {/* 7. شريط الثقة والمميزات (Trust Bar) */}
      <section className="max-w-7xl mx-auto px-2.5 sm:px-4 pt-2 w-full max-w-full">
        <div className="rounded-3xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 p-3 sm:p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
            
            <div className="flex items-center gap-2.5 p-2 bg-white dark:bg-[#0F172A] rounded-2xl border border-[#E2E8F0]/70 dark:border-slate-700/50">
              <div className="w-8 h-8 rounded-xl bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="truncate">
                <h4 className="text-xs font-bold text-[#0F172A] dark:text-slate-100 leading-tight">{t.storefront?.trustFastDelivery || 'توصيل سريع'}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{t.storefront?.trustFastDeliveryDesc || 'لكافة ولايات تونس الـ24'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 bg-white dark:bg-[#0F172A] rounded-2xl border border-[#E2E8F0]/70 dark:border-slate-700/50">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Banknote className="w-4 h-4" />
              </div>
              <div className="truncate">
                <h4 className="text-xs font-bold text-[#0F172A] dark:text-slate-100 leading-tight">{t.storefront?.trustCod || 'دفع عند الاستلام'}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{t.storefront?.trustCodDesc || 'عاين طلبيتك قبل الدفع'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 bg-white dark:bg-[#0F172A] rounded-2xl border border-[#E2E8F0]/70 dark:border-slate-700/50">
              <div className="w-8 h-8 rounded-xl bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="truncate">
                <h4 className="text-xs font-bold text-[#0F172A] dark:text-slate-100 leading-tight">{t.storefront?.trustGenuine || 'قطع ومعدات أصلية'}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{t.storefront?.trustGenuineDesc || 'ضمان جودة معتمد 100%'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 bg-white dark:bg-[#0F172A] rounded-2xl border border-[#E2E8F0]/70 dark:border-slate-700/50">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <Headphones className="w-4 h-4" />
              </div>
              <div className="truncate">
                <h4 className="text-xs font-bold text-[#0F172A] dark:text-slate-100 leading-tight">{t.storefront?.trustDirectSupport || 'دعم وتتبع مباشر'}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{t.storefront?.trustDirectSupportDesc || 'خدمة هاتفية وواتساب'}</p>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
};
