import React from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  Truck, 
  Lock 
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { siteSettings, language, t, setCurrentView } = useStore();

  const handleLinkClick = (view: string) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#0B0F17] text-white border-t border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          
          {/* Brand Info (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src="/assets/aistudio/file_0000000048188243bc0b721218c854fc_ea3ea21d.png" 
                alt="ECHOX Logo" 
                className="w-10 h-10 rounded-full object-contain"
              />
              <div>
                <span className="text-xl font-black tracking-wider text-white">ECHOX STORE</span>
                <span className="block text-[11px] text-[#FF6B00] font-bold">المنصة التونسية المعتمدة</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              {t.footer.desc}
            </p>

            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 text-xs flex items-center gap-3">
              <Truck className="w-5 h-5 text-[#FF6B00] shrink-0" />
              <span className="text-slate-300 font-semibold">{t.footer.deliveryAllTunisia}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider">
              {t.footer.quickLinks}
            </h4>
            <ul className="space-y-2 text-xs text-slate-400 font-medium">
              <li>
                <button onClick={() => handleLinkClick('store')} className="hover:text-white transition-colors">
                  {t.nav.store}
                </button>
              </li>
              <li>
                <button onClick={() => handleLinkClick('promise')} className="hover:text-white transition-colors">
                  {t.nav.promise}
                </button>
              </li>
              <li>
                <button onClick={() => handleLinkClick('companies')} className="hover:text-white transition-colors">
                  {t.nav.companies}
                </button>
              </li>
              <li>
                <button onClick={() => handleLinkClick('my_orders')} className="hover:text-white transition-colors">
                  {t.nav.myOrders}
                </button>
              </li>
              <li>
                <button onClick={() => handleLinkClick('account')} className="hover:text-white transition-colors">
                  {t.nav.account}
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Service & Policies */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider">
              {t.footer.customerService}
            </h4>
            <ul className="space-y-2 text-xs text-slate-400 font-medium">
              <li>
                <button onClick={() => handleLinkClick('contact')} className="hover:text-white transition-colors">
                  {t.contactModal.title}
                </button>
              </li>
              <li>
                <button onClick={() => handleLinkClick('promise')} className="hover:text-white transition-colors">
                  {t.footer.returnPolicy}
                </button>
              </li>
              <li>
                <button onClick={() => handleLinkClick('promise')} className="hover:text-white transition-colors">
                  {t.footer.privacyPolicy}
                </button>
              </li>
              <li>
                <button onClick={() => handleLinkClick('promise')} className="hover:text-white transition-colors">
                  {t.footer.termsOfService}
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider">
              التواصل والمقر
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span dir="ltr" className="text-white font-mono font-bold">{siteSettings.supportPhone}</span>
              </li>
              <li className="flex items-center gap-2">
                <a 
                  href={`https://wa.me/${siteSettings.whatsappPhone}?text=مرحباً%20ECHOX%20STORE%20تونس`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-[#25D366] hover:underline"
                >
                  <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
                  <span className="text-xs font-bold">واتساب:</span>
                  <span dir="ltr" className="font-mono font-bold text-white">+{siteSettings.whatsappPhone}</span>
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span dir="ltr" className="text-slate-300">{siteSettings.officialEmail}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#FF6B00] shrink-0 mt-0.5" />
                <span className="text-slate-300">{siteSettings.address}</span>
              </li>
              <li className="pt-2 text-[11px] text-slate-500">
                {siteSettings.workingHours[language]}
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Strip */}
        <div className="pt-8 mt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>{t.footer.rights}</p>

          {/* Owner Entrance Link */}
          <button
            onClick={() => handleLinkClick('/owner/dashboard')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-[#FF6B00] transition-colors font-bold"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{t.footer.ownerPortalLink}</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
