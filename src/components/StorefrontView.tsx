import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import { 
  ShieldCheck, 
  Truck, 
  Banknote, 
  Headphones, 
  Sparkles, 
  Timer, 
  MapPin, 
  ChevronRight, 
  ArrowLeft,
  ArrowRight,
  Filter
} from 'lucide-react';
import { TUNISIAN_GOVERNORATES } from '../data/governorates';

export const StorefrontView: React.FC = () => {
  const { 
    products, 
    companies,
    language, 
    t, 
    searchQuery, 
    selectedCategory, 
    setSelectedCategory,
    setSelectedProductId,
    setCurrentView 
  } = useStore();

  const [selectedGovFilter, setSelectedGovFilter] = useState<string>('all');

  // Flash Countdown Timer state (e.g. 18 hours, 42 minutes, 15 seconds)
  const [timeLeft, setTimeLeft] = useState({
    hours: 18,
    minutes: 42,
    seconds: 15
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 24, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter products by category, search query, active status, and governorate
  const filteredProducts = products.filter(product => {
    if (!product.active) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = product.name[language]?.toLowerCase().includes(q) ||
        product.name.ar.toLowerCase().includes(q) ||
        product.name.fr.toLowerCase().includes(q);
      const matchComp = product.companyName.toLowerCase().includes(q);
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

  const categories = [
    { id: 'all', label: t.categories.all },
    { id: 'power_tools', label: t.categories.power_tools },
    { id: 'auto_parts', label: t.categories.auto_parts },
    { id: 'electronics', label: t.categories.electronics },
    { id: 'industrial', label: t.categories.industrial },
    { id: 'smart_home', label: t.categories.smart_home },
  ];

  return (
    <div className="space-y-12 pb-16">
      
      {/* 1. Hero Showcase Banner */}
      <section className="relative overflow-hidden bg-[#0B0F17] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Content (6 cols) */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-start">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF6B00]/15 border border-[#FF6B00]/30 text-[#FF6B00] text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.hero.badge}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight sm:leading-tight">
                {t.hero.title}
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
                {t.hero.subtitle}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <a
                  href="#catalog"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-sm shadow-lg shadow-[#FF6B00]/25 transition-all text-center"
                >
                  {t.hero.shopNow}
                </a>
                <button
                  onClick={() => {
                    setCurrentView('promise');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/10 transition-all text-center"
                >
                  {t.hero.learnPromise}
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 border-t border-slate-800 flex items-center justify-center lg:justify-start gap-6 text-xs text-slate-400 font-semibold">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
                  <span>{t.hero.guarantee}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  <span>توصيل 24 ولاية</span>
                </div>
              </div>
            </div>

            {/* Right Media Focal Anchor (5 cols) */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl aspect-16/10 lg:aspect-4/3 group">
                <img 
                  src="/src/assets/images/hero_echox_tunisia_store_1793963107162.jpg" 
                  alt="ECHOX Store Hardware Showroom"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                  <span className="text-[11px] font-bold text-[#FF6B00] uppercase tracking-wider">
                    ECHOX Certified Inventory
                  </span>
                  <p className="text-sm font-bold text-white">
                    أجهزة وقطع أصلية جاهزة للشحن الفوري لكافة الورشات والمنازل في تونس
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Flash Countdown Offer Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-linear-to-r from-[#111827] via-[#1E293B] to-[#0B0F17] text-white p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-start">
            <div className="w-12 h-12 rounded-2xl bg-[#FF6B00] text-white flex items-center justify-center shrink-0 shadow-md">
              <Timer className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-black text-[#FF6B00] uppercase tracking-wider block">
                تخفيض حصري -20%
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {t.flashOffer.title}
              </h2>
            </div>
          </div>

          {/* Countdown Clock */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 ml-2 hidden sm:inline">{t.flashOffer.endsIn}</span>
            <div className="bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-center min-w-12">
              <span className="block text-base font-black text-[#FF6B00] tabular-nums font-mono">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-400">{t.flashOffer.hours}</span>
            </div>
            <span className="text-slate-500 font-bold">:</span>
            <div className="bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-center min-w-12">
              <span className="block text-base font-black text-[#FF6B00] tabular-nums font-mono">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-400">{t.flashOffer.minutes}</span>
            </div>
            <span className="text-slate-500 font-bold">:</span>
            <div className="bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-center min-w-12">
              <span className="block text-base font-black text-[#FF6B00] tabular-nums font-mono">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-400">{t.flashOffer.seconds}</span>
            </div>

            <button
              onClick={() => {
                const prod = products.find(p => p.id === 'prod_titan_drill');
                if (prod) setSelectedProductId(prod.id);
              }}
              className="mr-3 px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs shadow-md transition-colors whitespace-nowrap"
            >
              {t.flashOffer.shopOffer}
            </button>
          </div>
        </div>
      </section>

      {/* 3. Four Core Purchase Benefits (Discipline: no pill boxes, clean icons) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="p-5 rounded-2xl bg-white border border-[#E8E4DD] shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">{t.benefits.cod}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{t.benefits.codDesc}</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E8E4DD] shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">{t.benefits.fastDelivery}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{t.benefits.fastDeliveryDesc}</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E8E4DD] shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">{t.benefits.genuine}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{t.benefits.genuineDesc}</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E8E4DD] shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Headphones className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">{t.benefits.directSupport}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{t.benefits.directSupportDesc}</p>
          </div>

        </div>
      </section>

      {/* 4. Catalog & Interactive Filter Controls */}
      <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header with Title and Governorate filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E8E4DD] pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              تشكيلة المنتجات والقطع المعتمدة
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              عرض {filteredProducts.length} منتج متوفر مع الأسعار بالدينار التونسي (TND)
            </p>
          </div>

          {/* Regional governorate filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <MapPin className="w-4 h-4 text-[#FF6B00] shrink-0" />
            <select
              value={selectedGovFilter}
              onChange={e => setSelectedGovFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:border-[#FF6B00] w-full sm:w-auto shadow-2xs"
            >
              <option value="all">كافة ولايات تونس (الكل)</option>
              {TUNISIAN_GOVERNORATES.map(gov => (
                <option key={gov.id} value={gov.id}>
                  ولاية {gov.nameAr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Categories Segmented Control Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-[#0B0F17] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-[#E8E4DD] hover:border-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Active search tag if searching */}
        {searchQuery && (
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
            <span>نتائج البحث عن: <strong className="text-slate-900">"{searchQuery}"</strong></span>
            <span aria-hidden="true">·</span>
            <span>({filteredProducts.length} نتائج)</span>
          </div>
        )}

        {/* 5. Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-[#E8E4DD] p-8 space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">لا توجد منتجات مطابقة لهذا الفلتر</h3>
            <p className="text-xs text-slate-500">جرب اختيار تصنيف آخر أو تفريغ شريط البحث</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedGovFilter('all');
              }}
              className="text-xs font-bold text-[#FF6B00] hover:underline"
            >
              إعادة ضبط الفلاتر
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

      </section>

      {/* 6. Partner Companies Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-[#FAF8F5] rounded-3xl border border-[#E8E4DD] p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#E8E4DD]/70 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">كبار الموزعين والشركات المعتمدة في تونس</h3>
              <p className="text-xs text-slate-500">تزويد مباشر بأعلى معايير الجودة والمطابقة</p>
            </div>
            <button
              onClick={() => {
                setCurrentView('companies');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs font-bold text-[#FF6B00] hover:underline flex items-center gap-1"
            >
              <span>دليل الشركات كاملة</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {companies.map(comp => (
              <div 
                key={comp.id} 
                onClick={() => {
                  setCurrentView('companies');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-[#FF6B00] cursor-pointer transition-all flex items-center gap-3.5"
              >
                <img 
                  src={comp.logo} 
                  alt={comp.name} 
                  className="w-12 h-12 rounded-xl object-contain bg-slate-50 p-1 border border-slate-200" 
                />
                <div className="overflow-hidden">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{comp.name}</h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5" dir="ltr">{comp.phone}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};
