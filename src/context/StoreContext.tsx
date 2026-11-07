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
  Review 
} from '../types';
import { 
  INITIAL_COMPANIES, 
  INITIAL_PRODUCTS, 
  INITIAL_ORDERS, 
  INITIAL_OWNER_SETTINGS, 
  INITIAL_SITE_SETTINGS 
} from '../data/initialData';
import { getTranslation } from '../data/translations';

interface StoreContextType {
  language: Language;
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
  
  // Orders
  orders: Order[];
  createOrder: (orderData: {
    customerName: string;
    customerEmail?: string;
    customerPhone: string;
    shippingAddress: CustomerAddress;
    paymentMethod: 'cod' | 'konnect' | 'flouci';
    carrierName?: string;
    notes?: string;
  }) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => void;
  
  // Contact & Chat
  inquiries: ContactInquiry[];
  sendInquiry: (inquiry: Omit<ContactInquiry, 'id' | 'createdAt' | 'read'>) => void;
  replyToInquiry: (inquiryId: string, reply: string) => void;
  chatMessages: ChatMessage[];
  sendChatMessage: (text: string, sender: 'customer' | 'owner') => void;
  
  // Settings
  siteSettings: SiteSettings;
  updateSiteSettings: (settings: Partial<SiteSettings>) => void;
  ownerSettings: OwnerSettings;
  updateOwnerSettings: (settings: Partial<OwnerSettings>) => void;
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

  const t = getTranslation(language);

  // 2. Navigation & Views
  const [currentView, setCurrentView] = useState<string>('store');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // 3. Products
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('echox_products');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
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
      return saved ? JSON.parse(saved) : INITIAL_COMPANIES;
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
      return saved ? JSON.parse(saved) : INITIAL_ORDERS;
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
      return saved ? JSON.parse(saved) : INITIAL_OWNER_SETTINGS;
    } catch {
      return INITIAL_OWNER_SETTINGS;
    }
  });

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
  };

  const updateOwnerSettings = (updates: Partial<OwnerSettings>) => {
    setOwnerSettingsState(prev => {
      // Ensure primaryPhone (+21621511162) and loginEmail (abdelkaderbahri570@gmail.com) remain locked
      const next = { 
        ...prev, 
        ...updates,
        primaryPhone: INITIAL_OWNER_SETTINGS.primaryPhone,
        loginEmail: INITIAL_OWNER_SETTINGS.loginEmail
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
  const cartShippingFee = cart.length === 0 
    ? 0 
    : (cartSubtotal >= siteSettings.freeShippingThreshold ? 0 : siteSettings.standardShippingFee);
  const cartTotal = Math.max(0, cartSubtotal - cartDiscountAmount + cartShippingFee);

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
    setProducts(prev => [newProduct, ...prev]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const toggleProductActive = (id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
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
  const createOrder = (orderData: {
    customerName: string;
    customerEmail?: string;
    customerPhone: string;
    shippingAddress: CustomerAddress;
    paymentMethod: 'cod' | 'konnect' | 'flouci';
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
      unitPrice: item.product.price,
      quantity: item.quantity,
      totalPrice: item.product.price * item.quantity
    }));

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
      shippingFee: cartShippingFee,
      totalAmount: cartTotal,
      status: 'new',
      paymentMethod: orderData.paymentMethod,
      paymentStatus: orderData.paymentMethod === 'cod' ? 'pending' : 'pending',
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

  const updateOrderStatus = (orderId: string, status: OrderStatus, note?: string) => {
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

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'owner',
      text: 'مرحباً بك في ECHOX STORE! كيف يمكننا مساعدتك اليوم بخصوص الأجهزة، القطع الأصلية، أو التوصيل لولايتك؟',
      timestamp: '2026-11-06T08:00:00Z'
    }
  ]);

  const sendChatMessage = (text: string, sender: 'customer' | 'owner') => {
    const msg: ChatMessage = {
      id: `chat_${Date.now()}`,
      sender,
      text,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, msg]);
  };

  return (
    <StoreContext.Provider value={{
      language,
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
      
      orders,
      createOrder,
      updateOrderStatus,
      
      inquiries,
      sendInquiry,
      replyToInquiry,
      chatMessages,
      sendChatMessage,
      
      siteSettings,
      updateSiteSettings,
      ownerSettings,
      updateOwnerSettings
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
