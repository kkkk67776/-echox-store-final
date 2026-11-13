import React, { useState, useEffect } from 'react';
import { Shield, Lock, AlertTriangle, CheckCircle, RefreshCw, LayoutDashboard } from 'lucide-react';
import emailjs from '@emailjs/browser';
import {
  setOwnerUnlocked,
  setOwnerGoogleUser,
  OWNER_EMAIL,
  verifyPinServer,
  updatePinServer,
} from '../../lib/security';

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

const SESSION_DURATION = 15 * 60 * 1000;

interface OwnerSecurityRoomProps {
  onUnlockSuccess?: () => void;
  onNavigate?: (route: string, state?: any) => void;
}

export default function OwnerSecurityRoom({ onUnlockSuccess, onNavigate }: OwnerSecurityRoomProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [pin, setPin] = useState<string[]>(['', '', '', '', '', '']);
  const [confirmPin, setConfirmPin] = useState<string[]>(['', '', '', '', '', '']);
  const [oldPin, setOldPin] = useState<string[]>(['', '', '', '', '', '']);

  const [isChangeMode, setIsChangeMode] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        openModal(false);
      }
    };
    const handleOpenVaultEvent = () => {
      openModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open_echox_vault', handleOpenVaultEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open_echox_vault', handleOpenVaultEvent);
    };
  }, []);

  useEffect(() => {
    const encryptedSession = sessionStorage.getItem('echox_owner_session');
    if (encryptedSession) {
      try {
        const parsed = JSON.parse(atob(encryptedSession));
        if (parsed.unlocked && parsed.exp > Date.now()) {
          setIsUnlocked(true);
          setOwnerUnlocked(true);
          setOwnerGoogleUser({
            email: OWNER_EMAIL,
            uid: 'sovereign_owner_uid_570',
          });
          if (onUnlockSuccess) onUnlockSuccess();
          return;
        }
      } catch {
        sessionStorage.removeItem('echox_owner_session');
      }
    }
  }, [onUnlockSuccess]);

  useEffect(() => {
    if (lockoutTime <= 0) return;
    const timer = setInterval(() => {
      setLockoutTime((prev) => Math.max(0, prev - 1));
    }, 1000);
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

    setTimeout(() => {
      const firstInputId = changeMode ? 'old-pin-0' : 'pin-0';
      document.getElementById(firstInputId)?.focus();
    }, 150);
  };

  const sendEmailAlert = (type: string, details: string = '') => {
    if (
      !EMAILJS_SERVICE_ID ||
      EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID' ||
      !EMAILJS_PUBLIC_KEY ||
      EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY'
    ) {
      return;
    }

    const templateParams = {
      alert_type: type,
      time: new Date().toLocaleString('ar-TN'),
      details,
    };

    emailjs
      .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY)
      .catch((err) => console.warn('EmailJS notice:', err));
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
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmSubmit();
      return;
    }
    if (e.key === 'Backspace') {
      const currentVal =
        targetType === 'old' ? oldPin[index] : targetType === 'confirm' ? confirmPin[index] : pin[index];
      if (!currentVal && index > 0) {
        const prefix = targetType === 'old' ? 'old-pin-' : targetType === 'confirm' ? 'pin-conf-' : 'pin-';
        document.getElementById(`${prefix}${index - 1}`)?.focus();
      }
    }
  };

  const handleConfirmSubmit = async () => {
    if (lockoutTime > 0 || loading) return;
    const enteredPin = pin.join('');

    if (isChangeMode) {
      const enteredOldPin = oldPin.join('');
      const confirmedPinStr = confirmPin.join('');

      if (enteredOldPin.length < 6 || enteredPin.length < 6 || confirmedPinStr.length < 6) {
        setError('يرجى ملء جميع الحقول بالأرقام كاملة (6 أرقام)');
        triggerShake();
        return;
      }

      if (enteredPin !== confirmedPinStr) {
        setError('الرمز الجديد وتأكيده غير متطابقين');
        triggerShake();
        return;
      }

      setLoading(true);
      setError('');
      const updateResult = await updatePinServer(enteredOldPin, enteredPin);
      setLoading(false);

      if (!updateResult.success) {
        setError(updateResult.error || 'تعذر تحديث رمز الـ PIN على الخادم');
        triggerShake();
        return;
      }

      setSuccessMsg(updateResult.message || 'تم تغيير رمز الحماية بنجاح على الخادم عبر Argon2id!');
      sendEmailAlert('تغيير رمز الحماية', 'تم تغيير رمز PIN لمركز التحكم بنجاح.');

      setTimeout(() => {
        setIsChangeMode(false);
        setIsModalOpen(false);
      }, 1000);
      return;
    }

    if (enteredPin.length < 6) {
      setError('يرجى إدخال رمز PIN كاملاً (6 أرقام)');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');
    const serverResult = await verifyPinServer(enteredPin);

    if (serverResult.success) {
      setAttempts(0);
      sendEmailAlert('دخول ناجح', 'تم فتح مركز التحكم بنجاح.');
      unlockVault();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      triggerShake();
      setPin(['', '', '', '', '', '']);
      document.getElementById('pin-0')?.focus();

      if (serverResult.lockedOut) {
        setLockoutTime(serverResult.remainingSeconds || 30);
        sendEmailAlert('تنبيه أمني خطير', `محاولات فاشلة متكررة (${newAttempts} محاولات).`);
        setError(serverResult.error || 'تم تجاوز الحد المسموح. تم تجميد البوابة لمدة 30 ثانية.');
      } else {
        setError(
          serverResult.error ||
            `الرمز غير صحيح! المحاولات المتبقية: ${serverResult.attemptsLeft ?? Math.max(0, 5 - newAttempts)}`
        );
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

    const sessionPayload = {
      unlocked: true,
      exp: Date.now() + SESSION_DURATION,
    };
    sessionStorage.setItem('echox_owner_session', btoa(JSON.stringify(sessionPayload)));

    setOwnerUnlocked(true);
    setOwnerGoogleUser({
      email: OWNER_EMAIL,
      uid: 'sovereign_owner_uid_570',
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

  if (isUnlocked) {
    return (
      <aside
        aria-label="شريط أمان مركز التحكم"
        className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-50 bg-[#0A0A0F]/95 border border-[#F59E0B]/40 backdrop-blur-md px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 sm:gap-3 text-xs text-gray-300 animate-fadeIn max-w-[calc(100vw-1.5rem)]"
      >
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <span className="font-bold text-white">مركز التحكم نشط ومؤمن (Argon2id)</span>

        <button
          type="button"
          onClick={handleGoToDashboard}
          className="bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 text-[#F59E0B] px-3 py-1.5 rounded-xl transition border border-[#F59E0B]/40 flex items-center gap-1.5 font-bold cursor-pointer"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>مركز التحكم</span>
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
      <div
        className={`relative w-full max-w-md bg-[#0A0A0F] border border-[#F59E0B]/30 rounded-2xl p-6 sm:p-8 shadow-2xl text-white ${
          shake ? 'animate-shake' : ''
        }`}
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B] mb-3 shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold tracking-wider text-white">ECHOX VAULT</h2>
          <p className="text-xs text-gray-400 mt-1">
            {isChangeMode ? 'تغيير رمز الـ PIN الحالي' : 'أدخل رمز الـ PIN السري للمتابعة إلى مركز التحكم'}
          </p>
        </div>

        <div className="space-y-4">
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

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 text-center">
              {isChangeMode ? 'الرمز الجديد' : 'رمز الـ PIN'}
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

          {isChangeMode && (
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

          <button
            type="button"
            disabled={loading || lockoutTime > 0}
            onClick={handleConfirmSubmit}
            className="w-full mt-5 py-3 rounded-xl bg-[#F59E0B] text-black font-bold text-sm hover:bg-[#F59E0B]/90 disabled:opacity-50 transition shadow-lg shadow-[#F59E0B]/20 cursor-pointer"
          >
            {loading ? 'جاري التحقق عبر الخادم...' : isChangeMode ? 'تأكيد وتغيير الرمز' : 'تأكيد ودخول'}
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
