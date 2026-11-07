/**
 * ECHOX STORE — Cloud Functions & Sovereign Security Layer
 * Real WhatsApp OTP via waotp to the Sovereign Phone (+21621511162)
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { sendOtp: sendWaOtp, verifyOtp: verifyWaOtp } = require('waotp');
const cookieParser = require('cookie-parser');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'abdelkaderbahri570@gmail.com';
const OWNER_PHONE = '+21621511162'; // Sovereign Locked Number

/**
 * 1. sendOtp - Sends 6-character alphanumeric OTP via WhatsApp to +21621511162
 * NEVER returns the OTP in response!
 */
exports.sendOtp = functions.https.onCall(async (data, context) => {
  // 1. تحقق من هوية المالك
  if (!context.auth || context.auth.token.email !== OWNER_EMAIL) {
    throw new functions.https.HttpsError('permission-denied', 'غير مصرح.');
  }

  // 2. منع الطلبات المتكررة (Rate Limiting: دقيقة واحدة)
  const recent = await db.collection('owner_otp_logs')
    .where('uid', '==', context.auth.uid)
    .where('createdAt', '>', new Date(Date.now() - 60 * 1000))
    .get();

  if (!recent.empty) {
    throw new functions.https.HttpsError('resource-exhausted', 'انتظر دقيقة قبل طلب رمز جديد.');
  }

  // 3. إرسال الرمز عبر واتساب إلى الرقم السيادي
  try {
    await sendWaOtp(OWNER_PHONE, {
      length: 6,
      type: 'alphanumeric', // دعم الرموز الأبجدية الرقمية (مثل A7K9P2)
      expiresIn: 300, // 5 دقائق
      message: 'ECHOX SECURITY: رمز الدخول الخاص بك هو {{otp}}. صالح لمدة 5 دقائق.'
    });

    // 4. سجل المحاولة
    await db.collection('owner_otp_logs').add({
      uid: context.auth.uid,
      phone: OWNER_PHONE,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 5. لا تعيد الرمز أبداً
    return { 
      success: true, 
      message: 'تم إرسال رمز التحقق بنجاح عبر تطبيق واتساب إلى هاتفك المسجل.' 
    };

  } catch (error) {
    console.error('فشل إرسال واتساب عبر waotp:', error);
    throw new functions.https.HttpsError('internal', 'تعذر إرسال الرمز عبر واتساب.');
  }
});

/**
 * 2. verifyOtp - Verifies OTP code via waotp for +21621511162
 * Grants Custom Claim owner:true upon success
 */
exports.verifyOtp = functions.https.onCall(async (data, context) => {
  // 1. تحقق من هوية المالك
  if (!context.auth || context.auth.token.email !== OWNER_EMAIL) {
    throw new functions.https.HttpsError('permission-denied', 'غير مصرح.');
  }

  const { otp } = data || {};
  if (!otp) {
    throw new functions.https.HttpsError('invalid-argument', 'الرمز مطلوب.');
  }

  // 2. التحقق من الرمز عبر waotp
  const isValid = await verifyWaOtp(OWNER_PHONE, String(otp).trim().toUpperCase());

  if (!isValid) {
    throw new functions.https.HttpsError('permission-denied', 'الرمز غير صحيح أو منتهي الصلاحية.');
  }

  // 3. نجاح: امنح صلاحية المالك Custom Claim owner: true
  await admin.auth().setCustomUserClaims(context.auth.uid, { owner: true });

  await db.collection('security_audit_logs').add({
    event: 'OWNER_CLAIM_GRANTED_VIA_WAOTP',
    uid: context.auth.uid,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});

/**
 * 3. createOwnerSession - HTTP API Endpoint
 * Sets secure __session cookie
 */
exports.createOwnerSession = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { idToken } = req.body || {};
  if (!idToken) {
    return res.status(400).json({ error: 'مفقود idToken' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken, true);

    if (decodedToken.email !== OWNER_EMAIL || decodedToken.owner !== true) {
      return res.status(403).json({ error: 'غير مصرح: لا يمتلك صلاحية المالك.' });
    }

    const expiresIn = 5 * 24 * 60 * 60 * 1000;
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('__session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });

    return res.json({ status: 'success', message: 'تم إنشاء جلسة المالك بنجاح.' });
  } catch (error) {
    console.error('Error creating session cookie:', error);
    return res.status(401).json({ error: 'فشل التحقق من الهوية أو إنشاء الجلسة.' });
  }
});

/**
 * 4. ownerMe - HTTP API Endpoint
 * Verifies __session cookie
 */
exports.ownerMe = functions.https.onRequest(async (req, res) => {
  cookieParser()(req, res, async () => {
    const sessionCookie = (req.cookies && req.cookies.__session) || '';

    if (!sessionCookie) {
      return res.status(401).json({ authenticated: false, error: 'لا توجد جلسة صالحة.' });
    }

    try {
      const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);

      if (decodedClaims.email !== OWNER_EMAIL || decodedClaims.owner !== true) {
        return res.status(403).json({ authenticated: false, error: 'غير مصرح.' });
      }

      return res.json({
        authenticated: true,
        email: decodedClaims.email,
        owner: true,
      });
    } catch {
      return res.status(401).json({ authenticated: false, error: 'جلسة منتهية أو ملغاة.' });
    }
  });
});
