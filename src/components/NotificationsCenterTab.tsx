import React, { useEffect, useState } from 'react';
import {
  BellRing,
  BellOff,
  ShieldAlert,
  ShoppingBag,
  Activity,
  MessageCircle,
  CheckCheck,
  Trash2,
  Send,
  Smartphone,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
} from 'lucide-react';
import {
  AdminNotificationDevice,
  AdminNotificationEvent,
  clearAdminNotificationsClient,
  getExistingPushSubscription,
  getNotificationPermissionState,
  getSavedAdminEndpoint,
  isIosDevice,
  isStandalonePWA,
  markAdminNotificationsReadClient,
  NotificationSettings,
  sendTestAdminPushClient,
  subscribeAdminPushClient,
  unsubscribeAdminPushClient,
  updateAdminNotificationSettings,
} from '../lib/notifications';

interface NotificationsCenterTabProps {
  vapidPublicKey: string;
  unreadCount: number;
  events: AdminNotificationEvent[];
  subscriptionsCount: number;
  subscriptions: AdminNotificationDevice[];
  settings: NotificationSettings;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onEventsUpdated: (updater: {
    events?: AdminNotificationEvent[];
    unreadCount?: number;
    settings?: NotificationSettings;
    subscriptionsCount?: number;
  }) => void;
}

type FeedFilter = 'all' | 'security' | 'orders_payments' | 'activity' | 'support';

export const NotificationsCenterTab: React.FC<NotificationsCenterTabProps> = ({
  vapidPublicKey,
  unreadCount,
  events,
  subscriptionsCount,
  subscriptions,
  settings,
  loading,
  onRefresh,
  onEventsUpdated,
}) => {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [deviceSubscribed, setDeviceSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [savingSettingsKey, setSavingSettingsKey] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    void getExistingPushSubscription().then((sub) => {
      if (!active) return;
      const perm = getNotificationPermissionState();
      setDeviceSubscribed(Boolean(sub && getSavedAdminEndpoint() && perm === 'granted'));
    });
    return () => {
      active = false;
    };
  }, [subscriptionsCount]);

  const handleEnableOrDisableDevicePush = async () => {
    setPushBusy(true);
    setFeedback(null);
    if (deviceSubscribed) {
      await unsubscribeAdminPushClient();
      setDeviceSubscribed(false);
      setFeedback({ type: 'info', text: 'تم إيقاف إشعارات مركز التحكم على هذا الهاتف.' });
      await onRefresh();
    } else {
      const res = await subscribeAdminPushClient(vapidPublicKey);
      if (res.ok) {
        setDeviceSubscribed(true);
        setFeedback({
          type: 'success',
          text: 'تم ربط هاتفك بإشعارات مركز التحكم بنجاح ✓ ستصلك تنبيهات الطلبات والاختراق والتعديلات فوراً.',
        });
        await onRefresh();
      } else {
        setFeedback({
          type: 'error',
          text: res.error || 'تعذر تفعيل إشعارات الهاتف على هذا المتصفح.',
        });
      }
    }
    setPushBusy(false);
  };

  const handleSendTestPush = async () => {
    setTestBusy(true);
    setFeedback(null);
    const res = await sendTestAdminPushClient();
    await onRefresh();
    if (!res.ok) {
      setFeedback({ type: 'error', text: res.error || 'فشل إرسال الإشعار التجريبي.' });
    } else if (res.total === 0) {
      setFeedback({
        type: 'info',
        text: 'تمت إضافة التنبيه التجريبي إلى السجل. قم بتفعيل "إشعارات الهاتف" أعلاه ليصل الإشعار لشاشة هاتفك.',
      });
    } else if (res.sent > 0) {
      setFeedback({
        type: 'success',
        text: `تم إرسال إشعار تجريبي فوري إلى ${res.sent} جهاز متصل بنجاح ✓`,
      });
    } else {
      setFeedback({
        type: 'error',
        text: 'تعذر توصيل الإشعار عبر شبكة الدفع (Web Push). أعد تفعيل الاشتراك على الهاتف ثم جرّب مجدداً.',
      });
    }
    setTestBusy(false);
  };

  const handleToggleSetting = async (key: keyof NotificationSettings) => {
    setSavingSettingsKey(key);
    const nextValue = !settings[key];
    const optimistic = { ...settings, [key]: nextValue };
    onEventsUpdated({ settings: optimistic });
    const res = await updateAdminNotificationSettings({ [key]: nextValue });
    if (res.ok && res.settings) {
      onEventsUpdated({ settings: res.settings });
    } else {
      onEventsUpdated({ settings });
      setFeedback({ type: 'error', text: 'تعذر حفظ تفضيل الإشعارات.' });
    }
    setSavingSettingsKey(null);
  };

  const handleMarkAllRead = async () => {
    const res = await markAdminNotificationsReadClient();
    if (res.ok) {
      onEventsUpdated({
        events: events.map((ev) => ({ ...ev, read: true })),
        unreadCount: 0,
      });
    }
  };

  const handleMarkOneRead = async (id: string) => {
    const target = events.find((e) => e.id === id);
    if (!target || target.read) return;
    const res = await markAdminNotificationsReadClient([id]);
    if (res.ok) {
      onEventsUpdated({
        events: events.map((ev) => (ev.id === id ? { ...ev, read: true } : ev)),
        unreadCount: res.unreadCount ?? Math.max(0, unreadCount - 1),
      });
    }
  };

  const handleClearLog = async () => {
    const res = await clearAdminNotificationsClient();
    setConfirmClear(false);
    if (res.ok) {
      onEventsUpdated({ events: [], unreadCount: 0 });
      setFeedback({ type: 'info', text: 'تم مسح سجل إشعارات مركز التحكم.' });
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (filter === 'all') return true;
    if (filter === 'security') return ev.category === 'security';
    if (filter === 'orders_payments') return ev.category === 'order' || ev.category === 'payment';
    if (filter === 'activity') return ev.category === 'activity';
    if (filter === 'support') return ev.category === 'support';
    return true;
  });

  const permState = getNotificationPermissionState();
  const iosNeedsHomeScreen = isIosDevice() && !isStandalonePWA();

  const toggleItems: Array<{
    key: keyof NotificationSettings;
    title: string;
    desc: string;
    icon: React.ReactNode;
  }> = [
    {
      key: 'notifySecurity',
      title: 'تنبيهات الأمن ومحاولات الاختراق',
      desc: 'إشعار فوري عند إدخال رمز أو PIN خاطئ، حظر الحماية، تلاعب الأسعار، أو ملفات SVG مشبوهة.',
      icon: <ShieldAlert className="w-4 h-4 text-red-500" />,
    },
    {
      key: 'notifyOrders',
      title: 'الطلبات الجديدة والمدفوعات',
      desc: 'إشعار لكل طلب جديد، إثبات تحويل بنكي، تأكيد دفع إلكتروني، أو طلب استرجاع.',
      icon: <ShoppingBag className="w-4 h-4 text-emerald-500" />,
    },
    {
      key: 'notifyActivity',
      title: 'نشاط وإضافات مركز التحكم',
      desc: 'إشعار عند إضافة أو تعديل منتج، قسم، بانر، إعدادات الدفع، أو تقييم منتج جديد.',
      icon: <Activity className="w-4 h-4 text-[#FF6B00]" />,
    },
    {
      key: 'notifySupport',
      title: 'رسائل الدعم المباشر والاستفسارات',
      desc: 'إشعار فوري عند إرسال زبون رسالة في شات الدعم أو استفسار من صفحة اتصل بنا.',
      icon: <MessageCircle className="w-4 h-4 text-blue-500" />,
    },
    {
      key: 'notifyStorefrontVisitors',
      title: 'تنبيه زوار المتجر بالمنتجات والعروض',
      desc: 'إرسال إشعار تلقائي للزوار المشتركين في إشعارات الموقع عند نشر منتج أو عرض جديد.',
      icon: <Sparkles className="w-4 h-4 text-purple-500" />,
    },
  ];

  const getCategoryBadge = (category: AdminNotificationEvent['category']) => {
    switch (category) {
      case 'security':
        return { label: 'أمن واختراق', cls: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30' };
      case 'order':
        return { label: 'طلب جديد', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
      case 'payment':
        return { label: 'مدفوعات', cls: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' };
      case 'support':
        return { label: 'دعم واستفسار', cls: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' };
      default:
        return { label: 'مركز التحكم', cls: 'bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/30' };
    }
  };

  const getSeverityStyle = (severity: AdminNotificationEvent['severity']) => {
    if (severity === 'critical') {
      return {
        border: 'border-red-300 dark:border-red-500/40 bg-red-50/70 dark:bg-red-950/20',
        icon: <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />,
      };
    }
    if (severity === 'warning') {
      return {
        border: 'border-amber-300 dark:border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20',
        icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />,
      };
    }
    if (severity === 'success') {
      return {
        border: 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/15',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      };
    }
    return {
      border: 'border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-[#0F172A]',
      icon: <Info className="w-4 h-4 text-blue-500 shrink-0" />,
    };
  };

  return (
    <div className="space-y-4">
      {/* Card 1: Mobile Web Push Activation for Owner Control Room */}
      <div className="bg-[#0B0F17] text-white rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-8 h-8 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center">
                <BellRing className="w-4 h-4" />
              </span>
              <h3 className="text-sm sm:text-base font-black">إشعارات الهاتف الفورية لمركز التحكم (Web Push)</h3>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  deviceSubscribed
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {deviceSubscribed ? 'مفعّل على هذا الهاتف ✓' : 'غير مفعّل على هذا الجهاز'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              فعّل الإشعارات ليصلك تنبيه فوري على شاشة الهاتف لأي طلب جديد، أي محاولة اختراق أو رمز خاطئ، وأي إضافة أو تعديل داخل مركز التحكم حتى عند إغلاق المتصفح.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={pushBusy}
              onClick={handleEnableOrDisableDevicePush}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60 active:scale-95 ${
                deviceSubscribed
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-[#FF6B00] hover:bg-[#E05E00] text-white shadow-md'
              }`}
            >
              {deviceSubscribed ? <BellOff className="w-4 h-4" /> : <BellRing className="w-4 h-4" />}
              <span>
                {pushBusy
                  ? 'جاري المعالجة...'
                  : deviceSubscribed
                  ? 'إشعارات الهاتف مفعّلة (إيقاف)'
                  : 'تفعيل إشعارات مركز التحكم على الهاتف'}
              </span>
            </button>

            <button
              type="button"
              disabled={testBusy}
              onClick={handleSendTestPush}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span>{testBusy ? 'جاري الإرسال...' : 'إرسال إشعار تجريبي'}</span>
            </button>
          </div>
        </div>

        {iosNeedsHomeScreen && (
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
            <strong>ملاحظة لمستخدمي iPhone / iPad:</strong> نظام Apple iOS يتطلب تثبيت الموقع على الشاشة الرئيسية عبر متصفح Safari (اضغط زر <strong>مشاركة</strong> ← <strong>إضافة إلى الشاشة الرئيسية</strong>) ثم فتح التطبيق وتفعيل الإشعارات من هنا.
          </div>
        )}

        {permState === 'denied' && (
          <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 leading-relaxed">
            إذن الإشعارات محظور حالياً في متصفح هذا الهاتف. افتح إعدادات الموقع (أيقونة القفل بجانب رابط المتجر) واسمح بالإشعارات ثم اضغط زر التفعيل مجدداً.
          </div>
        )}

        {feedback && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold border ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : feedback.type === 'error'
                ? 'bg-red-500/15 border-red-500/30 text-red-300'
                : 'bg-blue-500/15 border-blue-500/30 text-blue-300'
            }`}
          >
            {feedback.text}
          </div>
        )}

        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5 text-[#FF6B00]" />
            <span>الأجهزة المربوطة بإشعارات مركز التحكم: <strong className="text-white font-mono">{subscriptionsCount}</strong></span>
          </div>
          {subscriptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {subscriptions.slice(0, 4).map((d) => (
                <span key={d.id} className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">
                  {d.deviceLabel}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Card 2: Category Switches */}
      <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl p-4 sm:p-6 border border-[#E2E8F0] dark:border-slate-800 space-y-3">
        <h4 className="text-xs sm:text-sm font-black text-[#0F172A] dark:text-white">
          تخصيص أنواع التنبيهات المرسلة لهاتفك
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {toggleItems.map((item) => {
            const enabled = Boolean(settings[item.key]);
            return (
              <button
                key={item.key}
                type="button"
                disabled={savingSettingsKey === item.key}
                onClick={() => handleToggleSetting(item.key)}
                className={`p-3 rounded-2xl border text-start flex items-start justify-between gap-3 transition-all cursor-pointer ${
                  enabled
                    ? 'bg-white dark:bg-[#0F172A] border-[#FF6B00]/40'
                    : 'bg-slate-100/70 dark:bg-slate-900/50 border-[#E2E8F0] dark:border-slate-800 opacity-75'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">{item.icon}</div>
                  <div>
                    <div className="text-xs font-black text-[#0F172A] dark:text-white">{item.title}</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{item.desc}</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 ${
                    enabled
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {enabled ? 'مفعّل' : 'متوقف'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Card 3: Live Control Room Feed */}
      <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl p-4 sm:p-6 border border-[#E2E8F0] dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-black text-[#0F172A] dark:text-white">
              سجل تنبيهات مركز التحكم المباشر
            </h4>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#FF6B00] text-white text-[10px] font-black font-mono">
                {unreadCount} غير مقروء
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:border-[#FF6B00]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FF6B00]' : ''}`} />
              <span>تحديث</span>
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>تحديد الكل كمقروء</span>
              </button>
            )}

            {events.length > 0 && (
              confirmClear ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleClearLog}
                    className="px-2.5 py-1.5 rounded-xl bg-red-600 text-white text-[11px] font-bold cursor-pointer"
                  >
                    تأكيد المسح
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-[11px] font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>مسح السجل</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: `الكل (${events.length})` },
            { id: 'security', label: 'اختراق وأمن' },
            { id: 'orders_payments', label: 'طلبات ومدفوعات' },
            { id: 'activity', label: 'نشاط مركز التحكم' },
            { id: 'support', label: 'دعم واستفسارات' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id as FeedFilter)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
                filter === f.id
                  ? 'bg-[#FF6B00] text-white'
                  : 'bg-white dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Feed Items */}
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#0F172A] border border-dashed border-[#E2E8F0] dark:border-slate-700 space-y-2">
            <BellRing className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              لا توجد تنبيهات مسجلة في هذا التصنيف حالياً.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-0.5">
            {filteredEvents.map((ev) => {
              const catBadge = getCategoryBadge(ev.category);
              const sevStyle = getSeverityStyle(ev.severity);
              return (
                <div
                  key={ev.id}
                  onClick={() => void handleMarkOneRead(ev.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${sevStyle.border} ${
                    !ev.read ? 'ring-1 ring-[#FF6B00]/50' : 'opacity-85'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">{sevStyle.icon}</div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catBadge.cls}`}>
                            {catBadge.label}
                          </span>
                          {!ev.read && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FF6B00] text-white">
                              جديد
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(ev.createdAt).toLocaleString('ar-TN')}
                          </span>
                        </div>
                        <h5 className="text-xs sm:text-sm font-black text-[#0F172A] dark:text-white leading-snug">
                          {ev.title}
                        </h5>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {ev.body}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
