import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Phone, 
  MessageCircle, 
  X, 
  Send, 
  Headphones, 
  ExternalLink,
  MessageSquare
} from 'lucide-react';

export const FloatingActions: React.FC = () => {
  const { 
    siteSettings, 
    chatMessages, 
    sendChatMessage, 
    t 
  } = useStore();

  const [hubOpen, setHubOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    sendChatMessage(chatInput.trim(), 'customer');
    setChatInput('');

    // Simulate instant auto-acknowledgment if first message
    setTimeout(() => {
      sendChatMessage('شكراً لتواصلك معنا! تم إشعار إدارة ECHOX وسيتم الرد عليك في غضون لحظات أو الاتصال بك هاتفياً.', 'owner');
    }, 1200);
  };

  return (
    <>
      {/* 1. زر الدعم الموحد الأنيق (Single Elegant Support Hub Button) */}
      {/* موضوع في مكان ذكي ومرفوع عن شريط التنقل السفلي وبطاقات المنتجات */}
      <div className="fixed bottom-20 sm:bottom-6 left-3 sm:left-6 z-40 select-none">
        <button
          type="button"
          onClick={() => setHubOpen(!hubOpen)}
          title="مركز المساعدة والدعم"
          aria-label="Toggle Support Hub"
          className="relative flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#0F172A] dark:bg-[#1E293B] hover:bg-[#FF6B00] dark:hover:bg-[#FF6B00] text-white shadow-xl hover:scale-105 active:scale-95 transition-all border border-slate-700/50 cursor-pointer"
        >
          <div className="relative">
            {hubOpen ? <X className="w-5 h-5 text-white" /> : <Headphones className="w-5 h-5 text-[#FF6B00]" />}
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
          </div>
          <span className="text-xs font-bold hidden sm:inline">
            {hubOpen ? 'إغلاق' : 'المساعدة والدعم'}
          </span>
        </button>

        {/* 2. قائمة خيارات الدعم المنبثقة (Pop-up Support Hub Menu) */}
        {hubOpen && !chatOpen && (
          <div className="absolute bottom-14 left-0 w-64 sm:w-72 bg-white dark:bg-[#1E293B] rounded-3xl shadow-2xl border border-[#E2E8F0] dark:border-slate-700 p-3.5 space-y-2 animate-scaleUp text-[#0F172A] dark:text-white">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black flex items-center gap-1.5 text-[#0F172A] dark:text-white">
                <Headphones className="w-4 h-4 text-[#FF6B00]" />
                <span>مركز المساعدة المباشر</span>
              </span>
              <button 
                type="button"
                onClick={() => setHubOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* خيار 1: واتساب مباشر */}
            <a
              href={`https://wa.me/${siteSettings.whatsappPhone}?text=مرحباً%20ECHOX%20Store%20تونس،%20أود%20الاستفسار%20عن`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setHubOpen(false)}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MessageCircle className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-xs font-bold block text-slate-900 dark:text-white">محادثة واتساب سريعة</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">رد فوري على مدار اليوم</span>
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
                    <span className="text-xs font-bold block text-slate-900 dark:text-white">اتصال هاتفي مباشر</span>
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
                  <span className="text-xs font-bold block text-slate-900 dark:text-white">شات الدعم الفوري</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">تحدث مع الفريق بالمتجر</span>
                </div>
              </div>
              <span className="text-xs text-[#FF6B00] font-bold">فتح ←</span>
            </button>

          </div>
        )}
      </div>

      {/* 3. نافذة الدردشة المباشرة التفاعلية (Live Chat Window) */}
      {chatOpen && (
        <div className="fixed bottom-24 left-3 sm:left-6 z-50 w-80 sm:w-96 bg-white dark:bg-[#1E293B] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col animate-slideUp text-[#0F172A] dark:text-white">
          
          {/* Header */}
          <div className="bg-[#0F172A] p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#FF6B00] flex items-center justify-center font-bold text-xs text-white">
                EX
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight">{t.chat.widgetTitle}</h4>
                <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{t.chat.supportOnline}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages list */}
          <div className="p-4 h-64 overflow-y-auto space-y-3 bg-[#F8FAFC] dark:bg-[#0F172A] text-xs">
            {chatMessages.map(msg => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.sender === 'customer' ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`max-w-[85%] p-3 rounded-2xl shadow-2xs leading-relaxed ${
                    msg.sender === 'customer'
                      ? 'bg-[#FF6B00] text-white rounded-br-none'
                      : 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none'
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1 font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>

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
              className="p-2 bg-[#FF6B00] hover:bg-[#e05e00] text-white rounded-xl shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </>
  );
};
