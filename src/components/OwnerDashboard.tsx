import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  LogOut, 
  LayoutDashboard, 
  Package, 
  Building2, 
  ShoppingBag, 
  MessageSquare, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Download, 
  Search, 
  Phone, 
  Mail, 
  CheckCircle2, 
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Save,
  Send
} from 'lucide-react';
import { Product, Company, Order, OrderStatus } from '../types';
import { TUNISIAN_GOVERNORATES, getGovernorateName } from '../data/governorates';

import { 
  getOwnerGoogleUser, 
  getOwnerCustomClaims, 
  checkServerSession, 
  clearOwnerSecuritySession, 
  logoutOwnerServer, 
  OWNER_EMAIL 
} from '../lib/security';

interface OwnerDashboardProps {
  onNavigate?: (route: string, state?: any) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ onNavigate }) => {
  const navigate = (route: string, state?: any) => {
    if (onNavigate) {
      onNavigate(route, state);
    } else {
      window.history.pushState(state, '', route);
    }
  };

  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  const { 
    products, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    toggleProductActive,
    companies, 
    addCompany, 
    updateCompany, 
    deleteCompany,
    orders, 
    updateOrderStatus,
    inquiries, 
    replyToInquiry,
    ownerSettings, 
    updateOwnerSettings,
    siteSettings, 
    updateSiteSettings,
    language, 
    t 
  } = useStore();

  useEffect(() => {
    let cancelled = false;

    async function guard() {
      // 1) هل هناك مستخدم مسجل بحساب Google؟
      const googleUser = getOwnerGoogleUser();
      if (!googleUser) {
        if (!cancelled) navigate('/owner/login');
        return;
      }

      // 2) هل البريد هو المالك abdelkaderbahri570@gmail.com؟
      if (googleUser.email !== OWNER_EMAIL) {
        clearOwnerSecuritySession();
        if (!cancelled) navigate('/owner/login');
        return;
      }

      // 3) هل لديه Custom Claim owner:true؟ (لا يُمنح إلا بعد نجاح OTP)
      const claims = getOwnerCustomClaims();
      if (claims.owner !== true) {
        if (!cancelled) navigate('/owner/phone');
        return;
      }

      // 4) هل لديه جلسة cookie صالحة على الخادم (__session)؟
      try {
        const hasValidSession = await checkServerSession();
        if (!hasValidSession) {
          if (!cancelled) navigate('/owner/login');
          return;
        }
      } catch {
        if (!cancelled) navigate('/owner/login');
        return;
      }

      // ✅ كل الشروط تحققت — اسمح بالعرض
      if (!cancelled) {
        setAuthorized(true);
        setChecking(false);
      }
    }

    guard();
    return () => { cancelled = true; };
  }, []);

  // While checking authorization, display the mandatory security dark/gold screen
  if (checking) {
    return (
      <div 
        style={{ 
          minHeight: '85vh', 
          display: 'flex',
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#0A0A0B', 
          color: '#D4AF37',
          fontSize: '18px',
          fontWeight: 'bold',
          letterSpacing: '1px'
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          <span>جارٍ التحقق من الصلاحيات ونظام الأمان السيادي...</span>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  // 2. Authenticated Owner Control Room
  // Tab navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'companies' | 'orders' | 'support' | 'settings'>('dashboard');

  // Products state
  const [prodSearch, setProdSearch] = useState('');
  const [showAddProdModal, setShowAddProdModal] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);

  // New/Edit Product form inputs
  const [prodNameAr, setProdNameAr] = useState('');
  const [prodNameFr, setProdNameFr] = useState('');
  const [prodNameEn, setProdNameEn] = useState('');
  const [prodDescAr, setProdDescAr] = useState('');
  const [prodPrice, setProdPrice] = useState('0');
  const [prodOriginalPrice, setProdOriginalPrice] = useState('');
  const [prodStock, setProdStock] = useState('10');
  const [prodCategory, setProdCategory] = useState('power_tools');
  const [prodCompanyId, setProdCompanyId] = useState(companies[0]?.id || 'comp_echox');
  const [prodGov, setProdGov] = useState('tunis');
  const [prodImagesText, setProdImagesText] = useState('');
  const [prodFeatured, setProdFeatured] = useState(false);

  // Companies state
  const [showAddCompModal, setShowAddCompModal] = useState(false);
  const [compName, setCompName] = useState('');
  const [compPhone, setCompPhone] = useState('');
  const [compEmail, setCompEmail] = useState('');
  const [compAddress, setCompAddress] = useState('');
  const [compGov, setCompGov] = useState('tunis');
  const [compDescAr, setCompDescAr] = useState('');

  // Orders state
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [adminNoteInput, setAdminNoteInput] = useState<{ [key: string]: string }>({});

  // Support / Inquiries reply state
  const [replyInputs, setReplyInputs] = useState<{ [key: string]: string }>({});

  // Settings form state
  const [secondaryPhone, setSecondaryPhone] = useState(ownerSettings.secondaryPhone);
  const [contactEmail, setContactEmail] = useState(ownerSettings.contactEmail);
  const [siteAnnouncement, setSiteAnnouncement] = useState(siteSettings.announcementText[language]);
  const [shippingFee, setShippingFee] = useState(siteSettings.standardShippingFee.toString());
  const [freeThreshold, setFreeThreshold] = useState(siteSettings.freeShippingThreshold.toString());
  const [settingsSavedMessage, setSettingsSavedMessage] = useState(false);

  const handleLogout = async () => {
    await logoutOwnerServer();
    navigate('/owner/login');
  };

  // Calculations
  const totalSales = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
  const totalOrdersCount = orders.length;
  const newOrdersCount = orders.filter(o => o.status === 'new').length;
  const inProcessingCount = orders.filter(o => o.status === 'under_confirmation' || o.status === 'preparing' || o.status === 'out_for_delivery').length;
  const lowStockProds = products.filter(p => p.stock <= 5);

  // Product Add / Edit Handler
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const imgs = prodImagesText.split('\n').map(s => s.trim()).filter(Boolean);
    const selectedComp = companies.find(c => c.id === prodCompanyId);

    if (editingProd) {
      updateProduct(editingProd.id, {
        name: { ar: prodNameAr || editingProd.name.ar, fr: prodNameFr || prodNameAr, en: prodNameEn || prodNameAr },
        description: { ar: prodDescAr || editingProd.description.ar, fr: prodDescAr, en: prodDescAr },
        price: parseFloat(prodPrice) || 0,
        originalPrice: prodOriginalPrice ? parseFloat(prodOriginalPrice) : undefined,
        stock: parseInt(prodStock) || 0,
        category: prodCategory,
        companyId: prodCompanyId,
        companyName: selectedComp?.name || editingProd.companyName,
        governorate: prodGov,
        images: imgs.length > 0 ? imgs : editingProd.images,
        featured: prodFeatured
      });
      setEditingProd(null);
    } else {
      addProduct({
        name: { ar: prodNameAr, fr: prodNameFr || prodNameAr, en: prodNameEn || prodNameAr },
        description: { ar: prodDescAr, fr: prodDescAr, en: prodDescAr },
        category: prodCategory,
        price: parseFloat(prodPrice) || 0,
        originalPrice: prodOriginalPrice ? parseFloat(prodOriginalPrice) : undefined,
        stock: parseInt(prodStock) || 0,
        companyId: prodCompanyId,
        companyName: selectedComp?.name || 'ECHOX Distribution',
        governorate: prodGov,
        images: imgs.length > 0 ? imgs : ['/src/assets/images/hero_echox_tunisia_store_1793963107162.jpg'],
        featured: prodFeatured,
        active: true,
        deliveryTimeDays: 2
      });
    }

    setShowAddProdModal(false);
    resetProdForm();
  };

  const resetProdForm = () => {
    setProdNameAr('');
    setProdNameFr('');
    setProdNameEn('');
    setProdDescAr('');
    setProdPrice('0');
    setProdOriginalPrice('');
    setProdStock('10');
    setProdImagesText('');
    setProdFeatured(false);
    setEditingProd(null);
  };

  const openEditModal = (p: Product) => {
    setEditingProd(p);
    setProdNameAr(p.name.ar);
    setProdNameFr(p.name.fr);
    setProdNameEn(p.name.en);
    setProdDescAr(p.description.ar);
    setProdPrice(p.price.toString());
    setProdOriginalPrice(p.originalPrice ? p.originalPrice.toString() : '');
    setProdStock(p.stock.toString());
    setProdCategory(p.category);
    setProdCompanyId(p.companyId);
    setProdGov(p.governorate);
    setProdImagesText(p.images.join('\n'));
    setProdFeatured(!!p.featured);
    setShowAddProdModal(true);
  };

  // Company Add Handler
  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName || !compPhone) return;

    addCompany({
      name: compName,
      logo: '/assets/aistudio/file_0000000048188243bc0b721218c854fc_ea3ea21d.png',
      phone: compPhone,
      email: compEmail || 'contact@company.tn',
      address: compAddress || 'المنطقة الصناعية',
      governorate: compGov,
      description: { ar: compDescAr || compName, fr: compDescAr || compName, en: compDescAr || compName }
    });

    setShowAddCompModal(false);
    setCompName('');
    setCompPhone('');
    setCompEmail('');
    setCompAddress('');
    setCompDescAr('');
  };

  // Export CSV
  const exportOrdersCSV = () => {
    const headers = ['Tracking', 'Customer', 'Phone', 'Governorate', 'City', 'Total_TND', 'Status', 'Date'];
    const rows = orders.map(o => [
      o.trackingNumber,
      `"${o.customerName}"`,
      `"${o.customerPhone}"`,
      o.shippingAddress.governorate,
      `"${o.shippingAddress.city}"`,
      o.totalAmount.toFixed(3),
      o.status,
      o.createdAt
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `echox_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save Site & Owner Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateOwnerSettings({
      secondaryPhone: secondaryPhone.trim(),
      contactEmail: contactEmail.trim()
    });
    updateSiteSettings({
      supportPhone: secondaryPhone.trim(),
      whatsappPhone: secondaryPhone.trim().replace(/\D/g, ''),
      standardShippingFee: parseFloat(shippingFee) || 7.000,
      freeShippingThreshold: parseFloat(freeThreshold) || 150.000,
      announcementText: {
        ...siteSettings.announcementText,
        [language]: siteAnnouncement
      }
    });

    setSettingsSavedMessage(true);
    setTimeout(() => setSettingsSavedMessage(false), 3000);
  };

  // Filtered lists
  const filteredProducts = products.filter(p => 
    p.name.ar.toLowerCase().includes(prodSearch.toLowerCase()) || 
    p.name.fr.toLowerCase().includes(prodSearch.toLowerCase()) ||
    p.companyName.toLowerCase().includes(prodSearch.toLowerCase())
  );

  const filteredOrders = orders.filter(o => {
    const matchSearch = o.trackingNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerPhone.includes(orderSearch);
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Top Banner with Sovereign Credentials */}
      <div className="bg-[#0B0F17] rounded-3xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#FF6B00] text-white flex items-center justify-center font-black text-2xl shadow-lg shrink-0">
            E
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black">{t.admin.dashboard}</h1>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                جلسة مشفرة نشطة ✓
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>المالك المعتمد: <strong className="text-white font-mono" dir="ltr">{ownerSettings.loginEmail}</strong></span>
              <span aria-hidden="true">·</span>
              <span>الهاتف السيادي: <strong className="text-[#FF6B00] font-mono" dir="ltr">{ownerSettings.primaryPhone}</strong></span>
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-red-600/80 text-white text-xs font-bold transition-colors flex items-center gap-2 shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>{t.ownerSecurity.logout}</span>
        </button>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'dashboard' ? 'bg-[#FF6B00] text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>{t.admin.dashboard}</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'products' ? 'bg-[#FF6B00] text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{t.admin.products} ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('companies')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'companies' ? 'bg-[#FF6B00] text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{t.admin.companies} ({companies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'orders' ? 'bg-[#FF6B00] text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{t.admin.orders} ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('support')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'support' ? 'bg-[#FF6B00] text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{t.admin.support} ({inquiries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'settings' ? 'bg-[#FF6B00] text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>{t.admin.settings}</span>
        </button>
      </div>

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* KPI Cards Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-bold">{t.admin.totalRevenue}</span>
              <p className="text-2xl font-black text-[#FF6B00] tabular-nums">
                {totalSales.toFixed(3)} <span className="text-xs font-bold text-slate-600">{t.cart.currency}</span>
              </p>
              <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> نشاط مباشر ومبيعات فعلية
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-bold">{t.admin.totalOrders}</span>
              <p className="text-2xl font-black text-slate-900 tabular-nums">
                {totalOrdersCount}
              </p>
              <span className="text-[11px] text-slate-500">
                منها {newOrdersCount} طلبات جديدة
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-bold">{t.admin.inProcessing}</span>
              <p className="text-2xl font-black text-blue-600 tabular-nums">
                {inProcessingCount}
              </p>
              <span className="text-[11px] text-slate-500">
                مع شركات التوصيل التونسية
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-bold">{t.admin.lowStock}</span>
              <p className="text-2xl font-black text-amber-600 tabular-nums">
                {lowStockProds.length}
              </p>
              <span className="text-[11px] text-slate-500">
                تنبيه لتجديد المخزون
              </span>
            </div>
          </div>

          {/* Recent Orders Overview Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">أحدث الطلبيات المستلمة</h2>
              <button
                onClick={() => setActiveTab('orders')}
                className="text-xs text-[#FF6B00] hover:underline font-bold"
              >
                عرض كافة الطلبات ({orders.length}) ←
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-[#FAF8F5] text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-start">رقم التتبع</th>
                    <th className="py-2.5 px-3 text-start">الحريف</th>
                    <th className="py-2.5 px-3 text-start">الولاية</th>
                    <th className="py-2.5 px-3 text-start">المبلغ</th>
                    <th className="py-2.5 px-3 text-start">الحالة</th>
                    <th className="py-2.5 px-3 text-start">إجراء سريع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.slice(0, 5).map(o => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{o.trackingNumber}</td>
                      <td className="py-3 px-3 font-semibold">{o.customerName}</td>
                      <td className="py-3 px-3">{getGovernorateName(o.shippingAddress.governorate, language)}</td>
                      <td className="py-3 px-3 font-black text-[#FF6B00] tabular-nums">{o.totalAmount.toFixed(3)} {t.cart.currency}</td>
                      <td className="py-3 px-3">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full font-bold">
                          {t.orderStatus[o.status] || o.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={o.status}
                          onChange={e => updateOrderStatus(o.id, e.target.value as OrderStatus)}
                          className="text-[11px] py-1 px-2 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="new">جديد</option>
                          <option value="under_confirmation">قيد التأكيد</option>
                          <option value="preparing">قيد التحضير</option>
                          <option value="out_for_delivery">خرج للتوصيل</option>
                          <option value="delivered">تم التسليم</option>
                          <option value="cancelled">ملغى</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: PRODUCTS MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="relative flex-1 max-w-md w-full">
              <input
                type="text"
                placeholder="بحث في المنتجات بالاسم أو الشركة..."
                value={prodSearch}
                onChange={e => setProdSearch(e.target.value)}
                className="w-full text-xs py-2 px-3 pl-8 rounded-xl border border-slate-300"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  resetProdForm();
                  setShowAddProdModal(true);
                }}
                className="px-4 py-2 bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{t.admin.addProduct}</span>
              </button>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-[#FAF8F5] text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 text-start">الصورة</th>
                    <th className="py-3 px-3 text-start">اسم المنتج</th>
                    <th className="py-3 px-3 text-start">الشركة</th>
                    <th className="py-3 px-3 text-start">السعر (TND)</th>
                    <th className="py-3 px-3 text-start">المخزون</th>
                    <th className="py-3 px-3 text-start">الحالة</th>
                    <th className="py-3 px-3 text-start">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map(prod => (
                    <tr key={prod.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <img 
                          src={prod.images[0]} 
                          alt="thumb" 
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200" 
                        />
                      </td>
                      <td className="py-2.5 px-3 max-w-xs">
                        <p className="font-bold text-slate-900 truncate">{prod.name.ar}</p>
                        <p className="text-[11px] text-slate-400 truncate">{prod.name.fr}</p>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{prod.companyName}</td>
                      <td className="py-2.5 px-3 font-black text-[#FF6B00] tabular-nums">
                        {prod.price.toFixed(3)} {t.cart.currency}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`font-bold tabular-nums ${prod.stock <= 5 ? 'text-amber-600' : 'text-slate-800'}`}>
                          {prod.stock} قطع
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => toggleProductActive(prod.id)}
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 ${
                            prod.active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {prod.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{prod.active ? 'معروض' : 'موقف مؤقتاً'}</span>
                        </button>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(prod)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                            title="تعديل"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
                                deleteProduct(prod.id);
                              }
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 text-red-600"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add / Edit Product Modal */}
          {showAddProdModal && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-base font-bold text-slate-900">
                    {editingProd ? 'تعديل بيانات المنتج' : t.admin.addProduct}
                  </h3>
                  <button onClick={() => setShowAddProdModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveProduct} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">{t.admin.productNameAr} *</label>
                    <input
                      type="text"
                      required
                      value={prodNameAr}
                      onChange={e => setProdNameAr(e.target.value)}
                      placeholder="اسم المنتج بالعربية"
                      className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">{t.admin.productNameFr}</label>
                      <input
                        type="text"
                        value={prodNameFr}
                        onChange={e => setProdNameFr(e.target.value)}
                        placeholder="Nom en français"
                        className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700">{t.admin.productNameEn}</label>
                      <input
                        type="text"
                        value={prodNameEn}
                        onChange={e => setProdNameEn(e.target.value)}
                        placeholder="Name in English"
                        className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">{t.admin.priceTND} *</label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        value={prodPrice}
                        onChange={e => setProdPrice(e.target.value)}
                        className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700">{t.admin.originalPriceTND}</label>
                      <input
                        type="number"
                        step="0.001"
                        value={prodOriginalPrice}
                        onChange={e => setProdOriginalPrice(e.target.value)}
                        placeholder="اختياري لنسبة الخصم"
                        className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700">{t.admin.stockQty} *</label>
                      <input
                        type="number"
                        required
                        value={prodStock}
                        onChange={e => setProdStock(e.target.value)}
                        className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">{t.admin.category}</label>
                      <select
                        value={prodCategory}
                        onChange={e => setProdCategory(e.target.value)}
                        className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white"
                      >
                        <option value="power_tools">معدات كهربائية</option>
                        <option value="auto_parts">قطع غيار سيارات</option>
                        <option value="electronics">إلكترونيات وقياس</option>
                        <option value="industrial">معدات صناعية</option>
                        <option value="smart_home">أجهزة ذكية</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700">{t.admin.companySelect}</label>
                      <select
                        value={prodCompanyId}
                        onChange={e => setProdCompanyId(e.target.value)}
                        className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white"
                      >
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700">{t.admin.originGovSelect}</label>
                      <select
                        value={prodGov}
                        onChange={e => setProdGov(e.target.value)}
                        className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white"
                      >
                        {TUNISIAN_GOVERNORATES.map(g => (
                          <option key={g.id} value={g.id}>{g.nameAr}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">{t.admin.imageUrls}</label>
                    <textarea
                      rows={2}
                      value={prodImagesText}
                      onChange={e => setProdImagesText(e.target.value)}
                      placeholder="/src/assets/images/..."
                      className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">الوصف التفصيلي</label>
                    <textarea
                      rows={3}
                      value={prodDescAr}
                      onChange={e => setProdDescAr(e.target.value)}
                      className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="featCheck"
                      checked={prodFeatured}
                      onChange={e => setProdFeatured(e.target.checked)}
                      className="accent-[#FF6B00]"
                    />
                    <label htmlFor="featCheck" className="text-xs font-bold text-slate-700">
                      {t.admin.featuredStatus}
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setShowAddProdModal(false)}
                      className="px-4 py-2 text-xs text-slate-600 rounded-xl hover:bg-slate-100"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      {t.admin.saveChanges}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 3: COMPANIES MANAGEMENT */}
      {activeTab === 'companies' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">الشركات التونسية الشريكة والموزعون</h2>
              <p className="text-xs text-slate-500">إدارة حسابات الشركات والمصانع المسجلة في منصة ECHOX</p>
            </div>
            <button
              onClick={() => setShowAddCompModal(true)}
              className="px-4 py-2 bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t.admin.addCompany}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {companies.map(comp => {
              const compProdsCount = products.filter(p => p.companyId === comp.id).length;
              return (
                <div key={comp.id} className="bg-white p-5 rounded-3xl border border-slate-200 space-y-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <img 
                      src={comp.logo} 
                      alt="logo" 
                      className="w-12 h-12 rounded-xl object-contain bg-slate-50 p-1 border border-slate-200" 
                    />
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{comp.name}</h3>
                      <span className="text-[11px] text-slate-500">{getGovernorateName(comp.governorate, language)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">{comp.description.ar}</p>

                  <div className="pt-2 border-t border-slate-100 text-xs space-y-1 text-slate-600">
                    <p><strong>الهاتف:</strong> <span dir="ltr">{comp.phone}</span></p>
                    <p><strong>البريد:</strong> <span dir="ltr">{comp.email}</span></p>
                    <p><strong>المنتجات التابعة:</strong> <span className="text-[#FF6B00] font-bold">{compProdsCount} منتجات</span></p>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        if (confirm(`هل أنت متأكد من حذف شركة ${comp.name}؟`)) {
                          deleteCompany(comp.id);
                        }
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Company Modal */}
          {showAddCompModal && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-base font-bold text-slate-900">{t.admin.addCompany}</h3>
                  <button onClick={() => setShowAddCompModal(false)}>✕</button>
                </div>

                <form onSubmit={handleSaveCompany} className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="اسم الشركة أو المصنع"
                    value={compName}
                    onChange={e => setCompName(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="رقم الهاتف التونسي"
                    value={compPhone}
                    onChange={e => setCompPhone(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
                    dir="ltr"
                  />
                  <input
                    type="email"
                    placeholder="البريد الإلكتروني"
                    value={compEmail}
                    onChange={e => setCompEmail(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
                    dir="ltr"
                  />
                  <select
                    value={compGov}
                    onChange={e => setCompGov(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white"
                  >
                    {TUNISIAN_GOVERNORATES.map(g => (
                      <option key={g.id} value={g.id}>{g.nameAr}</option>
                    ))}
                  </select>
                  <textarea
                    rows={2}
                    placeholder="نبذة عن الشركة ومجال تخصصها..."
                    value={compDescAr}
                    onChange={e => setCompDescAr(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
                  />

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddCompModal(false)}
                      className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#FF6B00] text-white text-xs font-bold rounded-xl"
                    >
                      حفظ الشركة
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 4: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 flex-1 w-full sm:max-w-md">
              <input
                type="text"
                placeholder="بحث برقم التتبع أو اسم أو هاتف الحريف..."
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white"
              >
                <option value="all">كافة الحالات</option>
                <option value="new">جديد</option>
                <option value="under_confirmation">قيد التأكيد</option>
                <option value="preparing">قيد التحضير</option>
                <option value="out_for_delivery">خرج للتوصيل</option>
                <option value="delivered">تم التسليم</option>
                <option value="cancelled">ملغى</option>
              </select>

              <button
                onClick={exportOrdersCSV}
                className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-slate-800"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.admin.exportCSV}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredOrders.map(ord => (
              <div key={ord.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-[#FF6B00]">{ord.trackingNumber}</span>
                      <span className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full font-bold">
                        {t.orderStatus[ord.status] || ord.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      الحريف: <strong>{ord.customerName}</strong> · هاتف: <span dir="ltr">{ord.customerPhone}</span>
                    </p>
                  </div>

                  {/* Status Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">تغيير الحالة:</span>
                    <select
                      value={ord.status}
                      onChange={e => updateOrderStatus(ord.id, e.target.value as OrderStatus, adminNoteInput[ord.id])}
                      className="text-xs py-1.5 px-3 rounded-xl border border-slate-300 bg-white font-bold"
                    >
                      <option value="new">جديد</option>
                      <option value="under_confirmation">قيد التأكيد</option>
                      <option value="preparing">قيد التحضير</option>
                      <option value="out_for_delivery">خرج للتوصيل</option>
                      <option value="delivered">تم التسليم</option>
                      <option value="cancelled">ملغى</option>
                    </select>
                  </div>
                </div>

                {/* Items & Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
                  <div className="space-y-1">
                    <p><strong>الولاية:</strong> {getGovernorateName(ord.shippingAddress.governorate, language)} ({ord.shippingAddress.city})</p>
                    <p><strong>العنوان:</strong> {ord.shippingAddress.street}</p>
                    {ord.notes && <p className="text-amber-700"><strong>ملاحظات الحريف:</strong> {ord.notes}</p>}
                  </div>

                  <div className="space-y-1 text-end sm:text-start">
                    <p><strong>القطع المطلوبة:</strong> {ord.items.map(i => `${i.productName.ar} (×${i.quantity})`).join(', ')}</p>
                    <p><strong>المبلغ الإجمالي:</strong> <span className="font-black text-[#FF6B00] text-sm tabular-nums">{ord.totalAmount.toFixed(3)} {t.cart.currency}</span></p>
                    <p><strong>طريقة الدفع:</strong> {ord.paymentMethod === 'cod' ? 'دفع عند الاستلام نقداً' : ord.paymentMethod}</p>
                  </div>
                </div>

                {/* Add admin note field */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <input
                    type="text"
                    placeholder="إضافة ملاحظة إدارية لهذه الحالة (تظهر في سجل التتبع للحريف)..."
                    value={adminNoteInput[ord.id] || ''}
                    onChange={e => setAdminNoteInput({ ...adminNoteInput, [ord.id]: e.target.value })}
                    className="flex-1 text-xs py-1.5 px-3 rounded-xl border border-slate-200"
                  />
                  <button
                    onClick={() => {
                      if (adminNoteInput[ord.id]) {
                        updateOrderStatus(ord.id, ord.status, adminNoteInput[ord.id]);
                        setAdminNoteInput({ ...adminNoteInput, [ord.id]: '' });
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900"
                  >
                    حفظ الملاحظة
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SUPPORT & MESSAGES */}
      {activeTab === 'support' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">رسائل واستفسارات الحرفاء الواردة</h2>
            <p className="text-xs text-slate-500">الردود تصل مباشرة للحريف في صفحة المحادثة والدعم</p>
          </div>

          <div className="space-y-4">
            {inquiries.map(inq => (
              <div key={inq.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{inq.subject}</h3>
                    <p className="text-xs text-slate-500">
                      من: <strong>{inq.senderName}</strong> · هاتف: <span dir="ltr">{inq.phone}</span> · بريد: <span dir="ltr">{inq.email}</span>
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(inq.createdAt).toLocaleDateString('ar-TN')}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {inq.message}
                </p>

                {inq.reply ? (
                  <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 text-xs space-y-1">
                    <p className="font-bold text-emerald-800">تم إرسال رد المالك:</p>
                    <p>{inq.reply}</p>
                  </div>
                ) : (
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="اكتب ردك للحريف هنا..."
                      value={replyInputs[inq.id] || ''}
                      onChange={e => setReplyInputs({ ...replyInputs, [inq.id]: e.target.value })}
                      className="flex-1 text-xs py-2 px-3 rounded-xl border border-slate-300"
                    />
                    <button
                      onClick={() => {
                        if (replyInputs[inq.id]) {
                          replyToInquiry(inq.id, replyInputs[inq.id]);
                          setReplyInputs({ ...replyInputs, [inq.id]: '' });
                        }
                      }}
                      className="px-4 py-2 bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{t.admin.replyMessage}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: SITE & OWNER SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
          
          {settingsSavedMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{t.admin.siteSettingsSaved}</span>
            </div>
          )}

          {/* Section 1: Owner Sovereign Profile */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
              <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
              <span>بيانات وهوية المالك السيادية (ECHOX OWNER)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  حساب Google الدخول السيادي (🔒 للعرض فقط - غير قابل للتعديل):
                </label>
                <input
                  type="text"
                  disabled
                  value={ownerSettings.loginEmail}
                  className="w-full text-xs py-2 px-3 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 font-mono font-bold cursor-not-allowed"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الهاتف الأساسي السيادي (🔒 للعرض فقط - ثابت للأمان):
                </label>
                <input
                  type="text"
                  disabled
                  value={ownerSettings.primaryPhone}
                  className="w-full text-xs py-2 px-3 rounded-xl bg-slate-100 border border-slate-300 text-[#FF6B00] font-mono font-bold cursor-not-allowed"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم هاتف التواصل وواتساب الموقع (تحديث تلقائي لأزرار الاتصال):
                </label>
                <input
                  type="tel"
                  required
                  value={secondaryPhone}
                  onChange={e => setSecondaryPhone(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  بريد التواصل الرسمي الظاهر للحرفاء:
                </label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Store Shipping & Announcement */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
              <ShoppingBag className="w-4 h-4 text-[#FF6B00]" />
              <span>إعدادات الشحن والعروض</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تكلفة الشحن القياسية لكافة الولايات (TND):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={shippingFee}
                  onChange={e => setShippingFee(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الحد الأدنى للتوصيل المجاني (TND):
                </label>
                <input
                  type="number"
                  step="1"
                  value={freeThreshold}
                  onChange={e => setFreeThreshold(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نص الشريط العلوي للإعلانات:
              </label>
              <input
                type="text"
                value={siteAnnouncement}
                onChange={e => setSiteAnnouncement(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="px-6 py-3 bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{t.admin.saveChanges}</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
};
