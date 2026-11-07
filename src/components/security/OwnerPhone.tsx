import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Send, 
  AlertTriangle, 
  ShieldCheck, 
  Lock,
  ArrowRight,
  Info
} from 'lucide-react';
import { 
  OWNER_EMAIL, 
  OWNER_PHONE_MASKED, 
  OWNER_PHONE_FULL,
  getOwnerGoogleUser, 
  sendFirebasePhoneOtp,
  sendOtpCall 
} from '../../lib/security';

interface OwnerPhoneProps {
  onNavigate: (route: string, state?: any) => void;
}

export const OwnerPhone: React.FC<OwnerPhoneProps> = ({ onNavigate }) => {
  const [phoneMasked, setPhoneMasked] = useState(OWNER_PHONE_MASKED);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  const googleUser = getOwnerGoogleUser();

  // Guard: if not authenticated with Google or wrong email, redirect to /owner/login
  useEffect(() => {
    if (!googleUser || googleUser.email !== OWNER_EMAIL) {
      onNavigate('/owner/login');
    }
  }, [googleUser, onNavigate]);

  if (!googleUser) return null;

  async function handleSend() {
    if (!googleUser) return;
    setError('');
    setInfoNotice(null);
    setLoading(true);

    try {
      // 1. Attempt official Firebase Phone Authentication (SMS via RecaptchaVerifier)
      try {
        await sendFirebasePhoneOtp('recaptcha-container');
        setPhoneMasked(OWNER_PHONE_MASKED);
        onNavigate('/owner/otp');
        return;
      } catch (fbErr: any) {
        console.warn('[Firebase Phone Auth] SDK note:', fbErr?.code || fbErr?.message);
        if (fbErr?.code === 'auth/configuration-not-found') {
          setInfoNotice('مزود تسجيل الدخول بالهاتف (Phone) غير مفعّل في كونسول Firebase. يمكنك تفعيله بنقرة واحدة من الرابط أدناه.');
        }
        // Seamless fallback to server verification route so owner is never blocked
        await sendOtpCall(googleUser.email);
        setPhoneMasked(OWNER_PHONE_MASKED);
        onNavigate('/owner/otp');
      }
    } catch (e: any) {
      setError(e.message || 'تعذر إرسال رمز التحقق. يرجى مراجعة إعدادات Firebase.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-3xl border-2 border-slate-900 shadow-2xl p-6 sm:p-10 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-[#0B0F17] text-[#FF6B00] flex items-center justify-center mx-auto shadow-md border border-[#FF6B00]/20">
            <Phone className="w-8 h-8 text-[#FF6B00]" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-[#FF6B00] bg-[#FF6B00]/10 px-3.5 py-1 rounded-full inline-block">
            المرحلة 2 من 3 — التحقق عبر الهاتف (Firebase Phone Auth)
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-2">
            التحقق الثنائي عبر رسالة SMS
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            سيتم إرسال رمز أمان مكوّن من 6 خانات عبر خدمة Firebase Authentication SMS إلى هاتف المالك السيادي:
          </p>
        </div>

        {/* Masked Sovereign Phone Display */}
        <div className="bg-[#0B0F17] rounded-2xl p-6 text-center border-2 border-[#D4AF37]/60 shadow-inner space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>رقم الهاتف السيادي المسجل في Firebase</span>
          </div>
          <div 
            style={{ fontSize: 24, color: '#D4AF37', letterSpacing: 3 }}
            className="font-mono font-black py-1"
            dir="ltr"
          >
            {phoneMasked}
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            جاهز لاستقبال رمز التحقق عبر SMS (صالح لمدة 5 دقائق)
          </span>
        </div>

        {/* Hidden/Invisible reCAPTCHA container required by Firebase Phone Auth */}
        <div id="recaptcha-container" className="flex justify-center my-1"></div>

        {/* Action Button & Notice */}
        <div className="space-y-3">
          <button
            onClick={handleSend}
            disabled={loading}
            className="w-full py-4 px-4 rounded-xl bg-[#0B0F17] hover:bg-[#FF6B00] text-white font-black text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-center"
          >
            <Send className="w-4 h-4 text-[#FF6B00] shrink-0" />
            <span>
              {loading 
                ? 'جارٍ تشغيل reCAPTCHA وإرسال SMS...' 
                : 'إرسال رمز التحقق SMS عبر Firebase'}
            </span>
          </button>
          
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-slate-800">
              <Info className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span>إرشادات Firebase Phone Authentication:</span>
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-500 pr-1">
              <li>
                لتفعيل مزود الهاتف، افتح: 
                <a 
                  href="https://console.firebase.google.com/project/gen-lang-client-0251316053/authentication/providers" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[#FF6B00] font-bold hover:underline mx-1"
                >
                  Firebase Console &gt; Sign-in method
                </a> 
                ثم فعّل <strong>Phone</strong>.
              </li>
              <li>في بيئة الاختبار، يمكنك إضافة <code>+21621511162</code> في <em>Phone numbers for testing</em>.</li>
              <li>لحساب الإنتاج، تأكد من ضبط <em>SMS Region Policy</em> للسماح بإرسال الرسائل إلى تونس (+216).</li>
            </ul>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <div className="space-y-1">
              <div>{error}</div>
              <div className="text-[10px] text-red-600 font-normal">
                ملاحظة: تأكد من تفعيل مزود Phone في كونسول Firebase وإضافة نطاق التطبيق في Authorized Domains.
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 pt-3 text-center space-y-1.5">
          <p className="text-[11px] text-slate-400">
            🔒 الرقم ثابت ومحمي في خوادم Google ولا يمكن تغييره أو استبداله من المتصفح.
          </p>
          <button
            onClick={() => onNavigate('/owner/login')}
            className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold block mx-auto pt-1 cursor-pointer"
          >
            تسجيل الدخول بحساب Google آخر
          </button>
        </div>

      </div>
    </div>
  );
};
