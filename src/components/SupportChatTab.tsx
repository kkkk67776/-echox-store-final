import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import type { CustomChatRule, SupportChatConfig, SupportChatThread } from '../types';
import {
  DEFAULT_CHAT_CONFIG,
  deleteAdminChatThreadServer,
  fetchAdminChatOverview,
  markAdminThreadReadServer,
  saveAdminChatConfigServer,
  sendAdminChatReplyServer,
} from '../lib/supportChatEngine';
import {
  MessageSquare,
  Send,
  RefreshCw,
  Trash2,
  Plus,
  Save,
  CheckCircle2,
  AlertTriangle,
  Bot,
  User,
} from 'lucide-react';

export const SupportChatTab: React.FC = () => {
  const { refreshChatConfig } = useStore();

  const [threads, setThreads] = useState<SupportChatThread[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingReply, setSendingReply] = useState(false);

  // Customizable chat behavior config
  const [config, setConfig] = useState<SupportChatConfig>(DEFAULT_CHAT_CONFIG);
  const [newKeyword, setNewKeyword] = useState('');
  const [newReplyAr, setNewReplyAr] = useState('');
  const [newReplyFr, setNewReplyFr] = useState('');
  const [newReplyEn, setNewReplyEn] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const showNotice = (type: 'ok' | 'err', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await fetchAdminChatOverview();
    if (res.ok) {
      setThreads(res.threads);
      setConfig(res.config);
      if (!selectedSessionId && res.threads.length > 0) {
        setSelectedSessionId(res.threads[0].sessionId);
      }
    } else if (!silent && res.error) {
      showNotice('err', res.error);
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => loadData(true), 6000);
    return () => clearInterval(timer);
  }, []);

  const activeThread = threads.find((t) => t.sessionId === selectedSessionId) || null;

  const handleSelectThread = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    await markAdminThreadReadServer(sessionId);
    setThreads((prev) =>
      prev.map((th) => (th.sessionId === sessionId ? { ...th, unreadByOwner: 0 } : th))
    );
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !replyText.trim()) return;
    setSendingReply(true);
    const res = await sendAdminChatReplyServer(activeThread.sessionId, replyText.trim());
    setSendingReply(false);
    if (!res.ok || !res.thread) {
      showNotice('err', res.error || 'فشل إرسال الرد.');
      return;
    }
    setReplyText('');
    setThreads((prev) =>
      prev.map((th) => (th.sessionId === activeThread.sessionId ? res.thread! : th))
    );
    showNotice('ok', 'تم إرسال ردك المباشر إلى نافذة الحريف فوراً.');
  };

  const handleDeleteThread = async (sessionId: string) => {
    const ok = await deleteAdminChatThreadServer(sessionId);
    if (!ok) {
      showNotice('err', 'تعذر حذف المحادثة.');
      return;
    }
    setThreads((prev) => {
      const next = prev.filter((th) => th.sessionId !== sessionId);
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(next[0]?.sessionId || '');
      }
      return next;
    });
  };

  const handleAddRule = () => {
    const kw = newKeyword.trim();
    if (!kw || (!newReplyAr.trim() && !newReplyFr.trim() && !newReplyEn.trim())) {
      showNotice('err', 'يرجى كتابة الكلمة المفتاحية والرد المطلوب.');
      return;
    }
    const rule: CustomChatRule = {
      id: `rule_${Date.now()}`,
      keyword: kw,
      replyAr: newReplyAr.trim() || newReplyEn.trim() || newReplyFr.trim(),
      replyFr: newReplyFr.trim() || newReplyAr.trim() || newReplyEn.trim(),
      replyEn: newReplyEn.trim() || newReplyAr.trim() || newReplyFr.trim(),
    };
    setConfig((prev) => ({
      ...prev,
      customRules: [rule, ...(prev.customRules || [])],
    }));
    setNewKeyword('');
    setNewReplyAr('');
    setNewReplyFr('');
    setNewReplyEn('');
  };

  const handleRemoveRule = (ruleId: string) => {
    setConfig((prev) => ({
      ...prev,
      customRules: (prev.customRules || []).filter((r) => r.id !== ruleId),
    }));
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    const res = await saveAdminChatConfigServer(config);
    setSavingConfig(false);
    if (!res.ok || !res.config) {
      showNotice('err', res.error || 'تعذر حفظ إعدادات الردود.');
      return;
    }
    setConfig(res.config);
    await refreshChatConfig();
    showNotice('ok', 'تم حفظ إعدادات الردود والترحيب والقواعد المخصصة بنجاح.');
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div
          className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
            notice.type === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
          }`}
        >
          {notice.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* 1. صندوق المحادثات المباشرة مع الحرفاء */}
      <div className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl border border-[#E2E8F0] dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#FF6B00]" />
            <div>
              <h3 className="text-sm font-black">محادثات شات الدعم الفوري المباشر</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                تظهر هنا جميع رسائل الزوار مباشرة ويمكنك الرد عليهم لحظياً داخل نفس النافذة.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadData()}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:border-[#FF6B00]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Threads Sidebar */}
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 p-2.5 max-h-96 overflow-y-auto space-y-1.5">
            {threads.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                لا توجد محادثات واردة بعد. عندما يرسل أي زائر رسالة في الشات ستظهر هنا فوراً.
              </div>
            ) : (
              threads.map((th) => {
                const lastMsg = th.messages[th.messages.length - 1];
                const isSelected = th.sessionId === selectedSessionId;
                return (
                  <div
                    key={th.sessionId}
                    onClick={() => handleSelectThread(th.sessionId)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#FF6B00]/10 border-[#FF6B00]'
                        : 'bg-slate-50 dark:bg-[#1E293B] border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#FF6B00]" />
                        <span>{th.customerLabel}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                          {th.language}
                        </span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {th.unreadByOwner > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black">
                            {th.unreadByOwner}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteThread(th.sessionId);
                          }}
                          title="حذف المحادثة"
                          className="text-slate-400 hover:text-red-500 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {lastMsg && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                        {lastMsg.text}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Active Conversation Window */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-96 overflow-hidden">
            {activeThread ? (
              <>
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-black">
                    محادثة: {activeThread.customerLabel}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(activeThread.lastMessageAt).toLocaleString('ar-TN')}
                  </span>
                </div>

                <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#F8FAFC] dark:bg-[#0B0F17] text-xs">
                  {activeThread.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        m.sender === 'owner' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <span className="text-[9px] text-slate-400 px-1 mb-0.5">
                        {m.sender === 'customer'
                          ? 'الحريف'
                          : m.source === 'auto'
                          ? 'رد تلقائي ذكي'
                          : 'ردك المباشر'}
                      </span>
                      <div
                        className={`max-w-[85%] p-2.5 rounded-2xl whitespace-pre-line ${
                          m.sender === 'owner'
                            ? m.source === 'auto'
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                              : 'bg-[#FF6B00] text-white'
                            : 'bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={handleSendAdminReply}
                  className="p-2.5 border-t border-slate-200 dark:border-slate-800 flex gap-2"
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="اكتب ردك المباشر للحريف ليظهر في شات المتجر فوراً..."
                    className="flex-1 text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent focus:outline-none focus:border-[#FF6B00]"
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !replyText.trim()}
                    className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>إرسال</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                اختر محادثة من القائمة لقراءتها والرد عليها.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. تخصيص كيفية إجابة شات الدعم الفوري */}
      <form
        onSubmit={handleSaveConfig}
        className="bg-[#F8FAFC] dark:bg-[#1E293B] rounded-3xl border border-[#E2E8F0] dark:border-slate-800 p-4 sm:p-5 space-y-5"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#FF6B00]" />
            <div>
              <h3 className="text-sm font-black">تخصيص ردود شات الدعم الفوري</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                حدّد رسالة الترحيب والردود التلقائية على أسئلة المنتجات والأسعار والتوصيل وأضف كلماتك المفتاحية الخاصة.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer bg-white dark:bg-[#0F172A] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <input
              type="checkbox"
              checked={config.autoReplyEnabled}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, autoReplyEnabled: e.target.checked }))
              }
              className="accent-[#FF6B00] w-4 h-4"
            />
            <span>تفعيل الرد الذكي الفوري</span>
          </label>
        </div>

        {/* Welcome Message */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold mb-1">رسالة الترحيب (العربية)</label>
            <textarea
              rows={2}
              value={config.welcomeMessage.ar}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  welcomeMessage: { ...prev.welcomeMessage, ar: e.target.value },
                }))
              }
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold mb-1">رسالة الترحيب (الفرنسية)</label>
            <textarea
              rows={2}
              dir="ltr"
              value={config.welcomeMessage.fr}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  welcomeMessage: { ...prev.welcomeMessage, fr: e.target.value },
                }))
              }
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold mb-1">رسالة الترحيب (الإنجليزية)</label>
            <textarea
              rows={2}
              dir="ltr"
              value={config.welcomeMessage.en}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  welcomeMessage: { ...prev.welcomeMessage, en: e.target.value },
                }))
              }
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A]"
            />
          </div>
        </div>

        {/* Fallback Message */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold mb-1">الرد عند عدم تطابق السؤال (عربي)</label>
            <textarea
              rows={2}
              value={config.fallbackMessage.ar}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  fallbackMessage: { ...prev.fallbackMessage, ar: e.target.value },
                }))
              }
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold mb-1">الرد الاحتياطي (فرنسي)</label>
            <textarea
              rows={2}
              dir="ltr"
              value={config.fallbackMessage.fr}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  fallbackMessage: { ...prev.fallbackMessage, fr: e.target.value },
                }))
              }
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold mb-1">الرد الاحتياطي (إنجليزي)</label>
            <textarea
              rows={2}
              dir="ltr"
              value={config.fallbackMessage.en}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  fallbackMessage: { ...prev.fallbackMessage, en: e.target.value },
                }))
              }
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A]"
            />
          </div>
        </div>

        {/* Custom Keyword Rules */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 space-y-3">
          <h4 className="text-xs font-black">إضافة ردود مخصصة بكلمات مفتاحية</h4>
          <p className="text-[10px] text-slate-500">
            مثال: إذا كتب الحريف كلمة مثل «جملة» أو «ضمان» أو «تخفيض»، سيرد الشات فوراً بالنص الذي تحدده أنت (افصل الكلمات بفاصلة).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="الكلمات المفتاحية (مثلاً: جملة, gros)"
              className="text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"
            />
            <input
              type="text"
              value={newReplyAr}
              onChange={(e) => setNewReplyAr(e.target.value)}
              placeholder="الرد بالعربية..."
              className="text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"
            />
            <input
              type="text"
              dir="ltr"
              value={newReplyFr}
              onChange={(e) => setNewReplyFr(e.target.value)}
              placeholder="Réponse en français (optionnel)..."
              className="text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"
            />
            <div className="flex gap-2">
              <input
                type="text"
                dir="ltr"
                value={newReplyEn}
                onChange={(e) => setNewReplyEn(e.target.value)}
                placeholder="English reply (optional)..."
                className="flex-1 text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent"
              />
              <button
                type="button"
                onClick={handleAddRule}
                className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-[#FF6B00] text-white text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>أضف</span>
              </button>
            </div>
          </div>

          {Array.isArray(config.customRules) && config.customRules.length > 0 && (
            <div className="space-y-1.5 pt-2">
              {config.customRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-black text-[#FF6B00] block">{rule.keyword}</span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 block truncate">
                      {rule.replyAr}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRule(rule.id)}
                    className="text-red-500 hover:text-red-600 p-1 shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingConfig}
            className="px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{savingConfig ? 'جاري الحفظ...' : 'حفظ وتطبيق إعدادات الشات'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
