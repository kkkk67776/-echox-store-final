import React, { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, Phone, Mail, Image as ImageIcon, CheckCircle, X, AlertTriangle } from 'lucide-react';

export interface Partner {
  id: number | string;
  name: any;
  phone: string;
  email: string;
  location: any;
  description: any;
  logo: string;
}

const renderLocalized = (val: any, preferredLang: string = 'ar'): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return '';
  if (typeof val === 'object') {
    if (val[preferredLang]) return String(val[preferredLang]);
    if (val.ar) return String(val.ar);
    if (val.fr) return String(val.fr);
    if (val.en) return String(val.en);
    const firstVal = Object.values(val)[0];
    if (typeof firstVal === 'string') return firstVal;
    return '';
  }
  return String(val);
};

export default function PartnersManager() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // حالة نافذة تأكيد الحذف
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);

  // حقول نموذج إضافة شركة جديدة
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('تونس');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // استدعاء الشركات المسجلة من localStorage عند التحميل
  useEffect(() => {
    const savedPartners = localStorage.getItem('echox_partners');
    if (savedPartners) {
      try {
        setPartners(JSON.parse(savedPartners));
      } catch {
        setPartners([]);
      }
    } else {
      const defaultPartner: Partner[] = [{
        id: 1,
        name: 'ECHOX Distribution Tunisie',
        phone: '+216 21 511 162',
        email: 'abdelkaderbahri570@gmail.com',
        location: 'أريانة',
        description: 'الموزع الرسمي لقطع وأجهزة ECHOX المعتمدة في تونس والمغرب العربي.',
        logo: ''
      }];
      setPartners(defaultPartner);
      localStorage.setItem('echox_partners', JSON.stringify(defaultPartner));
    }
  }, []);

  // حفظ شركة جديدة
  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      setSuccessMsg('يرجى ملء اسم الشركة ورقم الهاتف على الأقل');
      return;
    }

    const newPartner: Partner = {
      id: Date.now(),
      name,
      phone,
      email,
      location,
      description,
      logo: logoUrl || ''
    };

    const updatedPartners = [newPartner, ...partners];
    setPartners(updatedPartners);
    localStorage.setItem('echox_partners', JSON.stringify(updatedPartners));

    setSuccessMsg('تم إضافة الشركة بنجاح!');
    setTimeout(() => {
      setSuccessMsg('');
      setIsModalOpen(false);
      setName('');
      setPhone('');
      setEmail('');
      setLocation('تونس');
      setDescription('');
      setLogoUrl('');
    }, 800);
  };

  // فتح نافذة تأكيد الحذف بدلاً من الحذف المباشر
  const promptDeletePartner = (partner: Partner) => {
    setPartnerToDelete(partner);
    setDeleteModalOpen(true);
  };

  // تأكيد الحذف النهائي وكسر الاتصال ومسح البيانات من البرنامج
  const confirmFinalDelete = () => {
    if (!partnerToDelete) return;

    const filtered = partners.filter(p => p.id !== partnerToDelete.id);
    setPartners(filtered);
    localStorage.setItem('echox_partners', JSON.stringify(filtered));

    // إغلاق النافذة وتصفية الذاكرة المؤقتة للشركة المحذوفة
    setDeleteModalOpen(false);
    setPartnerToDelete(null);
  };

  return (
    <div className="p-4 sm:p-6 bg-[#0A0A0F] text-white min-h-[500px] rounded-2xl border border-[#F59E0B]/20 shadow-2xl">
      
      {/* رأس القسم وزر الإضافة */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <Building2 className="w-5 h-5 text-[#F59E0B]" />
            <span>الشركات التونسية الشريكة والموزعون</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">إدارة حسابات الشركات والمصانع المسجلة في منصة ECHOX</p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#F59E0B] text-black font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-[#F59E0B]/90 transition shadow-lg shadow-[#F59E0B]/20 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة شركة جديدة</span>
        </button>
      </div>

      {/* قائمة الشركات الحالية */}
      <div className="space-y-4">
        {partners.length === 0 ? (
          <div className="text-center text-xs text-gray-400 py-12 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
            <Building2 className="w-8 h-8 text-gray-500 mx-auto mb-2 opacity-50" />
            <p>لا توجد شركات مسجلة حالياً (تم إفراغ السيرفر).</p>
          </div>
        ) : (
          partners.map((partner) => (
            <div key={partner.id} className="bg-white/[0.03] border border-white/10 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition hover:border-[#F59E0B]/40">
              
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {partner.logo ? (
                    <img src={partner.logo} alt={renderLocalized(partner.name)} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-6 h-6 text-[#F59E0B]" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2 flex-wrap">
                    {renderLocalized(partner.name)}
                    {partner.location && (
                      <span className="text-[10px] bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-0.5 rounded-full border border-[#F59E0B]/20 font-medium">
                        {renderLocalized(partner.location)}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">{renderLocalized(partner.description) || 'لا توجد نبذة تعريفية.'}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mt-3">
                    <span className="flex items-center gap-1 font-mono text-gray-300">
                      <Phone className="w-3 h-3 text-[#F59E0B]" />
                      <span dir="ltr">{partner.phone}</span>
                    </span>
                    <span className="flex items-center gap-1 text-gray-300">
                      <Mail className="w-3 h-3 text-[#F59E0B]" />
                      <span dir="ltr">{partner.email || 'غير متوفر'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* زر الحذف الذي يفتح نافذة التأكيد المنبثقة */}
              <button
                type="button"
                onClick={() => promptDeletePartner(partner)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2.5 rounded-xl transition border border-red-500/20 flex items-center gap-1.5 text-xs shrink-0 self-end md:self-center cursor-pointer"
                title="حذف نهائي"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف نهائي</span>
              </button>

            </div>
          ))
        )}
      </div>

      {/* نافذة تأكيد الحذف النهائية (Confirmation Modal) */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-fadeIn">
          <div className="relative w-full max-w-sm bg-[#0A0A0F] border border-red-500/40 rounded-2xl p-6 shadow-2xl text-center text-white">
            
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold mb-2">تأكيد الحذف النهائي</h3>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              هل أنت متأكد من رغبتك في مسح شركة <span className="text-white font-bold">"{renderLocalized(partnerToDelete?.name)}"</span> نهائياً من البرنامج؟ لن تتمكن من استرجاعها وسيتم تخفيف الحمل عن النظام.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={confirmFinalDelete}
                className="w-full py-2.5 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition shadow-lg shadow-red-500/20 cursor-pointer"
              >
                نعم، احذف نهائياً
              </button>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-white/5 text-gray-300 font-bold text-xs hover:bg-white/10 transition border border-white/10 cursor-pointer"
              >
                إلغاء
              </button>
            </div>

          </div>
        </div>
      )}

      {/* نافذة إضافة شركة جديدة مع الشعار */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#0A0A0F] border border-[#F59E0B]/30 rounded-2xl p-6 shadow-2xl text-white">
            
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#F59E0B]" />
                <span>إضافة شركة أو مصنع جديد</span>
              </h3>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-400 hover:text-white transition cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPartner} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">اسم الشركة أو المصنع</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: شركة تونس للأجهزة" 
                  className="w-full bg-[#111118] border border-white/10 rounded-xl p-3 text-xs text-white focus:border-[#F59E0B] outline-none transition"
                  required 
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">رقم الهاتف (مع الرمز الدولي)</label>
                <input 
                  type="text" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+216 XX XXX XXX" 
                  className="w-full bg-[#111118] border border-white/10 rounded-xl p-3 text-xs text-white focus:border-[#F59E0B] outline-none transition font-mono"
                  dir="ltr"
                  required 
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">البريد الإلكتروني</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="company@email.com" 
                  className="w-full bg-[#111118] border border-white/10 rounded-xl p-3 text-xs text-white focus:border-[#F59E0B] outline-none transition font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">رابط الشعار (Logo URL)</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="url" 
                    value={logoUrl} 
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png" 
                    className="w-full bg-[#111118] border border-white/10 rounded-xl p-3 text-xs text-white focus:border-[#F59E0B] outline-none transition font-mono"
                    dir="ltr"
                  />
                  <ImageIcon className="w-5 h-5 text-[#F59E0B] shrink-0" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">الولاية أو المدينة</label>
                <select 
                  value={location} 
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-[#111118] border border-white/10 rounded-xl p-3 text-xs text-white focus:border-[#F59E0B] outline-none transition cursor-pointer"
                >
                  <option value="تونس">تونس</option>
                  <option value="أريانة">أريانة</option>
                  <option value="بن عروس">بن عروس</option>
                  <option value="منوبة">منوبة</option>
                  <option value="سوسة">سوسة</option>
                  <option value="صفاقس">صفاقس</option>
                  <option value="نابل">نابل</option>
                  <option value="بنزرت">بنزرت</option>
                  <option value="المنستير">المنستير</option>
                  <option value="المهدية">المهدية</option>
                  <option value="القيروان">القيروان</option>
                  <option value="قابس">قابس</option>
                  <option value="مدنين">مدنين</option>
                  <option value="تطاوين">تطاوين</option>
                  <option value="قفصة">قفصة</option>
                  <option value="توزر">توزر</option>
                  <option value="قبلي">قبلي</option>
                  <option value="سيدي بوزيد">سيدي بوزيد</option>
                  <option value="القصرين">القصرين</option>
                  <option value="الكاف">الكاف</option>
                  <option value="سليانة">سليانة</option>
                  <option value="باجة">باجة</option>
                  <option value="جندوبة">جندوبة</option>
                  <option value="زغوان">زغوان</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">نبذة عن الشركة</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اختصاص الشركة ومجال عملها..." 
                  rows={2}
                  className="w-full bg-[#111118] border border-white/10 rounded-xl p-3 text-xs text-white focus:border-[#F59E0B] outline-none resize-none transition"
                ></textarea>
              </div>

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#F59E0B] text-black font-bold text-xs hover:bg-[#F59E0B]/90 transition shadow-lg shadow-[#F59E0B]/20 cursor-pointer"
                >
                  حفظ الشركة
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-3 rounded-xl bg-white/5 text-gray-300 font-bold text-xs hover:bg-white/10 transition border border-white/10 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
