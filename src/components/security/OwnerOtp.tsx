import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { 
  OWNER_EMAIL, 
  getOwnerGoogleUser, 
  confirmFirebasePhoneOtp,
  verifyOtpCall, 
  createOwnerSessionCall, 
  setOwnerCustomClaims 
} from '../../lib/security';

interface OwnerOtpProps {
  onNavigate: (route: string, state?: any) => void;
}

export const OwnerOtp: React.FC<OwnerOtpProps> = ({ onNavigate }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const googleUser = getOwnerGoogleUser();

  useEffect(() => {
    // If no authenticated Google user or wrong email, redirect to /owner/phone
    if (!googleUser || googleUser.email !== OWNER_EMAIL) {
      onNavigate('/owner/phone');
    }
  }, [googleUser, onNavigate]);

  function handleChange(i: number, val: string) {
    val = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const next = [...code];
    next[i] = val.slice(-1);
    setCode(next);

    // Auto-advance focus
    if (val && i < 5) {
      refs.current[i + 1]?.focus();
    }

    // If all 6 characters filled, submit immediately
    if (next.every(c => c.trim().length === 1)) {
      submit(next.join(''));
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  async function submit(fullCode: string) {
    if (!googleUser) return;

    setError('');
    setLoading(true);
    setSuccessMsg('');

    try {
      let customToken = '';

      // 1. Try Firebase Phone Authentication confirmationResult first if available
      if (window.confirmationResult) {
        try {
          const fbResult = await confirmFirebasePhoneOtp(fullCode);
          customToken = await fbResult.user.getIdToken();
        } catch (fbConfirmErr: any) {
          console.warn('[Firebase Auth] Confirmation note, trying server verify:', fbConfirmErr.message);
          // Fallback to server verifyOtp
          const verifyRes = await verifyOtpCall(fullCode, googleUser.email);
          customToken = verifyRes.customToken;
        }
      } else {
        // Fallback directly to server verifyOtp
        const verifyRes = await verifyOtpCall(fullCode, googleUser.email);
        customToken = verifyRes.customToken;
      }
      
      // 2. Set Custom Claim owner: true locally
      setOwnerCustomClaims({ owner: true });

      // 3. Create secure server session cookie (__session)
      await createOwnerSessionCall(googleUser.email, customToken);

      setSuccessMsg('تم التحقق بنجاح من رقم هاتف المالك! جاري فتح لوحة القيادة...');

      // 4. Navigate to /owner/dashboard
      setTimeout(() => {
        onNavigate('/owner/dashboard');
      }, 700);

    } catch (e: any) {
      setError(e.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية. يرجى مراجعة رسائل SMS المستلمة.');
      setCode(['', '', '', '', '', '']);
      refs.current[0]?.focus();
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
            <Lock className="w-8 h-8 text-[#FF6B00]" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-[#FF6B00] bg-[#FF6B00]/10 px-3.5 py-1 rounded-full inline-block">
            المرحلة 3 من 3 — إدخال رمز التحقق (SMS)
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-2">
            رمز الأمان المستلم عبر رسالة SMS
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            أدخل رمز التحقق المكوّن من 6 خانات المستلم عبر رسالة SMS من Firebase على هاتفك (+216 21 511 162):
          </p>
        </div>

        {/* 6-box Alphanumeric Input Strip */}
        <div className="flex justify-center gap-2 sm:gap-3 py-2" dir="ltr">
          {code.map((c, i) => (
            <input
              key={i}
              ref={el => { refs.current[i] = el; }}
              type="text"
              value={c}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              maxLength={1}
              autoFocus={i === 0}
              className="w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-black font-mono uppercase bg-[#FAF8F5] border-2 border-slate-300 focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 rounded-2xl outline-hidden shadow-xs transition-all"
            />
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
            <RefreshCw className="w-4 h-4 animate-spin text-[#FF6B00]" />
            <span>جارٍ التحقق من صحة الرمز ومنح ترخيص Custom Claim...</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Verification Submit Button if user pastes full code */}
        <button
          onClick={() => submit(code.join(''))}
          disabled={loading || code.some(c => !c.trim())}
          className="w-full py-3.5 rounded-xl bg-[#0B0F17] hover:bg-[#FF6B00] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>تأكيد رمز SMS والدخول إلى لوحة المالك</span>
        </button>

        <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-xs">
          <button
            onClick={() => onNavigate('/owner/phone')}
            className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
          >
            ← إعادة إرسال رمز SMS
          </button>
          <span className="text-slate-400">صالح لمدة 5 دقائق</span>
        </div>

      </div>
    </div>
  );
};
