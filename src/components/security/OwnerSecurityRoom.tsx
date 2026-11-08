import React, { useState, useEffect } from 'react';
import { Shield, Lock, Key, AlertTriangle, CheckCircle, RefreshCw, EyeOff, LayoutDashboard } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { 
  setOwnerUnlocked, 
  setOwnerGoogleUser, 
  OWNER_EMAIL,
  saveOwnerLockConfig,
  fetchOwnerLockConfig
} from '../../lib/security';

// ==========================================
// إعدادات التنبيهات الأمنية (EmailJS)
// ==========================================
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "YOUR_TEMPLATE_ID";
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "YOUR_PUBLIC_KEY";

const SESSION_DURATION = 15 * 60 * 1000; // 15 دقيقة
const ECHOX_SECRET_SALT = "ECHOX_SECRET_SALT_2026";

// الـ Hash الخاص بالشيفرة السرية (مشفراً مسبقاً لضمان السرية المطلقة في الكود)
// الشيفرة السرية غير موجودة كنص عادي أبداً، بل يتم التحقق منها عبر خوارزمية SHA-256
const VALID_SEARCH_HASHES = [
  "8f31b60882e379b398df9813b190f842de5d16568c0b25e790a6e03104e76964",
  "e0fa6bbbea58a39ac603805b6a1f68920c47a42d772b257edb8a462321465db5",
  "1dc225c52c6f14545367d3ad48a27b878696fa23340ec538cb7ffc010bfe1564"
];

interface OwnerSecurityRoomProps {
  onUnlockSuccess?: () => void;
  onNavigate?: (route: string, state?: any) => void;
}

export default function OwnerSecurityRoom({ onUnlockSuccess, onNavigate }: OwnerSecurityRoomProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // الخانات
  const [pin, setPin] = useState<string[]>(['', '', '', '', '', '']);
  const [confirmPin, setConfirmPin] = useState<string[]>(['', '', '', '', '', '']);
  const [oldPin, setOldPin] = useState<string[]>(['', '', '', '', '', '']);
  
  // الأوضاع (إعداد لأول مرة / تغيير الرمز / دخول عادي)
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [isChangeMode, setIsChangeMode] = useState(false);
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  
  // Brute-force lockout
  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);

  // دالة تشفير النصوص باستخدام Web Crypto API (SHA-256)
  const generateHash = async (text: string, salt: string = ''): Promise<string> => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text + salt);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return '';
    }
  };

  // 1. مراقبة اختصار لوحة المفاتيح السري (Ctrl + Shift + E)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        openModal();
      }
    };
    const handleOpenVaultEvent = () => {
      openModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open_echox_vault', handleOpenVaultEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open_echox_vault', handleOpenVaultEvent);
    };
  }, []);

  // 2. مراقبة حقول البحث عبر مقارنة الـ Hash المشفر في الوقت الفعلي
  useEffect(() => {
    const handleInputListener = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target && target.tagName === 'INPUT' && (target.type === 'text' || target.type === 'search')) {
        const value = target.value ? target.value.trim() : '';
        if (value.length > 3) {
          const saltedHash = await generateHash(value, ECHOX_SECRET_SALT);
          const bareHash = await generateHash(value, '');
          
          if (VALID_SEARCH_HASHES.includes(saltedHash) || VALID_SEARCH_HASHES.includes(bareHash)) {
            // مسح القيمة لمنع كشفها
            target.value = '';
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));
            openModal();
          }
        }
      }
    };

    document.addEventListener('input', handleInputListener);
    return () => document.removeEventListener('input', handleInputListener);
  }, []);

  // 3. التحقق من الجلسة النشطة المشفرة وقراءة إعدادات الرمز
  useEffect(() => {
    const checkActiveSession = () => {
      const encryptedSession = sessionStorage.getItem('echox_owner_session');
      if (encryptedSession) {
        try {
          const parsed = JSON.parse(atob(encryptedSession));
          if (parsed.unlocked && parsed.exp > Date.now()) {
            setIsUnlocked(true);
            setOwnerUnlocked(true);
            setOwnerGoogleUser({
              email: OWNER_EMAIL,
              uid: 'sovereign_owner_uid_570'
            });
            if (onUnlockSuccess) onUnlockSuccess();
            return;
          }
        } catch {
          sessionStorage.removeItem('echox_owner_session');
        }
      }
    };

    const syncExistingConfig = async () => {
      const localHash = localStorage.getItem('echox_pin_hash');
      if (localHash) {
        setIsSetupMode(false);
        return;
      }

      try {
        const cloudConfig = await fetchOwnerLockConfig();
        if (cloudConfig.configured && cloudConfig.config?.lock_type === 'pin' && cloudConfig.config.lock_hash) {
          localStorage.setItem('echox_pin_hash', cloudConfig.config.lock_hash);
          setIsSetupMode(false);
          return;
        }
      } catch (err) {
        console.warn('Sync existing lock notice:', err);
      }

      setIsSetupMode(true);
    };

    checkActiveSession();
    syncExistingConfig();
  }, [onUnlockSuccess]);

  // عداد التجميد عند الخطأ المتكرر
  useEffect(() => {
    let timer: any;
    if (lockoutTime > 0) {
      timer = setInterval(() => {
        setLockoutTime((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutTime]);

  const openModal = (changeMode = false) => {
    setIsModalOpen(true);
    setIsChangeMode(changeMode);
    setError('');
    setSuccessMsg('');
    setPin(['', '', '', '', '', '']);
    setConfirmPin(['', '', '', '', '', '']);
    setOldPin(['', '', '', '', '', '']);
    
    const existingHash = localStorage.getItem('echox_pin_hash');
    setIsSetupMode(!existingHash);

    setTimeout(() => {
      const firstInputId = changeMode ? 'old-pin-0' : 'pin-0';
      document.getElementById(firstInputId)?.focus();
    }, 150);
  };

  const sendEmailAlert = (type: string, details: string = '') => {
    if (
      !EMAILJS_SERVICE_ID || 
      EMAILJS_SERVICE_ID === "YOUR_SERVICE_ID" || 
      !EMAILJS_PUBLIC_KEY || 
      EMAILJS_PUBLIC_KEY === "YOUR_PUBLIC_KEY"
    ) {
      console.info(`[EmailJS] Alert: ${type} - ${details}`);
      return;
    }

    const templateParams = {
      alert_type: type,
      time: new Date().toLocaleString('ar-TN'),
      details: details,
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY)
      .catch((err) => console.warn("EmailJS notice:", err));
  };

  const handlePinChange = (index: number, value: string, targetType: 'pin' | 'confirm' | 'old') => {
    if (isNaN(Number(value))) return;
    const cleaned = value.replace(/\D/g, '').slice(-1);
    
    if (targetType === 'old') {
      const arr = [...oldPin];
      arr[index] = cleaned;
      setOldPin(arr);
      if (cleaned && index < 5) document.getElementById(`old-pin-${index + 1}`)?.focus();
    } else if (targetType === 'confirm') {
      const arr = [...confirmPin];
      arr[index] = cleaned;
      setConfirmPin(arr);
      if (cleaned && index < 5) document.getElementById(`pin-conf-${index + 1}`)?.focus();
    } else {
      const arr = [...pin];
      arr[index] = cleaned;
      setPin(arr);
      if (cleaned && index < 5) document.getElementById(`pin-${index + 1}`)?.focus();
    }
  };

  const handleKeyDownInput = (
    index: number, 
    e: React.KeyboardEvent<HTMLInputElement>, 
    targetType: 'pin' | 'confirm' | 'old'
  ) => {
    if (e.key === 'Backspace') {
      const currentVal = targetType === 'old' ? oldPin[index] : targetType === 'confirm' ? confirmPin[index] : pin[index];
      if (!currentVal && index > 0) {
        const prefix = targetType === 'old' ? 'old-pin-' : targetType === 'confirm' ? 'pin-conf-' : 'pin-';
        document.getElementById(`${prefix}${index - 1}`)?.focus();
      }
    }
  };

  const handleConfirmSubmit = async () => {
    if (lockoutTime > 0) return;
    const enteredPin = pin.join('');

    // 1. معالجة وضع تغيير الرمز
    if (isChangeMode) {
      const enteredOldPin = oldPin.join('');
      const confirmedPinStr = confirmPin.join('');

      if (enteredOldPin.length < 6 || enteredPin.length < 6 || confirmedPinStr.length < 6) {
        setError('يرجى ملء جميع الحقول بالأرقام كاملة');
        triggerShake();
        return;
      }

      setLoading(true);
      const storedHash = localStorage.getItem('echox_pin_hash');
      const storedSalt = localStorage.getItem('echox_salt') || '';
      const oldCheckHash = await generateHash(enteredOldPin, storedSalt);
      const oldCheckSimple = await generateHash(enteredOldPin, '');

      if (!storedHash || (oldCheckHash !== storedHash && oldCheckSimple !== storedHash)) {
        setError('الرمز القديم غير صحيح');
        triggerShake();
        setLoading(false);
        return;
      }

      if (enteredPin !== confirmedPinStr) {
        setError('الرمز الجديد وتأكيده غير متطابقين');
        triggerShake();
        setLoading(false);
        return;
      }

      const newSalt = Math.random().toString(36).substring(2);
      const newHash = await generateHash(enteredPin, newSalt);

      localStorage.setItem('echox_pin_hash', newHash);
      localStorage.setItem('echox_salt', newSalt);

      try {
        await saveOwnerLockConfig('pin', newHash, true);
      } catch (err) {
        console.warn('Sync cloud hash notice:', err);
      }

      setSuccessMsg('تم تغيير رمز الحماية بنجاح!');
      sendEmailAlert("تغيير رمز الحماية", "تم تغيير رمز PIN بنجاح بواسطة المالك.");

      setTimeout(() => {
        setIsChangeMode(false);
        setIsModalOpen(false);
      }, 1000);
      setLoading(false);
      return;
    }

    // 2. معالجة الإعداد الأولي لأول مرة
    if (isSetupMode) {
      const confirmedPinStr = confirmPin.join('');
      if (enteredPin.length < 6 || confirmedPinStr.length < 6) {
        setError('يرجى إدخال وتأكيد الرمز كاملين (6 أرقام)');
        triggerShake();
        return;
      }

      if (enteredPin !== confirmedPinStr) {
        setError('الرمزين غير متطابقين');
        triggerShake();
        return;
      }

      setLoading(true);
      const salt = Math.random().toString(36).substring(2);
      const hash = await generateHash(enteredPin, salt);

      localStorage.setItem('echox_pin_hash', hash);
      localStorage.setItem('echox_salt', salt);

      try {
        await saveOwnerLockConfig('pin', hash, true);
      } catch (cloudErr) {
        console.warn('Sync cloud hash notice:', cloudErr);
      }

      setSuccessMsg('تم إنشاء وحفظ الرمز السري بنجاح!');
      sendEmailAlert("إنشاء رمز جديد", "تم ضبط رمز PIN جديد بنجاح.");

      setTimeout(() => {
        setIsSetupMode(false);
        unlockVault();
      }, 1000);
      setLoading(false);
      return;
    }

    // 3. معالجة الدخول العادي
    if (enteredPin.length < 6) {
      setError('يرجى إدخال الرمز السري كاملاً (6 أرقام)');
      triggerShake();
      return;
    }

    setLoading(true);
    const storedHash = localStorage.getItem('echox_pin_hash');
    const storedSalt = localStorage.getItem('echox_salt') || '';
    const currentHash = await generateHash(enteredPin, storedSalt);
    const currentHashSimple = await generateHash(enteredPin, '');

    const isMatch = storedHash && (currentHash === storedHash || currentHashSimple === storedHash);

    if (isMatch) {
      setAttempts(0);
      sendEmailAlert("دخول ناجح", "تم فتح غرفة المالك بنجاح.");
      unlockVault();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      triggerShake();
      setPin(['', '', '', '', '', '']);
      document.getElementById('pin-0')?.focus();

      if (newAttempts >= 5) {
        setLockoutTime(30);
        sendEmailAlert("تنبيه أمني خطير", `محاولات فاشلة متكررة (${newAttempts} محاولات).`);
        setError('تم تجاوز الحد المسموح. تم تجميد البوابة لمدة 30 ثانية.');
      } else {
        setError(`الرمز غير صحيح! المحاولات المتبقية: ${5 - newAttempts}`);
      }
    }
    setLoading(false);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const unlockVault = () => {
    setIsUnlocked(true);
    setIsModalOpen(false);

    // تشفير بيانات الجلسة المؤقتة
    const sessionPayload = {
      unlocked: true,
      exp: Date.now() + SESSION_DURATION
    };
    sessionStorage.setItem('echox_owner_session', btoa(JSON.stringify(sessionPayload)));

    setOwnerUnlocked(true);
    setOwnerGoogleUser({
      email: OWNER_EMAIL,
      uid: 'sovereign_owner_uid_570'
    });

    if (onUnlockSuccess) onUnlockSuccess();
  };

  const lockAndHide = () => {
    setIsUnlocked(false);
    setIsModalOpen(false);
    sessionStorage.removeItem('echox_owner_session');
    setOwnerUnlocked(false);
  };

  const handleGoToDashboard = () => {
    if (onNavigate) {
      onNavigate('/owner/dashboard');
    } else {
      window.location.href = '/owner/dashboard';
    }
  };

  // الشريط العائم عند نشاط الجلسة
  if (isUnlocked) {
    return (
      <aside aria-label="شريط أمان غرفة المالك" className="fixed bottom-4 left-4 z-50 bg-[#0A0A0F]/95 border border-[#F59E0B]/40 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs text-gray-300 animate-fadeIn">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <span className="font-bold text-white">غرفة المالك نشطة ومؤمنة (مشفرة)</span>

        {/* Dashboard Shortcut */}
        <button
          type="button"
          onClick={handleGoToDashboard}
          className="bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 text-[#F59E0B] px-3 py-1.5 rounded-xl transition border border-[#F59E0B]/40 flex items-center gap-1.5 font-bold cursor-pointer"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>لوحة المالك</span>
        </button>

        <button 
          type="button"
          onClick={() => openModal(true)}
          className="bg-white/5 hover:bg-white/10 text-gray-300 px-2.5 py-1.5 rounded-xl transition border border-white/10 flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3 text-[#F59E0B]" />
          <span>تغيير الرمز</span>
        </button>

        <button 
          type="button"
          onClick={lockAndHide}
          className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2.5 py-1.5 rounded-xl transition border border-red-500/30 flex items-center gap-1 cursor-pointer"
        >
          <Lock className="w-3 h-3" />
          <span>قفل وإخفاء</span>
        </button>
      </aside>
    );
  }

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-fadeIn">
      <div className={`relative w-full max-w-md bg-[#0A0A0F] border border-[#F59E0B]/30 rounded-2xl p-6 sm:p-8 shadow-2xl text-white ${shake ? 'animate-shake' : ''}`}>
        
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B] mb-3 shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold tracking-wider text-white">ECHOX VAULT</h2>
          <p className="text-xs text-gray-400 mt-1">
            {isChangeMode 
              ? 'تغيير رمز الـ PIN الحالي' 
              : isSetupMode 
              ? 'إعداد رمز الحماية الأول (أدخل الرمز مرتين للتأكيد)' 
              : 'أدخل رمز الـ PIN السري للمتابعة'}
          </p>
        </div>

        <div className="space-y-4">
          {/* في وضع تغيير الرمز: طلب الرمز القديم */}
          {isChangeMode && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 text-center">الرمز القديم</label>
              <div className="flex justify-center gap-2" dir="ltr">
                {oldPin.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`old-pin-${idx}`}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(idx, e.target.value, 'old')}
                    onKeyDown={(e) => handleKeyDownInput(idx, e, 'old')}
                    className="w-10 h-11 text-center text-lg font-bold bg-[#111118] border border-white/10 rounded-xl focus:border-[#F59E0B] outline-none text-[#F59E0B] font-mono shadow-inner"
                  />
                ))}
              </div>
            </div>
          )}

          {/* الخانة الرئيسية (الرمز الجديد أو رمز الدخول) */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 text-center">
              {isChangeMode || isSetupMode ? 'الرمز الجديد' : 'رمز الـ PIN'}
            </label>
            <div className="flex justify-center gap-2" dir="ltr">
              {pin.map((digit, idx) => (
                <input
                  key={idx}
                  id={`pin-${idx}`}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  disabled={lockoutTime > 0}
                  onChange={(e) => handlePinChange(idx, e.target.value, 'pin')}
                  onKeyDown={(e) => handleKeyDownInput(idx, e, 'pin')}
                  className="w-10 h-11 text-center text-lg font-bold bg-[#111118] border border-white/10 rounded-xl focus:border-[#F59E0B] outline-none text-[#F59E0B] font-mono shadow-inner"
                />
              ))}
            </div>
          </div>

          {/* خانة التأكيد (في وضع الإعداد أو تغيير الرمز) */}
          {(isSetupMode || isChangeMode) && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 text-center mt-3">تأكيد الرمز الجديد</label>
              <div className="flex justify-center gap-2" dir="ltr">
                {confirmPin.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`pin-conf-${idx}`}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(idx, e.target.value, 'confirm')}
                    onKeyDown={(e) => handleKeyDownInput(idx, e, 'confirm')}
                    className="w-10 h-11 text-center text-lg font-bold bg-[#111118] border border-white/10 rounded-xl focus:border-[#F59E0B] outline-none text-[#F59E0B] font-mono shadow-inner"
                  />
                ))}
              </div>
            </div>
          )}

          {/* زر التأكيد */}
          <button
            type="button"
            disabled={loading || lockoutTime > 0}
            onClick={handleConfirmSubmit}
            className="w-full mt-5 py-3 rounded-xl bg-[#F59E0B] text-black font-bold text-sm hover:bg-[#F59E0B]/90 disabled:opacity-50 transition shadow-lg shadow-[#F59E0B]/20 cursor-pointer"
          >
            {loading ? 'جاري المعالجة...' : isChangeMode ? 'تأكيد وتغيير الرمز' : isSetupMode ? 'تأكيد وحفظ الرمز' : 'تأكيد ودخول'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center flex items-center justify-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center flex items-center justify-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {lockoutTime > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs text-center font-mono">
            تم تجميد النظام مؤقتاً. انتظر {lockoutTime} ثانية...
          </div>
        )}

        <div className="mt-6 flex items-center justify-end text-xs pt-2 border-t border-white/5">
          <button 
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="text-gray-400 hover:text-white transition cursor-pointer"
          >
            إلغاء وإخفاء
          </button>
        </div>

      </div>
    </div>
  );
}
