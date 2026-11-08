import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Grid3X3, 
  LogOut, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronLeft, 
  Smartphone, 
  Clock, 
  RefreshCw,
  X
} from 'lucide-react';
import { 
  fetchOwnerLockConfig, 
  saveOwnerLockConfig, 
  verifyOwnerLockInput, 
  logoutAllDevices,
  setOwnerUnlocked,
  OwnerLockConfig
} from '../../lib/security';
import { PatternGrid } from './PatternGrid';
import { PinKeypad } from './PinKeypad';

interface OwnerSecuritySettingsProps {
  onNavigate?: (route: string, state?: any) => void;
}

export const OwnerSecuritySettings: React.FC<OwnerSecuritySettingsProps> = ({ onNavigate }) => {
  const [config, setConfig] = useState<OwnerLockConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeLockType, setActiveLockType] = useState<'pattern' | 'pin'>('pattern');
  const [failedAttempts, setFailedAttempts] = useState<Array<{ timestamp: string; type: string }>>([]);

  // Change code modal state
  const [showChangeModal, setShowChangeModal] = useState<boolean>(false);
  const [targetType, setTargetType] = useState<'pattern' | 'pin'>('pattern');
  const [step, setStep] = useState<'verify_old' | 'enter_new' | 'confirm_new'>('verify_old');
  
  const [tempNewInput, setTempNewInput] = useState<string>('');
  const [modalError, setModalError] = useState<string>('');
  const [modalSuccess, setModalSuccess] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Status messages
  const [globalMessage, setGlobalMessage] = useState<string>('');
  const [globalError, setGlobalError] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchOwnerLockConfig();
      if (res.config) {
        setConfig(res.config);
        setActiveLockType(res.config.lock_type || 'pattern');
        setFailedAttempts(res.config.failed_attempts || []);
      }
    } catch (e) {
      console.warn('Error loading security settings:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Start Change Flow
  const startChangeFlow = (type: 'pattern' | 'pin') => {
    setTargetType(type);
    setStep('verify_old');
    setTempNewInput('');
    setModalError('');
    setModalSuccess('');
    setShowChangeModal(true);
  };

  // Step 1: Verify current code
  const handleVerifyOld = async (input: string) => {
    setModalError('');
    if (!config || (!config.lock_hash && !config.code_hash)) {
      // If never configured, proceed directly to new
      setStep('enter_new');
      return;
    }

    const currentHash = config.lock_hash || config.code_hash || '';
    const res = await verifyOwnerLockInput(input, currentHash, config.lock_type || 'pattern');

    if (res.success) {
      setModalError('');
      setStep('enter_new');
    } else {
      setModalError('الرمز الحالي غير صحيح! يرجى المحاولة مجدداً.');
    }
  };

  // Step 2: Enter New
  const handleEnterNew = (input: string) => {
    setModalError('');
    if (targetType === 'pattern' && input.split('-').length < 4) {
      setModalError('يجب وصل 4 نقاط على الأقل للنمط');
      return;
    }
    setTempNewInput(input);
    setStep('confirm_new');
  };

  // Step 3: Confirm & Save to Firebase
  const handleConfirmNew = async (input: string) => {
    setModalError('');
    if (input !== tempNewInput) {
      setModalError('الرمز الجديد غير متطابق! يرجى إعادة المحاولة.');
      setTimeout(() => {
        setStep('enter_new');
        setTempNewInput('');
      }, 800);
      return;
    }

    setIsSubmitting(true);
    try {
      await saveOwnerLockConfig(targetType, input);
      setModalSuccess(`تم تغيير وتشفير ${targetType === 'pattern' ? 'نمط القفل' : 'الرقم السري'} بنجاح في Firebase!`);
      await loadData();

      setTimeout(() => {
        setShowChangeModal(false);
        setGlobalMessage('تم تحديث إعدادات الأمان بنجاح.');
        setTimeout(() => setGlobalMessage(''), 3000);
      }, 1200);
    } catch (err: any) {
      setModalError('فشل حفظ الرمز الجديد في قاعدة البيانات.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sign out all devices
  const handleLogoutAll = async () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في تسجيل الخروج من جميع الأجهزة والجلسات؟')) {
      return;
    }
    await logoutAllDevices();
    if (onNavigate) {
      onNavigate('/owner/login');
    } else {
      window.location.href = '/owner/login';
    }
  };

  // Lock Screen Now
  const handleLockNow = () => {
    setOwnerUnlocked(false);
    if (onNavigate) {
      onNavigate('/owner/lock');
    } else {
      window.location.href = '/owner/lock';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-slate-900">
      
      {/* iOS Settings Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-black text-amber-400 border border-zinc-800 flex items-center justify-center shadow-md">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">
              الأمان والخصوصية
            </h2>
            <p className="text-xs text-slate-500">
              إعدادات حماية غرفة المالك بنظام تشغيل الهاتف (OS Lock Screen)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLockNow}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-amber-400 font-bold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>قفل الشاشة الآن</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {globalMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{globalMessage}</span>
        </div>
      )}

      {/* Group 1: Lock Type & Change Buttons (iPhone Settings Card) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            طريقة قفل الشاشة (Lock Mechanism)
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {/* Current Active Type Row */}
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                {activeLockType === 'pattern' ? (
                  <Grid3X3 className="w-5 h-5" />
                ) : (
                  <KeyRound className="w-5 h-5" />
                )}
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">النوع المفعل حالياً:</span>
                <p className="text-sm font-bold text-slate-900">
                  {activeLockType === 'pattern' ? 'قفل النمط (Pattern 3x3)' : 'الرقم السري (PIN Code)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                مشفر بـ SHA-256
              </span>
            </div>
          </div>

          {/* Action Row: Change Pattern */}
          <div className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <Grid3X3 className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs font-bold text-slate-800">تغيير نمط القفل</p>
                <p className="text-[11px] text-slate-400">إعادة رسم نمط النقاط وتحديث التشفير</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => startChangeFlow('pattern')}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-[#FF6B00] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              تغيير النمط
            </button>
          </div>

          {/* Action Row: Change PIN */}
          <div className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs font-bold text-slate-800">تغيير الرقم السري (PIN)</p>
                <p className="text-[11px] text-slate-400">تعيين رقم سري جديد من 6 خانات</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => startChangeFlow('pin')}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-[#FF6B00] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              تغيير الرقم السري
            </button>
          </div>
        </div>
      </div>

      {/* Group 2: Failed Attempts Log (iPhone Settings Group) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>سجل المحاولات الفاشلة (آخر 5 محاولات)</span>
          </h3>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            نظام الحماية من التخمين
          </span>
        </div>

        <div className="p-6">
          {failedAttempts.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-700">لا توجد محاولات فاشلة مسجلة</p>
              <p className="text-[11px] text-slate-400">النظام آمن تماماً ولم يتم رصد أي محاولات تخمين غير صحيحة.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-3">
                يتم قفل الشاشة تلقائياً لمدة 30 ثانية في حال حدوث 5 محاولات متتالية خاطئة.
              </p>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {failedAttempts.slice(0, 5).map((attempt, index) => {
                  const attemptDate = new Date(attempt.timestamp);
                  return (
                    <div key={index} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-[10px] font-mono font-bold">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800">
                            محاولة فاشلة ({attempt.type === 'pin' ? 'رقم سري' : 'قفل نمط'})
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono" dir="ltr">
                            {attemptDate.toLocaleString('ar-TN')}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                        مرفوضة
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Group 3: Device Sessions & Logout (iPhone Destructive Actions) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            الجلسات والأجهزة (Sessions)
          </h3>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900">تسجيل الخروج من جميع الأجهزة</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                إلغاء كافة الجلسات النشطة على كل المتصفحات ومسح الـ Cookies المشفرة فوراً.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogoutAll}
              className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-600 hover:text-white text-red-600 border border-red-200 text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج من جميع الأجهزة</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- CHANGE CODE MODAL (3-STEP OS FLOW) ---------------- */}
      {showChangeModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-sm sm:max-w-md bg-black rounded-[40px] border border-zinc-800 shadow-2xl p-6 text-white space-y-4 flex flex-col items-center">
            
            {/* Modal Header */}
            <div className="w-full flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="text-xs font-bold text-amber-400">
                {targetType === 'pattern' ? 'تغيير نمط القفل' : 'تغيير الرقم السري'}
              </span>
              <button
                type="button"
                onClick={() => setShowChangeModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400">
              <span className={step === 'verify_old' ? 'text-amber-400' : 'text-zinc-600'}>1. الرمز الحالي</span>
              <span>›</span>
              <span className={step === 'enter_new' ? 'text-amber-400' : 'text-zinc-600'}>2. الرمز الجديد</span>
              <span>›</span>
              <span className={step === 'confirm_new' ? 'text-amber-400' : 'text-zinc-600'}>3. التأكيد</span>
            </div>

            {/* Step Title */}
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">
                {step === 'verify_old' && 'أدخل الرمز الحالي أولاً'}
                {step === 'enter_new' && `أدخل ${targetType === 'pattern' ? 'النمط الجديد' : 'الرقم السري الجديد'}`}
                {step === 'confirm_new' && `أعد إدخال ${targetType === 'pattern' ? 'النمط الجديد' : 'الرقم السري للتأكيد'}`}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {step === 'verify_old' && 'للتحقق من هويتك كمالك للنظام'}
                {step === 'enter_new' && 'حدد الرمز الجديد المراد اعتماده'}
                {step === 'confirm_new' && 'للتأكد من صحة التعيين قبل التشفير'}
              </p>
            </div>

            {/* Error / Success Feedback */}
            {modalError && (
              <div className="w-full py-2 px-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs text-center font-medium animate-shake">
                {modalError}
              </div>
            )}
            {modalSuccess && (
              <div className="w-full py-2 px-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs text-center font-medium">
                {modalSuccess}
              </div>
            )}

            {/* Interactive Component for Current Step */}
            <div className="w-full py-2 flex flex-col items-center">
              {step === 'verify_old' ? (
                config?.lock_type === 'pin' ? (
                  <PinKeypad
                    onComplete={handleVerifyOld}
                    pinLength={6}
                    isError={!!modalError}
                    onClear={() => setModalError('')}
                  />
                ) : (
                  <PatternGrid
                    onComplete={handleVerifyOld}
                    isError={!!modalError}
                    onClear={() => setModalError('')}
                  />
                )
              ) : step === 'enter_new' ? (
                targetType === 'pin' ? (
                  <PinKeypad
                    onComplete={handleEnterNew}
                    pinLength={6}
                    isError={!!modalError}
                    onClear={() => setModalError('')}
                  />
                ) : (
                  <PatternGrid
                    onComplete={handleEnterNew}
                    isError={!!modalError}
                    onClear={() => setModalError('')}
                  />
                )
              ) : (
                targetType === 'pin' ? (
                  <PinKeypad
                    onComplete={handleConfirmNew}
                    pinLength={6}
                    disabled={isSubmitting}
                    isError={!!modalError}
                    onClear={() => setModalError('')}
                  />
                ) : (
                  <PatternGrid
                    onComplete={handleConfirmNew}
                    disabled={isSubmitting}
                    isError={!!modalError}
                    onClear={() => setModalError('')}
                  />
                )
              )}
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => setShowChangeModal(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300 pt-1 cursor-pointer"
            >
              إلغاء التغيير
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
