import React from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Truck
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { siteSettings, language, t, setCurrentView } = useStore();

  const handleLinkClick = (view: string) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#0F172A] text-white border-t border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          
          {/* 1. معلومات المتجر والعلامة */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <img 
                src="/assets/aistudio/file_0000000048188243bc0b721218c854fc_ea3ea21d.png" 
                alt="ECHOX Logo" 
                className="w-8 h-8 rounded-full object-contain border border-[#FF6B00]/40"
              />
              <div>
                <span className="text-lg font-black tracking-tight text-white block leading-none">
                  ECHOX <span className="text-[#FF6B00]">Store</span>
                </span>
                <span className="text-[10px] text-slate-400 font-bold">المنصة التونسية المعتمدة</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {(typeof siteSettings.description === 'object' && siteSettings.description
                ? siteSettings.description[language] || siteSettings.description.ar || siteSettings.description.fr || siteSettings.description.en
                : (siteSettings.description as any)) || t.footer.desc}
            </p>

            <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700 text-xs flex items-center gap-2 text-slate-200">
              <Truck className="w-4 h-4 text-[#FF6B00] shrink-0" />
              <span className="font-semibold text-[11px]">{t.footer.deliveryAllTunisia || 'شحن سريع وتوصيل لجميع الـ 24 ولاية'}</span>
            </div>
          </div>

          {/* 2. روابط التصفح السريعة */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black text-[#FF6B00] uppercase tracking-wider">
              {t.footer.quickLinks}
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300 font-medium">
              <li>
                <button 
                  type="button"
                  onClick={() => handleLinkClick('store')} 
                  className="hover:text-[#FF6B00] transition-colors cursor-pointer text-start"
                >
                  {t.nav.store}
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => handleLinkClick('companies')} 
                  className="hover:text-[#FF6B00] transition-colors cursor-pointer text-start"
                >
                  {t.nav.companies}
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => handleLinkClick('promise')} 
                  className="hover:text-[#FF6B00] transition-colors cursor-pointer text-start"
                >
                  {t.nav.promise}
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => handleLinkClick('my_orders')} 
                  className="hover:text-[#FF6B00] transition-colors cursor-pointer text-start"
                >
                  {t.nav.myOrders}
                </button>
              </li>
            </ul>
          </div>

          {/* 3. خدمة العملاء والضمان */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black text-[#FF6B00] uppercase tracking-wider">
              {t.footer.customerService}
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300 font-medium">
              <li>
                <button 
                  type="button"
                  onClick={() => handleLinkClick('contact')} 
                  className="hover:text-[#FF6B00] transition-colors cursor-pointer text-start"
                >
                  {t.contactModal.title}
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => handleLinkClick('promise')} 
                  className="hover:text-[#FF6B00] transition-colors cursor-pointer text-start"
                >
                  {t.footer.returnPolicy}
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => handleLinkClick('promise')} 
                  className="hover:text-[#FF6B00] transition-colors cursor-pointer text-start"
                >
                  {t.footer.privacyPolicy}
                </button>
              </li>
              <li>
                <button 
                  type="button"
                  onClick={() => handleLinkClick('promise')} 
                  className="hover:text-[#FF6B00] transition-colors cursor-pointer text-start"
                >
                  {t.footer.termsOfService}
                </button>
              </li>
            </ul>
          </div>

          {/* 4. معلومات التواصل الرسمية */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black text-[#FF6B00] uppercase tracking-wider">
              التواصل المباشر
            </h4>
            <ul className="space-y-2 text-xs text-slate-300 font-medium">
              {siteSettings?.supportPhone && (
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <a href={`tel:${siteSettings.supportPhone}`} dir="ltr" className="font-mono font-bold hover:text-white transition-colors">
                    {siteSettings.supportPhone}
                  </a>
                </li>
              )}
              {siteSettings?.whatsappPhone && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
                  <a 
                    href={`https://wa.me/${siteSettings.whatsappPhone.replace(/\D/g, '')}?text=مرحباً%20ECHOX%20Store%20تونس`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#25D366] hover:underline flex items-center gap-1 font-bold"
                  >
                    <span>واتساب:</span>
                    <span dir="ltr">+{siteSettings.whatsappPhone.replace(/\D/g, '')}</span>
                  </a>
                </li>
              )}
              {siteSettings?.officialEmail && (
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <a href={`mailto:${siteSettings.officialEmail}`} dir="ltr" className="text-slate-300 text-[11px] truncate hover:text-white">
                    {siteSettings.officialEmail}
                  </a>
                </li>
              )}
              {(siteSettings?.address || siteSettings?.addressMultilingual) && (
                <li className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#FF6B00] shrink-0 mt-0.5" />
                  <span className="text-slate-300 text-[11px]">
                    {(siteSettings.addressMultilingual && siteSettings.addressMultilingual[language]) || 
                     siteSettings.address || 
                     (siteSettings.addressMultilingual && (siteSettings.addressMultilingual.ar || siteSettings.addressMultilingual.fr || siteSettings.addressMultilingual.en))}
                  </span>
                </li>
              )}
            </ul>
          </div>

        </div>

        {/* حقوق المتجر بدون أي روابط إدارية */}
        <div className="pt-6 mt-6 border-t border-slate-800 text-center text-xs text-slate-500">
          <p>© 2026 ECHOX Store — {t.footer.rights || 'كافة الحقوق محفوظة. الجمهورية التونسية.'}</p>
        </div>
      </div>
    </footer>
  );
};
