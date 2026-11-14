import fs from 'fs';
import {
  atomicWriteJsonSync,
  getDataFilePath,
  isCloudPersistenceEnabled,
  loadCloudJson,
  pushCloudJson,
} from './cloudPersistence';
import {
  INITIAL_COMPANIES,
  INITIAL_OWNER_SETTINGS,
  INITIAL_PRODUCTS,
  INITIAL_SITE_SETTINGS,
} from '../src/data/initialData';
import type {
  CategoryItem,
  Company,
  ContactInquiry,
  OwnerSettings,
  Product,
  PromoBanner,
  SiteSettings,
} from '../src/types/index';

const STORE_DATA_FILE = getDataFilePath('store_state.json');
const CLOUD_STORE_KEY = 'echox:storefront_state';

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'all', label: 'الكل', icon: '⚡', desc: 'كافة المعروضات المعتمدة' },
  { id: 'power_tools', label: 'أدوات ومعدات ورشات', icon: '🔧', desc: 'مثاقب، مناشير، ومعدات ورشات' },
  { id: 'auto_parts', label: 'قطع غيار سيارات', icon: '🚗', desc: 'قطع ميكانيكية وكهربائية للسيارات' },
  { id: 'electronics', label: 'أجهزة قياس وإلكترونيات', icon: '🔌', desc: 'أجهزة قياس، لوحات وقطع إلكترونية' },
  { id: 'industrial', label: 'معدات صناعية ثقيلة', icon: '🏭', desc: 'معدات المصانع والورشات الثقيلة' },
  { id: 'smart_home', label: 'أنظمة وحماية ذكية', icon: '🏠', desc: 'أتمتة وحماية المنازل الذكية' },
];

const DEFAULT_BANNERS: PromoBanner[] = [
  {
    id: 'banner_1',
    tag: 'عروض حصرية',
    title: 'عروض وتخفيضات اليوم على كافة المعدات وقطع الغيار',
    subtitle: 'توصيل سريع لكافة الـ24 ولاية والدفع عند المعاينة والاستلام',
    active: true,
    bgGradient: 'from-[#FF6B00] via-[#F97316] to-[#EA580C]',
  },
];

const DEFAULT_INQUIRIES: ContactInquiry[] = [
  {
    id: 'inq_1',
    senderName: 'كمال التريكي',
    email: 'kamel.triki@gmail.com',
    phone: '+216 55 120 900',
    subject: 'استفسار حول توافق مصباح Matrix LED مع موديل W205',
    message:
      'السلام عليكم، هل مصباح الكريستال يركب مباشرة على موديل 2018 دون الحاجة إلى تعديل أسلاك أو برمجة كمبيوتر؟ شكراً.',
    createdAt: '2026-11-05T10:15:00Z',
    read: true,
    reply: 'وعليكم السلام سي كمال. نعم يتوافق مباشرة Plug & Play مع ضمان التشغيل الكامل.',
    repliedAt: '2026-11-05T11:00:00Z',
  },
];

export interface StorefrontDatabase {
  products: Product[];
  companies: Company[];
  categories: CategoryItem[];
  banners: PromoBanner[];
  siteSettings: SiteSettings;
  ownerSettings: OwnerSettings;
  inquiries: ContactInquiry[];
  updatedAt: string;
}

function createInitialStoreState(): StorefrontDatabase {
  return {
    products: INITIAL_PRODUCTS,
    companies: INITIAL_COMPANIES,
    categories: DEFAULT_CATEGORIES,
    banners: DEFAULT_BANNERS,
    siteSettings: INITIAL_SITE_SETTINGS,
    ownerSettings: INITIAL_OWNER_SETTINGS,
    inquiries: DEFAULT_INQUIRIES,
    updatedAt: new Date(0).toISOString(),
  };
}

function mergeMultilingual(
  base: { ar: string; fr: string; en: string } | undefined,
  patch?: Partial<{ ar: string; fr: string; en: string }>
): { ar: string; fr: string; en: string } {
  return {
    ar: patch?.ar ?? base?.ar ?? '',
    fr: patch?.fr ?? base?.fr ?? '',
    en: patch?.en ?? base?.en ?? '',
  };
}

function mergeStoreState(raw: Partial<StorefrontDatabase>): StorefrontDatabase {
  const def = createInitialStoreState();
  return {
    products: Array.isArray(raw.products) ? raw.products : def.products,
    companies: Array.isArray(raw.companies) ? raw.companies : def.companies,
    categories: Array.isArray(raw.categories) && raw.categories.length > 0 ? raw.categories : def.categories,
    banners: Array.isArray(raw.banners) ? raw.banners : def.banners,
    siteSettings: {
      ...def.siteSettings,
      ...(raw.siteSettings || {}),
      slogan: mergeMultilingual(def.siteSettings.slogan, raw.siteSettings?.slogan),
      description: mergeMultilingual(def.siteSettings.description, raw.siteSettings?.description),
      addressMultilingual: mergeMultilingual(
        def.siteSettings.addressMultilingual,
        raw.siteSettings?.addressMultilingual
      ),
      workingHours: mergeMultilingual(def.siteSettings.workingHours, raw.siteSettings?.workingHours),
      announcementText: mergeMultilingual(
        def.siteSettings.announcementText,
        raw.siteSettings?.announcementText
      ),
    },
    ownerSettings: {
      ...def.ownerSettings,
      ...(raw.ownerSettings || {}),
      bio: mergeMultilingual(def.ownerSettings.bio, raw.ownerSettings?.bio),
    },
    inquiries: Array.isArray(raw.inquiries) ? raw.inquiries : def.inquiries,
    updatedAt: typeof raw.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : new Date().toISOString(),
  };
}

function loadStoreState(): StorefrontDatabase {
  try {
    if (fs.existsSync(STORE_DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(STORE_DATA_FILE, 'utf-8'));
      return mergeStoreState(raw);
    }
  } catch (err) {
    console.warn('[StoreEngine] Notice loading store state, using initial data:', err);
  }
  const initial = createInitialStoreState();
  saveStoreState(initial, false);
  return initial;
}

function saveStoreState(state: StorefrontDatabase, pushCloud = true): void {
  try {
    atomicWriteJsonSync(STORE_DATA_FILE, state);
  } catch (err) {
    console.error('[StoreEngine] Error persisting store state:', err);
  }
  if (pushCloud) {
    pushCloudJson(CLOUD_STORE_KEY, state);
  }
}

let storeDb: StorefrontDatabase = loadStoreState();

export async function hydrateStoreStateFromCloud(): Promise<void> {
  if (!isCloudPersistenceEnabled()) return;
  const remote = await loadCloudJson<Partial<StorefrontDatabase>>(CLOUD_STORE_KEY);
  if (remote && typeof remote === 'object') {
    storeDb = mergeStoreState(remote);
    try {
      atomicWriteJsonSync(STORE_DATA_FILE, storeDb);
    } catch (err) {
      console.warn('[StoreEngine] Notice syncing cloud store snapshot to disk:', err);
    }
  } else {
    pushCloudJson(CLOUD_STORE_KEY, storeDb);
  }
}

export function getPublicStoreState() {
  return {
    products: storeDb.products,
    companies: storeDb.companies,
    categories: storeDb.categories,
    banners: storeDb.banners,
    siteSettings: storeDb.siteSettings,
    updatedAt: storeDb.updatedAt,
  };
}

export function getAdminStoreState() {
  return {
    ...getPublicStoreState(),
    ownerSettings: storeDb.ownerSettings,
    inquiries: storeDb.inquiries,
  };
}

export function updateAdminStoreState(patch: Partial<StorefrontDatabase>): {
  ok: boolean;
  error?: string;
  state: ReturnType<typeof getAdminStoreState>;
} {
  if (!patch || typeof patch !== 'object') {
    return { ok: false, error: 'بيانات غير صالحة.', state: getAdminStoreState() };
  }

  const next: StorefrontDatabase = {
    ...storeDb,
    updatedAt: new Date().toISOString(),
  };

  if (Array.isArray(patch.products)) {
    next.products = patch.products;
  }
  if (Array.isArray(patch.companies)) {
    next.companies = patch.companies;
  }
  if (Array.isArray(patch.categories) && patch.categories.length > 0) {
    next.categories = patch.categories;
  }
  if (Array.isArray(patch.banners)) {
    next.banners = patch.banners;
  }
  if (patch.siteSettings && typeof patch.siteSettings === 'object') {
    next.siteSettings = {
      ...next.siteSettings,
      ...patch.siteSettings,
      slogan: mergeMultilingual(next.siteSettings.slogan, patch.siteSettings.slogan),
      description: mergeMultilingual(next.siteSettings.description, patch.siteSettings.description),
      addressMultilingual: mergeMultilingual(
        next.siteSettings.addressMultilingual,
        patch.siteSettings.addressMultilingual
      ),
      workingHours: mergeMultilingual(next.siteSettings.workingHours, patch.siteSettings.workingHours),
      announcementText: mergeMultilingual(
        next.siteSettings.announcementText,
        patch.siteSettings.announcementText
      ),
    };
  }
  if (patch.ownerSettings && typeof patch.ownerSettings === 'object') {
    next.ownerSettings = {
      ...next.ownerSettings,
      ...patch.ownerSettings,
      bio: mergeMultilingual(next.ownerSettings.bio, patch.ownerSettings.bio),
    };
  }
  if (Array.isArray(patch.inquiries)) {
    next.inquiries = patch.inquiries;
  }

  storeDb = next;
  saveStoreState(storeDb, true);
  return { ok: true, state: getAdminStoreState() };
}

export function addPublicProductReview(
  productId: string,
  reviewInput: { authorName: string; rating: number; comment: string; verifiedPurchase?: boolean }
): { ok: boolean; error?: string; product?: Product } {
  const prod = storeDb.products.find((p) => p.id === productId);
  if (!prod) {
    return { ok: false, error: 'المنتج غير موجود.' };
  }
  const rating = Math.min(5, Math.max(1, Math.round(Number(reviewInput.rating) || 5)));
  const comment = (reviewInput.comment || '').trim().slice(0, 1000);
  const authorName = (reviewInput.authorName || '').trim().slice(0, 80) || 'حريف ECHOX';
  if (!comment) {
    return { ok: false, error: 'يرجى كتابة نص التقييم.' };
  }
  const newRev = {
    id: `rev_${Date.now()}`,
    authorName,
    rating,
    comment,
    date: new Date().toISOString().split('T')[0],
    verifiedPurchase: Boolean(reviewInput.verifiedPurchase),
  };
  const updatedReviews = [newRev, ...(prod.reviews || [])].slice(0, 100);
  const newRating = +(
    updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length
  ).toFixed(1);

  const updatedProduct: Product = {
    ...prod,
    reviews: updatedReviews,
    rating: newRating,
    reviewCount: updatedReviews.length,
  };
  storeDb = {
    ...storeDb,
    products: storeDb.products.map((p) => (p.id === productId ? updatedProduct : p)),
    updatedAt: new Date().toISOString(),
  };
  saveStoreState(storeDb, true);
  return { ok: true, product: updatedProduct };
}

export function addPublicInquiry(input: {
  senderName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}): { ok: boolean; error?: string; inquiry?: ContactInquiry } {
  const senderName = (input.senderName || '').trim().slice(0, 120);
  const phone = (input.phone || '').trim().slice(0, 30);
  const email = (input.email || '').trim().slice(0, 120);
  const subject = (input.subject || '').trim().slice(0, 200);
  const message = (input.message || '').trim().slice(0, 2000);

  if (!senderName || !phone || !message) {
    return { ok: false, error: 'يرجى إكمال الاسم ورقم الهاتف ونص الرسالة.' };
  }

  const inquiry: ContactInquiry = {
    id: `inq_${Date.now()}`,
    senderName,
    email,
    phone,
    subject: subject || 'استفسار عام',
    message,
    createdAt: new Date().toISOString(),
    read: false,
  };

  storeDb = {
    ...storeDb,
    inquiries: [inquiry, ...storeDb.inquiries].slice(0, 200),
    updatedAt: new Date().toISOString(),
  };
  saveStoreState(storeDb, true);
  return { ok: true, inquiry };
}

export function adminReplyToInquiry(inquiryId: string, reply: string): {
  ok: boolean;
  error?: string;
  inquiry?: ContactInquiry;
} {
  const cleanReply = (reply || '').trim().slice(0, 2000);
  if (!cleanReply) {
    return { ok: false, error: 'يرجى كتابة نص الرد.' };
  }
  const existing = storeDb.inquiries.find((i) => i.id === inquiryId);
  if (!existing) {
    return { ok: false, error: 'الرسالة غير موجودة.' };
  }
  const updated: ContactInquiry = {
    ...existing,
    read: true,
    reply: cleanReply,
    repliedAt: new Date().toISOString(),
  };
  storeDb = {
    ...storeDb,
    inquiries: storeDb.inquiries.map((i) => (i.id === inquiryId ? updated : i)),
    updatedAt: new Date().toISOString(),
  };
  saveStoreState(storeDb, true);
  return { ok: true, inquiry: updated };
}
