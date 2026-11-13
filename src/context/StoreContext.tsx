import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Language, 
  Product, 
  Company, 
  Order, 
  OrderItem, 
  OrderStatus, 
  CustomerAddress, 
  CustomerUser, 
  CartItem, 
  OwnerSettings, 
  SiteSettings, 
  ContactInquiry, 
  ChatMessage, 
  Review,
  CategoryItem,
  PromoBanner,
  PaymentMethodType,
  PaymentSystemPublicConfig,
  TransferProof,
  SupportChatConfig,
  ChatSuggestedProduct
} from '../types';
import {
  DEFAULT_CHAT_CONFIG,
  fetchChatThreadServer,
  fetchPublicChatConfig,
  generateSmartStoreReply,
  pushChatExchangeServer
} from '../lib/supportChatEngine';
import {
  DEFAULT_PUBLIC_PAYMENT_CONFIG,
  fetchPublicPaymentConfig,
  submitServerCheckout,
  canOrderShipClient,
  syncAdminCatalogToPaymentEngine
} from '../lib/payments';
import { 
  INITIAL_COMPANIES, 
  INITIAL_PRODUCTS, 
  INITIAL_ORDERS, 
  INITIAL_OWNER_SETTINGS, 
  INITIAL_SITE_SETTINGS 
} from '../data/initialData';
import { getTranslation } from '../data/translations';
import { 
  getAuthorizedOwnerEmail, 
  setAuthorizedOwnerEmail, 
  getAuthorizedOwnerPhone, 
  setAuthorizedOwnerPhone 
} from '../lib/security';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';


interface StoreContextType {
  language: Language;
  currentLanguage: Language;
  setLanguage: (lang: Language) => void;
  t: ReturnType<typeof getTranslation>;
  currentView: string;
  setCurrentView: (view: string) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  
  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  couponCode: string;
  discountRate: number;
  applyCoupon: (code: string) => boolean;
  cartSubtotal: number;
  cartShippingFee: number;
  cartDiscountAmount: number;
  cartTaxAmount: number;
  cartTotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  
  // Wishlist
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  
  // Customer Auth
  currentUser: CustomerUser | null;
  loginCustomer: (email: string, fullName?: string, phone?: string) => void;
  logoutCustomer: () => void;
  addCustomerAddress: (address: Omit<CustomerAddress, 'id'>) => void;
  setDefaultAddress: (addressId: string) => void;
  
  // Owner Auth & Security
  isOwner: boolean;
  loginOwnerWithGoogle: (email: string) => { success: boolean; message: string };
  logoutOwner: () => void;
  
  // Products Management
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'reviews' | 'rating' | 'reviewCount'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  toggleProductActive: (id: string) => void;
  addProductReview: (productId: string, review: Omit<Review, 'id' | 'date'>) => void;
  
  // Companies Management
  companies: Company[];
  addCompany: (company: Omit<Company, 'id'>) => void;
  updateCompany: (id: string, updates: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  
  // Categories & Chips
  categories: CategoryItem[];
  addCategory: (category: CategoryItem) => void;
  deleteCategory: (id: string) => void;
  
  // Banners & Promos
  banners: PromoBanner[];
  addBanner: (banner: Omit<PromoBanner, 'id'>) => void;
  deleteBanner: (id: string) => void;
  toggleBannerActive: (id: string) => void;

  // Orders & Payments
  paymentConfig: PaymentSystemPublicConfig;
  refreshPaymentConfig: () => Promise<void>;
  orders: Order[];
  createOrder: (orderData: {
    customerName: string;
    customerEmail?: string;
    customerPhone: string;
    shippingAddress: CustomerAddress;
    paymentMethod: PaymentMethodType;
    carrierName?: string;
    notes?: string;
  }) => Order;
  createServerOrder: (orderData: {
    customerName: string;
    customerEmail?: string;
    customerPhone: string;
    shippingAddress: CustomerAddress;
    paymentMethod: PaymentMethodType;
    carrierName?: string;
    notes?: string;
    transferProof?: Partial<TransferProof>;
  }) => Promise<{ ok: boolean; order?: Order; paymentUrl?: string; error?: string }>;
  updateOrderInState: (updatedOrder: Order) => void;
  addManualOrder: (orderData: Partial<Order>) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => { ok: boolean; error?: string };
  deleteOrder: (orderId: string) => void;
  isSupportModalOpen: boolean;
  setIsSupportModalOpen: (open: boolean) => void;
  
  // Contact & Chat
  inquiries: ContactInquiry[];
  sendInquiry: (inquiry: Omit<ContactInquiry, 'id' | 'createdAt' | 'read'>) => void;
  replyToInquiry: (inquiryId: string, reply: string) => void;
  chatMessages: ChatMessage[];
  chatConfig: SupportChatConfig;
  isChatReplying: boolean;
  sendChatMessage: (text: string, sender: 'customer' | 'owner', extra?: { suggestedProducts?: ChatSuggestedProduct[]; actionView?: string; source?: 'auto' | 'owner' | 'customer' }) => void;
  sendCustomerSupportMessage: (text: string) => Promise<void>;
  refreshChatThread: () => Promise<void>;
  refreshChatConfig: () => Promise<void>;
  resetChatSession: () => void;
  
  // Settings
  siteSettings: SiteSettings;
  updateSiteSettings: (settings: Partial<SiteSettings>) => void;
  ownerSettings: OwnerSettings;
  updateOwnerSettings: (settings: Partial<OwnerSettings>) => void;
  
  // Dark Mode
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Language State
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('echox_language');
      return (saved as Language) || 'ar';
    } catch {
      return 'ar';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('echox_language', lang);
    } catch (e) {
      console.warn('Storage quota or access error:', e);
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  // Dark Mode State with localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('echox_theme');
      if (saved) return saved === 'dark';
      return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('echox_theme', next ? 'dark' : 'light');
      } catch (e) {
        console.warn('Storage theme write error:', e);
      }
      return next;
    });
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const t = getTranslation(language);

  // 2. Navigation & Views (with clean browser URL sync)
  const [currentView, setCurrentViewState] = useState<string>('store');
  const [selectedProductId, setSelectedProductIdState] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState<boolean>(false);
  const [paymentConfig, setPaymentConfig] = useState<PaymentSystemPublicConfig>(DEFAULT_PUBLIC_PAYMENT_CONFIG);

  const setCurrentView = (view: string) => {
    setCurrentViewState(view);
    if (typeof window !== 'undefined') {
      const targetPath =
        view === 'store' || view === '/'
          ? '/'
          : view.startsWith('/')
          ? view
          : `/${view}`;
      const currentSearch = view === 'store' ? window.location.search : '';
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', `${targetPath}${currentSearch}`);
      }
    }
  };

  const setSelectedProductId = (id: string | null) => {
    setSelectedProductIdState(id);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (id) {
        url.searchParams.set('product', id);
      } else {
        url.searchParams.delete('product');
      }
      const nextUrl = `${url.pathname}${url.search}`;
      if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
        window.history.replaceState({}, '', nextUrl);
      }
    }
  };

  const refreshPaymentConfig = async () => {
    try {
      const cfg = await fetchPublicPaymentConfig();
      setPaymentConfig(cfg);
    } catch {
      // keep safe default
    }
  };

  useEffect(() => {
    refreshPaymentConfig();
  }, []);

  const normalizeAssetUrl = (url: string): string => {
    if (!url) return '/assets/images/echox-logo.webp';
    if (url.includes('file_0000000048188243bc0b721218c854fc_ea3ea21d.png')) return '/assets/images/echox-logo.webp';
    if (url.includes('product_drill_cordless_pro')) return '/assets/images/product_drill_cordless_pro.webp';
    if (url.includes('product_automotive_headlight')) return '/assets/images/product_automotive_headlight.webp';
    if (url.includes('product_digital_multimeter')) return '/assets/images/product_digital_multimeter.webp';
    if (url.includes('hero_echox_tunisia_store')) return '/assets/images/hero_echox_tunisia_store.webp';
    return url;
  };

  // 3. Products
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('echox_products');
      if (!saved) return INITIAL_PRODUCTS;
      const parsed: Product[] = JSON.parse(saved);
      return parsed.map(p => ({ ...p, images: (p.images || []).map(normalizeAssetUrl) }));
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('echox_products', JSON.stringify(products));
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  }, [products]);

  // 4. Companies
  const [companies, setCompanies] = useState<Company[]>(() => {
    try {
      const saved = localStorage.getItem('echox_companies');
      if (!saved) return INITIAL_COMPANIES;
      const parsed: Company[] = JSON.parse(saved);
      return parsed.map(c => ({ ...c, logo: normalizeAssetUrl(c.logo) }));
    } catch {
      return INITIAL_COMPANIES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('echox_companies', JSON.stringify(companies));
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  }, [companies]);

  // 5. Orders
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('echox_orders');
      if (!saved) return INITIAL_ORDERS;
      const parsed: Order[] = JSON.parse(saved);
      return parsed.map(o => ({
        ...o,
        items: (o.items || []).map(it => ({ ...it, productImage: normalizeAssetUrl(it.productImage) })),
      }));
    } catch {
      return INITIAL_ORDERS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('echox_orders', JSON.stringify(orders));
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  }, [orders]);

  // 5.1 Categories & Chips
  const DEFAULT_CATEGORIES: CategoryItem[] = [
    { id: 'all', label: 'الكل', icon: '⚡', desc: 'كافة المعروضات المعتمدة' },
    { id: 'power_tools', label: 'أدوات ومعدات ورشات', icon: '🔧', desc: 'مثاقب، مناشير، ومعدات ورشات' },
    { id: 'auto_parts', label: 'قطع غيار سيارات', icon: '🚗', desc: 'قطع ميكانيكية وكهربائية للسيارات' },
    { id: 'electronics', label: 'أجهزة قياس وإلكترونيات', icon: '🔌', desc: 'أجهزة قياس، لوحات وقطع إلكترونية' },
    { id: 'industrial', label: 'معدات صناعية ثقيلة', icon: '🏭', desc: 'معدات المصانع والورشات الثقيلة' },
    { id: 'smart_home', label: 'أنظمة وحماية ذكية', icon: '🏠', desc: 'أتمتة وحماية المنازل الذكية' },
  ];

  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('echox_categories');
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('echox_categories', JSON.stringify(categories));
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  }, [categories]);

  const addCategory = (category: CategoryItem) => {
    setCategories(prev => {
      if (prev.some(c => c.id === category.id)) return prev;
      return [...prev, category];
    });
  };

  const deleteCategory = (id: string) => {
    if (id === 'all') return;
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  // 5.2 Banners & Promos
  const DEFAULT_BANNERS: PromoBanner[] = [
    {
      id: 'banner_1',
      tag: 'عروض حصرية',
      title: 'عروض وتخفيضات اليوم على كافة المعدات وقطع الغيار',
      subtitle: 'توصيل سريع لكافة الـ24 ولاية والدفع عند المعاينة والاستلام',
      active: true,
      bgGradient: 'from-[#FF6B00] via-[#F97316] to-[#EA580C]'
    }
  ];

  const [banners, setBanners] = useState<PromoBanner[]>(() => {
    try {
      const saved = localStorage.getItem('echox_banners');
      return saved ? JSON.parse(saved) : DEFAULT_BANNERS;
    } catch {
      return DEFAULT_BANNERS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('echox_banners', JSON.stringify(banners));
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  }, [banners]);

  const addBanner = (bannerData: Omit<PromoBanner, 'id'>) => {
    const newBanner: PromoBanner = {
      ...bannerData,
      id: `banner_${Date.now()}`
    };
    setBanners(prev => [newBanner, ...prev]);
  };

  const deleteBanner = (id: string) => {
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  const toggleBannerActive = (id: string) => {
    setBanners(prev => prev.map(b => b.id === id ? { ...b, active: !b.active } : b));
  };

  // 5.3 Order Deletion & Manual Order Creation
  const deleteOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const addManualOrder = (orderData: Partial<Order>): Order => {
    const newId = `ord_manual_${Date.now()}`;
    const tracking = `ECH-TN-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();
    const created: Order = {
      id: newId,
      trackingNumber: tracking,
      customerName: orderData.customerName || 'عميل هاتفي مباشر',
      customerEmail: orderData.customerEmail || '',
      customerPhone: orderData.customerPhone || '+216 00 000 000',
      shippingAddress: orderData.shippingAddress || {
        id: `addr_${Date.now()}`,
        isDefault: true,
        fullName: orderData.customerName || 'عميل هاتف',
        phone: orderData.customerPhone || '+216 00 000 000',
        governorate: 'tunis',
        city: 'تونس العاصمة',
        postalCode: '1000',
        street: 'طلب مباشر عبر الهاتف / واتساب'
      },
      items: orderData.items && orderData.items.length > 0 ? orderData.items : [
        {
          productId: products[0]?.id || 'prod_1',
          productName: products[0]?.name || { ar: 'طلب هاتفي مباشر', fr: 'Commande directe', en: 'Direct Order' },
          productImage: products[0]?.images[0] || '/assets/images/echox-logo.webp',
          unitPrice: orderData.totalAmount || 150.000,
          quantity: 1,
          totalPrice: orderData.totalAmount || 150.000
        }
      ],
      subtotal: orderData.subtotal || orderData.totalAmount || 150.000,
      discount: orderData.discount || 0,
      shippingFee: orderData.shippingFee || 0,
      totalAmount: orderData.totalAmount || 150.000,
      status: orderData.status || 'new',
      paymentMethod: orderData.paymentMethod || 'cod',
      paymentStatus: orderData.paymentStatus || 'pending',
      carrierName: orderData.carrierName || 'LivriTN Logistics',
      createdAt: now,
      updatedAt: now,
      notes: orderData.notes || 'تم التسجيل يدوياً بواسطة المالك من لوحة التحكم',
      statusHistory: [
        { status: orderData.status || 'new', timestamp: now, note: 'تم تسجيل الطلب يدوياً عبر الهاتف / واتساب' }
      ]
    };

    setOrders(prev => [created, ...prev]);
    return created;
  };

  // 6. Settings
  const [siteSettings, setSiteSettingsState] = useState<SiteSettings>(() => {
    try {
      const saved = localStorage.getItem('echox_site_settings');
      return saved ? JSON.parse(saved) : INITIAL_SITE_SETTINGS;
    } catch {
      return INITIAL_SITE_SETTINGS;
    }
  });

  const [ownerSettings, setOwnerSettingsState] = useState<OwnerSettings>(() => {
    try {
      const saved = localStorage.getItem('echox_owner_settings');
      const base = saved ? JSON.parse(saved) : INITIAL_OWNER_SETTINGS;
      return {
        ...base,
        loginEmail: getAuthorizedOwnerEmail(),
        primaryPhone: getAuthorizedOwnerPhone()
      };
    } catch {
      return {
        ...INITIAL_OWNER_SETTINGS,
        loginEmail: getAuthorizedOwnerEmail(),
        primaryPhone: getAuthorizedOwnerPhone()
      };
    }
  });

  // Sync site settings from Firestore on mount
  useEffect(() => {
    let active = true;
    async function loadCloudSiteSettings() {
      try {
        const snap = await getDoc(doc(db, 'store_settings', 'site'));
        if (snap.exists() && active) {
          const cloudData = snap.data() as Partial<SiteSettings>;
          setSiteSettingsState(prev => {
            const merged = { ...prev, ...cloudData };
            try {
              localStorage.setItem('echox_site_settings', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      } catch (err) {
        console.info('Cloud site settings load notice:', err);
      }
    }
    loadCloudSiteSettings();
    return () => { active = false; };
  }, []);

  const updateSiteSettings = (updates: Partial<SiteSettings>) => {
    setSiteSettingsState(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('echox_site_settings', JSON.stringify(next));
      } catch (e) {
        console.warn('Storage write error:', e);
      }
      return next;
    });

    // Background sync to Firestore doc store_settings/site
    try {
      setDoc(doc(db, 'store_settings', 'site'), updates, { merge: true }).catch(err => {
        console.info('Firestore settings sync notice:', err);
      });
    } catch (e) {
      console.info('Firestore save exception notice:', e);
    }
  };

  const updateOwnerSettings = (updates: Partial<OwnerSettings>) => {
    if (updates.loginEmail) {
      setAuthorizedOwnerEmail(updates.loginEmail);
    }
    if (updates.primaryPhone) {
      setAuthorizedOwnerPhone(updates.primaryPhone);
    }
    setOwnerSettingsState(prev => {
      const next = { 
        ...prev, 
        ...updates
      };
      try {
        localStorage.setItem('echox_owner_settings', JSON.stringify(next));
      } catch (e) {
        console.warn('Storage write error:', e);
      }
      return next;
    });
  };

  // 7. Cart & Discounts
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('echox_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [couponCode, setCouponCode] = useState<string>('');
  const [discountRate, setDiscountRate] = useState<number>(0);

  useEffect(() => {
    localStorage.setItem('echox_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => {
    setCart([]);
    setCouponCode('');
    setDiscountRate(0);
  };

  const applyCoupon = (code: string): boolean => {
    const clean = code.trim().toUpperCase();
    if (clean === 'ECHOX2026' || clean === 'ECHOX10') {
      setCouponCode(clean);
      setDiscountRate(0.10); // 10% discount
      return true;
    }
    return false;
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartDiscountAmount = cartSubtotal * discountRate;
  const cartNetItems = Math.max(0, cartSubtotal - cartDiscountAmount);
  const cartTaxAmount = Math.round(cartNetItems * ((paymentConfig?.taxRatePercent || 0) / 100) * 1000) / 1000;
  const cartShippingFee = cart.length === 0 
    ? 0 
    : (cartSubtotal >= siteSettings.freeShippingThreshold ? 0 : siteSettings.standardShippingFee);
  const cartTotal = Math.max(0, Math.round((cartNetItems + cartTaxAmount + cartShippingFee) * 1000) / 1000);

  // 8. Wishlist
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('echox_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleWishlist = (productId: string) => {
    setWishlist(prev => {
      const next = prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      try {
        localStorage.setItem('echox_wishlist', JSON.stringify(next));
      } catch (e) {
        console.warn('Storage write error:', e);
      }
      return next;
    });
  };

  // 9. Customer Auth
  const [currentUser, setCurrentUser] = useState<CustomerUser | null>(() => {
    try {
      const saved = localStorage.getItem('echox_customer');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const loginCustomer = (email: string, fullName: string = 'حريف تونسي', phone: string = '+216 21 000 000') => {
    const user: CustomerUser = {
      id: `cust_${Date.now()}`,
      fullName,
      email,
      phone,
      addresses: [
        {
          id: 'addr_init',
          isDefault: true,
          fullName,
          phone,
          governorate: 'tunis',
          city: 'تونس العاصمة',
          postalCode: '1000',
          street: 'شارع الحبيب بورقيبة',
        }
      ],
      wishlist
    };
    setCurrentUser(user);
    try {
      localStorage.setItem('echox_customer', JSON.stringify(user));
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  };

  const logoutCustomer = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('echox_customer');
    } catch (e) {
      console.warn('Storage remove error:', e);
    }
  };

  const addCustomerAddress = (newAddr: Omit<CustomerAddress, 'id'>) => {
    if (!currentUser) return;
    const address: CustomerAddress = {
      ...newAddr,
      id: `addr_${Date.now()}`
    };
    const updatedAddresses = newAddr.isDefault 
      ? currentUser.addresses.map(a => ({ ...a, isDefault: false })).concat(address)
      : [...currentUser.addresses, address];
    
    const updatedUser = { ...currentUser, addresses: updatedAddresses };
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('echox_customer', JSON.stringify(updatedUser));
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  };

  const setDefaultAddress = (addressId: string) => {
    if (!currentUser) return;
    const updatedAddresses = currentUser.addresses.map(a => ({
      ...a,
      isDefault: a.id === addressId
    }));
    const updatedUser = { ...currentUser, addresses: updatedAddresses };
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('echox_customer', JSON.stringify(updatedUser));
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  };

  // 10. Owner Security & Auth
  const [isOwner, setIsOwner] = useState<boolean>(() => {
    const saved = sessionStorage.getItem('echox_owner_session');
    return saved === 'authorized_true';
  });

  const loginOwnerWithGoogle = (email: string) => {
    const targetEmail = 'abdelkaderbahri570@gmail.com';
    const cleanEmail = email.trim().toLowerCase();
    
    if (cleanEmail === targetEmail) {
      setIsOwner(true);
      sessionStorage.setItem('echox_owner_session', 'authorized_true');
      return {
        success: true,
        message: 'تم التحقق من هوية المالك بنجاح (ECHOX OWNER SECURITY: Custom Claim owner: true)'
      };
    } else {
      setIsOwner(false);
      sessionStorage.removeItem('echox_owner_session');
      return {
        success: false,
        message: `تم رفض الوصول! البريد (${email}) ليس حساب المالك المعتمد. الحساب الوحيد المصرح له هو abdelkaderbahri570@gmail.com`
      };
    }
  };

  const logoutOwner = () => {
    setIsOwner(false);
    sessionStorage.removeItem('echox_owner_session');
    if (currentView === 'owner_dashboard') {
      setCurrentView('store');
    }
  };

  // 11. Products CRUD
  const addProduct = (prodData: Omit<Product, 'id' | 'reviews' | 'rating' | 'reviewCount'>) => {
    const newProduct: Product = {
      ...prodData,
      id: `prod_${Date.now()}`,
      rating: 5.0,
      reviewCount: 0,
      reviews: []
    };
    setProducts(prev => {
      const next = [newProduct, ...prev];
      syncAdminCatalogToPaymentEngine(next);
      return next;
    });
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      syncAdminCatalogToPaymentEngine(next);
      return next;
    });
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const toggleProductActive = (id: string) => {
    setProducts(prev => {
      const next = prev.map(p => p.id === id ? { ...p, active: !p.active } : p);
      syncAdminCatalogToPaymentEngine(next);
      return next;
    });
  };

  const addProductReview = (productId: string, review: Omit<Review, 'id' | 'date'>) => {
    const newRev: Review = {
      ...review,
      id: `rev_${Date.now()}`,
      date: new Date().toISOString().split('T')[0]
    };
    setProducts(prev => prev.map(prod => {
      if (prod.id !== productId) return prod;
      const updatedReviews = [newRev, ...prod.reviews];
      const newRating = +(updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length).toFixed(1);
      return {
        ...prod,
        reviews: updatedReviews,
        rating: newRating,
        reviewCount: updatedReviews.length
      };
    }));
  };

  // 12. Companies CRUD
  const addCompany = (compData: Omit<Company, 'id'>) => {
    const newCompany: Company = {
      ...compData,
      id: `comp_${Date.now()}`
    };
    setCompanies(prev => [...prev, newCompany]);
  };

  const updateCompany = (id: string, updates: Partial<Company>) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCompany = (id: string) => {
    setCompanies(prev => prev.filter(c => c.id !== id));
  };

  // 13. Orders
  const updateOrderInState = (updatedOrder: Order) => {
    setOrders(prev => {
      const exists = prev.some(o => o.id === updatedOrder.id || o.trackingNumber === updatedOrder.trackingNumber);
      if (!exists) return [updatedOrder, ...prev];
      return prev.map(o => (o.id === updatedOrder.id || o.trackingNumber === updatedOrder.trackingNumber) ? updatedOrder : o);
    });
  };

  const createServerOrder = async (orderData: {
    customerName: string;
    customerEmail?: string;
    customerPhone: string;
    shippingAddress: CustomerAddress;
    paymentMethod: PaymentMethodType;
    carrierName?: string;
    notes?: string;
    transferProof?: Partial<TransferProof>;
  }): Promise<{ ok: boolean; order?: Order; paymentUrl?: string; error?: string }> => {
    const payload = {
      customerId: currentUser?.id,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
      shippingAddress: orderData.shippingAddress,
      items: cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        productImage: item.product.images[0] || '',
        unitPrice: item.product.price,
        quantity: item.quantity,
        companyId: item.product.companyId,
        companyName: item.product.companyName,
      })),
      couponCode: couponCode || undefined,
      paymentMethod: orderData.paymentMethod,
      clientExpectedTotal: cartTotal,
      carrierName: orderData.carrierName || 'Aramex Express Tunisie',
      notes: orderData.notes,
      transferProof: orderData.transferProof,
    };

    const res = await submitServerCheckout(payload);
    if (!res.ok || !res.order) {
      return { ok: false, error: res.error || 'تعذر تسجيل الطلب على الخادم.' };
    }

    setOrders(prev => [res.order!, ...prev]);
    clearCart();
    return { ok: true, order: res.order, paymentUrl: res.paymentUrl };
  };

  const createOrder = (orderData: {
    customerName: string;
    customerEmail?: string;
    customerPhone: string;
    shippingAddress: CustomerAddress;
    paymentMethod: PaymentMethodType;
    carrierName?: string;
    notes?: string;
  }): Order => {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const trackingNumber = `ECH-TN-${randomSuffix}`;
    const now = new Date().toISOString();

    const orderItems: OrderItem[] = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      productImage: item.product.images[0] || '',
      companyId: item.product.companyId,
      companyName: item.product.companyName,
      unitPrice: item.product.price,
      quantity: item.quantity,
      totalPrice: item.product.price * item.quantity
    }));

    const initialPayStatus =
      orderData.paymentMethod === 'bank_transfer'
        ? 'Awaiting Bank Transfer'
        : orderData.paymentMethod === 'cod'
        ? 'Cash on Delivery'
        : 'Pending Payment';

    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      trackingNumber,
      customerId: currentUser?.id,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
      shippingAddress: orderData.shippingAddress,
      items: orderItems,
      subtotal: cartSubtotal,
      discount: cartDiscountAmount,
      taxAmount: cartTaxAmount,
      shippingFee: cartShippingFee,
      totalAmount: cartTotal,
      status: 'new',
      paymentMethod: orderData.paymentMethod,
      paymentStatus: initialPayStatus,
      carrierName: orderData.carrierName || 'Aramex Express Tunisie',
      createdAt: now,
      updatedAt: now,
      notes: orderData.notes,
      statusHistory: [
        {
          status: 'new',
          timestamp: now,
          note: 'تم تسجيل الطلب بنجاح عبر منصة ECHOX STORE'
        }
      ]
    };

    setOrders(prev => [newOrder, ...prev]);
    clearCart();
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus, note?: string): { ok: boolean; error?: string } => {
    const targetOrder = orders.find(o => o.id === orderId);
    const shippingSteps: OrderStatus[] = ['preparing', 'out_for_delivery', 'delivered'];
    if (targetOrder && shippingSteps.includes(status) && !canOrderShipClient(targetOrder)) {
      return { ok: false, error: t.payments.shippingBlockedUnpaid };
    }

    const now = new Date().toISOString();
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        status,
        updatedAt: now,
        notes: note ? `${o.notes ? o.notes + ' | ' : ''}${note}` : o.notes,
        statusHistory: [
          ...o.statusHistory,
          { status, timestamp: now, note }
        ]
      };
    }));
    return { ok: true };
  };

  // 14. Inquiries & Chat
  const [inquiries, setInquiries] = useState<ContactInquiry[]>(() => {
    try {
      const saved = localStorage.getItem('echox_inquiries');
      return saved ? JSON.parse(saved) : [
        {
          id: 'inq_1',
          senderName: 'كمال التريكي',
          email: 'kamel.triki@gmail.com',
          phone: '+216 55 120 900',
          subject: 'استفسار حول توافق مصباح Matrix LED مع موديل W205',
          message: 'السلام عليكم، هل مصباح الكريستال يركب مباشرة على موديل 2018 دون الحاجة إلى تعديل أسلاك أو برمجة كمبيوتر؟ شكراً.',
          createdAt: '2026-11-05T10:15:00Z',
          read: true,
          reply: 'وعليكم السلام سي كمال. نعم يتوافق مباشرة Plug & Play مع ضمان التشغيل الكامل.',
          repliedAt: '2026-11-05T11:00:00Z'
        }
      ];
    } catch {
      return [
        {
          id: 'inq_1',
          senderName: 'كمال التريكي',
          email: 'kamel.triki@gmail.com',
          phone: '+216 55 120 900',
          subject: 'استفسار حول توافق مصباح Matrix LED مع موديل W205',
          message: 'السلام عليكم، هل مصباح الكريستال يركب مباشرة على موديل 2018 دون الحاجة إلى تعديل أسلاك أو برمجة كمبيوتر؟ شكراً.',
          createdAt: '2026-11-05T10:15:00Z',
          read: true,
          reply: 'وعليكم السلام سي كمال. نعم يتوافق مباشرة Plug & Play مع ضمان التشغيل الكامل.',
          repliedAt: '2026-11-05T11:00:00Z'
        }
      ];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('echox_inquiries', JSON.stringify(inquiries));
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  }, [inquiries]);

  const sendInquiry = (inquiry: Omit<ContactInquiry, 'id' | 'createdAt' | 'read'>) => {
    const newInquiry: ContactInquiry = {
      ...inquiry,
      id: `inq_${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false
    };
    setInquiries(prev => [newInquiry, ...prev]);
  };

  const replyToInquiry = (inquiryId: string, reply: string) => {
    setInquiries(prev => prev.map(inq => {
      if (inq.id !== inquiryId) return inq;
      return {
        ...inq,
        read: true,
        reply,
        repliedAt: new Date().toISOString()
      };
    }));
  };

  const [chatConfig, setChatConfig] = useState<SupportChatConfig>(DEFAULT_CHAT_CONFIG);
  const [isChatReplying, setIsChatReplying] = useState(false);

  const [chatSessionId, setChatSessionId] = useState<string>(() => {
    try {
      const existing = localStorage.getItem('echox_chat_session_id');
      if (existing && existing.length >= 6) return existing;
    } catch {
      // ignore
    }
    const generated = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      localStorage.setItem('echox_chat_session_id', generated);
    } catch {
      // ignore
    }
    return generated;
  });

  const buildWelcomeMessage = (lang: Language, cfg: SupportChatConfig): ChatMessage => ({
    id: 'msg_welcome',
    sender: 'owner',
    source: 'auto',
    text: cfg.welcomeMessage[lang] || cfg.welcomeMessage.ar || DEFAULT_CHAT_CONFIG.welcomeMessage[lang],
    timestamp: new Date().toISOString(),
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('echox_chat_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [buildWelcomeMessage(language, DEFAULT_CHAT_CONFIG)];
  });

  useEffect(() => {
    try {
      localStorage.setItem('echox_chat_messages', JSON.stringify(chatMessages));
    } catch {
      // ignore
    }
  }, [chatMessages]);

  // Update untouched default welcome message whenever user switches AR / FR / EN
  useEffect(() => {
    setChatMessages(prev => {
      if (prev.length === 1 && prev[0].id === 'msg_welcome') {
        const nextText = chatConfig.welcomeMessage[language] || chatConfig.welcomeMessage.ar;
        if (prev[0].text !== nextText) {
          return [{ ...prev[0], text: nextText }];
        }
      }
      return prev;
    });
  }, [language, chatConfig]);

  const refreshChatConfig = async () => {
    const cfg = await fetchPublicChatConfig();
    if (cfg) setChatConfig(cfg);
  };

  const refreshChatThread = async () => {
    const remoteThread = await fetchChatThreadServer(chatSessionId);
    if (remoteThread && Array.isArray(remoteThread.messages) && remoteThread.messages.length > 0) {
      setChatMessages(remoteThread.messages);
    }
  };

  useEffect(() => {
    refreshChatConfig();
    refreshChatThread();
  }, []);

  const sendChatMessage = (
    text: string,
    sender: 'customer' | 'owner',
    extra?: { suggestedProducts?: ChatSuggestedProduct[]; actionView?: string; source?: 'auto' | 'owner' | 'customer' }
  ) => {
    const msg: ChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sender,
      source: extra?.source || (sender === 'customer' ? 'customer' : 'owner'),
      text,
      timestamp: new Date().toISOString(),
      suggestedProducts: extra?.suggestedProducts,
      actionView: extra?.actionView,
    };
    setChatMessages(prev => [...prev, msg]);
  };

  const sendCustomerSupportMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    const customerMsg: ChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sender: 'customer',
      source: 'customer',
      text: trimmed,
      timestamp: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, customerMsg]);

    const reply = chatConfig.autoReplyEnabled
      ? generateSmartStoreReply({
          message: trimmed,
          language,
          products,
          companies,
          orders,
          siteSettings,
          paymentConfig,
          chatConfig,
        })
      : null;

    if (reply) {
      setIsChatReplying(true);
      await new Promise(resolve => setTimeout(resolve, 350));
      const autoMsg: ChatMessage = {
        id: `chat_auto_${Date.now() + 1}`,
        sender: 'owner',
        source: 'auto',
        text: reply.text,
        timestamp: new Date().toISOString(),
        suggestedProducts: reply.suggestedProducts,
        actionView: reply.actionView,
      };
      setChatMessages(prev => [...prev, autoMsg]);
      setIsChatReplying(false);
    }

    const serverThread = await pushChatExchangeServer({
      sessionId: chatSessionId,
      language,
      customerText: trimmed,
      autoReplyText: reply?.text,
      suggestedProducts: reply?.suggestedProducts,
      actionView: reply?.actionView,
    });
    if (serverThread && Array.isArray(serverThread.messages) && serverThread.messages.length > 0) {
      setChatMessages(serverThread.messages);
    }
  };

  const resetChatSession = () => {
    const nextId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      localStorage.setItem('echox_chat_session_id', nextId);
    } catch {
      // ignore
    }
    setChatSessionId(nextId);
    setChatMessages([buildWelcomeMessage(language, chatConfig)]);
  };

  return (
    <StoreContext.Provider value={{
      language,
      currentLanguage: language,
      setLanguage,
      t,
      currentView,
      setCurrentView,
      selectedProductId,
      setSelectedProductId,
      searchQuery,
      setSearchQuery,
      selectedCategory,
      setSelectedCategory,
      
      cart,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      couponCode,
      discountRate,
      applyCoupon,
      cartSubtotal,
      cartShippingFee,
      cartDiscountAmount,
      cartTaxAmount,
      cartTotal,
      isCartOpen,
      setIsCartOpen,
      
      wishlist,
      toggleWishlist,
      
      currentUser,
      loginCustomer,
      logoutCustomer,
      addCustomerAddress,
      setDefaultAddress,
      
      isOwner,
      loginOwnerWithGoogle,
      logoutOwner,
      
      products,
      addProduct,
      updateProduct,
      deleteProduct,
      toggleProductActive,
      addProductReview,
      
      companies,
      addCompany,
      updateCompany,
      deleteCompany,
      
      categories,
      addCategory,
      deleteCategory,
      
      banners,
      addBanner,
      deleteBanner,
      toggleBannerActive,
      
      paymentConfig,
      refreshPaymentConfig,
      orders,
      createOrder,
      createServerOrder,
      updateOrderInState,
      addManualOrder,
      updateOrderStatus,
      deleteOrder,
      isSupportModalOpen,
      setIsSupportModalOpen,
      
      inquiries,
      sendInquiry,
      replyToInquiry,
      chatMessages,
      chatConfig,
      isChatReplying,
      sendChatMessage,
      sendCustomerSupportMessage,
      refreshChatThread,
      refreshChatConfig,
      resetChatSession,
      
      siteSettings,
      updateSiteSettings,
      ownerSettings,
      updateOwnerSettings,
      
      isDarkMode,
      toggleDarkMode
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
