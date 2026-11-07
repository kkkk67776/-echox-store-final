import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Phone, 
  MessageCircle, 
  X, 
  Send, 
  Headphones, 
  ChevronUp 
} from 'lucide-react';

export const FloatingActions: React.FC = () => {
  const { 
    siteSettings, 
    chatMessages, 
    sendChatMessage, 
    t 
  } = useStore();

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
      {/* Floating Buttons Group */}
      <div className="fixed bottom-5 left-5 z-40 flex flex-col gap-2.5 items-center">
        
        {/* 1. Direct Phone Call Button */}
        <a
          href={`tel:${siteSettings.supportPhone}`}
          title="اتصال هاتفي مباشر"
          aria-label="Direct Phone Call"
          className="w-12 h-12 rounded-full bg-[#0B0F17] hover:bg-[#FF6B00] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all"
        >
          <Phone className="w-5 h-5" />
        </a>

        {/* 2. WhatsApp Direct Floating Button */}
        <a
          href={`https://wa.me/${siteSettings.whatsappPhone}?text=مرحباً%20ECHOX%20STORE%20تونس،%20أود%20الاستفسار%20عن`}
          target="_blank"
          rel="noreferrer"
          title="محادثة واتساب مباشرة"
          aria-label="WhatsApp Support"
          className="w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all"
        >
          <MessageCircle className="w-6 h-6" />
        </a>

        {/* 3. Live Support Chat Toggle Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          title="محادثة الدعم المباشر"
          aria-label="Toggle Live Chat"
          className="relative w-12 h-12 rounded-full bg-[#FF6B00] hover:bg-[#e05e00] text-white flex items-center justify-center shadow-xl hover:scale-105 transition-all"
        >
          {chatOpen ? <X className="w-6 h-6" /> : <Headphones className="w-6 h-6" />}
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
        </button>

      </div>

      {/* Live Chat Modal Drawer */}
      {chatOpen && (
        <div className="fixed bottom-20 left-5 z-50 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-slideUp">
          
          {/* Header */}
          <div className="bg-[#0B0F17] p-4 text-white flex items-center justify-between">
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
              onClick={() => setChatOpen(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages list */}
          <div className="p-4 h-64 overflow-y-auto space-y-3 bg-[#FAF8F5] text-xs">
            {chatMessages.map(msg => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.sender === 'customer' ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`max-w-[85%] p-3 rounded-2xl shadow-2xs leading-relaxed ${
                    msg.sender === 'customer'
                      ? 'bg-[#FF6B00] text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
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
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              placeholder={t.chat.placeholder}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              className="flex-1 text-xs py-2 px-3 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#FF6B00]"
            />
            <button
              type="submit"
              className="p-2 bg-[#FF6B00] hover:bg-[#e05e00] text-white rounded-xl shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </>
  );
};
