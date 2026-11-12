import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  User, 
  MapPin, 
  Package, 
  Heart, 
  Plus, 
  Check, 
  LogOut, 
  ShoppingBag, 
  Trash2, 
  Phone,
  Mail,
  Shield
} from 'lucide-react';
import { TUNISIAN_GOVERNORATES, getGovernorateName } from '../data/governorates';
import { getPaymentStatusTone } from '../lib/payments';

export const CustomerPortal: React.FC = () => {
  const { 
    currentUser, 
    loginCustomer, 
    logoutCustomer, 
    addCustomerAddress, 
    setDefaultAddress,
    orders, 
    products, 
    wishlist, 
    toggleWishlist, 
    addToCart, 
    setSelectedProductId, 
    setCurrentView,
    language, 
    t 
  } = useStore();

  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'wishlist'>('orders');

  // New Address Form state
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGovernorate, setNewGovernorate] = useState(TUNISIAN_GOVERNORATES[0].id);
  const [newCity, setNewCity] = useState('');
  const [newPostalCode, setNewPostalCode] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim()) return;
    loginCustomer(authEmail.trim(), authName.trim() || 'حريف تونسي', authPhone.trim() || '+216 21 000 000');
  };

  const handleAddAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newPhone || !newCity || !newStreet) return;

    addCustomerAddress({
      fullName: newFullName,
      phone: newPhone,
      governorate: newGovernorate,
      city: newCity,
      postalCode: newPostalCode || '1000',
      street: newStreet,
      notes: newNotes,
      isDefault: false
    });

    setShowAddAddress(false);
    setNewFullName('');
    setNewPhone('');
    setNewCity('');
    setNewStreet('');
    setNewNotes('');
  };

  // If customer is not logged in, show quick sign-in / registration
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 animate-fadeIn">
        <div className="bg-white rounded-3xl border border-[#E8E4DD] shadow-lg p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center mx-auto">
              <User className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black text-slate-900">تسجيل الدخول / فتح حساب زبون</h1>
            <p className="text-xs text-slate-500">
              تابع طلبياتك واحفظ عناوين التوصيل في الـ 24 ولاية تونسية وقائمة المفضلة
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                placeholder="votre.email@gmail.com"
                className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6B00]"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل</label>
              <input
                type="text"
                required
                value={authName}
                onChange={e => setAuthName(e.target.value)}
                placeholder="الاسم واللقب"
                className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف التونسي</label>
              <input
                type="tel"
                required
                value={authPhone}
                onChange={e => setAuthPhone(e.target.value)}
                placeholder="+216 21 000 000"
                className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6B00]"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#0B0F17] hover:bg-[#FF6B00] text-white font-bold text-xs transition-colors shadow-sm"
            >
              متابعة الدخول للمتجر
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Logged-in Customer Dashboard
  const customerOrders = orders.filter(o => o.customerPhone === currentUser.phone || o.customerName === currentUser.fullName || o.customerId === currentUser.id);
  const wishlistedProducts = products.filter(p => wishlist.includes(p.id));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn">
      
      {/* Profile Banner */}
      <div className="bg-white rounded-3xl border border-[#E8E4DD] shadow-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0B0F17] text-white flex items-center justify-center font-black text-xl shadow-xs">
            {currentUser.fullName.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">{currentUser.fullName}</h1>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                <span dir="ltr">{currentUser.email}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                <span dir="ltr">{currentUser.phone}</span>
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={logoutCustomer}
          className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-600 text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>تسجيل الخروج</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'orders' ? 'bg-[#0B0F17] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>سجل الطلبات ({customerOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('addresses')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'addresses' ? 'bg-[#0B0F17] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>العناوين التونسية ({currentUser.addresses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('wishlist')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'wishlist' ? 'bg-[#0B0F17] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>المفضلة ({wishlistedProducts.length})</span>
        </button>
      </div>

      {/* Tab 1: Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {customerOrders.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500">
              لا توجد طلبات مسجلة بعد. تصفح المتجر واطلب الآن مع الدفع عند الاستلام!
            </div>
          ) : (
            customerOrders.map(order => (
              <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs text-slate-400 block">رقم التتبع:</span>
                    <span className="font-mono font-bold text-sm text-[#FF6B00]">{order.trackingNumber}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${getPaymentStatusTone(order.paymentStatus)}`}>
                      {(t.payments.statuses as Record<string, string>)[order.paymentStatus] || order.paymentStatus}
                    </span>
                    <span className="text-xs bg-slate-100 px-3 py-1 rounded-full font-bold text-slate-800">
                      {t.orderStatus[order.status] || order.status}
                    </span>
                    <button
                      onClick={() => setCurrentView('my_orders')}
                      className="text-xs text-[#FF6B00] hover:underline font-bold"
                    >
                      تتبع مباشر
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>{order.items.length} منتجات · {getGovernorateName(order.shippingAddress.governorate, language)}</span>
                  <span className="text-sm font-black text-slate-900 tabular-nums">
                    {order.totalAmount.toFixed(3)} {t.cart.currency}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Addresses */}
      {activeTab === 'addresses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-900">عناوين التوصيل في ولايات تونس</h2>
            <button
              onClick={() => setShowAddAddress(!showAddAddress)}
              className="px-3.5 py-1.5 rounded-xl bg-[#FF6B00] text-white text-xs font-bold flex items-center gap-1 shadow-xs hover:bg-[#e05e00]"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عنوان جديد</span>
            </button>
          </div>

          {/* Add Address Form */}
          {showAddAddress && (
            <form onSubmit={handleAddAddressSubmit} className="bg-white p-5 rounded-2xl border border-[#E8E4DD] space-y-3">
              <h3 className="text-xs font-bold text-slate-800">بيانات العنوان الجديد</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="الاسم الكامل للمستلم"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
                />
                <input
                  type="tel"
                  required
                  placeholder="رقم الهاتف"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={newGovernorate}
                  onChange={e => setNewGovernorate(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white"
                >
                  {TUNISIAN_GOVERNORATES.map(gov => (
                    <option key={gov.id} value={gov.id}>
                      {gov.nameAr}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  placeholder="المدينة / المعتمدية"
                  value={newCity}
                  onChange={e => setNewCity(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
                />
                <input
                  type="text"
                  placeholder="الترقيم البريدي"
                  value={newPostalCode}
                  onChange={e => setNewPostalCode(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
                />
              </div>

              <input
                type="text"
                required
                placeholder="النهج، الشارع، ورقم البناية"
                value={newStreet}
                onChange={e => setNewStreet(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAddress(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0B0F17] hover:bg-[#FF6B00] text-white text-xs font-bold rounded-xl"
                >
                  حفظ العنوان
                </button>
              </div>
            </form>
          )}

          {/* Addresses Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentUser.addresses.map(addr => (
              <div 
                key={addr.id} 
                className={`p-4 rounded-2xl border-2 bg-white space-y-2 transition-all ${
                  addr.isDefault ? 'border-[#FF6B00] shadow-xs' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{addr.fullName}</span>
                  {addr.isDefault ? (
                    <span className="text-[10px] bg-[#FF6B00]/10 text-[#FF6B00] font-black px-2 py-0.5 rounded-full">
                      العنوان الافتراضي ✓
                    </span>
                  ) : (
                    <button
                      onClick={() => setDefaultAddress(addr.id)}
                      className="text-[11px] text-slate-500 hover:text-[#FF6B00]"
                    >
                      تعيين كافتراضي
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  {getGovernorateName(addr.governorate, language)} · {addr.city} ({addr.postalCode})
                </p>
                <p className="text-xs text-slate-500">{addr.street}</p>
                <p className="text-xs font-mono text-slate-700">{addr.phone}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Wishlist */}
      {activeTab === 'wishlist' && (
        <div className="space-y-4">
          {wishlistedProducts.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500">
              قائمة المفضلة فارغة حالياً. يمكنك النقر على أيقونة القلب لأي منتج لحفظه هنا!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {wishlistedProducts.map(prod => (
                <div key={prod.id} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
                  <div className="flex gap-3">
                    <img 
                      src={prod.images[0]} 
                      alt={prod.name[language]} 
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0" 
                    />
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{prod.name[language]}</h4>
                      <p className="text-xs font-black text-[#FF6B00] tabular-nums mt-1">{prod.price.toFixed(3)} {t.cart.currency}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => addToCart(prod, 1)}
                      className="flex-1 py-2 bg-slate-900 hover:bg-[#FF6B00] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{t.product.addToCart}</span>
                    </button>
                    <button
                      onClick={() => toggleWishlist(prod.id)}
                      className="p-2 border border-slate-200 hover:text-red-600 rounded-xl"
                      title="إزالة من المفضلة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
