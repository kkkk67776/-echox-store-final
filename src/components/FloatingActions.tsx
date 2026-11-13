import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Phone, 
  X, 
  Send, 
  Headphones, 
  ExternalLink,
  MessageSquare,
  RotateCcw,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

export const FloatingActions: React.FC = () => {
  const { 
    siteSettings, 
    chatMessages, 
    isChatReplying,
    sendCustomerSupportMessage,
    refreshChatThread,
    resetChatSession,
    setSelectedProductId,
    setCurrentView,
    language,
    t 
  } = useStore();

  const [hubOpen, setHubOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chatOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatReplying, chatOpen]);

  // Poll server for live Owner replies while the customer chat window is open
  useEffect(() => {
    if (!chatOpen) return;
    refreshChatThread();
    const timer = setInterval(() => {
      refreshChatThread();
    }, 4000);
    return () => clearInterval(timer);
  }, [chatOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatReplying) return;
    const msg = chatInput.trim();
    setChatInput('');
    await sendCustomerSupportMessage(msg);
  };

  const handleQuickChip = async (chipText: string) => {
    if (isChatReplying) return;
    await sendCustomerSupportMessage(chipText);
  };

  const whatsappDigits = (siteSettings?.whatsappPhone || '').replace(/\D/g, '');
  const timeLocale = language === 'fr' ? 'fr-TN' : language === 'en' ? 'en-GB' : 'ar-TN';
  const quickChips: string[] = Array.isArray((t.chat as any).quickChips) ? (t.chat as any).quickChips : [];

  return (
    <>
      {/* 1. زر الدعم الموحد الأنيق (Single Elegant Support Hub Button) */}
      <div className="fixed bottom-20 sm:bottom-6 left-3 sm:left-6 z-40 select-none">
        <button
          type="button"
          onClick={() => setHubOpen(!hubOpen)}
          title={t.supportHub.buttonTitle}
          aria-label={t.supportHub.buttonTitle}
          className="relative flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#0F172A] dark:bg-[#1E293B] hover:bg-[#FF6B00] dark:hover:bg-[#FF6B00] text-white shadow-xl hover:scale-105 active:scale-95 transition-all border border-slate-700/50 cursor-pointer"
        >
          <div className="relative">
            {hubOpen ? <X className="w-5 h-5 text-white" /> : <Headphones className="w-5 h-5 text-[#FF6B00]" />}
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
          </div>
          <span className="text-xs font-bold hidden sm:inline">
            {hubOpen ? t.supportHub.closeLabel : t.supportHub.helpLabel}
          </span>
        </button>

        {/* 2. قائمة خيارات الدعم المنبثقة */}
        {hubOpen && !chatOpen && (
          <div className="absolute bottom-14 left-0 w-64 sm:w-72 bg-white dark:bg-[#1E293B] rounded-3xl shadow-2xl border border-[#E2E8F0] dark:border-slate-700 p-3.5 space-y-2 animate-scaleUp text-[#0F172A] dark:text-white">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black flex items-center gap-1.5 text-[#0F172A] dark:text-white">
                <Headphones className="w-4 h-4 text-[#FF6B00]" />
                <span>{t.supportHub.title}</span>
              </span>
              <button 
                type="button"
                onClick={() => setHubOpen(false)}
                aria-label={t.supportHub.closeLabel}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* خيار 1: محادثة مباشرة عبر WhatsApp */}
            <a
              href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
                language === 'fr'
                  ? 'Bonjour ECHOX Store Tunisie, je souhaite avoir des informations'
                  : language === 'en'
                  ? 'Hello ECHOX Store Tunisia, I would like to inquire about'
                  : 'مرحباً ECHOX Store تونس، أود الاستفسار عن'
              )}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setHubOpen(false)}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <svg
                    viewBox="0 0 32 32"
                    className="w-4 h-4 fill-current"
                    aria-hidden="true"
                  >
                    <path d="M16.004 2.667C8.64 2.667 2.667 8.64 2.667 16c0 2.352.616 4.648 1.787 6.672L2.667 29.333l6.832-1.792A13.28 13.28 0 0 0 16.004 29.333C23.368 29.333 29.333 23.36 29.333 16S23.368 2.667 16.004 2.667zm7.768 18.88c-.325.917-1.912 1.749-2.648 1.856-.672.101-1.525.144-2.464-.155-.568-.181-1.296-.421-2.224-.821-3.912-1.688-6.464-5.637-6.659-5.899-.195-.261-1.589-2.115-1.589-4.035 0-1.92 1.005-2.864 1.363-3.253.357-.389.779-.485 1.037-.485.261 0 .52.003.747.013.24.011.563-.091.88.672.325.784 1.107 2.704 1.203 2.901.096.197.16.427.032.688-.128.261-.192.427-.389.656-.197.229-.413.512-.589.688-.197.197-.403.411-.173.805.229.395 1.021 1.685 2.192 2.731 1.507 1.344 2.779 1.76 3.173 1.957.395.197.624.165.853-.099.229-.261.989-1.155 1.253-1.552.261-.395.523-.328.88-.197.357.131 2.277 1.075 2.667 1.269.389.197.651.293.747.456.096.165.096.949-.229 1.867z" />
                  </svg>
                </span>
                <div>
                  <span className="text-xs font-bold block text-slate-900 dark:text-white">{t.supportHub.whatsappTitle}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{t.supportHub.whatsappSubtitle}</span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#25D366]" />
            </a>

            {/* خيار 2: اتصال هاتفي مباشر */}
            {siteSettings?.supportPhone && (
              <a
                href={`tel:${siteSettings.supportPhone}`}
                onClick={() => setHubOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Phone className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-xs font-bold block text-slate-900 dark:text-white">{t.supportHub.phoneTitle}</span>
                    <span dir="ltr" className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold block">
                      {siteSettings.supportPhone}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
              </a>
            )}

            {/* خيار 3: الدردشة الحية داخل المتجر */}
            <button
              type="button"
              onClick={() => {
                setHubOpen(false);
                setChatOpen(true);
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 border border-[#FF6B00]/25 transition-colors group cursor-pointer text-start"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MessageSquare className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-xs font-bold block text-slate-900 dark:text-white">{t.supportHub.liveChatTitle}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{t.supportHub.liveChatSubtitle}</span>
                </div>
              </div>
              <span className="text-xs text-[#FF6B00] font-bold">
                {t.supportHub.openBtn} {language === 'ar' ? '←' : '→'}
              </span>
            </button>

          </div>
        )}
      </div>

      {/* 3. نافذة الدردشة المباشرة الذكية (Smart + Owner Live Chat Window) */}
      {chatOpen && (
        <div className="fixed bottom-24 sm:bottom-6 left-3 sm:left-6 z-50 w-[calc(100vw-1.5rem)] max-w-sm sm:w-96 bg-white dark:bg-[#1E293B] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col animate-slideUp text-[#0F172A] dark:text-white">
          
          {/* Header */}
          <div className="bg-[#0F172A] p-3.5 text-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#FF6B00] flex items-center justify-center font-bold text-xs text-white shrink-0">
                EX
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold leading-tight truncate">{t.chat.widgetTitle}</h4>
                <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="truncate">{t.chat.supportOnline}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={resetChatSession}
                title={(t.chat as any).resetChat || 'New Chat'}
                aria-label={(t.chat as any).resetChat || 'New Chat'}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                aria-label={t.supportHub.closeLabel}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages list */}
          <div className="p-3.5 h-72 overflow-y-auto space-y-3 bg-[#F8FAFC] dark:bg-[#0F172A] text-xs">
            {chatMessages.map(msg => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.sender === 'customer' ? 'items-end' : 'items-start'}`}
              >
                {msg.sender === 'owner' && msg.source === 'owner' && (
                  <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 mb-0.5 px-1 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{(t.chat as any).liveOwnerBadge || 'Direct Admin Reply'}</span>
                  </span>
                )}
                <div 
                  className={`max-w-[88%] p-3 rounded-2xl shadow-2xs leading-relaxed whitespace-pre-line ${
                    msg.sender === 'customer'
                      ? 'bg-[#FF6B00] text-white rounded-br-none'
                      : 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none'
                  }`}
                >
                  <p>{msg.text}</p>

                  {/* Suggested products clickable cards */}
                  {Array.isArray(msg.suggestedProducts) && msg.suggestedProducts.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/70 space-y-1.5">
                      {msg.suggestedProducts.map((prod) => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => {
                            setSelectedProductId(prod.id);
                            setChatOpen(false);
                          }}
                          className="w-full flex items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] hover:bg-[#FF6B00]/10 border border-slate-200 dark:border-slate-700 transition-colors text-start cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {prod.image && (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold block truncate text-slate-900 dark:text-white">
                                {prod.name}
                              </span>
                              <span className="text-[10px] font-black text-[#FF6B00] font-mono">
                                {Number(prod.price).toFixed(3)} {t.cart.currency}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-[#FF6B00] shrink-0 flex items-center gap-0.5 px-1.5">
                            {(t.chat as any).viewProductBtn || 'View'}
                            <ArrowUpRight className="w-3 h-3" />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quick action view button (e.g. Track Order / Promise / Contact) */}
                  {msg.actionView && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentView(msg.actionView!);
                        setChatOpen(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#FF6B00] hover:underline cursor-pointer"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      <span>
                        {msg.actionView === 'my_orders'
                          ? t.nav.myOrders
                          : msg.actionView === 'promise'
                          ? t.nav.promise
                          : msg.actionView === 'companies'
                          ? t.nav.companies
                          : t.contactModal.title}
                      </span>
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1 font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {isChatReplying && (
              <div className="flex items-start">
                <div className="px-3 py-2 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 animate-pulse">
                  {(t.chat as any).typingNotice || '...'}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          {quickChips.length > 0 && (
            <div className="px-3 py-2 bg-white dark:bg-[#1E293B] border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {quickChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={isChatReplying}
                  onClick={() => handleQuickChip(chip)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-[#FF6B00]/15 hover:text-[#FF6B00] text-[10px] font-bold text-slate-700 dark:text-slate-300 shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Footer Input */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-[#1E293B] border-t border-slate-200 dark:border-slate-700 flex gap-2">
            <input
              type="text"
              placeholder={t.chat.placeholder}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              className="flex-1 text-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-[#0F172A] dark:text-white focus:outline-none focus:border-[#FF6B00]"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isChatReplying}
              aria-label={t.chat.send}
              className="p-2 bg-[#FF6B00] hover:bg-[#e05e00] disabled:opacity-50 text-white rounded-xl shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </>
  );
};
