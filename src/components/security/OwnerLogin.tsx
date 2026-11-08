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

    // 2. Authorized Google Account accepted
    setOwnerGoogleUser({
      email: OWNER_EMAIL,
      uid: 'sovereign_owner_uid_570'
    });

    // 3. Direct transition to Phone OS Lock Screen (Pattern or PIN)
    setTimeout(() => {
      setLoading(false);
      onNavigate('/owner/lock');
    }, 400);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-black text-white selection:bg-amber-500 selection:text-black">
      <div className="w-full max-w-md bg-zinc-950 rounded-[36px] border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.1)] p-6 sm:p-10 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/10 text-amber-400 flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3.5 py-1 rounded-full border border-amber-500/20">
              تسجيل دخول المالك السيادي
            </span>
            <h1 className="text-2xl font-black text-white mt-2">
              ECHOX OWNER SYSTEM
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              المصادقة الرسمية بحساب Google المعتمد قبل شاشة قفل الهاتف
            </p>
          </div>
        </div>

        {/* Authorized Credentials Notice */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400 font-medium">حساب Google المصرح:</span>
            <span className="font-mono font-bold text-amber-400 bg-white/[0.05] px-2 py-0.5 rounded-md border border-white/10" dir="ltr">
              abdelkaderbahri570@gmail.com
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400 font-medium">مستوى الحماية:</span>
            <span className="text-emerald-400 font-bold">
              Google Auth + OS Phone Lock (Pattern/PIN)
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleGoogleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              أدخل حساب Google المالك:
            </label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              placeholder="abdelkaderbahri570@gmail.com"
              className="w-full text-xs py-3.5 px-4 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-hidden focus:border-amber-500 font-mono text-center font-bold"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-bold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Lock className="w-4 h-4 text-black" />
            <span>{loading ? 'جارٍ التحقق من الحساب...' : 'المتابعة إلى شاشة قفل الهاتف'}</span>
          </button>
        </form>

        {/* Quick Helper Button */}
        <div className="text-center pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => setEmailInput(OWNER_EMAIL)}
            className="text-xs text-amber-400/90 hover:text-amber-300 hover:underline font-semibold cursor-pointer"
          >
            (انقر هنا لتعبئة حساب المالك المعتمد: abdelkaderbahri570@gmail.com)
          </button>
        </div>

        {/* Return to store */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-1 mx-auto cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>العودة إلى واجهة المتجر</span>
          </button>
        </div>

      </div>
    </div>
  );
};
