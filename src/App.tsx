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
import { OrderTrackingView } from './components/OrderTrackingView';
import { CustomerPortal } from './components/CustomerPortal';
import { OwnerDashboard } from './components/OwnerDashboard';
import { OwnerLogin } from './components/security/OwnerLogin';
import { OwnerLockScreen } from './components/security/OwnerLockScreen';
import OwnerSecurityRoom from './components/security/OwnerSecurityRoom';
import { PromiseView, CompaniesView, ContactView } from './components/StaticPages';
import { FloatingActions } from './components/FloatingActions';
import { Footer } from './components/Footer';

const AppContent: React.FC = () => {
  const { currentView, setCurrentView } = useStore();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [navState, setNavState] = useState<{ challengeId?: string; devTestHint?: string }>({});

  // Synchronize route with browser URL on mount and on popstate
  useEffect(() => {
    const syncRouteFromUrl = () => {
      const path = window.location.pathname;
      if (
        path === '/owner/login' || 
        path === '/owner/lock' || 
        path === '/owner/security-code' || 
        path === '/owner/dashboard'
      ) {
        setCurrentView(path);
      } else if (path === '/promise') {
        setCurrentView('promise');
      } else if (path === '/companies') {
        setCurrentView('companies');
      } else if (path === '/my_orders' || path === '/orders') {
        setCurrentView('my_orders');
      } else if (path === '/account') {
        setCurrentView('account');
      } else if (path === '/contact') {
        setCurrentView('contact');
      }
    };

    syncRouteFromUrl();
    window.addEventListener('popstate', syncRouteFromUrl);
    return () => window.removeEventListener('popstate', syncRouteFromUrl);
  }, [setCurrentView]);

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
    currentView === '/owner/login' || 
    currentView === '/owner/lock' || 
    currentView === '/owner/security-code' || 
    currentView === '/owner/dashboard' || 
    currentView === 'owner_dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-slate-900 selection:bg-[#FF6B00] selection:text-white">
      {/* 1. Header with original logo and language controls */}
      <Header />

      {/* 2. Main View Router */}
      <main className="flex-1">
        {/* Sovereign Security & OS Lock Screen Flow */}
        {currentView === '/owner/login' && (
          <OwnerLogin onNavigate={handleNavigate} />
        )}

        {(currentView === '/owner/lock' || currentView === '/owner/security-code') && (
          <OwnerLockScreen onNavigate={handleNavigate} />
        )}

        {(currentView === '/owner/dashboard' || currentView === 'owner_dashboard') && (
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
      <OwnerSecurityRoom 
        onUnlockSuccess={() => handleNavigate('/owner/dashboard')} 
        onNavigate={handleNavigate} 
      />
      
      {/* 4. Floating Communication Buttons */}
      <FloatingActions />

      {/* 5. Footer */}
      <Footer />
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
