import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
    recaptchaWidgetId?: any;
  }
}

import firebaseConfigJson from '../../firebase-applet-config.json';

// Robust config helper to ignore placeholders like 'your_api_key'
function getSafeConfig(envVal: string | undefined, jsonVal: string | undefined, hardcodedFallback: string): string {
  if (envVal && !envVal.startsWith('your_') && !envVal.startsWith('MY_') && !envVal.startsWith('VITE_') && envVal.trim().length > 0) {
    return envVal.trim();
  }
  if (jsonVal && !jsonVal.startsWith('your_') && !jsonVal.startsWith('MY_') && jsonVal.trim().length > 0) {
    return jsonVal.trim();
  }
  return hardcodedFallback;
}

const firestoreDatabaseId = getSafeConfig(
  import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
  firebaseConfigJson.firestoreDatabaseId,
  "ai-studio-echoxstore-9e1d54e8-7960-44b2-951a-524166c61a13"
);

const firebaseConfig = {
  apiKey: getSafeConfig(import.meta.env.VITE_FIREBASE_API_KEY, firebaseConfigJson.apiKey, "AIzaSyDoMctR2qL8S6_jU_xhiLxESDUX3edXFXg"),
  authDomain: getSafeConfig(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, firebaseConfigJson.authDomain, "gen-lang-client-0499444627.firebaseapp.com"),
  projectId: getSafeConfig(import.meta.env.VITE_FIREBASE_PROJECT_ID, firebaseConfigJson.projectId, "gen-lang-client-0499444627"),
  storageBucket: getSafeConfig(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, firebaseConfigJson.storageBucket, "gen-lang-client-0499444627.firebasestorage.app"),
  messagingSenderId: getSafeConfig(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, firebaseConfigJson.messagingSenderId, "977393142069"),
  appId: getSafeConfig(import.meta.env.VITE_FIREBASE_APP_ID, firebaseConfigJson.appId, "1:977393142069:web:9fc62b5cd1bbd0488f247c"),
};

console.log('[Firebase Init] Initializing Firebase with Project:', firebaseConfig.projectId, '| Database ID:', firestoreDatabaseId);

// Initialize app, auth, and db instances safely
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.languageCode = 'ar';

/* CRITICAL: Initialize Firestore with the database ID */
export const db = getFirestore(app, firestoreDatabaseId);

// Validate connection per Firebase skill instructions
async function testConnection() {
  try {
    if (db) {
      await getDocFromServer(doc(db, 'test', 'connection'));
      console.log('[Firebase Init] Firestore live connection successful to database:', firestoreDatabaseId);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase Init] Firestore client is offline or database unreachable. Check configuration.');
    } else {
      console.info('[Firebase Init] Firestore connection checked:', (error as Error)?.message || error);
    }
  }
}
testConnection();
