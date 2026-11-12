/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { StorefrontView } from './components/StorefrontView';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { SupportEchoxModal } from './components/SupportEchoxModal';
import { OrderTrackingView } from './components/OrderTrackingView';
import { CustomerPortal } from './components/CustomerPortal';
import { OwnerDashboard } from './components/OwnerDashboard';
import OwnerSecurityRoom from './components/security/OwnerSecurityRoom';
import { PromiseView, CompaniesView, ContactView } from './components/StaticPages';
import { FloatingActions } from './components/FloatingActions';
import { Footer } from './components/Footer';
import { BottomNavigation } from './components/BottomNavigation';
import { applySeo } from './lib/seo';

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
    // Update view and browser URL
    const urlPath = route.startsWith('/') ? route : `/${route}`;
    if (window.location.pathname !== urlPath) {
      window.history.pushState(state || {}, '', urlPath);
    }
    setCurrentView(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Determine current active view:
  const isOwnerRoute = 
    currentView === '/owner/dashboard' || 
    currentView === 'owner_dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0B0F17] text-[#0F172A] dark:text-slate-100 selection:bg-[#FF6B00] selection:text-white transition-colors overflow-x-hidden max-w-[100vw] w-full">
      {/* 1. Header with original logo and language controls */}
      <Header />

      {/* 2. Main View Router */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        {/* Owner Dashboard (Unlocked exclusively via secret code & ECHOX VAULT PIN) */}
        {isOwnerRoute && (
          <OwnerDashboard onNavigate={handleNavigate} />
        )}

        {/* Customer & Storefront Views */}
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
      </main>

      {/* 3. Global Drawers & Modals */}
      <ProductDetailModal />
      <CartDrawer onOpenCheckout={() => setIsCheckoutOpen(true)} />
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
      <SupportEchoxModal />
      <OwnerSecurityRoom 
        onUnlockSuccess={() => handleNavigate('/owner/dashboard')} 
        onNavigate={handleNavigate} 
      />
      
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
