// ECHOX OWNER SECURITY Client-Side Provider & Helpers
import { auth } from './firebase';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult, 
  UserCredential 
} from 'firebase/auth';

export const OWNER_EMAIL = 'abdelkaderbahri570@gmail.com';
export const OWNER_PHONE_MASKED = '+216 *** *** 62';
export const OWNER_PHONE_FULL = '+21621511162';

export interface OwnerAuthState {
  currentUser: { email: string; uid: string } | null;
  customClaims: { owner?: boolean };
}

// Memory & Session storage key for Google user
const GOOGLE_USER_KEY = 'echox_owner_google_user';
const CUSTOM_CLAIMS_KEY = 'echox_owner_custom_claims';

export function getOwnerGoogleUser(): { email: string; uid: string } | null {
  const raw = sessionStorage.getItem(GOOGLE_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setOwnerGoogleUser(user: { email: string; uid: string } | null) {
  if (user) {
    sessionStorage.setItem(GOOGLE_USER_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(GOOGLE_USER_KEY);
  }
}

export function getOwnerCustomClaims(): { owner?: boolean } {
  const raw = sessionStorage.getItem(CUSTOM_CLAIMS_KEY);
  return raw ? JSON.parse(raw) : {};
}

export function setOwnerCustomClaims(claims: { owner?: boolean }) {
  sessionStorage.setItem(CUSTOM_CLAIMS_KEY, JSON.stringify(claims));
}

export function clearOwnerSecuritySession() {
  sessionStorage.removeItem(GOOGLE_USER_KEY);
  sessionStorage.removeItem(CUSTOM_CLAIMS_KEY);
  if (window.confirmationResult) {
    delete window.confirmationResult;
  }
}

// Firebase Phone Authentication (SMS with RecaptchaVerifier)
export async function sendFirebasePhoneOtp(buttonOrContainerId: string = 'recaptcha-container'): Promise<ConfirmationResult> {
  try {
    // Clear any previous verifier if container changed
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, buttonOrContainerId, {
        size: 'invisible',
        callback: () => {
          console.log('[Firebase Auth] reCAPTCHA solved for Phone Auth');
        },
        'expired-callback': () => {
          console.warn('[Firebase Auth] reCAPTCHA response expired. Please retry.');
        }
      });
    }

    const appVerifier = window.recaptchaVerifier;
    const confirmationResult = await signInWithPhoneNumber(auth, OWNER_PHONE_FULL, appVerifier);
    window.confirmationResult = confirmationResult;
    return confirmationResult;
  } catch (err: any) {
    console.warn('[Firebase Phone Auth] Notice:', err?.code || err?.message || err);
    throw err;
  }
}

export async function confirmFirebasePhoneOtp(code: string): Promise<UserCredential> {
  if (!window.confirmationResult) {
    throw new Error('لم يتم العثور على جلسة إرسال SMS نشطة. يرجى طلب الرمز أولاً.');
  }
  return await window.confirmationResult.confirm(code);
}

// Backend API Callers
export async function sendOtpCall(email: string) {
  const res = await fetch('/api/sendOtp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'تعذر إرسال الرمز. يرجى مراجعة إعدادات Firebase.');
  }
  return data;
}

export async function verifyOtpCall(otp: string, email: string) {
  const res = await fetch('/api/verifyOtp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ otp, email }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'الرمز غير صحيح أو منتهي الصلاحية.');
  }
  return data;
}

export async function createOwnerSessionCall(email: string, customToken: string) {
  const res = await fetch('/api/createOwnerSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email, customToken }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'فشل إنشاء الجلسة.');
  }
  return data;
}

export async function checkServerSession() {
  try {
    const res = await fetch('/api/owner/me', {
      credentials: 'same-origin',
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.authenticated === true && data.owner === true;
  } catch {
    return false;
  }
}

export async function logoutOwnerServer() {
  try {
    await fetch('/api/owner/logout', {
      method: 'POST',
      credentials: 'same-origin',
    });
  } catch {
    // silent
  }
  clearOwnerSecuritySession();
}
