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
  KeyRound,
  Sparkles,
  X,
  ChevronLeft,
  MapPin,
  Tag,
  Smartphone,
  RefreshCw,
  FileText,
  Percent,
  Check
} from 'lucide-react';
import { Product, Company, Order, OrderStatus, CategoryItem, PromoBanner } from '../types';
import { TUNISIAN_GOVERNORATES, getGovernorateName } from '../data/governorates';
import { 
  getAuthorizedOwnerEmail, 
  setAuthorizedOwnerEmail, 
  getAuthorizedOwnerPhone, 
  setAuthorizedOwnerPhone, 
  getOwnerGoogleUser, 
  isOwnerUnlocked,
  clearOwnerSecuritySession, 
  logoutOwnerServer,
  saveOwnerLockConfig,
  fetchOwnerLockConfig,
  verifyOwnerLockInput
} from '../lib/security';

interface OwnerDashboardProps {
  onNavigate?: (route: string, state?: any) => void;
}

type DashboardTab = 
  | 'overview'
  | 'account_security'
  | 'products'
  | 'categories'
  | 'partners'
  | 'banners'
  | 'orders';

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
    deleteCompany,
    categories,
    addCategory,
    deleteCategory,
    banners,
    addBanner,
    deleteBanner,
    toggleBannerActive,
    orders, 
    addManualOrder,
    updateOrderStatus,
    deleteOrder,
    ownerSettings, 
    updateOwnerSettings,
    siteSettings, 
    updateSiteSettings,
    language, 
    t 
  } = useStore();

  // Active Tab
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Confirmation Delete Modal
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    type: 'product' | 'category' | 'partner' | 'banner' | 'order';
    id: string;
    title: string;
  }>({ isOpen: false, type: 'product', id: '', title: '' });

  // 1. Account & Security Form States
  const [editOwnerEmail, setEditOwnerEmail] = useState(ownerSettings.loginEmail || getAuthorizedOwnerEmail());
  const [editOwnerPhone, setEditOwnerPhone] = useState(ownerSettings.primaryPhone || getAuthorizedOwnerPhone());
  const [emailSavedSuccess, setEmailSavedSuccess] = useState(false);
  const [phoneSavedSuccess, setPhoneSavedSuccess] = useState(false);

  // Security Lock Change State
  const [lockType, setLockType] = useState<'pin' | 'pattern'>('pin');
  const [currentSecretInput, setCurrentSecretInput] = useState('');
  const [newSecretInput, setNewSecretInput] = useState('');
  const [confirmSecretInput, setConfirmSecretInput] = useState('');
  const [secretChangeStep, setSecretChangeStep] = useState<1 | 2>(1);
  const [secretSuccessMessage, setSecretSuccessMessage] = useState('');
  const [secretErrorMessage, setSecretErrorMessage] = useState('');
  const [isChangingPasscode, setIsChangingPasscode] = useState(false);

  // 2. Product Form & Filter States
  const [prodSearch, setProdSearch] = useState('');
  const [showAddProdModal, setShowAddProdModal] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);

  const [prodNameAr, setProdNameAr] = useState('');
  const [prodNameFr, setProdNameFr] = useState('');
  const [prodDescAr, setProdDescAr] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodOriginalPrice, setProdOriginalPrice] = useState('');
  const [prodStock, setProdStock] = useState('10');
  const [prodCategory, setProdCategory] = useState('power_tools');
  const [prodCompanyId, setProdCompanyId] = useState(companies[0]?.id || 'comp_echox');
  const [prodGov, setProdGov] = useState('tunis');
  const [prodImagesText, setProdImagesText] = useState('');
  const [prodFeatured, setProdFeatured] = useState(false);

  // 3. Category Form States
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [catId, setCatId] = useState('');
  const [catLabel, setCatLabel] = useState('');
  const [catIcon, setCatIcon] = useState('📦');
  const [catDesc, setCatDesc] = useState('');

  // 4. Partner / Company Form States
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerAddress, setPartnerAddress] = useState('');
  const [partnerGov, setPartnerGov] = useState('tunis');
  const [partnerDesc, setPartnerDesc] = useState('');
  const [partnerLogo, setPartnerLogo] = useState('');

  // 5. Banner Form States
  const [showAddBannerModal, setShowAddBannerModal] = useState(false);
  const [bannerTag, setBannerTag] = useState('عروض حصرية');
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerGradient, setBannerGradient] = useState('from-[#FF6B00] via-[#F97316] to-[#EA580C]');

  // 6. Orders States & Manual Order Form
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [showAddManualOrderModal, setShowAddManualOrderModal] = useState(false);
  const [manualCustName, setManualCustName] = useState('');
  const [manualCustPhone, setManualCustPhone] = useState('');
  const [manualGov, setManualGov] = useState('tunis');
  const [manualCity, setManualCity] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  // Authorization Check
  useEffect(() => {
    let cancelled = false;

    async function guard() {
      const googleUser = getOwnerGoogleUser();
      const authorizedEmail = getAuthorizedOwnerEmail().toLowerCase();
      
      if (!googleUser || googleUser.email.toLowerCase() !== authorizedEmail) {
        clearOwnerSecuritySession();
        if (!cancelled) navigate('/owner/login');
        return;
      }

      if (!isOwnerUnlocked()) {
        if (!cancelled) navigate('/owner/lock');
        return;
      }

      if (!cancelled) {
        setAuthorized(true);
        setChecking(false);
      }
    }

    guard();
    return () => { cancelled = true; };
  }, []);

  if (checking) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center bg-[#0B0F17] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-300">جارٍ التحقق من الصلاحيات والبيئة المشفرة...</span>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  const handleLogout = async () => {
    await logoutOwnerServer();
    navigate('/owner/login');
  };

  // Calculations for KPI Cards
  const totalSales = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
  const totalOrdersCount = orders.length;
  const newOrdersCount = orders.filter(o => o.status === 'new').length;
  const completedOrdersCount = orders.filter(o => o.status === 'delivered').length;

  // Handlers for Account & Security
  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOwnerEmail.trim() || !editOwnerEmail.includes('@')) return;
    setAuthorizedOwnerEmail(editOwnerEmail.trim());
    updateOwnerSettings({ loginEmail: editOwnerEmail.trim() });
    setEmailSavedSuccess(true);
    setTimeout(() => setEmailSavedSuccess(false), 3000);
  };

  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOwnerPhone.trim()) return;
    setAuthorizedOwnerPhone(editOwnerPhone.trim());
    updateOwnerSettings({ primaryPhone: editOwnerPhone.trim(), secondaryPhone: editOwnerPhone.trim() });
    updateSiteSettings({ supportPhone: editOwnerPhone.trim(), whatsappPhone: editOwnerPhone.trim().replace(/\D/g, '') });
    setPhoneSavedSuccess(true);
    setTimeout(() => setPhoneSavedSuccess(false), 3000);
  };

  const handleChangeSecretCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecretErrorMessage('');
    setSecretSuccessMessage('');

    if (secretChangeStep === 1) {
      if (!currentSecretInput.trim()) {
        setSecretErrorMessage('يرجى إدخال رمز الدخول الحالي أولاً.');
        return;
      }
      setIsChangingPasscode(true);
      try {
        const confRes = await fetchOwnerLockConfig();
        if (confRes.config?.lock_hash) {
          const verify = await verifyOwnerLockInput(currentSecretInput.trim(), confRes.config.lock_hash, confRes.config.lock_type);
          if (!verify.success) {
            setSecretErrorMessage('الرمز الحالي غير صحيح! تحقق من الرمز وأعد المحاولة.');
            setIsChangingPasscode(false);
            return;
          }
        }
        setSecretChangeStep(2);
      } catch (err) {
        setSecretChangeStep(2);
      } finally {
        setIsChangingPasscode(false);
      }
    } else {
      if (newSecretInput.trim().length < 4) {
        setSecretErrorMessage('الرمز الجديد يجب أن يتكون من 4 خانات أو أحرف على الأقل.');
        return;
      }
      if (newSecretInput.trim() !== confirmSecretInput.trim()) {
        setSecretErrorMessage('تأكيد الرمز غير متطابق مع الرمز الجديد!');
        return;
      }
      setIsChangingPasscode(true);
      try {
        await saveOwnerLockConfig(lockType, newSecretInput.trim(), false);
        setSecretSuccessMessage('تم تغيير رمز الدخول السري وتشفيره بنجاح ✓');
        setCurrentSecretInput('');
        setNewSecretInput('');
        setConfirmSecretInput('');
        setSecretChangeStep(1);
        setTimeout(() => setSecretSuccessMessage(''), 4000);
      } catch (err) {
        setSecretErrorMessage('حدث خطأ أثناء حفظ الرمز. يرجى إعادة المحاولة.');
      } finally {
        setIsChangingPasscode(false);
      }
    }
  };

  // Handlers for Products
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodNameAr.trim() || !prodPrice) return;

    const imgs = prodImagesText.split('\n').map(s => s.trim()).filter(Boolean);
    const selectedComp = companies.find(c => c.id === prodCompanyId);

    if (editingProd) {
      updateProduct(editingProd.id, {
        name: { ar: prodNameAr, fr: prodNameFr || prodNameAr, en: prodNameAr },
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
    } else {
      addProduct({
        name: { ar: prodNameAr, fr: prodNameFr || prodNameAr, en: prodNameAr },
        description: { ar: prodDescAr, fr: prodDescAr, en: prodDescAr },
        category: prodCategory,
        price: parseFloat(prodPrice) || 0,
        originalPrice: prodOriginalPrice ? parseFloat(prodOriginalPrice) : undefined,
        stock: parseInt(prodStock) || 0,
        companyId: prodCompanyId,
        companyName: selectedComp?.name || 'ECHOX Distribution',
        governorate: prodGov,
        images: imgs.length > 0 ? imgs : ['/assets/aistudio/file_0000000048188243bc0b721218c854fc_ea3ea21d.png'],
        featured: prodFeatured,
        active: true,
        deliveryTimeDays: 2
      });
    }

    setShowAddProdModal(false);
    setEditingProd(null);
    setProdNameAr('');
    setProdNameFr('');
    setProdDescAr('');
    setProdPrice('');
    setProdOriginalPrice('');
    setProdStock('10');
    setProdImagesText('');
    setProdFeatured(false);
  };

  const openEditProduct = (p: Product) => {
    setEditingProd(p);
    setProdNameAr(p.name.ar);
    setProdNameFr(p.name.fr || p.name.ar);
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

  // Handlers for Categories
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catLabel.trim()) return;

    const autoId = catId.trim() ? catId.trim().toLowerCase().replace(/\s+/g, '_') : `cat_${Date.now()}`;
    addCategory({
      id: autoId,
      label: catLabel.trim(),
      icon: catIcon.trim() || '📦',
      desc: catDesc.trim() || 'تصنيف معتمد في المتجر'
    });

    setShowAddCategoryModal(false);
    setCatId('');
    setCatLabel('');
    setCatIcon('📦');
    setCatDesc('');
  };

  // Handlers for Partners
  const handleSavePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim() || !partnerPhone.trim()) return;

    addCompany({
      name: partnerName.trim(),
      logo: partnerLogo.trim() || '/assets/aistudio/file_0000000048188243bc0b721218c854fc_ea3ea21d.png',
      phone: partnerPhone.trim(),
      email: partnerEmail.trim() || 'contact@partner.tn',
      address: partnerAddress.trim() || 'المنطقة الصناعية',
      governorate: partnerGov,
      description: { ar: partnerDesc.trim() || partnerName, fr: partnerDesc.trim() || partnerName, en: partnerDesc.trim() || partnerName }
    });

    setShowAddPartnerModal(false);
    setPartnerName('');
    setPartnerPhone('');
    setPartnerEmail('');
    setPartnerAddress('');
    setPartnerDesc('');
    setPartnerLogo('');
  };

  // Handlers for Banners
  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim()) return;

    addBanner({
      tag: bannerTag.trim() || 'عروض حصرية',
      title: bannerTitle.trim(),
      subtitle: bannerSubtitle.trim() || 'توصيل سريع لكافة الـ24 ولاية والدفع عند المعاينة والاستلام',
      active: true,
      bgGradient: bannerGradient
    });

    setShowAddBannerModal(false);
    setBannerTitle('');
    setBannerSubtitle('');
  };

  // Handlers for Manual Order
  const handleSaveManualOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCustName.trim() || !manualCustPhone.trim() || !manualAmount) return;

    const amt = parseFloat(manualAmount) || 0;
    addManualOrder({
      customerName: manualCustName.trim(),
      customerPhone: manualCustPhone.trim(),
      totalAmount: amt,
      subtotal: amt,
      shippingAddress: {
        id: `addr_${Date.now()}`,
        isDefault: true,
        fullName: manualCustName.trim(),
        phone: manualCustPhone.trim(),
        governorate: manualGov,
        city: manualCity.trim() || 'تونس',
        postalCode: '1000',
        street: 'طلب مباشر هاتفياً / واتساب'
      },
      notes: manualNotes.trim() || 'طلب هاتفي مباشر مسجل يدوياً'
    });

    setShowAddManualOrderModal(false);
    setManualCustName('');
    setManualCustPhone('');
    setManualCity('');
    setManualAmount('');
    setManualNotes('');
  };

  // Execute Confirmed Delete
  const executeDelete = () => {
    if (!deleteConfirmModal.id) return;

    if (deleteConfirmModal.type === 'product') {
      deleteProduct(deleteConfirmModal.id);
    } else if (deleteConfirmModal.type === 'category') {
      deleteCategory(deleteConfirmModal.id);
    } else if (deleteConfirmModal.type === 'partner') {
      deleteCompany(deleteConfirmModal.id);
    } else if (deleteConfirmModal.type === 'banner') {
      deleteBanner(deleteConfirmModal.id);
    } else if (deleteConfirmModal.type === 'order') {
      deleteOrder(deleteConfirmModal.id);
    }

    setDeleteConfirmModal({ isOpen: false, type: 'product', id: '', title: '' });
  };

  // Export CSV
  const exportOrdersCSV = () => {
    const headers = ['Tracking', 'Customer', 'Phone', 'Governorate', 'City', 'Total_TND', 'Status', 'Date'];
    const rows = orders.map(o => [
      o.trackingNumber,
      `"${o.customerName}"`,
      `"${o.customerPhone}"`,
      o.shippingAddress?.governorate || '',
      `"${o.shippingAddress?.city || ''}"`,
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
    const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 animate-fadeIn select-none text-[#0F172A] dark:text-slate-100">
      
      {/* 1. Header Card with Sovereign Credentials and Logout */}
      <div className="bg-[#0B0F17] rounded-3xl p-4 sm:p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl border border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#FF6B00] text-white flex items-center justify-center font-black text-xl shadow-lg shrink-0">
            EX
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                لوحة الإعدادات الشاملة للمالك
              </h1>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>جلسة مشفرة نشطة</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              الحساب المعتمد: <strong className="text-white">{ownerSettings.loginEmail}</strong> • الهاتف: <strong className="text-white font-mono">{ownerSettings.primaryPhone}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            عرض المتجر
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-[#E2E8F0] dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">إجمالي المبيعات</span>
            <span className="w-7 h-7 rounded-xl bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-2xl font-black text-[#FF6B00] font-mono block leading-none">
              {totalSales.toFixed(3)}
            </span>
            <span className="text-[10px] text-slate-500 font-bold mt-1 block">دينار تونسي</span>
          </div>
        </div>

        <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-[#E2E8F0] dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">إجمالي الطلبات</span>
            <span className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <ShoppingBag className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-2xl font-black text-[#0F172A] dark:text-white font-mono block leading-none">
              {totalOrdersCount}
            </span>
            <span className="text-[10px] text-slate-500 font-bold mt-1 block">طلب مسجل بالمتجر</span>
          </div>
        </div>

        <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-[#E2E8F0] dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">المنتجات المعروضة</span>
            <span className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Package className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-2xl font-black text-[#0F172A] dark:text-white font-mono block leading-none">
              {products.length}
            </span>
            <span className="text-[10px] text-slate-500 font-bold mt-1 block">منتج متاح للشراء</span>
          </div>
        </div>

        <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-[#E2E8F0] dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">الشركاء والعلامات</span>
            <span className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-2xl font-black text-[#0F172A] dark:text-white font-mono block leading-none">
              {companies.length}
            </span>
            <span className="text-[10px] text-slate-500 font-bold mt-1 block">شريك وموزع معتمد</span>
          </div>
        </div>
      </div>

      {/* 3. Google Play Horizontal Tab Chips Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x border-b border-[#E2E8F0] dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'overview'
              ? 'bg-[#FF6B00] text-white shadow-xs'
              : 'bg-[#F8FAFC] dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>نظرة عامة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('account_security')}
          className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'account_security'
              ? 'bg-[#FF6B00] text-white shadow-xs'
              : 'bg-[#F8FAFC] dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>إعدادات الحساب والأمان</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'products'
              ? 'bg-[#FF6B00] text-white shadow-xs'
              : 'bg-[#F8FAFC] dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>إدارة المنتجات ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'categories'
              ? 'bg-[#FF6B00] text-white shadow-xs'
              : 'bg-[#F8FAFC] dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>إدارة التصنيفات ({categories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('partners')}
          className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'partners'
              ? 'bg-[#FF6B00] text-white shadow-xs'
              : 'bg-[#F8FAFC] dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>الشركاء والعلامات ({companies.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('banners')}
          className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'banners'
              ? 'bg-[#FF6B00] text-white shadow-xs'
              : 'bg-[#F8FAFC] dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>العروض والبانرات ({banners.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'orders'
              ? 'bg-[#FF6B00] text-white shadow-xs'
              : 'bg-[#F8FAFC] dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>الطلبات والمبيعات ({orders.length})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 4. Tab Content Router */}
      {/* ========================================================= */}

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-6 bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl border border-[#E2E8F0] dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-black flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF6B00]" />
              <span>إجراءات سريعة ومختصرة للوحة التحكم</span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddProdModal(true)}
                className="p-3 bg-white dark:bg-[#0F172A] rounded-2xl border border-[#E2E8F0] dark:border-slate-700 hover:border-[#FF6B00] text-start transition-all cursor-pointer"
              >
                <Package className="w-5 h-5 text-[#FF6B00] mb-1.5" />
                <span className="text-xs font-bold block">+ إضافة منتج</span>
                <span className="text-[10px] text-slate-400">إدراج معدة أو قطعة غيار</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddManualOrderModal(true)}
                className="p-3 bg-white dark:bg-[#0F172A] rounded-2xl border border-[#E2E8F0] dark:border-slate-700 hover:border-[#FF6B00] text-start transition-all cursor-pointer"
              >
                <ShoppingBag className="w-5 h-5 text-emerald-500 mb-1.5" />
                <span className="text-xs font-bold block">+ تسجيل طلب يدوي</span>
                <span className="text-[10px] text-slate-400">للطلبات الواردة هاتفياً</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddCategoryModal(true)}
                className="p-3 bg-white dark:bg-[#0F172A] rounded-2xl border border-[#E2E8F0] dark:border-slate-700 hover:border-[#FF6B00] text-start transition-all cursor-pointer"
              >
                <Tag className="w-5 h-5 text-blue-500 mb-1.5" />
                <span className="text-xs font-bold block">+ إضافة قسم جديد</span>
                <span className="text-[10px] text-slate-400">يحدث شريط التصنيفات فوراً</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddPartnerModal(true)}
                className="p-3 bg-white dark:bg-[#0F172A] rounded-2xl border border-[#E2E8F0] dark:border-slate-700 hover:border-[#FF6B00] text-start transition-all cursor-pointer"
              >
                <Building2 className="w-5 h-5 text-purple-500 mb-1.5" />
                <span className="text-xs font-bold block">+ إضافة شريك</span>
                <span className="text-[10px] text-slate-400">علامة تجارية أو موزع</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddBannerModal(true)}
                className="p-3 bg-white dark:bg-[#0F172A] rounded-2xl border border-[#E2E8F0] dark:border-slate-700 hover:border-[#FF6B00] text-start transition-all cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-amber-500 mb-1.5" />
                <span className="text-xs font-bold block">+ إضافة بانر</span>
                <span className="text-[10px] text-slate-400">عروض وتخفيضات المتجر</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('account_security')}
                className="p-3 bg-white dark:bg-[#0F172A] rounded-2xl border border-[#E2E8F0] dark:border-slate-700 hover:border-[#FF6B00] text-start transition-all cursor-pointer"
              >
                <KeyRound className="w-5 h-5 text-red-500 mb-1.5" />
                <span className="text-xs font-bold block">إعدادات الأمان</span>
                <span className="text-[10px] text-slate-400">تعديل الإيميل والرمز</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Account & Security */}
      {activeTab === 'account_security' && (
        <div className="space-y-4">
          
          {/* Card 1: Email & Phone Settings */}
          <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl p-4 sm:p-6 border border-[#E2E8F0] dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
              <KeyRound className="w-4 h-4 text-[#FF6B00]" />
              <h3 className="text-sm font-black">بيانات الاعتماد السيادية للمالك</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Form 1: Modify Owner Email */}
              <form onSubmit={handleSaveEmail} className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 space-y-3">
                <label className="text-xs font-bold block">
                  البريد الإلكتروني المعتمد للمالك (Gmail):
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="email"
                    value={editOwnerEmail}
                    onChange={e => setEditOwnerEmail(e.target.value)}
                    dir="ltr"
                    required
                    placeholder="example@gmail.com"
                    className="w-full text-xs py-2.5 pr-9 pl-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white font-mono focus:border-[#FF6B00] outline-none"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>حفظ وتأكيد البريد</span>
                  </button>
                  {emailSavedSuccess && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>تم الحفظ بنجاح</span>
                    </span>
                  )}
                </div>
              </form>

              {/* Form 2: Modify Sovereign Phone */}
              <form onSubmit={handleSavePhone} className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 space-y-3">
                <label className="text-xs font-bold block">
                  رقم الهاتف السيادي المعتمد:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    value={editOwnerPhone}
                    onChange={e => setEditOwnerPhone(e.target.value)}
                    dir="ltr"
                    required
                    placeholder="+21621511162"
                    className="w-full text-xs py-2.5 pr-9 pl-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white font-mono focus:border-[#FF6B00] outline-none"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#0F172A] dark:bg-slate-700 hover:bg-[#FF6B00] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>حفظ فوري للهاتف</span>
                  </button>
                  {phoneSavedSuccess && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>تم التحديث بنجاح</span>
                    </span>
                  )}
                </div>
              </form>

            </div>
          </div>

          {/* Card 2: Change Secret Passcode / Room Lock */}
          <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl p-4 sm:p-6 border border-[#E2E8F0] dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#FF6B00]" />
                <h3 className="text-sm font-black">تغيير رمز الدخول السري لغرفة المالك</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                SHA-256 Encrypted
              </span>
            </div>

            <form onSubmit={handleChangeSecretCode} className="space-y-4">
              
              {/* Type Selection */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLockType('pin')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    lockType === 'pin' ? 'bg-[#FF6B00] text-white' : 'bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  رمز رقمي (PIN Code)
                </button>
                <button
                  type="button"
                  onClick={() => setLockType('pattern')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    lockType === 'pattern' ? 'bg-[#FF6B00] text-white' : 'bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  نمط الأمان (Pattern)
                </button>
              </div>

              {secretChangeStep === 1 ? (
                <div className="space-y-2 bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <label className="text-xs font-bold block">
                    الخطوة 1: أدخل رمز الدخول الحالي للمتابعة:
                  </label>
                  <input
                    type="password"
                    value={currentSecretInput}
                    onChange={e => setCurrentSecretInput(e.target.value)}
                    placeholder="الرمز الحالي..."
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white outline-none focus:border-[#FF6B00]"
                  />
                  <button
                    type="submit"
                    disabled={isChangingPasscode}
                    className="mt-2 px-4 py-2 rounded-xl bg-[#0F172A] dark:bg-slate-700 hover:bg-[#FF6B00] text-white text-xs font-bold cursor-pointer"
                  >
                    {isChangingPasscode ? 'جارٍ التحقق...' : 'التحقق والمتابعة للرمز الجديد ←'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="space-y-1">
                    <label className="text-xs font-bold block">
                      الخطوة 2: أدخل الرمز الجديد المطلوب:
                    </label>
                    <input
                      type="password"
                      value={newSecretInput}
                      onChange={e => setNewSecretInput(e.target.value)}
                      placeholder="الرمز الجديد..."
                      className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white outline-none focus:border-[#FF6B00]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold block">
                      تأكيد الرمز الجديد:
                    </label>
                    <input
                      type="password"
                      value={confirmSecretInput}
                      onChange={e => setConfirmSecretInput(e.target.value)}
                      placeholder="أعد إدخال الرمز الجديد للتأكيد..."
                      className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white outline-none focus:border-[#FF6B00]"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isChangingPasscode}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isChangingPasscode ? 'جارٍ الحفظ...' : 'حفظ وتشفير الرمز الجديد'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSecretChangeStep(1)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {secretSuccessMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-600 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{secretSuccessMessage}</span>
                </div>
              )}

              {secretErrorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-600 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{secretErrorMessage}</span>
                </div>
              )}

            </form>
          </div>

        </div>
      )}

      {/* Tab 3: Products Management */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                placeholder="ابحث بالاسم أو الشركة..."
                value={prodSearch}
                onChange={e => setProdSearch(e.target.value)}
                className="w-full text-xs py-2.5 pr-9 pl-3 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#1E293B] text-[#0F172A] dark:text-white outline-none focus:border-[#FF6B00]"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingProd(null);
                setShowAddProdModal(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة منتج جديد</span>
            </button>
          </div>

          {/* Products List Mobile Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredProducts.map(p => {
              const prodName = p.name[language] || p.name.ar;
              return (
                <div 
                  key={p.id}
                  className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={p.images[0] || '/assets/aistudio/file_0000000048188243bc0b721218c854fc_ea3ea21d.png'}
                      alt={prodName}
                      className="w-14 h-14 rounded-xl object-contain bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 p-1 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#0F172A] dark:text-white truncate">
                        {prodName}
                      </h4>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                        {p.companyName} • {p.stock > 0 ? `المخزون: ${p.stock}` : 'نفد المخزون'}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-black text-[#FF6B00] font-mono">
                          {p.price.toFixed(3)} د.ت
                        </span>
                        {p.originalPrice && p.originalPrice > p.price && (
                          <span className="text-[10px] text-slate-400 line-through">
                            {p.originalPrice.toFixed(3)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleProductActive(p.id)}
                      className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                        p.active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}
                      title={p.active ? 'نشط بالمتجر' : 'معطل'}
                    >
                      {p.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditProduct(p)}
                      className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20 cursor-pointer"
                      title="تعديل المنتج"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmModal({
                        isOpen: true,
                        type: 'product',
                        id: p.id,
                        title: prodName
                      })}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20 cursor-pointer"
                      title="حذف المنتج"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Categories & Chips */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black">أقسام وتصنيفات المتجر</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">التعديلات هنا تحدث شريط التصنيفات العلوي والشاشة فوراُ</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddCategoryModal(true)}
              className="px-3.5 py-2 rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة قسم</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {categories.map(c => {
              const count = c.id === 'all' 
                ? products.length 
                : products.filter(p => p.category === c.id).length;

              return (
                <div
                  key={c.id}
                  className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl w-8 h-8 rounded-xl bg-white dark:bg-[#0F172A] flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
                      {c.icon || '📦'}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-black block truncate">{c.label}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                        {count} منتج مسجل
                      </span>
                    </div>
                  </div>

                  {c.id !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmModal({
                        isOpen: true,
                        type: 'category',
                        id: c.id,
                        title: c.label
                      })}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-500/10 cursor-pointer transition-colors"
                      title="حذف هذا القسم"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 5: Partners & Brands */}
      {activeTab === 'partners' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black">الشركاء والموزعون والعلامات</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">إدارة العلامات التجارية الشريكة لمتجر ECHOX</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddPartnerModal(true)}
              className="px-3.5 py-2 rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة شريك</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {companies.map(comp => (
              <div
                key={comp.id}
                className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={comp.logo || '/assets/aistudio/file_0000000048188243bc0b721218c854fc_ea3ea21d.png'}
                    alt={comp.name}
                    className="w-12 h-12 rounded-xl object-contain bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 p-1 shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[#0F172A] dark:text-white truncate">
                      {comp.name}
                    </h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                      {comp.phone} • {comp.governorate}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                      {comp.email}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDeleteConfirmModal({
                    isOpen: true,
                    type: 'partner',
                    id: comp.id,
                    title: comp.name
                  })}
                  className="p-2 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500/20 cursor-pointer"
                  title="حذف هذا الشريك"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Banners & Promos */}
      {activeTab === 'banners' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black">العروض والبانرات الإعلانية</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">تظهر البانرات النشطة مباشرة في أعلى واجهة المتجر الرئيسية</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddBannerModal(true)}
              className="px-3.5 py-2 rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة بانر</span>
            </button>
          </div>

          <div className="space-y-3">
            {banners.map(b => (
              <div
                key={b.id}
                className="p-3.5 rounded-3xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 space-y-3"
              >
                {/* Banner Preview */}
                <div className={`rounded-2xl bg-gradient-to-r ${b.bgGradient || 'from-[#FF6B00] via-[#F97316] to-[#EA580C]'} text-white p-3 shadow-xs flex items-center justify-between gap-2`}>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-white" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase bg-white text-[#FF6B00] px-2 py-0.5 rounded-full">
                          {b.tag}
                        </span>
                        <span className="text-xs font-black">{b.title}</span>
                      </div>
                      <p className="text-[10px] text-white/90 mt-0.5">{b.subtitle}</p>
                    </div>
                  </div>
                </div>

                {/* Banner Actions */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleBannerActive(b.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                        b.active ? 'bg-emerald-500/20 text-emerald-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}
                    >
                      {b.active ? 'نشط بالواجهة ✓' : 'معطل'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmModal({
                      isOpen: true,
                      type: 'banner',
                      id: b.id,
                      title: b.title
                    })}
                    className="p-1.5 rounded-xl text-red-600 hover:bg-red-500/10 cursor-pointer"
                    title="حذف هذا البانر"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: Orders & Sales */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                placeholder="ابحث برقم التتبع أو اسم الحريف أو الهاتف..."
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                className="w-full text-xs py-2.5 pr-9 pl-3 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#1E293B] text-[#0F172A] dark:text-white outline-none focus:border-[#FF6B00]"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddManualOrderModal(true)}
                className="px-3.5 py-2.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ تسجيل طلب يدوي</span>
              </button>

              <button
                type="button"
                onClick={exportOrdersCSV}
                className="p-2.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white cursor-pointer"
                title="تصدير CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {['all', 'new', 'under_confirmation', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setOrderStatusFilter(st)}
                className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  orderStatusFilter === st
                    ? 'bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A]'
                    : 'bg-[#F8FAFC] dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-800'
                }`}
              >
                {st === 'all' ? 'كافة الحالات' : st}
              </button>
            ))}
          </div>

          {/* Orders Cards */}
          <div className="space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl border border-[#E2E8F0] dark:border-slate-800 text-xs text-slate-500">
                لا توجد طلبات مطابقة للبحث أو الفلتر
              </div>
            ) : (
              filteredOrders.map(o => (
                <div
                  key={o.id}
                  className="p-4 rounded-3xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black font-mono bg-white dark:bg-[#0F172A] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        {o.trackingNumber}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(o.createdAt).toLocaleDateString('ar-TN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-[#FF6B00] font-mono">
                        {o.totalAmount.toFixed(3)} د.ت
                      </span>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmModal({
                          isOpen: true,
                          type: 'order',
                          id: o.id,
                          title: `الطلب ${o.trackingNumber} (${o.customerName})`
                        })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
                        title="حذف هذا الطلب"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{o.customerName}</span>
                      <a href={`tel:${o.customerPhone}`} dir="ltr" className="font-mono text-[#FF6B00] hover:underline">
                        {o.customerPhone}
                      </a>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {o.shippingAddress?.governorate ? `ولاية ${o.shippingAddress.governorate}` : ''} • {o.shippingAddress?.city || ''}
                    </p>
                  </div>

                  {/* Status Selection */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500">حالة الشحن:</span>
                    <select
                      value={o.status}
                      onChange={e => updateOrderStatus(o.id, e.target.value as OrderStatus)}
                      className="text-xs py-1 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] font-bold text-[#0F172A] dark:text-white cursor-pointer"
                    >
                      <option value="new">جديد (New)</option>
                      <option value="under_confirmation">قيد التأكيد (Confirmation)</option>
                      <option value="preparing">قيد التجهيز (Preparing)</option>
                      <option value="out_for_delivery">خرج للتسليم (Out for delivery)</option>
                      <option value="delivered">تم التسليم (Delivered)</option>
                      <option value="cancelled">ملغى (Cancelled)</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. Modals for Adding Entities */}
      {/* ========================================================= */}

      {/* Modal: Add/Edit Product */}
      {showAddProdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-[#1E293B] rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-black">
                {editingProd ? 'تعديل بيانات المنتج' : '+ إضافة منتج جديد للكاتالوج'}
              </h3>
              <button onClick={() => setShowAddProdModal(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold block">اسم المنتج بالعربية *</label>
                <input
                  type="text"
                  required
                  value={prodNameAr}
                  onChange={e => setProdNameAr(e.target.value)}
                  placeholder="مثال: مثقاب احترافي لاسلكي 20V..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold block">اسم المنتج بالفرنسية (اختياري)</label>
                <input
                  type="text"
                  value={prodNameFr}
                  onChange={e => setProdNameFr(e.target.value)}
                  placeholder="Ex: Perceuse Sans Fil 20V..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold block">السعر (د.ت) *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={prodPrice}
                    onChange={e => setProdPrice(e.target.value)}
                    placeholder="345.000"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold block">السعر قبل التخفيض (اختياري)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={prodOriginalPrice}
                    onChange={e => setProdOriginalPrice(e.target.value)}
                    placeholder="420.000"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold block">القسم / التصنيف *</label>
                  <select
                    value={prodCategory}
                    onChange={e => setProdCategory(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-bold"
                  >
                    {categories.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id} className="text-[#0F172A]">{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold block">الكمية المتوفرة بالمخزون</label>
                  <input
                    type="number"
                    value={prodStock}
                    onChange={e => setProdStock(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold block">الشركة المصنعة أو الموزعة</label>
                <select
                  value={prodCompanyId}
                  onChange={e => setProdCompanyId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-bold"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id} className="text-[#0F172A]">{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold block">روابط الصور (رابط واحد في كل سطر)</label>
                <textarea
                  rows={2}
                  value={prodImagesText}
                  onChange={e => setProdImagesText(e.target.value)}
                  placeholder="https://...&#10;https://..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold block">الوصف والمواصفات</label>
                <textarea
                  rows={2}
                  value={prodDescAr}
                  onChange={e => setProdDescAr(e.target.value)}
                  placeholder="أدخل تفاصيل ومميزات المنتج والضمان..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProdModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95"
                >
                  {editingProd ? 'حفظ التعديلات' : 'إضافة المنتج فوراً'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Category */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-[#1E293B] rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-black">+ إضافة قسم جديد</h3>
              <button onClick={() => setShowAddCategoryModal(false)} className="p-1 rounded-full text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold block">اسم القسم بالعربية *</label>
                <input
                  type="text"
                  required
                  value={catLabel}
                  onChange={e => setCatLabel(e.target.value)}
                  placeholder="مثال: مضخات ومحركات هيدروليكية..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold block">رمز الأيقونة (Emoji) *</label>
                <input
                  type="text"
                  value={catIcon}
                  onChange={e => setCatIcon(e.target.value)}
                  placeholder="🔧"
                  className="w-full text-sm p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold block">وصف القسم (اختياري)</label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={e => setCatDesc(e.target.value)}
                  placeholder="مضخات ضغط عالي معتمدة..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-500"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95"
                >
                  حفظ القسم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Partner */}
      {showAddPartnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-[#1E293B] rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-black">+ إضافة شريك / علامة تجارية</h3>
              <button onClick={() => setShowAddPartnerModal(false)} className="p-1 rounded-full text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePartner} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold block">اسم الشركة / العلامة *</label>
                <input
                  type="text"
                  required
                  value={partnerName}
                  onChange={e => setPartnerName(e.target.value)}
                  placeholder="مثال: Tunis Outillage Pro..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold block">رقم الهاتف *</label>
                <input
                  type="text"
                  required
                  value={partnerPhone}
                  onChange={e => setPartnerPhone(e.target.value)}
                  placeholder="+216 71 000 000"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold block">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={partnerEmail}
                  onChange={e => setPartnerEmail(e.target.value)}
                  placeholder="contact@company.tn"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold block">رابط الشعار (Logo URL)</label>
                <input
                  type="text"
                  value={partnerLogo}
                  onChange={e => setPartnerLogo(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPartnerModal(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-500"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95"
                >
                  حفظ الشريك
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Banner */}
      {showAddBannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-[#1E293B] rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-black">+ إضافة بانر ترويجي</h3>
              <button onClick={() => setShowAddBannerModal(false)} className="p-1 rounded-full text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold block">الشارة النصية (Tag)</label>
                <input
                  type="text"
                  value={bannerTag}
                  onChange={e => setBannerTag(e.target.value)}
                  placeholder="عروض حصرية / تخفيضات الموسم..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold block">العنوان الترويجي *</label>
                <input
                  type="text"
                  required
                  value={bannerTitle}
                  onChange={e => setBannerTitle(e.target.value)}
                  placeholder="تخفيضات خاصة على معدات الورشات..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold block">الوصف الإضافي</label>
                <input
                  type="text"
                  value={bannerSubtitle}
                  onChange={e => setBannerSubtitle(e.target.value)}
                  placeholder="شحن سريع لكافة الـ24 ولاية والدفع عند الاستلام..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBannerModal(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-500"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95"
                >
                  حفظ البانر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Manual Order */}
      {showAddManualOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-[#1E293B] rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-black">+ تسجيل طلب يدوي (هاتف / واتساب)</h3>
              <button onClick={() => setShowAddManualOrderModal(false)} className="p-1 rounded-full text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManualOrder} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold block">اسم الحريف *</label>
                <input
                  type="text"
                  required
                  value={manualCustName}
                  onChange={e => setManualCustName(e.target.value)}
                  placeholder="مثال: منير الطرابلسي..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold block">رقم الهاتف *</label>
                <input
                  type="text"
                  required
                  value={manualCustPhone}
                  onChange={e => setManualCustPhone(e.target.value)}
                  placeholder="+216 98 000 000"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold block">الولاية *</label>
                  <select
                    value={manualGov}
                    onChange={e => setManualGov(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-bold"
                  >
                    {TUNISIAN_GOVERNORATES.map(g => (
                      <option key={g.id} value={g.id} className="text-[#0F172A]">{g.nameAr}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold block">المبلغ الإجمالي (د.ت) *</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={manualAmount}
                    onChange={e => setManualAmount(e.target.value)}
                    placeholder="120.000"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold block">ملاحظات الطلبية</label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={e => setManualNotes(e.target.value)}
                  placeholder="طلب عبر اتصال واتساب..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddManualOrderModal(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-500"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95"
                >
                  تسجيل واحتساب الطلب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Delete Dialog */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-[#1E293B] rounded-3xl p-5 border border-red-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-red-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-black">تأكيد الحذف النهائي</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف <strong className="text-red-600">{deleteConfirmModal.title}</strong>؟ لا يمكن التراجع عن هذه العملية بعد التأكيد.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ isOpen: false, type: 'product', id: '', title: '' })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OwnerDashboard;
