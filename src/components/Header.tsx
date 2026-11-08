import React, { useState } from 'react';
import { Menu, X, Search, ShoppingBag, Heart, User, Phone, CheckCircle2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';

interface HeaderProps {
  onOpenVault?: () => void;
  productsList?: Product[];
  onSelectProduct?: (product: Product) => void;
}

export default function Header({ onOpenVault, productsList, onSelectProduct }: HeaderProps) {
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
    products: storeProducts,
    setSelectedProductId,
    siteSettings
  } = useStore();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);

  const productsToSearch = productsList || storeProducts || [];
  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // الـ Hash الخاص بالشيفرة السرية لغرفة المالك (تشفير متقدم)
  const VALID_SEARCH_HASHES = [
    "8f31b60882e379b398df9813b190f842de5d16568c0b25e790a6e03104e76964",
    "e0fa6bbbea58a39ac603805b6a1f68920c47a42d772b257edb8a462321465db5",
    "1dc225c52c6f14545367d3ad48a27b878696fa23340ec538cb7ffc010bfe1564"
  ];

  const generateHash = async (text: string, salt: string = "ECHOX_SECRET_SALT_2026"): Promise<string> => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text + salt);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return '';
    }
  };

  // دالة البحث المزدوجة (للمنتجات + البوابة السرية)
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);

    if (val.trim().length > 0) {
      // 1. فحص هل الكلمة المدخلة هي الشيفرة السرية لغرفة المالك
      const saltedHash = await generateHash(val.trim(), "ECHOX_SECRET_SALT_2026");
      const bareHash = await generateHash(val.trim(), "");

      if (VALID_SEARCH_HASHES.includes(saltedHash) || VALID_SEARCH_HASHES.includes(bareHash)) {
        setSearchInput('');
        setSearchResults([]);
        setIsSearchOpen(false);

        // إطلاق غرفة المالك السرية
        if (onOpenVault) {
          onOpenVault();
        }
        window.dispatchEvent(new CustomEvent('open_echox_vault'));
        return;
      }

      // 2. البحث العادي عن المنتجات في المتجر
      const term = val.toLowerCase().trim();
      const filtered = productsToSearch.filter(item => {
        const nameAr = item.name?.ar?.toLowerCase() || '';
        const nameFr = item.name?.fr?.toLowerCase() || '';
        const nameEn = item.name?.en?.toLowerCase() || '';
        const descAr = item.description?.ar?.toLowerCase() || '';
        const descFr = item.description?.fr?.toLowerCase() || '';
        const descEn = item.description?.en?.toLowerCase() || '';
        
        // Also support flat string name if present
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

  const handleSelectProductItem = (product: Product) => {
    if (onSelectProduct) {
      onSelectProduct(product);
    } else if (setSelectedProductId) {
      setSelectedProductId(product.id);
    }
    setIsSearchOpen(false);
    setSearchInput('');
    setSearchResults([]);
  };

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

  return (
    <header className="w-full bg-[#0A0A0F] border-b border-white/15 text-white sticky top-0 z-40 shadow-xl">
      {/* Top Announcement Bar if enabled */}
      {siteSettings?.showAnnouncement && (
        <div className="bg-[#111118] text-gray-300 border-b border-white/5 text-[11px] py-1.5 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-3">
          <span>{siteSettings.announcementText[language]}</span>
          <span className="hidden md:inline-block text-gray-600">|</span>
          <a 
            href={`tel:${siteSettings.supportPhone}`} 
            className="hidden md:inline-flex items-center gap-1 text-[#F59E0B] hover:underline"
          >
            <Phone className="w-3 h-3" />
            <span dir="ltr">{siteSettings.supportPhone}</span>
          </a>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        
        {/* اليسار: الثلاث خطوط، رمز البحث المجاور، والشعار */}
        <div className="flex items-center gap-2.5">
          {/* زر الثلاث خطوط (القائمة الجانبية) */}
          <button 
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition cursor-pointer"
            title="القائمة"
            aria-label="القائمة"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* رمز البحث بجانب الثلاث خطوط */}
          <button 
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition cursor-pointer group"
            title="بحث"
            aria-label="بحث"
          >
            <Search className="w-5 h-5 text-[#F59E0B] group-hover:scale-110 transition-transform" />
          </button>

          {/* الشعار واسم المتجر */}
          <div 
            onClick={() => handleNavClick('store')}
            className="flex items-center gap-2 cursor-pointer ml-1 sm:ml-2 group select-none"
          >
            <img 
              src="/assets/aistudio/file_0000000048188243bc0b721218c854fc_ea3ea21d.png" 
              alt="ECHOX" 
              className="w-8 h-8 rounded-full object-contain border border-[#F59E0B]/30 group-hover:scale-105 transition-transform"
            />
            <span className="font-black tracking-wider text-sm sm:text-base text-[#F59E0B] group-hover:text-amber-400 transition-colors">
              ECHOX Market
            </span>
          </div>
        </div>

        {/* اليمين: الأيقونات (اللغة، المفضلة، السلة) */}
        <div className="flex items-center gap-2">
          {/* زر تبديل اللغة */}
          <button 
            type="button"
            onClick={cycleLanguage}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 transition cursor-pointer uppercase"
            title="تغيير اللغة"
          >
            {language}
          </button>

          {/* زر المفضلة */}
          <button
            type="button"
            onClick={() => handleNavClick('wishlist')}
            aria-label="Wishlist"
            className="hidden sm:flex relative p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-gray-300 hover:text-red-400 cursor-pointer"
            title="المفضلة"
          >
            <Heart className={`w-4 h-4 ${wishlist && wishlist.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
            {wishlist && wishlist.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {wishlist.length}
              </span>
            )}
          </button>

          {/* زر السلة */}
          <button 
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition relative cursor-pointer group text-gray-300 hover:text-white"
            title="سلة التسوق"
            aria-label="سلة التسوق"
          >
            <ShoppingBag className="w-4 h-4 text-[#F59E0B] group-hover:scale-110 transition-transform" />
            {totalCartItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#F59E0B] text-black text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                {totalCartItems}
              </span>
            )}
          </button>
        </div>

      </div>

      {/* نافذة البحث المنبثقة (تفتح عند الضغط على أيقونة العدسة بجانب الثلاث خطوط) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/85 backdrop-blur-md p-4 pt-20 animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0A0A0F] border border-[#F59E0B]/40 rounded-2xl p-5 shadow-2xl relative text-white animate-scaleUp">
            
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>البحث السريع أو البوابة</span>
              </span>
              <button 
                type="button"
                onClick={() => setIsSearchOpen(false)} 
                className="text-gray-400 hover:text-white p-1 rounded-lg bg-white/5 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative flex items-center mb-3">
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="ابحث عن منتج أو أدخل شيفرة الوصول..."
                autoFocus
                className="w-full bg-[#111118] border border-white/10 rounded-xl py-3 pl-3 pr-10 text-xs text-white focus:border-[#F59E0B] outline-none transition shadow-inner placeholder-gray-500"
              />
              <Search className="w-4 h-4 text-[#F59E0B] absolute right-3 pointer-events-none" />
            </div>

            {/* نتائج البحث المباشرة */}
            {searchResults.length > 0 && (
              <div className="bg-[#111118] border border-white/10 rounded-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-white/5 shadow-inner">
                {searchResults.map((product) => {
                  const prodName = product.name?.[language] || (typeof (product as any).name === 'string' ? (product as any).name : product.name?.ar);
                  return (
                    <div 
                      key={product.id}
                      onClick={() => handleSelectProductItem(product)}
                      className="p-3 hover:bg-white/5 text-xs text-gray-300 transition cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {product.images && product.images[0] && (
                          <img 
                            src={product.images[0]} 
                            alt={prodName} 
                            className="w-8 h-8 rounded-lg object-cover bg-black/40 border border-white/10 shrink-0"
                          />
                        )}
                        <span className="truncate group-hover:text-white transition-colors">{prodName}</span>
                      </div>
                      <span className="text-[#F59E0B] font-bold font-mono shrink-0">{product.price} د.ت</span>
                    </div>
                  );
                })}
              </div>
            )}

            {searchInput.trim().length > 0 && searchResults.length === 0 && (
              <p className="text-center text-xs text-gray-500 py-4">
                لا توجد نتائج مطابقة لبحثك.
              </p>
            )}

          </div>
          <div className="absolute inset-0 -z-10 cursor-pointer" onClick={() => setIsSearchOpen(false)}></div>
        </div>
      )}

      {/* القائمة الجانبية (الثلاث خطوط) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-start bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-4/5 max-w-xs bg-[#0A0A0F] border-r border-[#F59E0B]/30 p-5 flex flex-col justify-between text-white shadow-2xl h-full animate-slideIn">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <img 
                    src="/assets/aistudio/file_0000000048188243bc0b721218c854fc_ea3ea21d.png" 
                    alt="ECHOX" 
                    className="w-7 h-7 rounded-full object-contain border border-[#F59E0B]/30"
                  />
                  <span className="font-bold text-sm tracking-wider text-[#F59E0B]">القائمة الرئيسية</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsMenuOpen(false)} 
                  className="text-gray-400 hover:text-white p-1 rounded-lg bg-white/5 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-gray-300">
                <button 
                  type="button"
                  onClick={() => handleNavClick('store')}
                  className="w-full text-start block p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 hover:text-[#F59E0B] transition cursor-pointer"
                >
                  الرئيسية
                </button>
                <button 
                  type="button"
                  onClick={() => handleNavClick('store')}
                  className="w-full text-start block p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 hover:text-[#F59E0B] transition cursor-pointer"
                >
                  المنتجات والعروض
                </button>
                <button 
                  type="button"
                  onClick={() => handleNavClick('companies')}
                  className="w-full text-start block p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 hover:text-[#F59E0B] transition cursor-pointer"
                >
                  الشركات الشريكة والموزعون
                </button>
                <button 
                  type="button"
                  onClick={() => handleNavClick('promise')}
                  className="w-full text-start block p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 hover:text-[#F59E0B] transition cursor-pointer"
                >
                  الوعد وضمان ECHOX
                </button>
                <button 
                  type="button"
                  onClick={() => handleNavClick('my_orders')}
                  className="w-full text-start block p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 hover:text-[#F59E0B] transition cursor-pointer"
                >
                  متابعة طلباتي
                </button>
                <button 
                  type="button"
                  onClick={() => handleNavClick('wishlist')}
                  className="w-full text-start block p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 hover:text-[#F59E0B] transition cursor-pointer"
                >
                  المفضلة ({wishlist ? wishlist.length : 0})
                </button>
                <button 
                  type="button"
                  onClick={() => handleNavClick('account')}
                  className="w-full text-start block p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 hover:text-[#F59E0B] transition cursor-pointer"
                >
                  حسابي ({currentUser ? currentUser.fullName.split(' ')[0] : 'تسجيل الدخول'})
                </button>
                <button 
                  type="button"
                  onClick={() => handleNavClick('contact')}
                  className="w-full text-start block p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 hover:text-[#F59E0B] transition cursor-pointer"
                >
                  اتصل بنا
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 text-[10px] text-gray-500 text-center">
              ECHOX STORE © 2026
            </div>
          </div>
          <div className="flex-1 cursor-pointer" onClick={() => setIsMenuOpen(false)}></div>
        </div>
      )}
    </header>
  );
}

// Named export for backwards compatibility
export { Header };
