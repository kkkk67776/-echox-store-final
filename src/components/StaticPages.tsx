import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  ShieldCheck, 
  Award, 
  RefreshCw, 
  Headphones, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Send, 
  CheckCircle2 
} from 'lucide-react';
import { getGovernorateName } from '../data/governorates';

// 1. The Promise Page (الوعد)
export const PromiseView: React.FC = () => {
  const { language, t, siteSettings, setCurrentView } = useStore();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12 animate-fadeIn">
      <div className="text-center space-y-4">
        <span className="text-xs font-black uppercase tracking-widest text-[#FF6B00] bg-[#FF6B00]/10 px-3.5 py-1.5 rounded-full">
          ميثاق الشرف والجودة
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900">
          {t.promisePage.title}
        </h1>
        <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          {t.promisePage.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-[#E8E4DD] shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">{t.promisePage.point1Title}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{t.promisePage.point1Desc}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#E8E4DD] shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">{t.promisePage.point2Title}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{t.promisePage.point2Desc}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#E8E4DD] shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">{t.promisePage.point3Title}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{t.promisePage.point3Desc}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#E8E4DD] shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <Headphones className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">{t.promisePage.point4Title}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{t.promisePage.point4Desc}</p>
        </div>
      </div>

      <div className="bg-[#0B0F17] rounded-3xl p-8 text-center text-white space-y-4">
        <h2 className="text-xl sm:text-2xl font-black">جاهز لتجربة تسوق مختلفة في تونس؟</h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
          اختر قطعتك الآن، واستلمها خلال 24-48 ساعة، وادفع عند المعاينة لباب منزلك أو ورشتك.
        </p>
        <button
          onClick={() => {
            setCurrentView('store');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="px-6 py-3 bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs rounded-xl shadow-md transition-all"
        >
          تصفح المتجر الآن
        </button>
      </div>
    </div>
  );
};

// 2. Partner Companies Page (الشركات)
export const CompaniesView: React.FC = () => {
  const { companies, products, language, t, setSelectedProductId, setCurrentView } = useStore();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-10 animate-fadeIn">
      <div className="text-center space-y-3">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          {t.companiesPage.title}
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto">
          {t.companiesPage.subtitle}
        </p>
      </div>

      <div className="space-y-8">
        {companies.map(comp => {
          const compProducts = products.filter(p => p.companyId === comp.id);
          return (
            <div key={comp.id} className="bg-white rounded-3xl border border-[#E8E4DD] p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-4">
                  <img 
                    src={comp.logo} 
                    alt={comp.name} 
                    className="w-16 h-16 rounded-2xl object-contain bg-slate-50 p-1.5 border border-slate-200" 
                  />
                  <div>
                    <h2 className="text-lg font-black text-slate-900">{comp.name}</h2>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#FF6B00]" />
                        <span>{comp.address} ({getGovernorateName(comp.governorate, language)})</span>
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <a 
                    href={`tel:${comp.phone}`} 
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span dir="ltr">{comp.phone}</span>
                  </a>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {comp.description[language]}
              </p>

              {/* Company Products */}
              {compProducts.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    منتجات متوفرة من {comp.name}:
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {compProducts.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => setSelectedProductId(p.id)}
                        className="p-3 rounded-2xl bg-[#FAF8F5] border border-slate-200 hover:border-[#FF6B00] cursor-pointer flex items-center gap-3 transition-all"
                      >
                        <img 
                          src={p.images[0]} 
                          alt="thumb" 
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-xl object-cover bg-white" 
                        />
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-900 truncate">{p.name[language]}</p>
                          <p className="text-xs font-black text-[#FF6B00] tabular-nums">{p.price.toFixed(3)} {t.cart.currency}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 3. Contact Us Page (اتصل بنا)
export const ContactView: React.FC = () => {
  const { siteSettings, sendInquiry, t } = useStore();
  const [senderName, setSenderName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName || !phone || !message) return;

    sendInquiry({
      senderName,
      phone,
      email: email || 'contact@client.tn',
      subject: subject || 'استفسار عام',
      message
    });

    setSentSuccess(true);
    setSenderName('');
    setPhone('');
    setEmail('');
    setSubject('');
    setMessage('');
    setTimeout(() => setSentSuccess(false), 5000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8 animate-fadeIn">
      <div className="text-center space-y-3">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          {t.contactModal.title}
        </h1>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">
          {t.contactModal.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Quick Contacts Box */}
        <div className="md:col-span-1 bg-white p-6 rounded-3xl border border-[#E8E4DD] shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">قنوات التواصل المباشرة</h3>
            <div className="space-y-4 text-xs">
              <a
                href={`tel:${siteSettings.supportPhone}`}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-[#FF6B00]/10 flex items-center gap-3 transition-colors border border-slate-200"
              >
                <div className="w-8 h-8 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">اتصال هاتفي</span>
                  <span className="font-bold text-slate-900 font-mono" dir="ltr">{siteSettings.supportPhone}</span>
                </div>
              </a>

              <a
                href={`https://wa.me/${siteSettings.whatsappPhone}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 flex items-center gap-3 transition-colors border border-emerald-200"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-emerald-800 block">واتساب مباشر</span>
                  <span className="font-bold text-emerald-950 font-mono" dir="ltr">+{siteSettings.whatsappPhone}</span>
                </div>
              </a>

              <div className="p-3 rounded-2xl bg-slate-50 flex items-center gap-3 border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">البريد الرسمي</span>
                  <span className="font-bold text-slate-900 text-[11px]" dir="ltr">{siteSettings.officialEmail}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 flex items-center gap-3 border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">المقر الرئيسي</span>
                  <span className="font-bold text-slate-900 text-[11px]">{siteSettings.address}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <div className="md:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E4DD] shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">{t.contactModal.formTitle}</h2>

          {sentSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{t.contactModal.sentSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.checkout.fullName} *</label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  placeholder="اسمك الكامل"
                  className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.checkout.phone} *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+216 21 000 000"
                  className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6B00]"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t.contactModal.subject}</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="موضوع الاستفسار أو القطعة المطلوبة"
                className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t.contactModal.message} *</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="اكتب تفاصيل استفسارك أو طلبك..."
                className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6B00]"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{t.contactModal.sendBtn}</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
