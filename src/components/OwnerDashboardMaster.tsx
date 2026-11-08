import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Phone, 
  MapPin, 
  Image as ImageIcon, 
  CheckCircle, 
  X, 
  AlertTriangle, 
  Package, 
  Sparkles
} from 'lucide-react';

export interface MasterPartner {
  id: number;
  name: string;
  phone: string;
  email?: string;
  location?: string;
  description?: string;
  logo?: string;
}

export interface MasterProduct {
  id: number;
  name: string;
  price: string;
  stock: string;
  status: string;
  image?: string;
}

interface DeleteTarget {
  type: 'partner' | 'product';
  item: {
    id: number;
    name: string;
    [key: string]: any;
  };
}

export default function OwnerDashboardMaster() {
  const [activeTab, setActiveTab] = useState<'partners' | 'products'>('partners');
  
  // بيانات الشركات والمنتجات
  const [partners, setPartners] = useState<MasterPartner[]>([]);
  const [products, setProducts] = useState<MasterProduct[]>([]);

  // حالات النوافذ المنبثقة لإضافة العناصر
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // حالات نافذة التأكيد بالحذف النهائي (الشاملة لأي عنصر)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DeleteTarget | null>(null);

  // حقول نموذج إضافة شركة
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerLocation, setPartnerLocation] = useState('تونس');
  const [partnerDesc, setPartnerDesc] = useState('');
  const [partnerLogo, setPartnerLogo] = useState('');

  // حقول نموذج إضافة منتج
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodImage, setProdImage] = useState('');

  const [successMsg, setSuccessMsg] = useState('');

  // استدعاء البيانات المحفوظة محلياً عند الإقلاع
  useEffect(() => {
    const savedPartners = localStorage.getItem('echox_partners');
    if (savedPartners) {
      try { 
        setPartners(JSON.parse(savedPartners)); 
      } catch { 
        setPartners([]); 
      }
    } else {
      const defaultPartner: MasterPartner[] = [{
        id: 1,
        name: 'ECHOX Distribution Tunisie',
        phone: '+216 21 511 162',
        email: 'abdelkaderbahri570@gmail.com',
        location: 'أريانة',
        description: 'الموزع الرسمي لقطع وأجهزة ECHOX المعتمدة.',
        logo: ''
      }];
      setPartners(defaultPartner);
      localStorage.setItem('echox_partners', JSON.stringify(defaultPartner));
    }

    const savedProducts = localStorage.getItem('echox_products');
    if (savedProducts) {
      try { 
        setProducts(JSON.parse(savedProducts)); 
      } catch { 
        setProducts([]); 
      }
    } else {
      const defaultProducts: MasterProduct[] = [
        { id: 101, name: 'قطع غيار ميكانيكية أصلية', price: '345.000', stock: '14 قطع', status: 'معروض' },
        { id: 102, name: 'جهاز تشخيص الأعطال الذكي', price: '680.000', stock: '6 قطع', status: 'معروض' }
      ];
      setProducts(defaultProducts);
      localStorage.setItem('echox_products', JSON.stringify(defaultProducts));
    }
  }, []);

  // إضافة شركة جديدة
  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName || !partnerPhone) {
      alert('يرجى ملء الحقول الأساسية (اسم الشركة ورقم الهاتف)');
      return;
    }

    const newP: MasterPartner = {
      id: Date.now(),
      name: partnerName,
      phone: partnerPhone,
      email: partnerEmail,
      location: partnerLocation,
      description: partnerDesc,
      logo: partnerLogo
    };

    const updated = [newP, ...partners];
    setPartners(updated);
    localStorage.setItem('echox_partners', JSON.stringify(updated));

    setSuccessMsg('تمت إضافة الشركة بنجاح');
    setTimeout(() => {
      setSuccessMsg('');
      setIsPartnerModalOpen(false);
      setPartnerName(''); 
      setPartnerPhone(''); 
      setPartnerEmail(''); 
      setPartnerDesc(''); 
      setPartnerLogo('');
    }, 800);
  };

  // إضافة منتج جديد
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodPrice) {
      alert('يرجى ملء اسم المنتج والسعر');
      return;
    }

    const newPr: MasterProduct = {
      id: Date.now(),
      name: prodName,
      price: prodPrice,
      stock: prodStock || '10 قطع',
      status: 'معروض',
      image: prodImage
    };

    const updated = [newPr, ...products];
    setProducts(updated);
    localStorage.setItem('echox_products', JSON.stringify(updated));

    setSuccessMsg('تمت إضافة المنتج بنجاح');
    setTimeout(() => {
      setSuccessMsg('');
      setIsProductModalOpen(false);
      setProdName(''); 
      setProdPrice(''); 
      setProdStock(''); 
      setProdImage('');
    }, 800);
  };

  // فتح نافذة التأكيد للحذف النهائي لأي عنصر
  const promptDelete = (type: 'partner' | 'product', item: any) => {
    setItemToDelete({ type, item });
    setDeleteModalOpen(true);
  };

  // تنفيذ الحذف النهائي والمسح الشامل من البرنامج
  const confirmFinalDelete = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'partner') {
      const filtered = partners.filter(p => p.id !== itemToDelete.item.id);
      setPartners(filtered);
      localStorage.setItem('echox_partners', JSON.stringify(filtered));
    } else if (itemToDelete.type === 'product') {
      const filtered = products.filter(pr => pr.id !== itemToDelete.item.id);
      setProducts(filtered);
      localStorage.setItem('echox_products', JSON.stringify(filtered));
    }

    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  return (
    <div className="p-4 sm:p-6 bg-[#0A0A0F] text-white min-h-screen rounded-2xl border border-[#F59E0B]/20 shadow-2xl">
      
      {/* التنقل بين الأقسام وأزرار الإضافة */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('partners')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'partners' 
                ? 'bg-[#F59E0B] text-black shadow-lg shadow-[#F59E0B]/20' 
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>الشركات الشريكة ({partners.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'products' 
                ? 'bg-[#F59E0B] text-black shadow-lg shadow-[#F59E0B]/20' 
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>إدارة المنتجات ({products.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => activeTab === 'partners' ? setIsPartnerModalOpen(true) : setIsProductModalOpen(true)}
          className="flex items-center gap-2 bg-[#F59E0B] text-black font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-[#F59E0B]/90 transition shadow-lg shadow-[#F59E0B]/20 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{activeTab === 'partners' ? 'إضافة شركة جديدة' : 'إضافة منتج جديد'}</span>
        </button>
      </div>

      {/* قسم الشركات الشريكة */}
      {activeTab === 'partners' && (
        <div className="space-y-4">
          {partners.length === 0 ? (
            <div className="text-center text-xs text-gray-400 py-12 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
              <Building2 className="w-8 h-8 text-gray-500 mx-auto mb-2 opacity-50" />
              <p>لا توجد شركات مسجلة (تم تفريغ النظام).</p>
            </div>
          ) : (
            partners.map((partner) => (
              <div 
                key={partner.id} 
                className="bg-white/[0.03] border border-white/10 p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-4 transition hover:border-[#F59E0B]/40"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {partner.logo ? (
                      <img src={partner.logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-6 h-6 text-[#F59E0B]" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      {partner.name}
                      {partner.location && (
                        <span className="text-[10px] bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-0.5 rounded-full border border-[#F59E0B]/20">
                          {partner.location}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      <span className="font-mono" dir="ltr">{partner.phone}</span>
                      {partner.email && (
                        <>
                          <span>•</span>
                          <span dir="ltr">{partner.email}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* زر الحذف النهائي */}
                <button
                  type="button"
                  onClick={() => promptDelete('partner', partner)}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2.5 rounded-xl transition border border-red-500/20 cursor-pointer shrink-0"
                  title="حذف نهائي"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* قسم إدارة المنتجات */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {products.length === 0 ? (
            <div className="text-center text-xs text-gray-400 py-12 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
              <Package className="w-8 h-8 text-gray-500 mx-auto mb-2 opacity-50" />
              <p>لا توجد منتجات مسجلة.</p>
            </div>
          ) : (
            products.map((product) => (
              <div 
                key={product.id} 
                className="bg-white/[0.03] border border-white/10 p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-4 transition hover:border-[#F59E0B]/40"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-[#F59E0B]" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{product.name}</h3>
                    <p className="text-xs text-[#F59E0B] font-bold mt-1">
                      {product.price} د.ت <span className="text-gray-400 font-normal">| المخزون: {product.stock}</span>
                    </p>
                  </div>
                </div>

                {/* زر الحذف النهائي */}
                <button
                  type="button"
                  onClick={() => promptDelete('product', product)}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2.5 rounded-xl transition border border-red-500/20 cursor-pointer shrink-0"
                  title="حذف نهائي"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* نافذة التأكيد المنبثقة الموحدة (للحذف النهائي الشامل) */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-fadeIn">
          <div className="relative w-full max-w-sm bg-[#0A0A0F] border border-red-500/40 rounded-2xl p-6 shadow-2xl text-center text-white">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold mb-2">تأكيد الحذف النهائي</h3>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              هل أنت متأكد من رغبتك في مسح العنصر <span className="text-white font-bold">"{itemToDelete?.item?.name}"</span> نهائياً من البرنامج؟ سيتم إزالته تماماً لتخفيف الحمل عن السيرفر.
            </p>
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={confirmFinalDelete} 
                className="w-full py-2.5 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition cursor-pointer shadow-lg shadow-red-500/20"
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

      {/* نافذة إضافة شركة جديدة */}
      {isPartnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#0A0A0F] border border-[#F59E0B]/30 rounded-2xl p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#F59E0B]" />
                <span>إضافة شركة أو مصنع</span>
              </h3>
              <button 
                type="button"
                onClick={() => setIsPartnerModalOpen(false)} 
                className="text-gray-400 hover:text-white p-1 rounded-lg bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddPartner} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">اسم الشركة أو المصنع</label>
                <input 
                  type="text" 
                  value={partnerName} 
                  onChange={(e) => setPartnerName(e.target.value)} 
                  placeholder="اسم الشركة" 
                  className="w-full bg-[#111118] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-[#F59E0B] transition" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">رقم الهاتف</label>
                <input 
                  type="text" 
                  value={partnerPhone} 
                  onChange={(e) => setPartnerPhone(e.target.value)} 
                  placeholder="+216 XX XXX XXX" 
                  className="w-full bg-[#111118] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-[#F59E0B] transition font-mono" 
                  dir="ltr"
                  required 
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">البريد الإلكتروني (اختياري)</label>
                <input 
                  type="email" 
                  value={partnerEmail} 
                  onChange={(e) => setPartnerEmail(e.target.value)} 
                  placeholder="company@domain.tn" 
                  className="w-full bg-[#111118] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-[#F59E0B] transition font-mono" 
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">الولاية أو المدينة</label>
                <input 
                  type="text" 
                  value={partnerLocation} 
                  onChange={(e) => setPartnerLocation(e.target.value)} 
                  placeholder="المدينة / الولاية" 
                  className="w-full bg-[#111118] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-[#F59E0B] transition" 
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">رابط الشعار (Logo URL)</label>
                <input 
                  type="url" 
                  value={partnerLogo} 
                  onChange={(e) => setPartnerLogo(e.target.value)} 
                  placeholder="https://example.com/logo.png" 
                  className="w-full bg-[#111118] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-[#F59E0B] transition font-mono" 
                  dir="ltr"
                />
              </div>
              {successMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>{successMsg}</span>
                </div>
              )}
              <button 
                type="submit" 
                className="w-full py-3 rounded-xl bg-[#F59E0B] text-black font-bold text-xs hover:bg-[#F59E0B]/90 transition shadow-lg shadow-[#F59E0B]/20 cursor-pointer mt-2"
              >
                حفظ الشركة
              </button>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إضافة منتج جديد */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#0A0A0F] border border-[#F59E0B]/30 rounded-2xl p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-[#F59E0B]" />
                <span>إضافة منتج جديد</span>
              </h3>
              <button 
                type="button"
                onClick={() => setIsProductModalOpen(false)} 
                className="text-gray-400 hover:text-white p-1 rounded-lg bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">اسم المنتج</label>
                <input 
                  type="text" 
                  value={prodName} 
                  onChange={(e) => setProdName(e.target.value)} 
                  placeholder="اسم المنتج" 
                  className="w-full bg-[#111118] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-[#F59E0B] transition" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">السعر (د.ت)</label>
                <input 
                  type="text" 
                  value={prodPrice} 
                  onChange={(e) => setProdPrice(e.target.value)} 
                  placeholder="السعر (د.ت)" 
                  className="w-full bg-[#111118] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-[#F59E0B] transition font-mono" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">المخزون المتوفر</label>
                <input 
                  type="text" 
                  value={prodStock} 
                  onChange={(e) => setProdStock(e.target.value)} 
                  placeholder="المخزون (مثال: 10 قطع)" 
                  className="w-full bg-[#111118] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-[#F59E0B] transition" 
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">رابط صورة المنتج (اختياري)</label>
                <input 
                  type="url" 
                  value={prodImage} 
                  onChange={(e) => setProdImage(e.target.value)} 
                  placeholder="https://example.com/product.jpg" 
                  className="w-full bg-[#111118] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-[#F59E0B] transition font-mono" 
                  dir="ltr"
                />
              </div>
              {successMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>{successMsg}</span>
                </div>
              )}
              <button 
                type="submit" 
                className="w-full py-3 rounded-xl bg-[#F59E0B] text-black font-bold text-xs hover:bg-[#F59E0B]/90 transition shadow-lg shadow-[#F59E0B]/20 cursor-pointer mt-2"
              >
                حفظ المنتج
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
