import React, { useEffect, useState } from 'react';
import { Menu, X, ShoppingBag, Bell, BellRing, BellOff, CheckCircle2, Sparkles, Sun, Moon, HeartHandshake, Download, Smartphone } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import {
  fetchPublicNotifications,
  getDeferredInstallPrompt,
  getExistingPushSubscription,
  getSavedPublicEndpoint,
  isIosDevice,
  isStandalonePWA,
  PublicStoreAnnouncement,
  subscribePublicPushClient,
  triggerPwaInstallPrompt,
  unsubscribePublicPushClient,
} from '../lib/notifications';

interface HeaderProps {
  onOpenVault?: () => void;
  productsList?: Product[];
  onSelectProduct?: (product: Product) => void;
}

export default function Header(_props: HeaderProps) {
  const { 
    language, 
    setLanguage, 
    t, 
    currentView, 
    setCurrentView, 
    setSelectedProductId,
    cart, 
    setIsCartOpen, 
    wishlist, 
    siteSettings,
    selectedCategory,
    setSelectedCategory,
    isDarkMode,
    toggleDarkMode,
    categories,
    setIsSupportModalOpen
  } = useStore();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<PublicStoreAnnouncement[]>([]);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<string | null>(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);
  const [showIosInstallTip, setShowIosInstallTip] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchPublicNotifications().then((res) => {
      if (active) setAnnouncements(res.announcements || []);
    });
    void getExistingPushSubscription().then((sub) => {
      if (active && sub && getSavedPublicEndpoint() && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        setIsPushEnabled(true);
      }
    });

    const refreshInstallState = () => {
      if (!active) return;
      setCanInstallPwa(!isStandalonePWA() && (Boolean(getDeferredInstallPrompt()) || isIosDevice()));
    };
    refreshInstallState();
    window.addEventListener('echox_pwa_install_ready', refreshInstallState);
    window.addEventListener('echox_pwa_installed', refreshInstallState);
    return () => {
      active = false;
      window.removeEventListener('echox_pwa_install_ready', refreshInstallState);
      window.removeEventListener('echox_pwa_installed', refreshInstallState);
    };
  }, []);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    let active = true;
    void fetchPublicNotifications().then((res) => {
      if (active) setAnnouncements(res.announcements || []);
    });
    return () => { active = false; };
  }, [isNotificationsOpen]);

  const handleToggleStorePush = async () => {
    setPushBusy(true);
    setPushFeedback(null);
    if (isPushEnabled) {
      await unsubscribePublicPushClient();
      setIsPushEnabled(false);
      setPushFeedback('تم إيقاف إشعارات المتجر على هذا الجهاز.');
    } else {
      const res = await subscribePublicPushClient();
      if (res.ok) {
        setIsPushEnabled(true);
        setPushFeedback('تم تفعيل إشعارات المتجر على هاتفك بنجاح ✓');
      } else {
        setPushFeedback(res.error || 'تعذر تفعيل الإشعارات.');
      }
    }
    setPushBusy(false);
  };

  const handleInstallPwa = async () => {
    if (getDeferredInstallPrompt()) {
      const outcome = await triggerPwaInstallPrompt();
      if (outcome === 'accepted') {
        setCanInstallPwa(false);
        setIsMenuOpen(false);
      }
    } else if (isIosDevice()) {
      setShowIosInstallTip((prev) => !prev);
    }
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleNavClick = (view: string) => {
    setCurrentView(view);
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cycleLanguage = () => {
    if (language === 'ar') setLanguage('en');
    else if (language === 'en') setLanguage('fr');
    else setLanguage('ar');
  };

  // أزرار التصنيفات السريعة الأفقية (Google Play Style Category Chips)
  const categoryChips = (categories && categories.length > 0 ? categories : [
    { id: 'all', label: t.categories.all },
    { id: 'power_tools', label: t.categories.power_tools },
    { id: 'auto_parts', label: t.categories.auto_parts },
    { id: 'electronics', label: t.categories.electronics },
    { id: 'industrial', label: t.categories.industrial },
    { id: 'smart_home', label: t.categories.smart_home },
  ]).map(c => ({
    ...c,
    label: (t.categories as Record<string, string>)[c.id] || c.label
  }));

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory(catId);
    if (currentView !== 'store' && currentView !== '/') {
      setCurrentView('store');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="w-full bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-slate-800 text-[#0F172A] dark:text-white sticky top-0 z-40 shadow-xs transition-colors select-none">
      
      {/* 1. السطر العلوي لتخطيط Google Play: الشعار في الأعلى مع أيقونة الإشعارات وسلة المشتريات */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-2 flex items-center justify-between gap-2">
        
        {/* اليمين: زر القائمة الجانبية + الشعار واسم المتجر */}
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0F172A] dark:text-white transition-colors cursor-pointer"
            title="القائمة"
            aria-label="القائمة"
          >
            <Menu className="w-5 h-5 text-[#0F172A] dark:text-white" />
          </button>

          <div 
            onClick={() => handleNavClick('store')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <img 
              src="/assets/images/echox-logo.webp" 
              alt="ECHOX Store" 
              className="w-8 h-8 rounded-full object-contain border border-[#FF6B00]/30 group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="font-black tracking-tight text-base sm:text-lg text-[#0F172A] dark:text-white leading-none group-hover:text-[#FF6B00] transition-colors">
                ECHOX <span className="text-[#FF6B00]">Store</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-tight hidden xs:block">
                {t.header?.subtitle || (language === 'ar' ? 'متجر المعدات والقطع الأصلية' : language === 'fr' ? 'Outillage & Pièces d’Origine' : 'Genuine Hardware & Tools')}
              </span>
            </div>
          </div>
        </div>

        {/* اليسار: أيقونة الإشعارات، سلة المشتريات، والوضع المظلم، واللغة */}
        <div className="flex items-center gap-1.5 sm:gap-2 relative">
          
          {/* زر تبديل الوضع المظلم والفاتح */}
          <button 
            type="button"
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#0F172A] dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title={isDarkMode ? 'الوضع الفاتح' : 'الوضع المظلم'}
            aria-label="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* زر تبديل اللغة */}
          <button 
            type="button"
            onClick={cycleLanguage}
            className="px-2.5 py-1 rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold text-[#0F172A] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer uppercase"
            title="تغيير اللغة"
          >
            {language}
          </button>

          {/* أيقونة الإشعارات (Google Play Notification Bell) */}
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer"
            title="الإشعارات"
            aria-label="الإشعارات"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF6B00] ring-2 ring-white dark:ring-slate-900"></span>
          </button>

          {/* أيقونة سلة المشتريات مع الشارة */}
          <button 
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer"
            title="سلة التسوق"
            aria-label="سلة التسوق"
          >
            <ShoppingBag className="w-5 h-5 text-[#0F172A] dark:text-white" />
            {totalCartItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#FF6B00] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {totalCartItems}
              </span>
            )}
          </button>

          {/* نافذة الإشعارات المنسدلة */}
          {isNotificationsOpen && (
            <div className="absolute top-full left-0 mt-2 w-80 max-w-[90vw] bg-white dark:bg-[#0F172A] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 shadow-xl p-3 z-50 animate-scaleUp">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] dark:border-slate-800 mb-2">
                <span className="text-xs font-black text-[#0F172A] dark:text-white flex items-center gap-1.5">
                  <BellRing className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <span>{t.header?.notifications || 'إشعارات ECHOX Store'}</span>
                </span>
                <button type="button" onClick={() => setIsNotificationsOpen(false)} className="text-slate-400 hover:text-[#0F172A] dark:hover:text-white cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* زر تفعيل إشعارات المتجر على الهاتف */}
              <div className="mb-2.5 p-2.5 rounded-xl bg-[#FF6B00]/10 border border-[#FF6B00]/25 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
                    <span>تنبيهات العروض والمنتجات الجديدة</span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={pushBusy}
                  onClick={handleToggleStorePush}
                  className={`w-full py-1.5 px-3 rounded-lg text-[11px] font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 ${
                    isPushEnabled
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-[#FF6B00] hover:bg-[#E05E00] text-white'
                  }`}
                >
                  {isPushEnabled ? (
                    <>
                      <BellOff className="w-3.5 h-3.5" />
                      <span>إشعارات المتجر مفعّلة ✓ (إيقاف)</span>
                    </>
                  ) : (
                    <>
                      <BellRing className="w-3.5 h-3.5" />
                      <span>{pushBusy ? 'جاري التفعيل...' : 'تفعيل إشعارات الموقع على الهاتف'}</span>
                    </>
                  )}
                </button>
                {pushFeedback && (
                  <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                    {pushFeedback}
                  </p>
                )}
              </div>

              <div className="space-y-2 text-xs max-h-60 overflow-y-auto">
                {announcements.length > 0 && announcements.map((ann) => (
                  <button
                    key={ann.id}
                    type="button"
                    onClick={() => {
                      if (ann.url && ann.url.includes('product=')) {
                        try {
                          const u = new URL(ann.url, window.location.origin);
                          const pid = u.searchParams.get('product');
                          if (pid) setSelectedProductId(pid);
                        } catch {}
                      }
                      setIsNotificationsOpen(false);
                    }}
                    className="w-full text-start p-2 rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 hover:border-[#FF6B00]/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1 text-[#FF6B00] font-bold text-[11px] mb-0.5">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span>{ann.tag || 'تحديث المتجر'}</span>
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {new Date(ann.createdAt).toLocaleDateString('ar-TN')}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-[#0F172A] dark:text-white leading-snug">{ann.title}</p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">{ann.body}</p>
                  </button>
                ))}

                <div className="p-2 rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-[#FF6B00] font-bold text-[11px] mb-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t.storefront?.defaultBannerTag || 'عروض حصرية'}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">{t.header?.notificationPromo || 'تخفيض 10% بمناسبة إطلاق التشكيلة الجديدة! استخدم كود ECHOX2026.'}</p>
                </div>
                <div className="p-2 rounded-xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] mb-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t.storefront?.trustGenuine || 'قطع ومعدات أصلية 100%'}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">{t.header?.notificationCod || 'الدفع عند الاستلام والمعاينة متوفر لكافة ولايات تونس الـ24.'}</p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 3. شريط أزرار تصنيفات سريعة أفقية قابلة للتمرير (Category Chips) بزوايا دائرية كاملة (rounded-full) */}
      <div className="border-t border-[#F1F5F9] dark:border-slate-800 bg-white dark:bg-[#0F172A] w-full max-w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none snap-x w-full max-w-full">
          {categoryChips.map((chip) => {
            const isSelected = selectedCategory === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleCategoryClick(chip.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-[#FF6B00] text-white shadow-xs'
                    : 'bg-[#F8FAFC] dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#0F172A] dark:hover:text-white border border-[#E2E8F0] dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. القائمة الجانبية (Drawer) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-start bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-4/5 max-w-xs bg-white dark:bg-[#0F172A] border-r border-[#E2E8F0] dark:border-slate-800 p-5 flex flex-col justify-between text-[#0F172A] dark:text-white shadow-2xl h-full animate-slideIn">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E2E8F0] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <img 
                    src="/assets/images/echox-logo.webp" 
                    alt="ECHOX Store" 
                    className="w-7 h-7 rounded-full object-contain border border-[#FF6B00]/30"
                  />
                  <span className="font-black text-sm tracking-tight text-[#0F172A] dark:text-white">
                    ECHOX <span className="text-[#FF6B00]">Store</span>
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsMenuOpen(false)} 
                  className="text-slate-500 hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white p-1.5 rounded-full bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                <button 
                  type="button"
                  onClick={() => handleNavClick('store')}
                  className="w-full text-start block p-2.5 rounded-2xl hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:text-[#FF6B00] transition-colors cursor-pointer"
                >
                  {t.nav.store}
                </button>
                <button 
                  type="button"
                  onClick={() => handleNavClick('companies')}
                  className="w-full text-start block p-2.5 rounded-2xl hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:text-[#FF6B00] transition-colors cursor-pointer"
                >
                  {t.nav.companies}
                </button>
                <button 
                  type="button"
                  onClick={() => handleNavClick('promise')}
                  className="w-full text-start block p-2.5 rounded-2xl hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:text-[#FF6B00] transition-colors cursor-pointer"
                >
                  {t.nav.promise}
                </button>
                <button 
                  type="button"
                  onClick={() => handleNavClick('my_orders')}
                  className="w-full text-start block p-2.5 rounded-2xl hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:text-[#FF6B00] transition-colors cursor-pointer"
                >
                  {t.nav.myOrders}
                </button>
                <button 
                  type="button"
                  onClick={() => handleNavClick('wishlist')}
                  className="w-full text-start block p-2.5 rounded-2xl hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:text-[#FF6B00] transition-colors cursor-pointer"
                >
                  {t.nav.wishlist} ({wishlist ? wishlist.length : 0})
                </button>
                <button 
                  type="button"
                  onClick={() => handleNavClick('contact')}
                  className="w-full text-start block p-2.5 rounded-2xl hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:text-[#FF6B00] transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'اتصل بنا' : language === 'fr' ? 'Contactez-nous' : 'Contact Us'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsSupportModalOpen(true);
                  }}
                  className="w-full text-start flex items-center gap-2 p-2.5 rounded-2xl bg-[#FF6B00]/10 text-[#FF6B00] hover:bg-[#FF6B00]/20 transition-colors cursor-pointer mt-2"
                >
                  <HeartHandshake className="w-4 h-4 shrink-0" />
                  <span>{t.supportEchox.navLabel}</span>
                </button>

                {canInstallPwa && (
                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={handleInstallPwa}
                      className="w-full text-start flex items-center gap-2 p-2.5 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-[#FF6B00] shrink-0" />
                      <span>تثبيت التطبيق على الهاتف (PWA)</span>
                    </button>
                    {showIosInstallTip && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                        على متصفح Safari: اضغط على أيقونة <strong>المشاركة (Share)</strong> بالأسفل ثم اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong> لتثبيت التطبيق وتفعيل إشعارات الهاتف.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] dark:border-slate-800 text-[11px] text-slate-400 text-center font-medium">
              ECHOX Store © 2026 — {language === 'ar' ? 'تونس' : language === 'fr' ? 'Tunisie' : 'Tunisia'}
            </div>
          </div>
          <div className="flex-1 cursor-pointer" onClick={() => setIsMenuOpen(false)}></div>
        </div>
      )}

    </header>
  );
}

export { Header };
