/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { StorefrontView } from './components/StorefrontView';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { FloatingActions } from './components/FloatingActions';
import { Footer } from './components/Footer';
import { BottomNavigation } from './components/BottomNavigation';
import { applySeo } from './lib/seo';

const CheckoutModal = lazy(() => import('./components/CheckoutModal').then(m => ({ default: m.CheckoutModal })));
const SupportEchoxModal = lazy(() => import('./components/SupportEchoxModal').then(m => ({ default: m.SupportEchoxModal })));
const OrderTrackingView = lazy(() => import('./components/OrderTrackingView').then(m => ({ default: m.OrderTrackingView })));
const CustomerPortal = lazy(() => import('./components/CustomerPortal').then(m => ({ default: m.CustomerPortal })));
const OwnerDashboard = lazy(() => import('./components/OwnerDashboard').then(m => ({ default: m.OwnerDashboard })));
const OwnerSecurityRoom = lazy(() => import('./components/security/OwnerSecurityRoom'));
const PromiseView = lazy(() => import('./components/StaticPages').then(m => ({ default: m.PromiseView })));
const CompaniesView = lazy(() => import('./components/StaticPages').then(m => ({ default: m.CompaniesView })));
const ContactView = lazy(() => import('./components/StaticPages').then(m => ({ default: m.ContactView })));

const RouteFallback: React.FC = () => (
  <div className="min-h-[45vh] flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-3 border-[#FF6B00]/25 border-t-[#FF6B00] animate-spin" />
  </div>
);

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
  } = useStore();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [navState, setNavState] = useState<{ challengeId?: string; devTestHint?: string }>({});

  // Synchronize route & query parameters (?product, ?category, ?lang) with browser URL
  useEffect(() => {
    const syncRouteFromUrl = () => {
      const path = window.location.pathname;
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

      if (path === '/owner/dashboard' || path === '/owner_dashboard') {
        setCurrentView('/owner/dashboard');
      } else if (path === '/owner/login' || path === '/owner/lock' || path === '/owner/security-code') {
        window.history.replaceState({}, '', '/');
        setCurrentView('store');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('open_echox_vault'));
        }, 100);
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
      }
    };

    syncRouteFromUrl();
    window.addEventListener('popstate', syncRouteFromUrl);
    return () => window.removeEventListener('popstate', syncRouteFromUrl);
  }, [setCurrentView, setLanguage, setSelectedCategory, setSelectedProductId]);

  const activeProduct = products.find((p) => p.id === selectedProductId) || null;

  // Keep title, description, canonical, hreflang, product JSON-LD and robots tags synced
  useEffect(() => {
    applySeo(currentView, language, activeProduct);
  }, [currentView, language, activeProduct]);

  const handleNavigate = (route: string, state?: any) => {
    if (state) {
      setNavState(state);
    }
    const urlPath = route.startsWith('/') ? route : `/${route}`;
    if (window.location.pathname !== urlPath) {
      window.history.pushState(state || {}, '', urlPath);
    }
    setCurrentView(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isOwnerRoute =
    currentView === '/owner/dashboard' ||
    currentView === 'owner_dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0B0F17] text-[#0F172A] dark:text-slate-100 selection:bg-[#FF6B00] selection:text-white transition-colors overflow-x-hidden max-w-[100vw] w-full">
      {/* 1. Header */}
      <Header />

      {/* 2. Main View Router */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
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
      </main>

      {/* 3. Global Drawers & Modals */}
      <ProductDetailModal />
      <CartDrawer onOpenCheckout={() => setIsCheckoutOpen(true)} />
      <Suspense fallback={null}>
        {isCheckoutOpen && (
          <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
        )}
        <SupportEchoxModal />
        <OwnerSecurityRoom
          onUnlockSuccess={() => handleNavigate('/owner/dashboard')}
          onNavigate={handleNavigate}
        />
      </Suspense>

      {/* 4. Floating Communication Buttons */}
      <FloatingActions />

      {/* 5. Footer */}
      <Footer />

      {/* 6. Google Play Fixed Bottom Navigation Bar */}
      {!isOwnerRoute && <BottomNavigation />}
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
