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
  Check,
  Globe,
  ExternalLink,
  MessageCircle,
  RotateCcw,
  CreditCard
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Company, Order, OrderStatus, CategoryItem, PromoBanner, SiteSettings } from '../types';
import { INITIAL_SITE_SETTINGS } from '../data/initialData';
import { PaymentManagementTab } from './PaymentManagementTab';
import { SupportChatTab } from './SupportChatTab';
import { canOrderShipClient, getPaymentStatusTone } from '../lib/payments';
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
  verifyOwnerLockInput,
  updateAccessCodeServer,
  updatePinServer,
  fetchActiveSessions,
  revokeAllSessionsServer,
  fetchSecuritySystemStatus
} from '../lib/security';

interface OwnerDashboardProps {
  onNavigate?: (route: string, state?: any) => void;
}

type DashboardTab = 
  | 'overview'
  | 'payment_management'
  | 'account_security'
  | 'footer_info'
  | 'products'
  | 'categories'
  | 'partners'
  | 'banners'
  | 'orders'
  | 'support_chat';

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
    updateOrderInState,
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
  const [orderStatusError, setOrderStatusError] = useState<string | null>(null);

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

  // 1.1 Footer & Store Info Form States
  const [footerDescAr, setFooterDescAr] = useState(siteSettings.description?.ar || '');
  const [footerDescFr, setFooterDescFr] = useState(siteSettings.description?.fr || '');
  const [footerDescEn, setFooterDescEn] = useState(siteSettings.description?.en || '');
  const [footerSupportPhone, setFooterSupportPhone] = useState(siteSettings.supportPhone || '+216 21 511 162');
  const [footerWhatsappPhone, setFooterWhatsappPhone] = useState(siteSettings.whatsappPhone || '21621511162');
  const [footerEmail, setFooterEmail] = useState(siteSettings.officialEmail || 'contact@echox-store.tn');
  const [footerAddressAr, setFooterAddressAr] = useState(siteSettings.addressMultilingual?.ar || siteSettings.address || '');
  const [footerAddressFr, setFooterAddressFr] = useState(siteSettings.addressMultilingual?.fr || '');
  const [footerAddressEn, setFooterAddressEn] = useState(siteSettings.addressMultilingual?.en || '');
  const [footerGov, setFooterGov] = useState(siteSettings.governorate || 'ariana');
  const [footerWorkingHoursAr, setFooterWorkingHoursAr] = useState(siteSettings.workingHours?.ar || '');
  const [footerWorkingHoursFr, setFooterWorkingHoursFr] = useState(siteSettings.workingHours?.fr || '');
  const [footerWorkingHoursEn, setFooterWorkingHoursEn] = useState(siteSettings.workingHours?.en || '');
  const [footerSavedSuccess, setFooterSavedSuccess] = useState(false);
  const [footerSaving, setFooterSaving] = useState(false);
  const [previewFooterLang, setPreviewFooterLang] = useState<'ar' | 'fr' | 'en'>('ar');

  // Security & Access Management States (Argon2id)
  const [accessCodeCurrent, setAccessCodeCurrent] = useState('');
  const [accessCodeNew, setAccessCodeNew] = useState('');
  const [accessCodeConfirm, setAccessCodeConfirm] = useState('');
  const [accessCodeStep, setAccessCodeStep] = useState<1 | 2>(1);
  const [accessCodeLoading, setAccessCodeLoading] = useState(false);
  const [accessCodeSuccess, setAccessCodeSuccess] = useState('');
  const [accessCodeError, setAccessCodeError] = useState('');
  const [showAccessCodePlain, setShowAccessCodePlain] = useState(false);

  const [pinCurrent, setPinCurrent] = useState('');
  const [pinNew, setPinNew] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinStep, setPinStep] = useState<1 | 2>(1);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinSuccess, setPinSuccess] = useState('');
  const [pinError, setPinError] = useState('');

  const [activeSessionsList, setActiveSessionsList] = useState<Array<{ id: string; ip: string; userAgent: string; createdAt: string; isCurrent: boolean }>>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsMessage, setSessionsMessage] = useState('');
  const [securityStatusInfo, setSecurityStatusInfo] = useState<{ argon2idEnabled: boolean; hashingAlgorithm: string; activeSessionsCount: number; updatedAt: string } | null>(null);

  // Legacy state for compatibility
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

  // Authorization Check: exclusively protected by ECHOX VAULT
  useEffect(() => {
    let cancelled = false;

    async function guard() {
      if (!isOwnerUnlocked()) {
        clearOwnerSecuritySession();
        if (!cancelled) {
          navigate('/');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('open_echox_vault'));
          }, 100);
        }
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

  // Sync Footer form states whenever siteSettings updates
  useEffect(() => {
    setFooterDescAr(siteSettings.description?.ar || '');
    setFooterDescFr(siteSettings.description?.fr || '');
    setFooterDescEn(siteSettings.description?.en || '');
    setFooterSupportPhone(siteSettings.supportPhone || '');
    setFooterWhatsappPhone(siteSettings.whatsappPhone || '');
    setFooterEmail(siteSettings.officialEmail || '');
    setFooterAddressAr(siteSettings.addressMultilingual?.ar || siteSettings.address || '');
    setFooterAddressFr(siteSettings.addressMultilingual?.fr || '');
    setFooterAddressEn(siteSettings.addressMultilingual?.en || '');
    setFooterGov(siteSettings.governorate || 'ariana');
    setFooterWorkingHoursAr(siteSettings.workingHours?.ar || '');
    setFooterWorkingHoursFr(siteSettings.workingHours?.fr || '');
    setFooterWorkingHoursEn(siteSettings.workingHours?.en || '');
  }, [siteSettings]);

  // Load Active Sessions & Security Engine Status
  useEffect(() => {
    let active = true;
    async function loadSessionsAndStatus() {
      try {
        const sess = await fetchActiveSessions();
        if (active && sess && sess.sessions) {
          setActiveSessionsList(sess.sessions);
        }
        const stat = await fetchSecuritySystemStatus();
        if (active && stat) {
          setSecurityStatusInfo(stat);
        }
      } catch (err) {
        console.warn('Security info load notice:', err);
      }
    }
    loadSessionsAndStatus();
    return () => { active = false; };
  }, [activeTab]);

  if (checking) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center bg-[#0B0F17] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-300">جارٍ التحقق من صلاحيات مركز التحكم (Argon2id)...</span>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  const handleLogout = async () => {
    clearOwnerSecuritySession();
    await logoutOwnerServer();
    navigate('/');
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

  // Handler for Footer & Store Info Form Save
  const handleSaveFooterSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setFooterSaving(true);

    const cleanWhatsapp = footerWhatsappPhone.replace(/\D/g, '');

    const updated: Partial<SiteSettings> = {
      description: {
        ar: footerDescAr.trim() || siteSettings.description.ar,
        fr: footerDescFr.trim() || siteSettings.description.fr || footerDescAr.trim(),
        en: footerDescEn.trim() || siteSettings.description.en || footerDescAr.trim()
      },
      supportPhone: footerSupportPhone.trim() || siteSettings.supportPhone,
      whatsappPhone: cleanWhatsapp || siteSettings.whatsappPhone,
      officialEmail: footerEmail.trim() || siteSettings.officialEmail,
      address: footerAddressAr.trim() || siteSettings.address,
      addressMultilingual: {
        ar: footerAddressAr.trim() || siteSettings.address,
        fr: footerAddressFr.trim() || footerAddressAr.trim(),
        en: footerAddressEn.trim() || footerAddressAr.trim()
      },
      governorate: footerGov || siteSettings.governorate,
      workingHours: {
        ar: footerWorkingHoursAr.trim() || siteSettings.workingHours.ar,
        fr: footerWorkingHoursFr.trim() || siteSettings.workingHours.fr,
        en: footerWorkingHoursEn.trim() || siteSettings.workingHours.en
      }
    };

    updateSiteSettings(updated);

    // Sync to Firestore doc store_settings/site
    try {
      await setDoc(doc(db, 'store_settings', 'site'), updated, { merge: true });
    } catch (err) {
      console.info('Firestore store_settings/site save notice:', err);
    }

    setFooterSaving(false);
    setFooterSavedSuccess(true);
    setTimeout(() => setFooterSavedSuccess(false), 4000);
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
        const { hash } = await saveOwnerLockConfig('pin', newSecretInput.trim(), false);
        localStorage.setItem('echox_pin_hash', hash);
        localStorage.removeItem('echox_salt');
        setSecretSuccessMessage('تم تغيير رمز الـ PIN لخزنة ECHOX وتشفيره بنجاح ✓');
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

  // Handlers for Centralized Argon2id Security & Access Management
  const handleUpdateAccessCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccessCodeError('');
    setAccessCodeSuccess('');

    if (accessCodeStep === 1) {
      if (!accessCodeCurrent.trim()) {
        setAccessCodeError('يرجى إدخال رمز الوصول أو الـ PIN الحالي للمتابعة.');
        return;
      }
      setAccessCodeStep(2);
    } else {
      if (accessCodeNew.trim().length < 4) {
        setAccessCodeError('رمز الوصول الجديد يجب أن يتكون من 4 خانات على الأقل.');
        return;
      }
      if (accessCodeNew.trim() !== accessCodeConfirm.trim()) {
        setAccessCodeError('تأكيد رمز الوصول غير متطابق مع الرمز الجديد!');
        return;
      }

      setAccessCodeLoading(true);
      const res = await updateAccessCodeServer(accessCodeCurrent.trim(), accessCodeNew.trim());
      setAccessCodeLoading(false);

      if (res.success) {
        setAccessCodeSuccess('تم تحديث وتشفير رمز الوصول السري بنجاح ببصمة Argon2id خادمياً ✓ (فعال فورياً)');
        setAccessCodeCurrent('');
        setAccessCodeNew('');
        setAccessCodeConfirm('');
        setAccessCodeStep(1);
        setTimeout(() => setAccessCodeSuccess(''), 5000);
      } else {
        setAccessCodeError(res.error || 'حدث خطأ أثناء تحديث رمز الوصول.');
      }
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');

    if (pinStep === 1) {
      if (!pinCurrent.trim()) {
        setPinError('يرجى إدخال رمز PIN الحالي للمتابعة.');
        return;
      }
      setPinStep(2);
    } else {
      const cleanNew = pinNew.trim();
      if (cleanNew.length !== 6 || !/^\d{6}$/.test(cleanNew)) {
        setPinError('يجب أن يتكون رمز الـ PIN الجديد من 6 أرقام رقمية بالضبط (0-9).');
        return;
      }
      if (cleanNew !== pinConfirm.trim()) {
        setPinError('تأكيد رمز الـ PIN غير متطابق مع الرمز الجديد!');
        return;
      }

      setPinLoading(true);
      const res = await updatePinServer(pinCurrent.trim(), cleanNew);
      setPinLoading(false);

      if (res.success) {
        setPinSuccess('تم تحديث وتشفير رمز PIN الجديد بنجاح ببصمة Argon2id خادمياً ✓ (فعال فورياً)');
        setPinCurrent('');
        setPinNew('');
        setPinConfirm('');
        setPinStep(1);
        setTimeout(() => setPinSuccess(''), 5000);
      } else {
        setPinError(res.error || 'رمز PIN الحالي غير صحيح أو حدث خطأ أثناء التحديث.');
      }
    }
  };

  const handleRevokeAllSessions = async () => {
    setSessionsLoading(true);
    const res = await revokeAllSessionsServer();
    setSessionsLoading(false);
    setSessionsMessage(res.message || 'تم إلغاء كافة الجلسات الأخرى بنجاح.');
    const sess = await fetchActiveSessions();
    if (sess && sess.sessions) {
      setActiveSessionsList(sess.sessions);
    }
    setTimeout(() => setSessionsMessage(''), 4000);
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
        images: imgs.length > 0 ? imgs : ['/assets/images/echox-logo.webp'],
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
      logo: partnerLogo.trim() || '/assets/images/echox-logo.webp',
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
                لوحة الإعدادات الشاملة — مركز التحكم
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
          onClick={() => setActiveTab('payment_management')}
          className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'payment_management'
              ? 'bg-[#FF6B00] text-white shadow-xs'
              : 'bg-[#F8FAFC] dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>{t.payments.sectionTitle}</span>
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
          onClick={() => setActiveTab('footer_info')}
          className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'footer_info'
              ? 'bg-[#FF6B00] text-white shadow-xs'
              : 'bg-[#F8FAFC] dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>تذييل وتفاصيل المتجر</span>
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

        <button
          type="button"
          onClick={() => setActiveTab('support_chat')}
          className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
            activeTab === 'support_chat'
              ? 'bg-[#FF6B00] text-white shadow-xs'
              : 'bg-[#F8FAFC] dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>شات الدعم المباشر</span>
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
                onClick={() => setActiveTab('footer_info')}
                className="p-3 bg-white dark:bg-[#0F172A] rounded-2xl border border-[#E2E8F0] dark:border-slate-700 hover:border-[#FF6B00] text-start transition-all cursor-pointer"
              >
                <FileText className="w-5 h-5 text-blue-500 mb-1.5" />
                <span className="text-xs font-bold block">تذييل وتفاصيل المتجر</span>
                <span className="text-[10px] text-slate-400">الوصف، الهاتف، العنوان</span>
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

              <button
                type="button"
                onClick={() => setActiveTab('payment_management')}
                className="p-3 bg-white dark:bg-[#0F172A] rounded-2xl border border-[#E2E8F0] dark:border-slate-700 hover:border-[#FF6B00] text-start transition-all cursor-pointer"
              >
                <CreditCard className="w-5 h-5 text-[#FF6B00] mb-1.5" />
                <span className="text-xs font-bold block">{t.payments.sectionTitle}</span>
                <span className="text-[10px] text-slate-400">البنك، البوابات، البائعين</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1.5: Comprehensive Payment Management Center */}
      {activeTab === 'payment_management' && <PaymentManagementTab />}

      {/* Tab 2: Account & Security */}
      {activeTab === 'account_security' && (
        <div className="space-y-4">
          
          {/* Card 1: Email & Phone Settings */}
          <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl p-4 sm:p-6 border border-[#E2E8F0] dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
              <KeyRound className="w-4 h-4 text-[#FF6B00]" />
              <h3 className="text-sm font-black">بيانات الاعتماد السيادية لمركز التحكم</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Form 1: Modify Owner Email */}
              <form onSubmit={handleSaveEmail} className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-[#E2E8F0] dark:border-slate-700 space-y-3">
                <label className="text-xs font-bold block">
                  البريد الإلكتروني المعتمد لمركز التحكم (Gmail):
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

          {/* Card 2: إدارة رمز الوصول السري (Access Code Management) */}
          <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl p-4 sm:p-6 border border-[#E2E8F0] dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 gap-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#FF6B00]" />
                <div>
                  <h3 className="text-sm font-black">إدارة رمز الوصول السري (Access Code Management)</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    الرمز السري المكتوب في شريط البحث لاستدعاء بوابة PIN (يتم التحقق منه وتحديثه حصرياً على الخادم)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Argon2id Server-Side
                </span>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="leading-relaxed text-[11px]">
                <strong>حماية قصوى:</strong> لا يتم حفظ رمز الوصول كنص صريح في أي ملف أمامي أو متصفح. يتم تشفيره فورياً ببصمة Argon2id خادمية مع Salt فريد. يمكنك تغيير الرمز هنا ويصبح فعالاً فوراً بدون تعديل الأكواد أو إعادة النشر.
              </div>
            </div>

            <form onSubmit={handleUpdateAccessCode} className="space-y-4">
              {accessCodeStep === 1 ? (
                <div className="space-y-3 bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <label className="text-xs font-bold block">
                    الخطوة 1: أدخل رمز الوصول الحالي أو رمز PIN للتحقق من هويتك:
                  </label>
                  <input
                    type="password"
                    value={accessCodeCurrent}
                    onChange={e => setAccessCodeCurrent(e.target.value)}
                    placeholder="رمز الوصول الحالي أو الـ PIN..."
                    required
                    className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white outline-none focus:border-[#FF6B00] font-mono"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="submit"
                      disabled={accessCodeLoading}
                      className="px-4 py-2 rounded-xl bg-[#0F172A] dark:bg-slate-700 hover:bg-[#FF6B00] text-white text-xs font-bold cursor-pointer transition active:scale-95"
                    >
                      {accessCodeLoading ? 'جارٍ التحقق...' : 'التحقق والمتابعة للرمز الجديد ←'}
                    </button>
                    <span className="text-[11px] text-slate-400">حماية ضد التخمين (Rate Limiting)</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold block">
                        الخطوة 2: أدخل رمز الوصول الجديد المطلوب:
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAccessCodePlain(!showAccessCodePlain)}
                        className="text-[11px] text-[#FF6B00] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {showAccessCodePlain ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showAccessCodePlain ? 'إخفاء' : 'إظهار'}</span>
                      </button>
                    </div>
                    <input
                      type={showAccessCodePlain ? 'text' : 'password'}
                      value={accessCodeNew}
                      onChange={e => setAccessCodeNew(e.target.value)}
                      placeholder="مثال: #echox_admin_2026 أو أي كلمة سرية..."
                      required
                      className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white outline-none focus:border-[#FF6B00] font-mono"
                    />
                    {accessCodeNew.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <div className="h-1.5 flex-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              accessCodeNew.length >= 8 ? 'w-full bg-emerald-500' : accessCodeNew.length >= 5 ? 'w-2/3 bg-amber-500' : 'w-1/3 bg-red-500'
                            }`}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">
                          {accessCodeNew.length >= 8 ? 'قوة الرمز: ممتازة' : accessCodeNew.length >= 5 ? 'قوة الرمز: متوسطة' : 'قصير'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold block">
                      تأكيد رمز الوصول الجديد:
                    </label>
                    <input
                      type="password"
                      value={accessCodeConfirm}
                      onChange={e => setAccessCodeConfirm(e.target.value)}
                      placeholder="أعد إدخال رمز الوصول للتأكيد..."
                      required
                      className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white outline-none focus:border-[#FF6B00] font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={accessCodeLoading}
                      className="px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{accessCodeLoading ? 'جارٍ التشفير والحفظ...' : 'حفظ وتشفير رمز الوصول بـ Argon2id'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccessCodeStep(1)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {accessCodeSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-600 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{accessCodeSuccess}</span>
                </div>
              )}

              {accessCodeError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-600 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{accessCodeError}</span>
                </div>
              )}
            </form>
          </div>

          {/* Card 3: إدارة رمز PIN (PIN Management) */}
          <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl p-4 sm:p-6 border border-[#E2E8F0] dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 gap-2">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#FF6B00]" />
                <div>
                  <h3 className="text-sm font-black">إدارة رمز الـ PIN (ECHOX VAULT PIN)</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    الرمز الرقمي المكون من 6 أرقام والمطلوب لفتح مركز التحكم بعد رمز الوصول
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/20">
                  Argon2id (6-Digits)
                </span>
              </div>
            </div>

            <form onSubmit={handleUpdatePin} className="space-y-4">
              {pinStep === 1 ? (
                <div className="space-y-3 bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <label className="text-xs font-bold block">
                    الخطوة 1: أدخل رمز الـ PIN الحالي للمتابعة:
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pinCurrent}
                    onChange={e => setPinCurrent(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    required
                    className="w-full text-center tracking-[0.5em] text-base py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white outline-none focus:border-[#FF6B00] font-mono"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="submit"
                      disabled={pinLoading}
                      className="px-4 py-2 rounded-xl bg-[#0F172A] dark:bg-slate-700 hover:bg-[#FF6B00] text-white text-xs font-bold cursor-pointer transition active:scale-95"
                    >
                      {pinLoading ? 'جارٍ التحقق...' : 'التحقق والمتابعة للـ PIN الجديد ←'}
                    </button>
                    <span className="text-[11px] text-slate-400">ميزة الحظر التلقائي عند 5 محاولات خاطئة</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="space-y-1">
                    <label className="text-xs font-bold block">
                      الخطوة 2: أدخل رمز الـ PIN الجديد (6 أرقام رقمية):
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={pinNew}
                      onChange={e => setPinNew(e.target.value.replace(/\D/g, ''))}
                      placeholder="6 أرقام جديدة..."
                      required
                      className="w-full text-center tracking-[0.5em] text-base py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white outline-none focus:border-[#FF6B00] font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold block">
                      تأكيد رمز الـ PIN الجديد:
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={pinConfirm}
                      onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                      placeholder="أعد إدخال الـ PIN للتأكيد..."
                      required
                      className="w-full text-center tracking-[0.5em] text-base py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white outline-none focus:border-[#FF6B00] font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={pinLoading}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{pinLoading ? 'جارٍ التشفير والحفظ...' : 'حفظ وتشفير بصمة PIN الجديدة'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPinStep(1)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {pinSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-600 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{pinSuccess}</span>
                </div>
              )}

              {pinError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-600 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}
            </form>
          </div>

          {/* Card 4: إدارة الجلسات والأجهزة (Session Management) */}
          <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl p-4 sm:p-6 border border-[#E2E8F0] dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#FF6B00]" />
                <div>
                  <h3 className="text-sm font-black">إدارة الجلسات والأجهزة الموثوقة (Session Management)</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    مراقبة الجلسات المفتوحة مع توقيع خادمي HMAC-SHA256 وإمكانية إنهاء الجلسات فوراً
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRevokeAllSessions}
                  disabled={sessionsLoading}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/30 text-xs font-bold cursor-pointer transition active:scale-95 flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{sessionsLoading ? 'جارٍ الإنهاء...' : 'تسجيل الخروج من كافة الأجهزة'}</span>
                </button>
              </div>
            </div>

            {sessionsMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-600 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{sessionsMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              {activeSessionsList.length > 0 ? (
                activeSessionsList.map((sess, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00]">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 font-mono font-bold text-slate-800 dark:text-slate-200">
                          <span>{sess.id}</span>
                          {sess.isCurrent && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-sans font-bold">
                              الجلسة الحالية
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>IP: {sess.ip}</span>
                          <span>•</span>
                          <span className="truncate max-w-[200px]">{sess.userAgent}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(sess.createdAt).toLocaleTimeString('ar-TN')}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                  جلسة المتصفح الحالية نشطة ومؤمنة بتوقيع خادمي مشفر.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
              <span>محرك التشفير النشط: <strong>Argon2id (Memory-Hard v=19)</strong></span>
              <span>توقيع الكوكيز: <strong>HMAC-SHA256 HttpOnly</strong></span>
            </div>
          </div>

        </div>
      )}

      {/* Tab: Footer & Store Info Settings (إعدادات تذييل الصفحة وتفاصيل المتجر) */}
      {activeTab === 'footer_info' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#FF6B00]/10 border border-[#FF6B00]/30 flex items-center justify-center text-[#FF6B00]">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-white">
                    إعدادات تذييل الصفحة وتفاصيل المتجر
                  </h2>
                  <span className="text-[10px] font-bold bg-[#FF6B00]/15 text-[#FF6B00] px-2 py-0.5 rounded-full border border-[#FF6B00]/25">
                    Footer & Store Info Settings
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  تحكم مباشر في النبذة التعريفية، أرقام الهاتف والواتساب، البريد والعنوان مع التحديث الفوري بجميع لغات المتجر.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-[#0F172A] dark:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>معاينة المتجر الحقيقي</span>
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {footerSavedSuccess && (
            <div className="p-4 bg-emerald-500/15 border-2 border-emerald-500/30 rounded-2xl text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2.5 shadow-sm animate-scaleUp">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="font-black">تم حفظ وتحديث إعدادات تذييل الصفحة بنجاح! ✓</p>
                <p className="text-[11px] font-normal opacity-90 mt-0.5">
                  تم التحديث فورياً في ذاكرة التخزين السريع وقاعدة البيانات السحابية (Firestore) بجميع اللغات.
                </p>
              </div>
            </div>
          )}

          {/* Live Footer Preview Card */}
          <div className="bg-[#0B0F17] rounded-3xl p-5 sm:p-6 border border-[#FF6B00]/30 text-white space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#FF6B00]" />
                <h3 className="text-xs font-bold tracking-wide">
                  معاينة حية لتذييل الصفحة (Live Footer Preview)
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
                  Real-time
                </span>
              </div>

              {/* Language Switcher for Preview */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10" dir="ltr">
                <button
                  type="button"
                  onClick={() => setPreviewFooterLang('ar')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewFooterLang === 'ar' ? 'bg-[#FF6B00] text-white shadow-xs' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  العربية
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFooterLang('fr')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewFooterLang === 'fr' ? 'bg-[#FF6B00] text-white shadow-xs' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Français
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFooterLang('en')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewFooterLang === 'en' ? 'bg-[#FF6B00] text-white shadow-xs' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Rendered Live Mockup */}
            <div className="bg-[#0F172A] rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                
                {/* Brand & Dynamic Bio */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <img 
                      src="/assets/images/echox-logo.webp" 
                      alt="Logo" 
                      className="w-6 h-6 rounded-full border border-[#FF6B00]/40 object-contain"
                    />
                    <span className="font-black text-sm text-white">
                      ECHOX <span className="text-[#FF6B00]">Store</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed italic bg-black/20 p-2 rounded-xl border border-white/5">
                    "{previewFooterLang === 'ar' 
                      ? (footerDescAr || 'متجر تونسي متخصص في المعدات الميكانيكية والكهربائية...') 
                      : previewFooterLang === 'fr' 
                      ? (footerDescFr || footerDescAr || 'Boutique en ligne tunisienne spécialisée...') 
                      : (footerDescEn || footerDescAr || 'Tunisian online store specializing in...')}"
                  </p>
                </div>

                {/* Quick Links Preview */}
                <div className="space-y-1.5 opacity-80 hidden sm:block">
                  <span className="font-bold text-[11px] text-[#FF6B00] block">
                    {previewFooterLang === 'ar' ? 'روابط سريعة' : previewFooterLang === 'fr' ? 'Liens rapides' : 'Quick Links'}
                  </span>
                  <p className="text-[11px] text-slate-400">• {previewFooterLang === 'ar' ? 'المتجر' : previewFooterLang === 'fr' ? 'Boutique' : 'Store'}</p>
                  <p className="text-[11px] text-slate-400">• {previewFooterLang === 'ar' ? 'الشركات الشريكة' : previewFooterLang === 'fr' ? 'Partenaires' : 'Partners'}</p>
                  <p className="text-[11px] text-slate-400">• {previewFooterLang === 'ar' ? 'ميثاق الجودة' : previewFooterLang === 'fr' ? 'Engagement' : 'Promise'}</p>
                </div>

                {/* Direct Contact Live Preview */}
                <div className="space-y-1.5">
                  <span className="font-bold text-[11px] text-[#FF6B00] block">
                    {previewFooterLang === 'ar' ? 'التواصل المباشر' : previewFooterLang === 'fr' ? 'Contact Direct' : 'Direct Contact'}
                  </span>
                  <div className="space-y-1 text-[11px] text-slate-300 font-mono">
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-[#FF6B00] shrink-0" />
                      <span dir="ltr">{footerSupportPhone || '+216 21 511 162'}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-[#25D366]">
                      <MessageCircle className="w-3 h-3 shrink-0" />
                      <span dir="ltr">+{footerWhatsappPhone.replace(/\D/g, '') || '21621511162'}</span>
                    </p>
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 text-[#FF6B00] shrink-0" />
                      <span dir="ltr" className="truncate">{footerEmail || 'contact@echox-store.tn'}</span>
                    </p>
                  </div>
                </div>

                {/* Address Live Preview */}
                <div className="space-y-1.5">
                  <span className="font-bold text-[11px] text-[#FF6B00] block">
                    {previewFooterLang === 'ar' ? 'الموقع والعنوان' : previewFooterLang === 'fr' ? 'Localisation' : 'Location'}
                  </span>
                  <p className="flex items-start gap-1.5 text-[11px] text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-[#FF6B00] shrink-0 mt-0.5" />
                    <span>
                      {previewFooterLang === 'ar' 
                        ? (footerAddressAr || 'المركب التكنولوجي بالغزالة، أريانة') 
                        : previewFooterLang === 'fr' 
                        ? (footerAddressFr || footerAddressAr || 'Pôle Technologique El Ghazala') 
                        : (footerAddressEn || footerAddressAr || 'El Ghazala Technopark')}
                      {' • '}
                      <strong className="text-white">
                        {getGovernorateName(footerGov, previewFooterLang)}
                      </strong>
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {previewFooterLang === 'ar' 
                      ? (footerWorkingHoursAr || 'من الإثنين إلى السبت: 08:30 إلى 18:30') 
                      : previewFooterLang === 'fr' 
                      ? (footerWorkingHoursFr || footerWorkingHoursAr) 
                      : (footerWorkingHoursEn || footerWorkingHoursAr)}
                  </p>
                </div>

              </div>

              <div className="pt-3 border-t border-slate-800 text-center text-[10px] text-slate-500">
                © 2026 ECHOX Store — {previewFooterLang === 'ar' ? 'كافة الحقوق محفوظة. الجمهورية التونسية.' : previewFooterLang === 'fr' ? 'Tous droits réservés. République Tunisienne.' : 'All rights reserved. Republic of Tunisia.'}
              </div>
            </div>
          </div>

          {/* The Main Edit Form */}
          <form onSubmit={handleSaveFooterSettings} className="space-y-6">
            
            {/* Card 1: Store Description (Multilingual) */}
            <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#FF6B00]" />
                  <h3 className="text-sm font-black text-[#0F172A] dark:text-white">
                    1. وصف المتجر والنبذة التعريفية (Store Bio & Descriptions)
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  تظهر في تذييل الصفحة بجميع اللغات
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Arabic Bio */}
                <div className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-xs font-bold block flex items-center justify-between text-[#0F172A] dark:text-white">
                    <span>النبذة التعريفية (بالعربية):</span>
                    <span className="text-[10px] font-mono text-[#FF6B00] font-bold">AR</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={footerDescAr}
                    onChange={e => setFooterDescAr(e.target.value)}
                    placeholder="متجر إلكتروني تونسي متخصص في توفير المعدات والأجهزة الصناعية وقطع الغيار الأصلية..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white focus:border-[#FF6B00] outline-none resize-none leading-relaxed"
                  />
                  <span className="text-[10px] text-slate-400 block text-end">
                    {footerDescAr.length} حرفاً
                  </span>
                </div>

                {/* French Bio */}
                <div className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-xs font-bold block flex items-center justify-between text-[#0F172A] dark:text-white">
                    <span>النبذة التعريفية (بالفرنسية):</span>
                    <span className="text-[10px] font-mono text-[#FF6B00] font-bold">FR</span>
                  </label>
                  <textarea
                    rows={3}
                    value={footerDescFr}
                    onChange={e => setFooterDescFr(e.target.value)}
                    placeholder="Boutique en ligne tunisienne spécialisée dans l’outillage, matériel électrique et pièces détachées..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white focus:border-[#FF6B00] outline-none resize-none leading-relaxed"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-slate-400 block text-end font-mono">
                    {footerDescFr.length} chars
                  </span>
                </div>

                {/* English Bio */}
                <div className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-xs font-bold block flex items-center justify-between text-[#0F172A] dark:text-white">
                    <span>النبذة التعريفية (بالإنجليزية):</span>
                    <span className="text-[10px] font-mono text-[#FF6B00] font-bold">EN</span>
                  </label>
                  <textarea
                    rows={3}
                    value={footerDescEn}
                    onChange={e => setFooterDescEn(e.target.value)}
                    placeholder="Tunisian online store specializing in professional tools, electrical equipment, and genuine spare parts..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white focus:border-[#FF6B00] outline-none resize-none leading-relaxed"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-slate-400 block text-end font-mono">
                    {footerDescEn.length} chars
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Contact Numbers & Email */}
            <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#FF6B00]" />
                  <h3 className="text-sm font-black text-[#0F172A] dark:text-white">
                    2. أرقام الاتصال وقنوات التواصل الرسمية (Official Contact & Support Channels)
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  روابط تفاعلية بالنقر
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Support Phone */}
                <div className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-xs font-bold block text-[#0F172A] dark:text-white">
                    رقم الهاتف الرسمي للدعم والمبيعات:
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={footerSupportPhone}
                      onChange={e => setFooterSupportPhone(e.target.value)}
                      placeholder="+216 21 511 162"
                      className="w-full text-xs py-2.5 pl-9 pr-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white font-mono focus:border-[#FF6B00] outline-none"
                      dir="ltr"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    يُفعّل زر الاتصال المباشر tel:{footerSupportPhone}
                  </span>
                </div>

                {/* WhatsApp Phone */}
                <div className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-xs font-bold block text-[#0F172A] dark:text-white">
                    رقم الواتساب الرسمي (أرقام فقط):
                  </label>
                  <div className="relative">
                    <MessageCircle className="w-4 h-4 text-[#25D366] absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={footerWhatsappPhone}
                      onChange={e => setFooterWhatsappPhone(e.target.value)}
                      placeholder="21621511162"
                      className="w-full text-xs py-2.5 pl-9 pr-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white font-mono focus:border-[#FF6B00] outline-none"
                      dir="ltr"
                    />
                  </div>
                  <span className="text-[10px] text-[#25D366] font-bold block">
                    رابط المحادثة المباشر: wa.me/{footerWhatsappPhone.replace(/\D/g, '')}
                  </span>
                </div>

                {/* Support Email */}
                <div className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-xs font-bold block text-[#0F172A] dark:text-white">
                    بريد الدعم الفني والمراسلات:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={footerEmail}
                      onChange={e => setFooterEmail(e.target.value)}
                      placeholder="contact@echox-store.tn"
                      className="w-full text-xs py-2.5 pl-9 pr-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white font-mono focus:border-[#FF6B00] outline-none"
                      dir="ltr"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    يُفعّل إرسال البريد المباشر mailto:{footerEmail}
                  </span>
                </div>

              </div>
            </div>

            {/* Card 3: Physical Address & Location */}
            <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#FF6B00]" />
                  <h3 className="text-sm font-black text-[#0F172A] dark:text-white">
                    3. العنوان المكتوب والموقع الجغرافي (Store Physical Address & Location)
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  متوافق مع محركات البحث SEO
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Arabic Address */}
                <div className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-xs font-bold block text-[#0F172A] dark:text-white">
                    العنوان المكتوب (بالعربية):
                  </label>
                  <input
                    type="text"
                    required
                    value={footerAddressAr}
                    onChange={e => setFooterAddressAr(e.target.value)}
                    placeholder="المركب التكنولوجي بالغزالة، أريانة / تونس"
                    className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white focus:border-[#FF6B00] outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block">يظهر في واجهة المتجر العربية</span>
                </div>

                {/* French Address */}
                <div className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-xs font-bold block text-[#0F172A] dark:text-white">
                    العنوان بالفرنسية (FR):
                  </label>
                  <input
                    type="text"
                    value={footerAddressFr}
                    onChange={e => setFooterAddressFr(e.target.value)}
                    placeholder="Pôle Technologique El Ghazala, Ariana"
                    className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white focus:border-[#FF6B00] outline-none"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-slate-400 block">يظهر في النسخة الفرنسية</span>
                </div>

                {/* English Address */}
                <div className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-xs font-bold block text-[#0F172A] dark:text-white">
                    العنوان بالإنجليزية (EN):
                  </label>
                  <input
                    type="text"
                    value={footerAddressEn}
                    onChange={e => setFooterAddressEn(e.target.value)}
                    placeholder="El Ghazala Technopark, Ariana / Tunis"
                    className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white focus:border-[#FF6B00] outline-none"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-slate-400 block">يظهر في النسخة الإنجليزية</span>
                </div>

                {/* Governorate Select */}
                <div className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-xs font-bold block text-[#0F172A] dark:text-white">
                    ولاية المقر التونسي الرئيسي:
                  </label>
                  <select
                    value={footerGov}
                    onChange={e => setFooterGov(e.target.value)}
                    className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white focus:border-[#FF6B00] outline-none"
                  >
                    {TUNISIAN_GOVERNORATES.map(gov => (
                      <option key={gov.id} value={gov.id} className="dark:bg-[#0F172A] text-slate-900 dark:text-white">
                        {gov.nameAr} ({gov.nameFr})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 block">إحدى ولايات تونس الـ 24</span>
                </div>

              </div>
            </div>

            {/* Card 4: Working Hours */}
            <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#FF6B00]" />
                  <h3 className="text-sm font-black text-[#0F172A] dark:text-white">
                    4. أوقات العمل والدعم الفني (Support Working Hours)
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-xs font-bold block text-[#0F172A] dark:text-white">أوقات العمل (بالعربية):</label>
                  <input
                    type="text"
                    value={footerWorkingHoursAr}
                    onChange={e => setFooterWorkingHoursAr(e.target.value)}
                    placeholder="من الإثنين إلى السبت: 08:30 إلى 18:30"
                    className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white focus:border-[#FF6B00] outline-none"
                  />
                </div>

                <div className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-xs font-bold block text-[#0F172A] dark:text-white">أوقات العمل (بالفرنسية):</label>
                  <input
                    type="text"
                    value={footerWorkingHoursFr}
                    onChange={e => setFooterWorkingHoursFr(e.target.value)}
                    placeholder="Du Lundi au Samedi : 08h30 à 18h30"
                    className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white focus:border-[#FF6B00] outline-none"
                    dir="ltr"
                  />
                </div>

                <div className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-xs font-bold block text-[#0F172A] dark:text-white">أوقات العمل (بالإنجليزية):</label>
                  <input
                    type="text"
                    value={footerWorkingHoursEn}
                    onChange={e => setFooterWorkingHoursEn(e.target.value)}
                    placeholder="Monday to Saturday: 08:30 to 18:30"
                    className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent text-[#0F172A] dark:text-white focus:border-[#FF6B00] outline-none"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-[#F8FAFC] dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={footerSaving}
                  className="px-6 py-3 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{footerSaving ? 'جارٍ الحفظ والمزامنة...' : 'حفظ التغييرات وتطبيق فوري على التذييل ✓'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFooterDescAr(INITIAL_SITE_SETTINGS.description.ar);
                    setFooterDescFr(INITIAL_SITE_SETTINGS.description.fr);
                    setFooterDescEn(INITIAL_SITE_SETTINGS.description.en);
                    setFooterSupportPhone(INITIAL_SITE_SETTINGS.supportPhone);
                    setFooterWhatsappPhone(INITIAL_SITE_SETTINGS.whatsappPhone);
                    setFooterEmail(INITIAL_SITE_SETTINGS.officialEmail);
                    setFooterAddressAr(INITIAL_SITE_SETTINGS.address);
                    setFooterAddressFr(INITIAL_SITE_SETTINGS.addressMultilingual?.fr || '');
                    setFooterAddressEn(INITIAL_SITE_SETTINGS.addressMultilingual?.en || '');
                    setFooterGov(INITIAL_SITE_SETTINGS.governorate);
                    setFooterWorkingHoursAr(INITIAL_SITE_SETTINGS.workingHours.ar);
                    setFooterWorkingHoursFr(INITIAL_SITE_SETTINGS.workingHours.fr);
                    setFooterWorkingHoursEn(INITIAL_SITE_SETTINGS.workingHours.en);
                  }}
                  className="px-4 py-3 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>استعادة القيم الافتراضية</span>
                </button>
              </div>

              {footerSavedSuccess && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم التحديث الفوري في تذييل المتجر لجميع اللغات!</span>
                </span>
              )}
            </div>

          </form>
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
                      src={p.images[0] || '/assets/images/echox-logo.webp'}
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
                    src={comp.logo || '/assets/images/echox-logo.webp'}
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

          {orderStatusError && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-600 dark:text-red-400 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{orderStatusError}</span>
              </div>
              <button
                type="button"
                onClick={() => setOrderStatusError(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Orders Cards */}
          <div className="space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl border border-[#E2E8F0] dark:border-slate-800 text-xs text-slate-500">
                لا توجد طلبات مطابقة للبحث أو الفلتر
              </div>
            ) : (
              filteredOrders.map(o => {
                const shipAllowed = canOrderShipClient(o);
                return (
                <div
                  key={o.id}
                  className="p-4 rounded-3xl bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 space-y-3 shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black font-mono bg-white dark:bg-[#0F172A] px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        {o.trackingNumber}
                      </span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getPaymentStatusTone(o.paymentStatus)}`}>
                        {(t.payments.statuses as Record<string, string>)[o.paymentStatus] || o.paymentStatus}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(o.createdAt).toLocaleDateString('ar-TN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-[#FF6B00] font-mono tabular-nums">
                        {o.totalAmount.toFixed(3)} {o.currency || 'د.ت'}
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
                      {o.shippingAddress?.governorate ? `ولاية ${o.shippingAddress.governorate}` : ''} • {o.shippingAddress?.city || ''} • وسيلة الدفع: <strong className="font-mono">{o.paymentMethod}</strong>
                      {o.paymentReference && <> • المرجع: <strong className="font-mono">{o.paymentReference}</strong></>}
                    </p>
                  </div>

                  {!shipAllowed && (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2">
                      <span>{t.payments.shippingBlockedUnpaid}</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('payment_management')}
                        className="text-[11px] font-black text-[#FF6B00] hover:underline shrink-0 cursor-pointer"
                      >
                        مراجعة وتأكيد الدفع ←
                      </button>
                    </div>
                  )}

                  {/* Status Selection */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-500">حالة الشحن:</span>
                    <select
                      value={o.status}
                      onChange={async e => {
                        const targetStatus = e.target.value as OrderStatus;
                        setOrderStatusError(null);
                        const clientRes = updateOrderStatus(o.id, targetStatus);
                        if (!clientRes.ok) {
                          setOrderStatusError(clientRes.error || t.payments.shippingBlockedUnpaid);
                          return;
                        }
                        try {
                          const srvRes = await fetch(`/api/admin/orders/${encodeURIComponent(o.id)}/status`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ status: targetStatus }),
                          });
                          if (srvRes.status === 409) {
                            const errData = await srvRes.json().catch(() => ({}));
                            setOrderStatusError(errData.error || t.payments.shippingBlockedUnpaid);
                          } else if (srvRes.ok) {
                            const okData = await srvRes.json().catch(() => ({}));
                            if (okData?.order) updateOrderInState(okData.order);
                          }
                        } catch {
                          // Order might exist only in local seed data
                        }
                      }}
                      className="text-xs py-1 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] font-bold text-[#0F172A] dark:text-white cursor-pointer"
                    >
                      <option value="new">جديد (New)</option>
                      <option value="under_confirmation">قيد التأكيد (Confirmation)</option>
                      <option value="preparing" disabled={!shipAllowed}>قيد التجهيز (Preparing)</option>
                      <option value="out_for_delivery" disabled={!shipAllowed}>خرج للتسليم (Out for delivery)</option>
                      <option value="delivered" disabled={!shipAllowed}>تم التسليم (Delivered)</option>
                      <option value="cancelled">ملغى (Cancelled)</option>
                    </select>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 9: Live Support Chat & Reply Customization */}
      {activeTab === 'support_chat' && <SupportChatTab />}

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
