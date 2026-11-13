import React, { useState, useRef, useEffect } from 'react';
import { Home, LayoutGrid, Search, ShoppingBag, X, ChevronLeft, ArrowRight, Sparkles, TrendingUp, Star, AlertTriangle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import { verifyAccessCodeServer } from '../lib/security';

interface BottomNavigationProps {
  onOpenVault?: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ onOpenVault }) => {
  const { 
    currentView, 
    setCurrentView, 
    cart, 
    setIsCartOpen, 
    selectedCategory, 
    setSelectedCategory,
    setSelectedProductId,
    t,
    language,
    products,
    searchQuery,
    setSearchQuery,
    categories: storeCategories
  } = useStore();

  const [isCategoriesSheetOpen, setIsCategoriesSheetOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [localSearchInput, setLocalSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isCheckingVault, setIsCheckingVault] = useState(false);
  const [vaultError, setVaultError] = useState('');
  const accessCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (accessCheckTimerRef.current) clearTimeout(accessCheckTimerRef.current);
    };
  }, []);

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const runAccessCodeVerification = async (candidate: string, explicitSubmit: boolean = false) => {
    const clean = candidate.trim();
    if (clean.length < 4) return;
    if (!explicitSubmit && !clean.startsWith('#') && clean.length < 8) return;

    setIsCheckingVault(true);
    setVaultError('');
    try {
      const check = await verifyAccessCodeServer(clean);
      if (check.success) {
        setLocalSearchInput('');
        setSearchQuery('');
        setSearchResults([]);
        setVaultError('');
        setIsSearchModalOpen(false);
        (window as any).__echoxVaultOpenPending = true;
        if (onOpenVault) onOpenVault();
        window.dispatchEvent(new CustomEvent('open_echox_vault'));
        return;
      }

      const isServiceOrRateIssue =
        check.httpStatus === 503 ||
        check.httpStatus === 502 ||
        check.httpStatus === 500 ||
        check.httpStatus === 429 ||
        check.httpStatus === 0 ||
        Boolean(check.lockedOut);

      if (isServiceOrRateIssue || (explicitSubmit && clean.startsWith('#'))) {
        setVaultError(check.error || 'تعذر التحقق من رمز الوصول حالياً.');
      }
    } catch (err) {
      console.warn('Access code check notice in bottom nav:', err);
      if (explicitSubmit || clean.startsWith('#')) {
        setVaultError('تعذر الاتصال بالخادم للتحقق من رمز الوصول.');
      }
    } finally {
      setIsCheckingVault(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearchInput(val);
    setSearchQuery(val);
    if (vaultError) setVaultError('');

    if (accessCheckTimerRef.current) clearTimeout(accessCheckTimerRef.current);

    if (val.trim().length > 0) {
      // تحقق مؤجل (Debounce) بعد التوقف عن الكتابة بـ 500ms لمنع قفل البوابة أثناء الكتابة الحرفية
      const trimmed = val.trim();
      if (trimmed.startsWith('#') || trimmed.length >= 8) {
        accessCheckTimerRef.current = setTimeout(() => {
          runAccessCodeVerification(trimmed, false);
        }, 500);
      }

      // البحث عن المنتجات
      const term = val.toLowerCase().trim();
      const filtered = products.filter(item => {
        const nameAr = item.name?.ar?.toLowerCase() || '';
        const nameFr = item.name?.fr?.toLowerCase() || '';
        const nameEn = item.name?.en?.toLowerCase() || '';
        const descAr = item.description?.ar?.toLowerCase() || '';
        const descFr = item.description?.fr?.toLowerCase() || '';
        const descEn = item.description?.en?.toLowerCase() || '';
        const flatName = typeof (item as any).name === 'string' ? (item as any).name.toLowerCase() : '';
        const flatDesc = typeof (item as any).description === 'string' ? (item as any).description.toLowerCase() : '';

        return (
          nameAr.includes(term) ||
          nameFr.includes(term) ||
          nameEn.includes(term) ||
          descAr.includes(term) ||
          descFr.includes(term) ||
          descEn.includes(term) ||
          flatName.includes(term) ||
          flatDesc.includes(term)
        );
      });
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  };

  const handleQuickTagClick = (tag: string) => {
    setLocalSearchInput(tag);
    setSearchQuery(tag);
    const term = tag.toLowerCase().trim();
    const filtered = products.filter(item => {
      const nameAr = item.name?.ar?.toLowerCase() || '';
      const nameFr = item.name?.fr?.toLowerCase() || '';
      const descAr = item.description?.ar?.toLowerCase() || '';
      return nameAr.includes(term) || nameFr.includes(term) || descAr.includes(term);
    });
    setSearchResults(filtered);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product.id);
    setIsSearchModalOpen(false);
  };

  const categories = storeCategories && storeCategories.length > 0 ? storeCategories : [
    { id: 'all', label: t.categories.all, icon: '⚡', desc: 'كافة المعروضات المعتمدة' },
    { id: 'power_tools', label: t.categories.power_tools, icon: '🔧', desc: 'مثاقب، مناشير، ومعدات ورشات' },
    { id: 'auto_parts', label: t.categories.auto_parts, icon: '🚗', desc: 'قطع ميكانيكية وكهربائية للسيارات' },
    { id: 'electronics', label: t.categories.electronics, icon: '🔌', desc: 'أجهزة قياس، لوحات وقطع إلكترونية' },
    { id: 'industrial', label: t.categories.industrial, icon: '🏭', desc: 'معدات المصانع والورشات الثقيلة' },
    { id: 'smart_home', label: t.categories.smart_home, icon: '🏠', desc: 'أتمتة وحماية المنازل الذكية' },
  ];

  const handleTabClick = (tab: 'home' | 'categories' | 'search' | 'cart') => {
    if (tab === 'home') {
      setSelectedCategory('all');
      setSearchQuery('');
      if (currentView !== 'store' && currentView !== '/') {
        setCurrentView('store');
      }
      setIsCategoriesSheetOpen(false);
      setIsSearchModalOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'categories') {
      setIsSearchModalOpen(false);
      setIsCategoriesSheetOpen(true);
    } else if (tab === 'search') {
      setIsCategoriesSheetOpen(false);
      setIsSearchModalOpen(true);
    } else if (tab === 'cart') {
      setIsCategoriesSheetOpen(false);
      setIsSearchModalOpen(false);
      setIsCartOpen(true);
    }
  };

  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId);
    if (currentView !== 'store' && currentView !== '/') {
      setCurrentView('store');
    }
    setIsCategoriesSheetOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isHomeActive = (currentView === 'store' || currentView === '/') && !isCategoriesSheetOpen && !isSearchModalOpen;
  const isCategoriesActive = isCategoriesSheetOpen;
  const isSearchActive = isSearchModalOpen;

  const popularTags = [
    'مثقاب كهربائي',
    'مفتاح عزم',
    'مضخة هواء',
    'فلتر زيت',
    'بطارية 20V',
    'قاطع ليزري'
  ];

  return (
    <>
      {/* 1. نافذة البحث المخصصة بنمط Google Play (تفتح حصرياً عند الضغط على تبويب البحث السفلي) */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#0B0F17] flex flex-col animate-fadeIn select-none text-[#0F172A] dark:text-slate-100">
          {/* Top Bar for Search */}
          <div className="p-3 sm:p-4 border-b border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#0F172A] flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsSearchModalOpen(false);
                setLocalSearchInput('');
                setSearchResults([]);
                setVaultError('');
              }}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0F172A] dark:text-slate-200 transition-colors cursor-pointer shrink-0"
              title="رجوع"
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* حقل البحث الكبسولي */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (accessCheckTimerRef.current) clearTimeout(accessCheckTimerRef.current);
                runAccessCodeVerification(localSearchInput, true);
              }}
              className="flex-1 relative flex items-center bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 focus-within:border-[#FF6B00] dark:focus-within:border-[#FF6B00] focus-within:bg-white dark:focus-within:bg-[#0F172A] rounded-full py-2 px-3.5 transition-all shadow-inner"
            >
              <Search className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
              <input
                type="search"
                enterKeyHint="search"
                value={localSearchInput}
                onChange={handleSearchChange}
                autoFocus
                placeholder={t.bottomNav?.searchPlaceholder || 'ابحث في المعدات والأجهزة وقطع الغيار...'}
                className="w-full bg-transparent text-xs sm:text-sm text-[#0F172A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
              />
              {localSearchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearchInput('');
                    setSearchQuery('');
                    setSearchResults([]);
                    setVaultError('');
                  }}
                  className="p-1 text-slate-400 hover:text-[#0F172A] dark:hover:text-white rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>

          {/* Search Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {isCheckingVault && localSearchInput.trim().startsWith('#') && (
              <div className="p-3 rounded-2xl bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-xs font-bold text-[#FF6B00] flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin shrink-0" />
                <span>جارٍ التحقق عبر الخادم...</span>
              </div>
            )}

            {vaultError && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-600 dark:text-red-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{vaultError}</span>
              </div>
            )}

            {/* عندما لا يوجد نص بحث: اعرض الاقتراحات الشائعة */}
            {!localSearchInput.trim() && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black text-[#0F172A] dark:text-slate-100 mb-2.5">
                    <TrendingUp className="w-4 h-4 text-[#FF6B00]" />
                    <span>عمليات البحث الشائعة في تونس</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {popularTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleQuickTagClick(tag)}
                        className="px-3.5 py-1.5 rounded-full bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 hover:border-[#FF6B00] text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-[#FF6B00] transition-colors cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-black text-[#0F172A] dark:text-slate-100 mb-2.5">
                    <Sparkles className="w-4 h-4 text-[#FF6B00]" />
                    <span>{t.bottomNav?.browseByCat || 'تصفح حسب القسم'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.slice(1).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          handleSelectCategory(cat.id);
                          setIsSearchModalOpen(false);
                        }}
                        className="p-2.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 text-start cursor-pointer transition-colors"
                      >
                        <span className="text-lg">{cat.icon}</span>
                        <span className="text-xs font-bold text-[#0F172A] dark:text-slate-200 truncate">
                          {(t.categories as Record<string, string>)[cat.id] || cat.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* نتائج البحث المباشرة */}
            {localSearchInput.trim() && searchResults.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2">
                  {t.bottomNav?.foundMatches || 'عثرنا على'} ({searchResults.length}) {t.bottomNav?.matchingProductsSuffix || 'منتج مطابق:'}
                </span>
                {searchResults.map((product) => {
                  const prodName = product.name[language] || product.name.ar;
                  return (
                    <div
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 hover:border-[#CBD5E1] dark:hover:border-slate-700 flex items-center justify-between gap-3 cursor-pointer group transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700/60 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                          <img
                            src={product.images[0] || '/assets/images/echox-logo.webp'}
                            alt={prodName}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[#0F172A] dark:text-slate-100 truncate group-hover:text-[#FF6B00] transition-colors">
                            {prodName}
                          </h4>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">{product.companyName}</span>
                          <div className="flex items-center gap-1 text-[10px] text-amber-500 mt-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span className="font-bold text-slate-700 dark:text-slate-300">{product.rating || '4.9'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-end shrink-0">
                        <span className="text-xs font-black text-[#FF6B00] font-mono block">
                          {product.price.toFixed(3)}
                        </span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">{t.cart.currency}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {localSearchInput.trim() && searchResults.length === 0 && (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
                <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-[#0F172A] dark:text-slate-200">{t.bottomNav?.noMatches || 'لا توجد نتائج مطابقة لبحثك'}</h4>
                <p className="text-xs">{t.bottomNav?.noMatchesTip || 'جرب كلمات بحث مختلفة أو تصفح الأقسام'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. نافذة الأقسام المنبثقة من الأسفل (Google Play Bottom Sheet for Categories) */}
      {isCategoriesSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full sm:max-w-md bg-white dark:bg-[#0F172A] rounded-t-3xl sm:rounded-3xl border border-[#E2E8F0] dark:border-slate-800 shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-slideUp text-[#0F172A] dark:text-white">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00]">
                  <LayoutGrid className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-[#0F172A] dark:text-white leading-tight">
                    {t.bottomNav?.categoriesSheetTitle || 'تصفح أقسام ECHOX Store'}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {t.bottomNav?.categoriesSheetSubtitle || 'اختر القسم لفلترة المنتجات فوراً'}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsCategoriesSheetOpen(false)}
                className="p-1.5 rounded-full bg-[#F8FAFC] dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Categories List */}
            <div className="space-y-2">
              {categories.map((cat) => {
                const count = cat.id === 'all' 
                  ? products.length 
                  : products.filter(p => p.category === cat.id).length;
                const isSelected = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between text-start cursor-pointer active:scale-98 ${
                      isSelected
                        ? 'bg-[#FF6B00]/10 border-[#FF6B00] text-[#0F172A] dark:text-white'
                        : 'bg-[#F8FAFC] dark:bg-[#1E293B] border-[#E2E8F0] dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-[#0F172A] dark:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl w-8 h-8 rounded-xl bg-white dark:bg-[#0F172A] flex items-center justify-center shadow-xs border border-[#E2E8F0] dark:border-slate-700">
                        {cat.icon}
                      </span>
                      <div>
                        <span className="text-xs font-black block leading-tight">
                          {(t.categories as Record<string, string>)[cat.id] || cat.label}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">{cat.desc}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        {count} {t.bottomNav?.itemsCountSuffix || (language === 'ar' ? 'منتج' : language === 'fr' ? 'articles' : 'products')}
                      </span>
                      <ChevronLeft className={`w-4 h-4 text-slate-400 ${language !== 'ar' ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                );
              })}
            </div>

          </div>
          <div className="fixed inset-0 -z-10 cursor-pointer" onClick={() => setIsCategoriesSheetOpen(false)}></div>
        </div>
      )}

      {/* 3. شريط التنقل السفلي الثابت (Fixed Bottom Navigation Bar) */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-t border-[#E2E8F0] dark:border-slate-800 shadow-lg px-2 py-1.5 transition-all select-none"
        aria-label="التنقل السفلي"
      >
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          
          {/* Tab 1: الرئيسية (Home) */}
          <button
            type="button"
            onClick={() => handleTabClick('home')}
            className="flex flex-col items-center justify-center py-1 group cursor-pointer active:scale-95"
          >
            <div 
              className={`px-4 py-1 rounded-full transition-all flex items-center justify-center ${
                isHomeActive 
                  ? 'bg-[#FF6B00]/15 text-[#FF6B00]' 
                  : 'text-slate-500 dark:text-slate-400 group-hover:text-[#0F172A] dark:group-hover:text-white'
              }`}
            >
              <Home className={`w-5 h-5 ${isHomeActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            </div>
            <span className={`text-[10px] mt-0.5 font-bold ${isHomeActive ? 'text-[#FF6B00]' : 'text-slate-500 dark:text-slate-400'}`}>
              {t.bottomNav?.home || t.nav.store}
            </span>
          </button>

          {/* Tab 2: الأقسام (Categories) */}
          <button
            type="button"
            onClick={() => handleTabClick('categories')}
            className="flex flex-col items-center justify-center py-1 group cursor-pointer active:scale-95"
          >
            <div 
              className={`px-4 py-1 rounded-full transition-all flex items-center justify-center ${
                isCategoriesActive 
                  ? 'bg-[#FF6B00]/15 text-[#FF6B00]' 
                  : 'text-slate-500 dark:text-slate-400 group-hover:text-[#0F172A] dark:group-hover:text-white'
              }`}
            >
              <LayoutGrid className={`w-5 h-5 ${isCategoriesActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            </div>
            <span className={`text-[10px] mt-0.5 font-bold ${isCategoriesActive ? 'text-[#FF6B00]' : 'text-slate-500 dark:text-slate-400'}`}>
              {t.bottomNav?.categories || t.nav.categories}
            </span>
          </button>

          {/* Tab 3: البحث (Search) - يفتح البحث المخصص */}
          <button
            type="button"
            onClick={() => handleTabClick('search')}
            className="flex flex-col items-center justify-center py-1 group cursor-pointer active:scale-95"
          >
            <div 
              className={`px-4 py-1 rounded-full transition-all flex items-center justify-center ${
                isSearchActive 
                  ? 'bg-[#FF6B00]/15 text-[#FF6B00]' 
                  : 'text-slate-500 dark:text-slate-400 group-hover:text-[#0F172A] dark:group-hover:text-white'
              }`}
            >
              <Search className={`w-5 h-5 ${isSearchActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            </div>
            <span className={`text-[10px] mt-0.5 font-bold ${isSearchActive ? 'text-[#FF6B00]' : 'text-slate-500 dark:text-slate-400'}`}>
              {t.bottomNav?.search || t.nav.search}
            </span>
          </button>

          {/* Tab 4: السلة (Cart) */}
          <button
            type="button"
            onClick={() => handleTabClick('cart')}
            className="flex flex-col items-center justify-center py-1 group cursor-pointer active:scale-95 relative"
          >
            <div className="px-4 py-1 rounded-full text-slate-500 dark:text-slate-400 group-hover:text-[#0F172A] dark:group-hover:text-white transition-all flex items-center justify-center relative">
              <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
              {totalCartItems > 0 && (
                <span className="absolute top-0 right-3 bg-[#FF6B00] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {totalCartItems}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 font-bold text-slate-500 dark:text-slate-400">
              {t.bottomNav?.cart || t.nav.cart}
            </span>
          </button>

        </div>
      </nav>
    </>
  );
};
