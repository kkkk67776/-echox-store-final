import fs from 'fs';
import {
  atomicWriteJsonSync,
  getDataFilePath,
  loadCloudJson,
  pushCloudJson,
} from './cloudPersistence.js';
import type {
  ChatMessage,
  ChatSuggestedProduct,
  CustomChatRule,
  Language,
  SupportChatConfig,
  SupportChatThread,
} from '../src/types/index.js';

const CHAT_DATA_FILE = getDataFilePath('support_chat_data.json');
const CLOUD_CHAT_KEY = 'echox_support_chat_data';
const MAX_THREADS = 250;
const MAX_MESSAGES_PER_THREAD = 120;

interface ChatDatabase {
  config: SupportChatConfig;
  threads: Record<string, SupportChatThread>;
}

const DEFAULT_CHAT_CONFIG: SupportChatConfig = {
  autoReplyEnabled: true,
  welcomeMessage: {
    ar: 'مرحباً بك في ECHOX Store! اسألني عن أي منتج أو سعر، مصاريف التوصيل لولايتك، طرق الدفع، أو أرسل رقم تتبع طلبيتك (مثل ECH-TN-...).',
    fr: 'Bienvenue chez ECHOX Store ! Posez-moi vos questions sur nos produits, prix, livraison (24 gouvernorats), paiement ou suivi de commande (ECH-TN-...).',
    en: 'Welcome to ECHOX Store! Ask me about any product or price, shipping across Tunisia’s 24 governorates, payment methods, or send your tracking code (e.g. ECH-TN-...).',
  },
  fallbackMessage: {
    ar: 'تم استلام رسالتك وإشعار فريق ECHOX للرد عليك هنا مباشرة. يمكنك أيضاً ذكر اسم القطعة أو كتابة رقم الطلب (ECH-TN-...) أو التواصل الفوري على الرقم +216 21 511 162.',
    fr: 'Votre message a bien été transmis à l’équipe ECHOX qui vous répondra ici. Vous pouvez aussi préciser le nom d’un article, votre numéro de suivi (ECH-TN-...) ou appeler le +216 21 511 162.',
    en: 'Your message has been sent to the ECHOX team to reply directly here. You can also mention a product name, share an order tracking code (ECH-TN-...), or call +216 21 511 162.',
  },
  customRules: [],
  updatedAt: new Date().toISOString(),
};

function sanitizeText(input: unknown, maxLen = 1500): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, maxLen);
}

function loadInitialChatDb(): ChatDatabase {
  try {
    if (fs.existsSync(CHAT_DATA_FILE)) {
      const raw = fs.readFileSync(CHAT_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<ChatDatabase>;
      return {
        config: {
          ...DEFAULT_CHAT_CONFIG,
          ...(parsed.config || {}),
          welcomeMessage: {
            ...DEFAULT_CHAT_CONFIG.welcomeMessage,
            ...(parsed.config?.welcomeMessage || {}),
          },
          fallbackMessage: {
            ...DEFAULT_CHAT_CONFIG.fallbackMessage,
            ...(parsed.config?.fallbackMessage || {}),
          },
          customRules: Array.isArray(parsed.config?.customRules) ? parsed.config!.customRules : [],
        },
        threads: parsed.threads && typeof parsed.threads === 'object' ? parsed.threads : {},
      };
    }
  } catch (err) {
    console.warn('[ChatEngine] Notice reading local chat db:', (err as Error)?.message || err);
  }
  return {
    config: { ...DEFAULT_CHAT_CONFIG, updatedAt: new Date().toISOString() },
    threads: {},
  };
}

let chatDb: ChatDatabase = loadInitialChatDb();

function persistChatDb(): void {
  try {
    // Prune oldest threads if exceeding MAX_THREADS
    const threadIds = Object.keys(chatDb.threads);
    if (threadIds.length > MAX_THREADS) {
      threadIds
        .sort((a, b) => new Date(chatDb.threads[a].lastMessageAt).getTime() - new Date(chatDb.threads[b].lastMessageAt).getTime())
        .slice(0, threadIds.length - MAX_THREADS)
        .forEach((oldId) => {
          delete chatDb.threads[oldId];
        });
    }
    atomicWriteJsonSync(CHAT_DATA_FILE, chatDb);
    pushCloudJson(CLOUD_CHAT_KEY, chatDb);
  } catch (err) {
    console.error('[ChatEngine] Failed to persist chat database:', err);
  }
}

export async function hydrateChatDbFromCloud(): Promise<void> {
  const remote = await loadCloudJson<Partial<ChatDatabase>>(CLOUD_CHAT_KEY);
  if (!remote) return;
  if (remote.config) {
    chatDb.config = {
      ...DEFAULT_CHAT_CONFIG,
      ...remote.config,
      welcomeMessage: {
        ...DEFAULT_CHAT_CONFIG.welcomeMessage,
        ...(remote.config.welcomeMessage || {}),
      },
      fallbackMessage: {
        ...DEFAULT_CHAT_CONFIG.fallbackMessage,
        ...(remote.config.fallbackMessage || {}),
      },
      customRules: Array.isArray(remote.config.customRules) ? remote.config.customRules : [],
    };
  }
  if (remote.threads && typeof remote.threads === 'object') {
    chatDb.threads = { ...remote.threads, ...chatDb.threads };
  }
  atomicWriteJsonSync(CHAT_DATA_FILE, chatDb);
}

export function getPublicChatConfig(): SupportChatConfig {
  return chatDb.config;
}

export function updateChatConfig(payload: {
  autoReplyEnabled?: boolean;
  welcomeMessage?: Partial<{ ar: string; fr: string; en: string }>;
  fallbackMessage?: Partial<{ ar: string; fr: string; en: string }>;
  customRules?: CustomChatRule[];
}): SupportChatConfig {
  if (typeof payload.autoReplyEnabled === 'boolean') {
    chatDb.config.autoReplyEnabled = payload.autoReplyEnabled;
  }
  if (payload.welcomeMessage) {
    chatDb.config.welcomeMessage = {
      ar: sanitizeText(payload.welcomeMessage.ar, 600) || chatDb.config.welcomeMessage.ar,
      fr: sanitizeText(payload.welcomeMessage.fr, 600) || chatDb.config.welcomeMessage.fr,
      en: sanitizeText(payload.welcomeMessage.en, 600) || chatDb.config.welcomeMessage.en,
    };
  }
  if (payload.fallbackMessage) {
    chatDb.config.fallbackMessage = {
      ar: sanitizeText(payload.fallbackMessage.ar, 600) || chatDb.config.fallbackMessage.ar,
      fr: sanitizeText(payload.fallbackMessage.fr, 600) || chatDb.config.fallbackMessage.fr,
      en: sanitizeText(payload.fallbackMessage.en, 600) || chatDb.config.fallbackMessage.en,
    };
  }
  if (Array.isArray(payload.customRules)) {
    chatDb.config.customRules = payload.customRules
      .slice(0, 40)
      .map((r, idx) => ({
        id: sanitizeText(r.id, 60) || `rule_${Date.now()}_${idx}`,
        keyword: sanitizeText(r.keyword, 120),
        replyAr: sanitizeText(r.replyAr, 800),
        replyFr: sanitizeText(r.replyFr, 800),
        replyEn: sanitizeText(r.replyEn, 800),
      }))
      .filter((r) => r.keyword && (r.replyAr || r.replyFr || r.replyEn));
  }
  chatDb.config.updatedAt = new Date().toISOString();
  persistChatDb();
  return chatDb.config;
}

export function normalizeChatSessionId(rawId: unknown): string {
  const cleaned = typeof rawId === 'string' ? rawId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) : '';
  return cleaned.length >= 6 ? cleaned : '';
}

export function getChatThread(sessionId: string): SupportChatThread | null {
  const safeId = normalizeChatSessionId(sessionId);
  if (!safeId) return null;
  return chatDb.threads[safeId] || null;
}

export function recordCustomerChatExchange(params: {
  sessionId: string;
  language?: Language;
  customerLabel?: string;
  customerText: string;
  autoReplyText?: string;
  suggestedProducts?: ChatSuggestedProduct[];
  actionView?: string;
}): { ok: boolean; thread?: SupportChatThread; error?: string } {
  const safeId = normalizeChatSessionId(params.sessionId);
  if (!safeId) {
    return { ok: false, error: 'معرف جلسة المحادثة غير صالح.' };
  }
  const customerText = sanitizeText(params.customerText, 1200);
  if (!customerText) {
    return { ok: false, error: 'نص الرسالة فارغ.' };
  }

  const lang: Language = params.language === 'fr' || params.language === 'en' ? params.language : 'ar';
  const now = new Date().toISOString();

  if (!chatDb.threads[safeId]) {
    chatDb.threads[safeId] = {
      sessionId: safeId,
      customerLabel: sanitizeText(params.customerLabel, 60) || `حريف #${safeId.slice(-4).toUpperCase()}`,
      language: lang,
      messages: [
        {
          id: `msg_welcome_${Date.now()}`,
          sender: 'owner',
          source: 'auto',
          text: chatDb.config.welcomeMessage[lang] || chatDb.config.welcomeMessage.ar,
          timestamp: now,
        },
      ],
      unreadByOwner: 0,
      lastMessageAt: now,
      createdAt: now,
    };
  }

  const thread = chatDb.threads[safeId];
  thread.language = lang;

  const customerMsg: ChatMessage = {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sender: 'customer',
    source: 'customer',
    text: customerText,
    timestamp: now,
  };
  thread.messages.push(customerMsg);
  thread.unreadByOwner = (thread.unreadByOwner || 0) + 1;

  const replyText = sanitizeText(params.autoReplyText, 1600);
  if (replyText && chatDb.config.autoReplyEnabled) {
    const autoMsg: ChatMessage = {
      id: `chat_auto_${Date.now() + 1}_${Math.random().toString(36).slice(2, 6)}`,
      sender: 'owner',
      source: 'auto',
      text: replyText,
      timestamp: new Date(Date.now() + 50).toISOString(),
      suggestedProducts: Array.isArray(params.suggestedProducts) ? params.suggestedProducts.slice(0, 4) : undefined,
      actionView: sanitizeText(params.actionView, 40) || undefined,
    };
    thread.messages.push(autoMsg);
  }

  if (thread.messages.length > MAX_MESSAGES_PER_THREAD) {
    thread.messages = thread.messages.slice(-MAX_MESSAGES_PER_THREAD);
  }
  thread.lastMessageAt = now;
  persistChatDb();
  return { ok: true, thread };
}

export function adminSendChatReply(params: {
  sessionId: string;
  replyText: string;
}): { ok: boolean; thread?: SupportChatThread; message?: ChatMessage; error?: string } {
  const safeId = normalizeChatSessionId(params.sessionId);
  if (!safeId || !chatDb.threads[safeId]) {
    return { ok: false, error: 'المحادثة غير موجودة.' };
  }
  const replyText = sanitizeText(params.replyText, 1600);
  if (!replyText) {
    return { ok: false, error: 'نص الرد مطلوب.' };
  }

  const thread = chatDb.threads[safeId];
  const now = new Date().toISOString();
  const ownerMsg: ChatMessage = {
    id: `chat_owner_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sender: 'owner',
    source: 'owner',
    text: replyText,
    timestamp: now,
  };
  thread.messages.push(ownerMsg);
  if (thread.messages.length > MAX_MESSAGES_PER_THREAD) {
    thread.messages = thread.messages.slice(-MAX_MESSAGES_PER_THREAD);
  }
  thread.unreadByOwner = 0;
  thread.lastMessageAt = now;
  persistChatDb();
  return { ok: true, thread, message: ownerMsg };
}

export function markThreadReadByOwner(sessionId: string): boolean {
  const safeId = normalizeChatSessionId(sessionId);
  if (!safeId || !chatDb.threads[safeId]) return false;
  chatDb.threads[safeId].unreadByOwner = 0;
  persistChatDb();
  return true;
}

export function deleteChatThread(sessionId: string): boolean {
  const safeId = normalizeChatSessionId(sessionId);
  if (!safeId || !chatDb.threads[safeId]) return false;
  delete chatDb.threads[safeId];
  persistChatDb();
  return true;
}

export function listAdminChatThreads(): {
  threads: SupportChatThread[];
  totalUnread: number;
  config: SupportChatConfig;
} {
  const threads = Object.values(chatDb.threads).sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
  const totalUnread = threads.reduce((acc, t) => acc + (t.unreadByOwner || 0), 0);
  return { threads, totalUnread, config: chatDb.config };
}
