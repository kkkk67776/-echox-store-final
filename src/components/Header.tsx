import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  ShoppingBag, 
  Search, 
  Heart, 
  User, 
  ShieldCheck, 
  X, 
  Menu, 
  Phone, 
  ChevronDown 
} from 'lucide-react';
import { Language } from '../types';

export const Header: React.FC = () => {
  const { 
    language, 
    setLanguage, 
    t, 
    currentView, 
    setCurrentView, 
    cart, 
    setIsCartOpen, 
    wishlist, 
    currentUser, 
    isOwner,
    searchQuery, 
    setSearchQuery,
    siteSettings
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleNavClick = (view: string) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E8E4DD] transition-all">
      {/* 1. Top Sovereign Announcement Bar */}
      {siteSettings.showAnnouncement && (
        <div className="bg-[#111827] text-white text-xs py-2 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-3">
          <span>{siteSettings.announcementText[language]}</span>
          <span className="hidden md:inline-block text-slate-400">|</span>
          <a 
            href={`tel:${siteSettings.supportPhone}`} 
            className="hidden md:inline-flex items-center gap-1 text-[#FF6B00] hover:underline"
          >
            <Phone className="w-3 h-3" />
            <span dir="ltr">{siteSettings.supportPhone}</span>
          </a>
        </div>
      )}

      {/* 2. Main Top Row (Faithful to the ECHOX reference screenshot) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between gap-3 md:gap-6">
          
          {/* Left Area: Cart Button + Wishlist + Customer Account */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Cart Button (Circular styling matching screenshot) */}
            <button
              onClick={() => setIsCartOpen(true)}
              aria-label="Shopping Cart"
              className="relative w-11 h-11 rounded-full border border-[#D5CFBE] bg-white/80 hover:bg-white flex items-center justify-center text-slate-800 hover:text-[#FF6B00] transition-all shadow-xs hover:shadow-sm"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalCartItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                  {totalCartItems}
                </span>
              )}
            </button>

            {/* Wishlist Button */}
            <button
              onClick={() => handleNavClick('wishlist')}
              aria-label="Wishlist"
              className="hidden sm:flex relative w-11 h-11 rounded-full border border-[#D5CFBE] bg-white/80 hover:bg-white items-center justify-center text-slate-700 hover:text-red-500 transition-all shadow-xs"
            >
              <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[11px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Customer Account Button */}
            <button
              onClick={() => handleNavClick('account')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full border border-[#D5CFBE] bg-white/80 hover:bg-white text-xs font-semibold text-slate-800 transition-all shadow-xs"
            >
              <User className="w-4 h-4 text-slate-600" />
              <span>{currentUser ? currentUser.fullName.split(' ')[0] : t.nav.account}</span>
            </button>
          </div>

          {/* Center-Left: Language Switcher Capsule (Identical to reference screenshot) */}
          <div className="flex items-center p-1 rounded-full border border-[#D5CFBE] bg-white/90 shadow-xs shrink-0">
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                language === 'en' 
                  ? 'bg-[#111827] text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('fr')}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                language === 'fr' 
                  ? 'bg-[#111827] text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              FR
            </button>
            <button
              onClick={() => setLanguage('ar')}
              className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded-full transition-all ${
                language === 'ar' 
                  ? 'bg-[#111827] text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ع
            </button>
          </div>

          {/* Right Area: Brand Wordmark & Official Original Circular Logo */}
          <div className="flex items-center gap-3">
            <div 
              onClick={() => handleNavClick('store')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="text-right">
                <span className="block text-base sm:text-lg font-black tracking-wider text-[#0B0F17] group-hover:text-[#FF6B00] transition-colors leading-none">
                  ECHOX
                </span>
                <span className="block text-[11px] font-semibold text-slate-500 tracking-normal leading-tight">
                  Market
                </span>
              </div>
              <img 
                src="/assets/aistudio/file_0000000048188243bc0b721218c854fc_ea3ea21d.png" 
                alt="ECHOX Logo" 
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-contain drop-shadow-xs transition-transform group-hover:scale-105"
              />
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 hover:text-slate-900 focus:outline-hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* 3. Search Bar Row (Directly matching the screenshot pill search input) */}
        <div className="mt-3 max-w-3xl mx-auto relative">
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full h-12 pl-12 pr-12 rounded-full border border-[#D5CFBE] bg-white text-slate-900 text-sm sm:text-base placeholder-slate-400 focus:outline-hidden focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 shadow-xs transition-all text-center sm:text-start"
            />
            <div className={`absolute ${language === 'ar' ? 'left-4' : 'right-4'} flex items-center pointer-events-none text-slate-400`}>
              <Search className="w-5 h-5 text-slate-500" />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} text-slate-400 hover:text-slate-700 p-1`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 4. Sub-Navigation Links (Identical to screenshot: المتجر | الوعد | طلباتي + Companies + Owner Portal) */}
        <nav className="mt-3.5 hidden md:flex items-center justify-center gap-8 text-sm font-semibold text-slate-700 border-t border-[#E8E4DD]/70 pt-2.5">
          <button 
            onClick={() => handleNavClick('store')}
            className={`transition-colors pb-1 border-b-2 ${
              currentView === 'store' ? 'border-[#FF6B00] text-[#FF6B00] font-bold' : 'border-transparent hover:text-[#0B0F17]'
            }`}
          >
            {t.nav.store}
          </button>
          <button 
            onClick={() => handleNavClick('promise')}
            className={`transition-colors pb-1 border-b-2 ${
              currentView === 'promise' ? 'border-[#FF6B00] text-[#FF6B00] font-bold' : 'border-transparent hover:text-[#0B0F17]'
            }`}
          >
            {t.nav.promise}
          </button>
          <button 
            onClick={() => handleNavClick('my_orders')}
            className={`transition-colors pb-1 border-b-2 ${
              currentView === 'my_orders' ? 'border-[#FF6B00] text-[#FF6B00] font-bold' : 'border-transparent hover:text-[#0B0F17]'
            }`}
          >
            {t.nav.myOrders}
          </button>
          <button 
            onClick={() => handleNavClick('companies')}
            className={`transition-colors pb-1 border-b-2 ${
              currentView === 'companies' ? 'border-[#FF6B00] text-[#FF6B00] font-bold' : 'border-transparent hover:text-[#0B0F17]'
            }`}
          >
            {t.nav.companies}
          </button>
          <button 
            onClick={() => handleNavClick('contact')}
            className={`transition-colors pb-1 border-b-2 ${
              currentView === 'contact' ? 'border-[#FF6B00] text-[#FF6B00] font-bold' : 'border-transparent hover:text-[#0B0F17]'
            }`}
          >
            {t.contactModal.title}
          </button>

          {/* Sovereign Owner Room Entrance */}
          <button 
            onClick={() => handleNavClick('/owner/dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
              isOwner 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'bg-[#111827] text-white hover:bg-[#FF6B00]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isOwner ? '✓ لوحة المالك المتصل' : t.nav.ownerDashboard}</span>
          </button>
        </nav>
      </div>

      {/* 5. Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-[#E8E4DD] px-4 py-4 space-y-3 shadow-lg">
          <button 
            onClick={() => handleNavClick('store')}
            className="block w-full text-start py-2 font-bold text-slate-800 hover:text-[#FF6B00]"
          >
            {t.nav.store}
          </button>
          <button 
            onClick={() => handleNavClick('promise')}
            className="block w-full text-start py-2 font-bold text-slate-800 hover:text-[#FF6B00]"
          >
            {t.nav.promise}
          </button>
          <button 
            onClick={() => handleNavClick('my_orders')}
            className="block w-full text-start py-2 font-bold text-slate-800 hover:text-[#FF6B00]"
          >
            {t.nav.myOrders}
          </button>
          <button 
            onClick={() => handleNavClick('companies')}
            className="block w-full text-start py-2 font-bold text-slate-800 hover:text-[#FF6B00]"
          >
            {t.nav.companies}
          </button>
          <button 
            onClick={() => handleNavClick('wishlist')}
            className="block w-full text-start py-2 font-bold text-slate-800 hover:text-[#FF6B00]"
          >
            {t.nav.wishlist} ({wishlist.length})
          </button>
          <button 
            onClick={() => handleNavClick('account')}
            className="block w-full text-start py-2 font-bold text-slate-800 hover:text-[#FF6B00]"
          >
            {t.nav.account} ({currentUser ? currentUser.fullName : 'تسجيل الدخول'})
          </button>
          <button 
            onClick={() => handleNavClick('contact')}
            className="block w-full text-start py-2 font-bold text-slate-800 hover:text-[#FF6B00]"
          >
            {t.contactModal.title}
          </button>
          <div className="pt-2 border-t border-slate-100">
            <button 
              onClick={() => handleNavClick('/owner/dashboard')}
              className="w-full py-2.5 px-4 rounded-xl bg-[#111827] text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
              <span>{t.nav.ownerDashboard}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
