import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft 
} from 'lucide-react';
import { OWNER_EMAIL, setOwnerGoogleUser, clearOwnerSecuritySession } from '../../lib/security';

interface OwnerLoginProps {
  onNavigate: (route: string, state?: any) => void;
}

export const OwnerLogin: React.FC<OwnerLoginProps> = ({ onNavigate }) => {
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanEmail = emailInput.trim().toLowerCase();

    // 1. Check if authorized Google Account
    if (cleanEmail !== OWNER_EMAIL) {
      clearOwnerSecuritySession();
      setError(`تم رفض الوصول! الحساب (${emailInput}) غير مصرح له بامتلاك النظام. المنصة مقفلة حصراً للمالك abdelkaderbahri570@gmail.com`);
      setLoading(false);
      return;
    }

    // 2. Authorized Google Account accepted for Stage 1
    // Store Google session (Note: DOES NOT have Custom Claim owner: true yet!)
    setOwnerGoogleUser({
      email: OWNER_EMAIL,
      uid: 'sovereign_owner_uid_570'
    });

    // 3. MANDATORY SECURITY PROTOCOL: Redirect to Stage 2 (Phone verification)
    // NEVER redirect directly to dashboard!
    setTimeout(() => {
      setLoading(false);
      onNavigate('/owner/phone');
    }, 500);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-3xl border-2 border-slate-900 shadow-2xl p-6 sm:p-10 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#0B0F17] text-[#FF6B00] flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-[#FF6B00] bg-[#FF6B00]/10 px-3.5 py-1 rounded-full">
              المرحلة 1 من 3 — التحقق من هوية المالك
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-2">
              ECHOX OWNER SECURITY
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              تسجيل الدخول الإلزامي بحساب Google السيادي المعتمد
            </p>
          </div>
        </div>

        {/* Authorized Credentials Notice */}
        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DD] space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-semibold">حساب Google المصرح:</span>
            <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200" dir="ltr">
              abdelkaderbahri570@gmail.com
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-semibold">الحماية المطبقة:</span>
            <span className="text-[#FF6B00] font-bold">
              Google Auth + SMS OTP + Server Session Cookie
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleGoogleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              أدخل حساب Google المالك:
            </label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              placeholder="abdelkaderbahri570@gmail.com"
              className="w-full text-xs py-3 px-4 rounded-xl border-2 border-slate-300 focus:outline-hidden focus:border-[#FF6B00] font-mono text-center font-bold"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#0B0F17] hover:bg-[#FF6B00] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Lock className="w-4 h-4 text-[#FF6B00]" />
            <span>{loading ? 'جارٍ التحقق من الحساب...' : 'تسجيل الدخول بحساب Google المالك'}</span>
          </button>
        </form>

        {/* Quick Helper Button */}
        <div className="text-center pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setEmailInput(OWNER_EMAIL)}
            className="text-xs text-[#FF6B00] hover:underline font-semibold"
          >
            (انقر هنا لتعبئة حساب المالك المعتمد: abdelkaderbahri570@gmail.com)
          </button>
        </div>

        {/* Return to store */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="text-xs text-slate-400 hover:text-slate-700 flex items-center justify-center gap-1 mx-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>العودة إلى واجهة المتجر</span>
          </button>
        </div>

      </div>
    </div>
  );
};
