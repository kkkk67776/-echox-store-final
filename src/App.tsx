/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { StorefrontView } from './components/StorefrontView';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { FloatingActions } from './components/FloatingActions';
import { Footer } from './components/Footer';
import { BottomNavigation } from './components/BottomNavigation';
import OwnerSecurityRoom from './components/security/OwnerSecurityRoom';
import { applySeo } from './lib/seo';
import { verifyGatewayReturnClient } from './lib/payments';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const CheckoutModal = lazy(() => import('./components/CheckoutModal').then(m => ({ default: m.CheckoutModal })));
const SupportEchoxModal = lazy(() => import('./components/SupportEchoxModal').then(m => ({ default: m.SupportEchoxModal })));
const OrderTrackingView = lazy(() => import('./components/OrderTrackingView').then(m => ({ default: m.OrderTrackingView })));
const CustomerPortal = lazy(() => import('./components/CustomerPortal').then(m => ({ default: m.CustomerPortal })));
const OwnerDashboard = lazy(() => import('./components/OwnerDashboard').then(m => ({ default: m.OwnerDashboard })));
const PromiseView = lazy(() => import('./components/StaticPages').then(m => ({ default: m.PromiseView })));
const CompaniesView = lazy(() => import('./components/StaticPages').then(m => ({ default: m.CompaniesView })));
const ContactView = lazy(() => import('./components/StaticPages').then(m => ({ default: m.ContactView })));

const RouteFallback: React.FC = () => (
  <div className="min-h-[45vh] flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-3 border-[#FF6B00]/25 border-t-[#FF6B00] animate-spin" />
  </div>
);

class RouteErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            تعذر تحميل هذه الصفحة. يرجى تحديث الصفحة والمحاولة مجدداً.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-[#FF6B00] text-white text-xs font-bold cursor-pointer"
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    language,
    setLanguage,
    products,
    selectedProductId,
    setSelectedProductId,
    setSelectedCategory,
    setSearchQuery,
    updateOrderInState,
  } = useStore();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [navState, setNavState] = useState<{ challengeId?: string; devTestHint?: string }>({});
  const [vaultOpenNonce, setVaultOpenNonce] = useState(0);
  const [paymentReturnBanner, setPaymentReturnBanner] = useState<{
    status: 'paid' | 'pending' | 'failed';
    kind?: 'order' | 'support';
    tracking?: string;
    message: string;
  } | null>(null);

  const requestOpenVault = useCallback(() => {
    (window as any).__echoxVaultOpenPending = true;
    setVaultOpenNonce((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const handleGlobalVaultEvent = () => {
      setVaultOpenNonce((prev) => prev + 1);
    };
    window.addEventListener('open_echox_vault', handleGlobalVaultEvent);
    return () => window.removeEventListener('open_echox_vault', handleGlobalVaultEvent);
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onSwMessage = (event: MessageEvent) => {
      const payload = event.data;
      if (!payload || payload.type !== 'ECHOX_NOTIFICATION_CLICK' || typeof payload.url !== 'string') return;
      try {
        const parsed = new URL(payload.url, window.location.origin);
        const path = parsed.pathname.replace(/\/+$/, '') || '/';
        const productParam = parsed.searchParams.get('product');
        if (productParam) {
          setSelectedProductId(productParam);
        }
        window.history.pushState({}, '', `${parsed.pathname}${parsed.search}`);
        if (path === '/owner/dashboard' || path === '/owner_dashboard') {
          setCurrentView('/owner/dashboard');
        } else {
          setCurrentView('store');
        }
      } catch {
        // ignore invalid url
      }
    };
    navigator.serviceWorker.addEventListener('message', onSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onSwMessage);
  }, [setCurrentView, setSelectedProductId]);

  // Synchronize route & query parameters (?product, ?category, ?lang, ?search) with browser URL
  useEffect(() => {
    const syncRouteFromUrl = () => {
      const path = window.location.pathname.replace(/\/+$/, '') || '/';
      const params = new URLSearchParams(window.location.search);

      const urlLang = params.get('lang');
      if (urlLang === 'ar' || urlLang === 'fr' || urlLang === 'en') {
        setLanguage(urlLang);
      }

      const urlCat = params.get('category');
      if (urlCat) {
        setSelectedCategory(urlCat);
      }

      const urlProduct = params.get('product');
      if (urlProduct) {
        setSelectedProductId(urlProduct);
      }

      const urlSearch = params.get('search');
      if (urlSearch) {
        setSearchQuery(urlSearch);
      }

      const paymentReturn = params.get('payment_return');
      const trackingParam = params.get('tracking') || undefined;
      const paymentRefParam = params.get('payment_ref') || params.get('payment_id') || undefined;
      const providerParam = params.get('provider') || undefined;

      if (paymentReturn && (trackingParam || paymentRefParam)) {
        const cleanParams = new URLSearchParams(params.toString());
        ['payment_return', 'tracking', 'payment_ref', 'payment_id', 'provider'].forEach((k) => cleanParams.delete(k));
        const nextQs = cleanParams.toString();
        window.history.replaceState({}, '', `${path}${nextQs ? `?${nextQs}` : ''}`);

        void verifyGatewayReturnClient({
          tracking: trackingParam,
          paymentRef: paymentRefParam,
          provider: providerParam,
        }).then((res) => {
          if (res.ok) {
            if (res.kind === 'order' && res.order) {
              updateOrderInState(res.order);
            }
            if (res.paymentStatus === 'Paid') {
              setPaymentReturnBanner({
                status: 'paid',
                kind: res.kind,
                tracking: res.order?.trackingNumber || res.supportTransaction?.supportReference || trackingParam,
                message:
                  res.kind === 'support'
                    ? 'تم تأكيد مساهمة دعم ECHOX الإلكترونية بنجاح ✓'
                    : `تم تأكيد دفع الطلب (${res.order?.trackingNumber || trackingParam}) بنجاح ✓`,
              });
            } else if (paymentReturn === 'fail' || res.paymentStatus === 'Payment Failed') {
              setPaymentReturnBanner({
                status: 'failed',
                kind: res.kind,
                tracking: trackingParam,
                message: `لم تكتمل عملية الدفع الإلكتروني للطلب (${trackingParam || ''}). يمكنك المحاولة مجدداً من صفحة التتبع.`,
              });
            } else {
              setPaymentReturnBanner({
                status: 'pending',
                kind: res.kind,
                tracking: trackingParam,
                message: `تم استلام عودتك من بوابة الدفع (${trackingParam || ''})، وبانتظار تأكيد البوابة النهائي.`,
              });
            }
          } else if (paymentReturn === 'fail') {
            setPaymentReturnBanner({
              status: 'failed',
              tracking: trackingParam,
              message: 'تم إلغاء عملية الدفع الإلكتروني أو فشل التحقق منها.',
            });
          }
        });
      }

      if (path === '/owner/dashboard' || path === '/owner_dashboard') {
        setCurrentView('/owner/dashboard');
      } else if (path === '/owner/login' || path === '/owner/lock' || path === '/owner/security-code') {
        window.history.replaceState({}, '', '/');
        setCurrentView('store');
        requestOpenVault();
      } else if (path === '/promise') {
        setCurrentView('promise');
      } else if (path === '/companies') {
        setCurrentView('companies');
      } else if (path === '/my_orders' || path === '/orders') {
        setCurrentView('my_orders');
      } else if (path === '/account') {
        setCurrentView('account');
      } else if (path === '/wishlist') {
        setCurrentView('wishlist');
      } else if (path === '/contact') {
        setCurrentView('contact');
      } else {
        setCurrentView('store');
      }
    };

    syncRouteFromUrl();
    window.addEventListener('popstate', syncRouteFromUrl);
    return () => window.removeEventListener('popstate', syncRouteFromUrl);
  }, [setCurrentView, setLanguage, setSelectedCategory, setSelectedProductId, setSearchQuery, requestOpenVault, updateOrderInState]);

  const activeProduct = products.find((p) => p.id === selectedProductId) || null;

  // Keep title, description, canonical, hreflang, product JSON-LD and robots tags synced
  useEffect(() => {
    applySeo(currentView, language, activeProduct);
  }, [currentView, language, activeProduct]);

  const handleNavigate = useCallback((route: string, state?: any) => {
    if (state) {
      setNavState(state);
    }
    const urlPath = route === 'store' ? '/' : route.startsWith('/') ? route : `/${route}`;
    if (window.location.pathname !== urlPath) {
      window.history.pushState(state || {}, '', urlPath);
    }
    setCurrentView(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setCurrentView]);

  const isOwnerRoute =
    currentView === '/owner/dashboard' ||
    currentView === 'owner_dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0B0F17] text-[#0F172A] dark:text-slate-100 selection:bg-[#FF6B00] selection:text-white transition-colors overflow-x-hidden max-w-[100vw] w-full">
      {/* 1. Header */}
      <Header />

      {/* Gateway Payment Return Notice */}
      {paymentReturnBanner && (
        <div className="max-w-6xl mx-auto w-full px-4 pt-3">
          <div
            className={`p-3.5 rounded-2xl border text-xs font-bold flex flex-wrap items-center justify-between gap-3 ${
              paymentReturnBanner.status === 'paid'
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                : paymentReturnBanner.status === 'failed'
                ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300'
                : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {paymentReturnBanner.status === 'paid' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{paymentReturnBanner.message}</span>
            </div>
            <div className="flex items-center gap-2">
              {paymentReturnBanner.kind === 'order' && (
                <button
                  type="button"
                  onClick={() => handleNavigate('/my_orders')}
                  className="px-3 py-1.5 rounded-xl bg-[#FF6B00] text-white text-[11px] font-bold cursor-pointer"
                >
                  عرض طلباتي
                </button>
              )}
              <button
                type="button"
                onClick={() => setPaymentReturnBanner(null)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                aria-label="Dismiss payment banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main View Router */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        <RouteErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            {isOwnerRoute && (
              <OwnerDashboard onNavigate={handleNavigate} />
            )}

            {!isOwnerRoute && (
              <>
                {(currentView === 'store' || currentView === '/') && <StorefrontView />}
                {currentView === 'promise' && <PromiseView />}
                {currentView === 'companies' && <CompaniesView />}
                {currentView === 'my_orders' && <OrderTrackingView />}
                {(currentView === 'account' || currentView === 'wishlist') && <CustomerPortal />}
                {currentView === 'contact' && <ContactView />}
              </>
            )}
          </Suspense>
        </RouteErrorBoundary>
      </main>

      {/* 3. Global Drawers & Modals */}
      <ProductDetailModal />
      <CartDrawer onOpenCheckout={() => setIsCheckoutOpen(true)} />
      <Suspense fallback={null}>
        {isCheckoutOpen && (
          <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
        )}
        <SupportEchoxModal />
      </Suspense>
      <OwnerSecurityRoom
        vaultOpenNonce={vaultOpenNonce}
        onUnlockSuccess={() => handleNavigate('/owner/dashboard')}
        onNavigate={handleNavigate}
      />

      {/* 4. Floating Communication Buttons */}
      <FloatingActions />

      {/* 5. Footer */}
      <Footer />

      {/* 6. Google Play Fixed Bottom Navigation Bar */}
      {!isOwnerRoute && <BottomNavigation onOpenVault={requestOpenVault} />}
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
