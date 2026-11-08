import React, { useState, useEffect, useCallback } from 'react';
import { 
  Lock, 
  Unlock, 
  ShieldCheck, 
  AlertTriangle, 
  Wifi, 
  BatteryMedium, 
  HelpCircle, 
  RotateCcw,
  Sparkles,
  CheckCircle2,
  KeyRound,
  Grid3X3
} from 'lucide-react';
import { 
  OWNER_EMAIL, 
  fetchOwnerLockConfig, 
  saveOwnerLockConfig, 
  verifyOwnerLockInput, 
  resetOwnerLockConfig, 
  logFailedAttemptCall,
  setOwnerUnlocked,
  getOwnerGoogleUser,
  clearOwnerSecuritySession
} from '../../lib/security';
import { PatternGrid } from './PatternGrid';
import { PinKeypad } from './PinKeypad';

interface OwnerLockScreenProps {
  onNavigate: (route: string, state?: any) => void;
}

export const OwnerLockScreen: React.FC<OwnerLockScreenProps> = ({ onNavigate }) => {
  // Status Bar live clock & date
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Lock configuration state
  const [loading, setLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [activeLockType, setActiveLockType] = useState<'pattern' | 'pin'>('pattern');
  const [storedHash, setStoredHash] = useState<string>('');

  // Setup mode states (when not configured yet)
  const [setupStep, setSetupStep] = useState<'create' | 'confirm'>('create');
  const [tempFirstInput, setTempFirstInput] = useState<string>('');
  const [setupType, setSetupType] = useState<'pattern' | 'pin'>('pattern');

  // Daily unlock state
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [consecutiveFails, setConsecutiveFails] = useState<number>(0);

  // Lockout timer state (30 seconds after 5 failures)
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);

  // Forgot code modal
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Unlock success animation
  const [isUnlockedSuccess, setIsUnlockedSuccess] = useState<boolean>(false);

  // 1. Live OS Status Bar Clock & Date
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit', hour12: false }));
      setCurrentDate(now.toLocaleDateString('ar-TN', { weekday: 'long', day: 'numeric', month: 'long' }));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Check Google auth guard on mount
  useEffect(() => {
    const googleUser = getOwnerGoogleUser();
    if (!googleUser || googleUser.email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
      onNavigate('/owner/login');
    }
  }, [onNavigate]);

  // 3. Load lock configuration from Firestore / Server
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchOwnerLockConfig();
      if (res.lockedOut && res.remainingSeconds && res.remainingSeconds > 0) {
        setIsLockedOut(true);
        setLockoutRemaining(res.remainingSeconds);
      }

      if (res.configured && res.config && (res.config.lock_hash || res.config.code_hash)) {
        setIsConfigured(true);
        setActiveLockType(res.config.lock_type || 'pattern');
        setStoredHash(res.config.lock_hash || res.config.code_hash || '');
      } else {
        setIsConfigured(false);
      }
    } catch (err) {
      console.warn('[LockScreen] Config load notice:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // 4. Handle Lockout Countdown Timer
  useEffect(() => {
    if (!isLockedOut || lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining(prev => {
        if (prev <= 1) {
          setIsLockedOut(false);
          setConsecutiveFails(0);
          setErrorMessage('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isLockedOut, lockoutRemaining]);

  // 5. Daily Lock Mode: Single Entry Verification
  const handleDailyEntry = async (rawInput: string) => {
    if (isLockedOut || isUnlockedSuccess || !storedHash) return;

    setErrorMessage('');
    setIsError(false);

    try {
      const result = await verifyOwnerLockInput(rawInput, storedHash, activeLockType);

      if (result.success) {
        // Correct entry -> Flash Green, set session, navigate to Dashboard!
        setIsUnlockedSuccess(true);
        setConsecutiveFails(0);
        setOwnerUnlocked(true);

        setTimeout(() => {
          onNavigate('/owner/dashboard');
        }, 550);
        return;
      }

      // Incorrect entry -> Shake & Red
      setIsError(true);
      await logFailedAttemptCall(activeLockType);

      if (result.lockedOut) {
        setIsLockedOut(true);
        setLockoutRemaining(result.remainingSeconds || 30);
        setErrorMessage('المحاولات كثيرة، انتظر 30 ثانية');
      } else {
        const fails = consecutiveFails + 1;
        setConsecutiveFails(fails);
        if (fails >= 5) {
          setIsLockedOut(true);
          setLockoutRemaining(30);
          setErrorMessage('المحاولات كثيرة، انتظر 30 ثانية');
        } else {
          const attemptsLeft = 5 - fails;
          setErrorMessage(`الرمز غير صحيح! يتبقى لديك ${attemptsLeft} محاولات`);
        }
      }
    } catch {
      setIsError(true);
      setErrorMessage('حدث خطأ أثناء فحص الرمز');
    }
  };

  // 6. Setup Mode: Initial Configuration (Create -> Confirm -> Save)
  const handleSetupEntry = async (rawInput: string) => {
    if (setupStep === 'create') {
      if (setupType === 'pattern' && rawInput.split('-').length < 4) {
        setIsError(true);
        setErrorMessage('يجب وصل 4 نقاط على الأقل للنمط');
        return;
      }
      setTempFirstInput(rawInput);
      setSetupStep('confirm');
      setErrorMessage('');
      setIsError(false);
    } else {
      // Step 2: Confirmation
      if (rawInput !== tempFirstInput) {
        setIsError(true);
        setErrorMessage('الرمز غير متطابق! يرجى إعادة المحاولة من البداية.');
        setTimeout(() => {
          setSetupStep('create');
          setTempFirstInput('');
          setErrorMessage('');
        }, 900);
        return;
      }

      // Match confirmed! Hash and save to Firestore
      try {
        setLoading(true);
        await saveOwnerLockConfig(setupType, rawInput);
        setIsUnlockedSuccess(true);
        setOwnerUnlocked(true);

        setTimeout(() => {
          onNavigate('/owner/dashboard');
        }, 600);
      } catch (err: any) {
        setIsError(true);
        setErrorMessage('فشل حفظ إعدادات الأمان');
      } finally {
        setLoading(false);
      }
    }
  };

  // 7. Handle Forgot Code (Reset in Firebase & Logout)
  const handleConfirmForgot = async () => {
    setIsResetting(true);
    try {
      await resetOwnerLockConfig();
      clearOwnerSecuritySession();
      setShowForgotModal(false);
      onNavigate('/owner/login');
    } catch (err) {
      console.warn('Reset lock error:', err);
      onNavigate('/owner/login');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-2 sm:p-4 selection:bg-amber-500 selection:text-black">
      {/* Phone Mockup Frame */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-black rounded-[44px] sm:rounded-[52px] border-4 border-zinc-800 shadow-[0_0_80px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.15)] overflow-hidden flex flex-col min-h-[720px] sm:min-h-[780px]">
        
        {/* Subtle ambient OLED golden glow at the top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* ---------------- 1. OS STATUS BAR ---------------- */}
        <div className="relative z-20 flex items-center justify-between px-7 pt-4 pb-2 text-xs font-semibold text-zinc-300 select-none">
          {/* Time (Left/RTL alignment) */}
          <div className="w-16 text-right font-mono tracking-tight text-white font-bold text-[13px]">
            {currentTime || '12:00'}
          </div>

          {/* Dynamic Island / Speaker Notch (Center) */}
          <div className="w-24 h-5 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-end px-2.5 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-zinc-700/80" />
          </div>

          {/* Indicators: Cellular, Wi-Fi, Battery (Right) */}
          <div className="w-16 flex items-center justify-start gap-1.5 text-zinc-300">
            {/* Cellular Signal Bars */}
            <div className="flex items-end gap-[1.5px] h-3">
              <span className="w-[2.5px] h-1 bg-white rounded-xs" />
              <span className="w-[2.5px] h-1.5 bg-white rounded-xs" />
              <span className="w-[2.5px] h-2 bg-white rounded-xs" />
              <span className="w-[2.5px] h-3 bg-white rounded-xs" />
            </div>

            {/* Wi-Fi Icon */}
            <Wifi className="w-3.5 h-3.5 text-white" />

            {/* Battery Level */}
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] font-mono text-zinc-400">96%</span>
              <div className="w-4 h-2.5 rounded-[3px] border border-zinc-400 p-[1px] flex items-center">
                <div className="h-full w-4/5 bg-amber-400 rounded-[1.5px]" />
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- 2. MAIN LOCK / SETUP BODY ---------------- */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-between px-6 pt-4 pb-6">
          
          {/* Top Info & Date */}
          <div className="text-center space-y-1 w-full">
            <p className="text-xs text-zinc-400 font-medium">
              {currentDate}
            </p>

            {/* Pulsing Lock Icon */}
            <div className="flex justify-center pt-2">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                isUnlockedSuccess
                  ? 'bg-emerald-500/20 text-emerald-400 scale-110 shadow-[0_0_25px_rgba(16,185,129,0.5)]'
                  : isError
                  ? 'bg-red-500/20 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                  : 'bg-white/[0.06] text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
              }`}>
                {isUnlockedSuccess ? (
                  <Unlock className="w-6 h-6 animate-pulse" />
                ) : (
                  <Lock className="w-6 h-6" />
                )}
              </div>
            </div>

            {/* Header Titles */}
            <h1 className="text-lg font-bold text-white tracking-wide mt-2">
              {!isConfigured 
                ? (setupStep === 'create' ? 'إعداد حماية هاتف المالك' : 'تأكيد الرمز الأمني')
                : (activeLockType === 'pattern' ? 'ارسم نمط فتح القفل' : 'أدخل الرقم السري للفتح')}
            </h1>

            <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
              {!isConfigured
                ? (setupStep === 'create'
                    ? `اختر رمز الحماية الأول لغرفة المالك (${setupType === 'pattern' ? 'نمط النقاط' : 'الرقم السري'})`
                    : 'أعد الرسم/الإدخال مرة ثانية للتأكيد والتشفير')
                : 'نظام تشغيل هاتف المالك السيادي — إدخال واحد للفتح'}
            </p>
          </div>

          {/* Setup Type Selector Tabs (Only in Initial Setup Mode) */}
          {!isConfigured && setupStep === 'create' && (
            <div className="flex p-1 rounded-2xl bg-zinc-900 border border-zinc-800 my-2 w-full max-w-xs">
              <button
                type="button"
                onClick={() => { setSetupType('pattern'); setErrorMessage(''); }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  setupType === 'pattern'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>قفل النمط</span>
              </button>
              <button
                type="button"
                onClick={() => { setSetupType('pin'); setErrorMessage(''); }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  setupType === 'pin'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>الرقم السري (PIN)</span>
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="w-full max-w-xs py-2 px-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs text-center font-medium animate-shake flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ---------------- 3. LOCKOUT SCREEN (IF 5 FAILED ATTEMPTS) ---------------- */}
          {isLockedOut ? (
            <div className="my-auto py-8 px-6 text-center space-y-4 rounded-3xl bg-red-950/30 border border-red-500/30 w-full max-w-xs backdrop-blur-md">
              <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                <Lock className="w-8 h-8 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-red-400">
                  المحاولات كثيرة!
                </h3>
                <p className="text-xs text-zinc-300">
                  تم قفل شاشة الهاتف مؤقتاً لحماية المتجر.
                </p>
                <p className="text-lg font-mono font-bold text-amber-400 mt-2">
                  انتظر {lockoutRemaining} ثانية
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${(lockoutRemaining / 30) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            /* ---------------- 4. INTERACTIVE INPUT (PATTERN OR PIN) ---------------- */
            <div className="w-full my-auto flex flex-col items-center">
              {loading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-zinc-500">جارٍ قراءة حماية الهاتف من Firebase...</p>
                </div>
              ) : !isConfigured ? (
                /* Initial Setup Mode */
                setupType === 'pattern' ? (
                  <PatternGrid
                    onComplete={handleSetupEntry}
                    isError={isError}
                    onClear={() => setIsError(false)}
                  />
                ) : (
                  <PinKeypad
                    onComplete={handleSetupEntry}
                    pinLength={6}
                    isError={isError}
                    onClear={() => setIsError(false)}
                  />
                )
              ) : (
                /* Daily Unlock Mode (Single Entry) */
                activeLockType === 'pattern' ? (
                  <PatternGrid
                    onComplete={handleDailyEntry}
                    disabled={isLockedOut || isUnlockedSuccess}
                    isError={isError}
                    onClear={() => setIsError(false)}
                  />
                ) : (
                  <PinKeypad
                    onComplete={handleDailyEntry}
                    pinLength={6}
                    disabled={isLockedOut || isUnlockedSuccess}
                    isError={isError}
                    onClear={() => setIsError(false)}
                  />
                )
              )}
            </div>
          )}

          {/* ---------------- 5. BOTTOM ACTIONS & FORGOT CODE ---------------- */}
          <div className="w-full flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
            {/* Quick Helper button for returning to store */}
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              العودة للمتجر
            </button>

            {/* Forgot Code button */}
            {isConfigured && (
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-amber-400/90 hover:text-amber-300 hover:underline transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>هل نسيت الرمز؟</span>
              </button>
            )}

            {/* Reset in setup mode */}
            {!isConfigured && setupStep === 'confirm' && (
              <button
                type="button"
                onClick={() => { setSetupStep('create'); setTempFirstInput(''); }}
                className="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إعادة الرسم</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Phone Indicator Line */}
        <div className="w-32 h-1 bg-zinc-700/60 rounded-full mx-auto mb-2 pointer-events-none" />
      </div>

      {/* ---------------- 6. FORGOT CODE MODAL ---------------- */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-scale-up">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-white">
                إعادة ضبط رمز الحماية
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                لإعادة الضبط، يرجى تسجيل الدخول بحساب Google مرة أخرى (سيتم مسح الرمز الحالي وإعادة تعيين الحماية).
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowForgotModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleConfirmForgot}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isResetting ? 'جارٍ المسح...' : 'تسجيل خروج وإعادة الضبط'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
