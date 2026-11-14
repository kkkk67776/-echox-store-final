import type {
  ChatMessage,
  ChatSuggestedProduct,
  Company,
  Language,
  Order,
  PaymentSystemPublicConfig,
  Product,
  SiteSettings,
  SupportChatConfig,
  SupportChatThread,
} from '../types';
import { getTranslation } from '../data/translations';
import { getAdminAuthHeaders, notifySessionExpired } from './security';

export const DEFAULT_CHAT_CONFIG: SupportChatConfig = {
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
  updatedAt: '',
};

function normalizeText(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SEARCH_SYNONYMS: Record<string, string[]> = {
  مثقاب: ['drill', 'perceuse', 'shignol', 'شنيور', 'دريل', 'bosch', 'titan'],
  شنيور: ['drill', 'perceuse', 'مثقاب', 'bosch'],
  drill: ['مثقاب', 'perceuse', 'شنيور', 'bosch'],
  perceuse: ['مثقاب', 'drill', 'شنيور'],
  منشار: ['saw', 'scie', 'disk', 'disque'],
  بطاريه: ['battery', 'batterie', 'lithium'],
  فرامل: ['brake', 'frein', 'plaquette'],
  سياره: ['auto', 'car', 'voiture', 'قطع'],
  قياس: ['fluke', 'multimeter', 'multimetre', 'test', 'كاشف'],
  كاميرا: ['camera', 'حمايه', 'مراقبه', 'smart'],
  معدات: ['tools', 'outillage', 'ادوات', 'power'],
  ادوات: ['tools', 'outillage', 'معدات', 'power'],
  tools: ['ادوات', 'معدات', 'outillage'],
  outillage: ['ادوات', 'معدات', 'tools'],
};

const STOP_WORDS = new Set([
  'ما', 'هو', 'هي', 'كم', 'سعر', 'ثمن', 'اريد', 'ابحث', 'عن', 'في', 'من', 'على', 'هل', 'يوجد', 'عندكم', 'عندي',
  'متوفر', 'متوفرة', 'مع', 'او', 'و', 'بكم', 'شحال', 'قداش', 'كيف', 'لو', 'سمحت', 'ممكن', 'منتج', 'منتجات',
  'the', 'is', 'are', 'how', 'much', 'price', 'cost', 'do', 'you', 'have', 'any', 'for', 'with', 'and', 'or', 'what',
  'le', 'la', 'les', 'un', 'une', 'des', 'quel', 'est', 'prix', 'combien', 'pour', 'avez', 'vous', 'avec', 'et', 'ou',
]);

function extractKeywords(normalizedMsg: string): string[] {
  const baseWords = normalizedMsg
    .split(' ')
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  const expanded = new Set<string>(baseWords);
  for (const word of baseWords) {
    const syns = SEARCH_SYNONYMS[word];
    if (syns) {
      syns.forEach((s) => expanded.add(normalizeText(s)));
    }
  }
  return Array.from(expanded);
}

export interface GeneratedSupportReply {
  text: string;
  suggestedProducts?: ChatSuggestedProduct[];
  actionView?: string;
}

export function generateSmartStoreReply(params: {
  message: string;
  language: Language;
  products: Product[];
  companies: Company[];
  orders: Order[];
  siteSettings: SiteSettings;
  paymentConfig: PaymentSystemPublicConfig;
  chatConfig?: SupportChatConfig;
}): GeneratedSupportReply {
  const { message, language, products, companies, orders, siteSettings, paymentConfig, chatConfig } = params;
  const t = getTranslation(language);
  const norm = normalizeText(message);
  const config = chatConfig || DEFAULT_CHAT_CONFIG;

  // 1. Custom Owner-Defined Rules (Highest Priority)
  if (Array.isArray(config.customRules) && config.customRules.length > 0) {
    for (const rule of config.customRules) {
      const kwList = (rule.keyword || '')
        .split(/[,،|]/)
        .map((k) => normalizeText(k))
        .filter(Boolean);
      if (kwList.some((kw) => kw && norm.includes(kw))) {
        const reply =
          language === 'fr'
            ? rule.replyFr || rule.replyAr || rule.replyEn
            : language === 'en'
            ? rule.replyEn || rule.replyAr || rule.replyFr
            : rule.replyAr || rule.replyFr || rule.replyEn;
        if (reply) {
          return { text: reply };
        }
      }
    }
  }

  // 2. Order Tracking Code Lookup (ECH-TN-XXXXXX)
  const trackingMatch = message.toUpperCase().match(/ECH-TN-[A-Z0-9-]+/);
  if (trackingMatch) {
    const code = trackingMatch[0];
    const foundOrder = orders.find((o) => o.trackingNumber.toUpperCase() === code);
    if (foundOrder) {
      const statusLabel = (t.orderStatus as Record<string, string>)[foundOrder.status] || foundOrder.status;
      const payLabel = (t.payments.statuses as Record<string, string>)[foundOrder.paymentStatus] || foundOrder.paymentStatus;
      if (language === 'fr') {
        return {
          text: `Commande ${foundOrder.trackingNumber} :\n• Statut : ${statusLabel}\n• Paiement : ${payLabel}\n• Total : ${foundOrder.totalAmount.toFixed(3)} ${t.cart.currency}\n• Transporteur : ${foundOrder.carrierName}`,
          actionView: 'my_orders',
        };
      }
      if (language === 'en') {
        return {
          text: `Order ${foundOrder.trackingNumber}:\n• Status: ${statusLabel}\n• Payment: ${payLabel}\n• Total: ${foundOrder.totalAmount.toFixed(3)} ${t.cart.currency}\n• Carrier: ${foundOrder.carrierName}`,
          actionView: 'my_orders',
        };
      }
      return {
        text: `تفاصيل طلبك رقم ${foundOrder.trackingNumber}:\n• الحالة الحالية: ${statusLabel}\n• حالة الدفع: ${payLabel}\n• المبلغ الإجمالي: ${foundOrder.totalAmount.toFixed(3)} ${t.cart.currency}\n• شركة التوصيل: ${foundOrder.carrierName}`,
        actionView: 'my_orders',
      };
    }
    return {
      text:
        language === 'fr'
          ? `Aucune commande trouvée sous le numéro ${code} dans cette session. Vérifiez le code dans l’onglet « Mes Commandes » ou contactez le ${siteSettings.supportPhone}.`
          : language === 'en'
          ? `I couldn’t find order ${code} in your current device orders. Please double-check the code under "My Orders" or call ${siteSettings.supportPhone}.`
          : `لم أجد طلباً مسجلاً بالرقم ${code} على هذا الجهاز. تأكد من الرقم في قسم "طلباتي" أو تواصل معنا مباشرة على ${siteSettings.supportPhone}.`,
      actionView: 'my_orders',
    };
  }

  // 3. Greetings
  if (/^(مرحبا|اهلا|سلام|السلام عليكم|صباح الخير|مساء الخير|bonjour|salut|bonsoir|hello|hi|hey|good morning|good evening)(\s|$)/i.test(norm)) {
    const welcome =
      config.welcomeMessage[language] ||
      config.welcomeMessage.ar ||
      DEFAULT_CHAT_CONFIG.welcomeMessage[language];
    return { text: welcome };
  }

  // 4. Shipping / Delivery / Governorates
  if (/(توصيل|شحن|ولای|ولايه|مده|وقت|سريع|livraison|delai|expedition|gouvernorat|frais|shipping|delivery|governorate|arrive|fast)/i.test(norm)) {
    const fee = Number(siteSettings.standardShippingFee ?? 7).toFixed(3);
    const freeLimit = Number(siteSettings.freeShippingThreshold ?? 150).toFixed(0);
    if (language === 'fr') {
      return {
        text: `Livraison rapide sur les 24 gouvernorats tunisiens sous 24 à 48h.\n• Frais standards : ${fee} DT.\n• Livraison GRATUITE dès ${freeLimit} DT d’achats.\n• Droit d’inspecter le colis avant de payer à la réception.`,
      };
    }
    if (language === 'en') {
      return {
        text: `We deliver across all 24 Tunisian governorates within 24–48 hours.\n• Standard fee: ${fee} TND.\n• FREE shipping on orders over ${freeLimit} TND.\n• You may inspect your order before paying upon delivery.`,
      };
    }
    return {
      text: `التوصيل متوفر لجميع ولايات تونس الـ 24 خلال 24 إلى 48 ساعة:\n• معلوم التوصيل العادي: ${fee} د.ت.\n• التوصيل مجاني تماماً للطلبات التي تتجاوز ${freeLimit} د.ت.\n• يمكنك معاينة طلبيتك قبل الدفع عند الاستلام.`,
    };
  }

  // 5. Payment Methods
  if (/(دفع|استلام|خلاص|بنك|تحويل|كاش|فلوس|بطاق|paiement|payer|especes|virement|carte|payment|pay|cash|cod|bank|transfer|iban|rib)/i.test(norm)) {
    const methods: string[] = [];
    if (siteSettings.enableCOD || paymentConfig.methods.cod.enabled) {
      methods.push(
        language === 'fr'
          ? 'Paiement à la livraison (espèces après inspection)'
          : language === 'en'
          ? 'Cash on Delivery (pay after inspecting the parcel)'
          : 'الدفع عند الاستلام نقداً بعد معاينة الطلبية'
      );
    }
    if (siteSettings.enableBankTransfer || paymentConfig.methods.bank_transfer.enabled) {
      methods.push(
        language === 'fr'
          ? 'Virement bancaire / postal avec justificatif'
          : language === 'en'
          ? 'Bank / Postal Transfer with receipt verification'
          : 'التحويل البنكي أو البريدي مع إرفاق الوصل'
      );
    }
    if (paymentConfig.methods.online_payment.enabled && paymentConfig.methods.online_payment.readyForLive) {
      methods.push(
        language === 'fr'
          ? 'Paiement en ligne sécurisé'
          : language === 'en'
          ? 'Secure online card / E-Dinar payment'
          : 'الدفع الإلكتروني الآمن بالبطاقة أو E-Dinar'
      );
    }
    if (language === 'fr') {
      return {
        text: `Modes de paiement actuellement actifs :\n• ${methods.join('\n• ')}`,
      };
    }
    if (language === 'en') {
      return {
        text: `Currently enabled payment methods:\n• ${methods.join('\n• ')}`,
      };
    }
    return {
      text: `وسائل الدفع المتاحة حالياً في ECHOX Store:\n• ${methods.join('\n• ')}`,
    };
  }

  // 6. Coupons / Discounts / Promo Deals
  if (/(كود|كوبون|خصم|تخفيض|عرض|عروض|promo|code|remise|reduction|solde|discount|coupon|deal|offer|sale)/i.test(norm)) {
    const discounted = products.filter((p) => p.active && p.originalPrice && p.originalPrice > p.price).slice(0, 3);
    const suggestedProducts: ChatSuggestedProduct[] = discounted.map((p) => ({
      id: p.id,
      name: p.name[language] || p.name.ar,
      price: p.price,
      image: p.images[0],
    }));

    if (language === 'fr') {
      return {
        text: `Utilisez le code promo ECHOX2026 dans le panier pour obtenir -10% de remise !\n${discounted.length > 0 ? 'Voici nos meilleures offres en cours :' : ''}`,
        suggestedProducts,
      };
    }
    if (language === 'en') {
      return {
        text: `Use promo code ECHOX2026 in your cart for 10% off your order!\n${discounted.length > 0 ? 'Check out these current deals:' : ''}`,
        suggestedProducts,
      };
    }
    return {
      text: `يمكنك استخدام كود الخصم ECHOX2026 داخل السلة للحصول على تخفيض فوري بنسبة 10%!\n${discounted.length > 0 ? 'وهذه أبرز المنتجات المخفضة حالياً:' : ''}`,
      suggestedProducts,
    };
  }

  // 7. Warranty / Return Policy / Authenticity
  if (/(ضمان|اصلي|تبديل|ارجاع|استرجاع|معاينه|garantie|retour|authentique|echange|warranty|return|genuine|original|refund)/i.test(norm)) {
    if (language === 'fr') {
      return {
        text: 'Tous nos équipements sont 100% authentiques et couverts par une garantie constructeur officielle. Vous avez également le droit de vérifier le colis à la livraison et de demander un échange ou retour.',
        actionView: 'promise',
      };
    }
    if (language === 'en') {
      return {
        text: 'All items in ECHOX Store are 100% genuine with an official warranty. You have the right to inspect your parcel before paying, backed by our fair return & exchange policy.',
        actionView: 'promise',
      };
    }
    return {
      text: 'جميع المنتجات أصلية 100% ومضمونة من الوكلاء الرسميين، مع حقك الكامل في المعاينة عند الاستلام وسياسة إرجاع واستبدال مرنة.',
      actionView: 'promise',
    };
  }

  // 8. Tracking General Question (without explicit code)
  if (/(تتبع|طلبي|طلبیت|وين|وصل|commande|suivi|track|where is my order|status)/i.test(norm)) {
    if (language === 'fr') {
      return {
        text: 'Pour suivre votre commande, envoyez-moi votre numéro de suivi (ex : ECH-TN-981240) ou consultez directement l’onglet « Mes Commandes ».',
        actionView: 'my_orders',
      };
    }
    if (language === 'en') {
      return {
        text: 'To check your order status right here, send your tracking code (e.g. ECH-TN-981240) or open the "My Orders" page.',
        actionView: 'my_orders',
      };
    }
    return {
      text: 'لمعرفة حالة طلبك الآن، أرسل لي رقم التتبع الخاص بك (مثال: ECH-TN-981240) أو اضغط على قسم "طلباتي" لمتابعته لحظة بلحظة.',
      actionView: 'my_orders',
    };
  }

  // 9. Contact / Phone / Email / Address / Working Hours / Companies
  if (/(رقم|هاتف|اتصال|تواصل|موقع|عنوان|ساعات|ايميل|بريد|شرك|تليفون|whatsapp|telephone|numero|adresse|horaire|contact|phone|email|address|hours|location)/i.test(norm)) {
    const addr =
      (siteSettings.addressMultilingual && siteSettings.addressMultilingual[language]) ||
      siteSettings.address;
    const hours =
      (siteSettings.workingHours && (siteSettings.workingHours[language] || siteSettings.workingHours.ar)) || '';
    if (language === 'fr') {
      return {
        text: `Coordonnées directes ECHOX Store :\n• Téléphone : ${siteSettings.supportPhone}\n• Email : ${siteSettings.officialEmail}\n• Adresse : ${addr}${hours ? `\n• Horaires : ${hours}` : ''}`,
        actionView: 'contact',
      };
    }
    if (language === 'en') {
      return {
        text: `ECHOX Store direct contact details:\n• Phone: ${siteSettings.supportPhone}\n• Email: ${siteSettings.officialEmail}\n• Address: ${addr}${hours ? `\n• Hours: ${hours}` : ''}`,
        actionView: 'contact',
      };
    }
    return {
      text: `بيانات التواصل المباشر مع ECHOX Store:\n• الهاتف: ${siteSettings.supportPhone}\n• البريد: ${siteSettings.officialEmail}\n• المقر: ${addr}${hours ? `\n• أوقات العمل: ${hours}` : ''}`,
      actionView: 'contact',
    };
  }

  // 10. Product Catalog Search (Prices, Stock, Brands, Equipment)
  const keywords = extractKeywords(norm);
  if (keywords.length > 0) {
    const scored = products
      .filter((p) => p.active)
      .map((p) => {
        const haystack = normalizeText(
          [
            p.name.ar,
            p.name.fr,
            p.name.en,
            p.description.ar,
            p.description.fr,
            p.description.en,
            p.companyName,
            p.category,
            ...(p.specs || []).flatMap((s) => [s.key.ar, s.key.en, s.value.ar, s.value.en]),
          ].join(' ')
        );
        let score = 0;
        for (const kw of keywords) {
          if (haystack.includes(kw)) score += 1;
        }
        return { product: p, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (scored.length > 0) {
      const suggestedProducts: ChatSuggestedProduct[] = scored.map(({ product }) => ({
        id: product.id,
        name: product.name[language] || product.name.ar,
        price: product.price,
        image: product.images[0],
      }));
      const lines = scored.map(({ product }) => {
        const name = product.name[language] || product.name.ar;
        const stockNote =
          product.stock > 0
            ? language === 'fr'
              ? 'En stock'
              : language === 'en'
              ? 'In stock'
              : 'متوفر'
            : language === 'fr'
            ? 'Rupture'
            : language === 'en'
            ? 'Out of stock'
            : 'غير متوفر';
        return `• ${name} — ${product.price.toFixed(3)} ${t.cart.currency} (${stockNote})`;
      });
      if (language === 'fr') {
        return {
          text: `Voici les articles correspondants dans notre catalogue :\n${lines.join('\n')}`,
          suggestedProducts,
        };
      }
      if (language === 'en') {
        return {
          text: `Here are the matching products from our catalog:\n${lines.join('\n')}`,
          suggestedProducts,
        };
      }
      return {
        text: `وجدت لك هذه المنتجات المتوفرة لدينا:\n${lines.join('\n')}`,
        suggestedProducts,
      };
    }

    // Check matching companies if no product keyword hit directly
    const matchedComp = companies.find((c) =>
      keywords.some((kw) => normalizeText(c.name).includes(kw))
    );
    if (matchedComp) {
      return {
        text:
          language === 'fr'
            ? `${matchedComp.name} est un partenaire certifié ECHOX Store (${matchedComp.phone}).`
            : language === 'en'
            ? `${matchedComp.name} is an authorized ECHOX Store partner (${matchedComp.phone}).`
            : `${matchedComp.name} من الشركات الشريكة المعتمدة لدينا (${matchedComp.phone}).`,
        actionView: 'companies',
      };
    }
  }

  // 11. Thanks / Closing
  if (/^(شكرا|يعطيك الصحه|بارك الله|merci|thanks|thank you|thx)/i.test(norm)) {
    return {
      text:
        language === 'fr'
          ? 'Avec grand plaisir ! N’hésitez pas si vous avez d’autres questions.'
          : language === 'en'
          ? 'You’re very welcome! Let me know if you need help with anything else.'
          : 'على الرحب والسعة! يسعدنا خدمتك في أي وقت.',
    };
  }

  // 12. Smart Fallback (Owner-customizable + notifies owner in Admin Console)
  const fallback =
    config.fallbackMessage[language] ||
    config.fallbackMessage.ar ||
    DEFAULT_CHAT_CONFIG.fallbackMessage[language];
  return { text: fallback };
}

// --- Client-Server Persistence API Helpers ---

export async function fetchPublicChatConfig(): Promise<SupportChatConfig | null> {
  try {
    const res = await fetch('/api/chat/config', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.config) return data.config as SupportChatConfig;
    return null;
  } catch {
    return null;
  }
}

export async function fetchChatThreadServer(sessionId: string): Promise<SupportChatThread | null> {
  if (!sessionId) return null;
  try {
    const res = await fetch(`/api/chat/session/${encodeURIComponent(sessionId)}`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.thread || null;
  } catch {
    return null;
  }
}

export async function pushChatExchangeServer(params: {
  sessionId: string;
  language: Language;
  customerText: string;
  autoReplyText?: string;
  suggestedProducts?: ChatSuggestedProduct[];
  actionView?: string;
}): Promise<SupportChatThread | null> {
  try {
    const res = await fetch(`/api/chat/session/${encodeURIComponent(params.sessionId)}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.thread || null;
  } catch {
    return null;
  }
}

export async function fetchAdminChatOverview(): Promise<{
  ok: boolean;
  threads: SupportChatThread[];
  totalUnread: number;
  config: SupportChatConfig;
  error?: string;
}> {
  try {
    const res = await fetch('/api/admin/chat/threads', {
      credentials: 'include',
      cache: 'no-store',
      headers: getAdminAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) notifySessionExpired();
    if (!res.ok) {
      return {
        ok: false,
        threads: [],
        totalUnread: 0,
        config: DEFAULT_CHAT_CONFIG,
        error: data?.error || 'تعذر تحميل محادثات الدعم.',
      };
    }
    return {
      ok: true,
      threads: Array.isArray(data.threads) ? data.threads : [],
      totalUnread: Number(data.totalUnread || 0),
      config: data.config || DEFAULT_CHAT_CONFIG,
    };
  } catch {
    return {
      ok: false,
      threads: [],
      totalUnread: 0,
      config: DEFAULT_CHAT_CONFIG,
      error: 'تعذر الاتصال بالخادم.',
    };
  }
}

export async function sendAdminChatReplyServer(
  sessionId: string,
  replyText: string
): Promise<{ ok: boolean; thread?: SupportChatThread; error?: string }> {
  try {
    const res = await fetch(`/api/admin/chat/threads/${encodeURIComponent(sessionId)}/reply`, {
      method: 'POST',
      headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ replyText }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) notifySessionExpired();
    if (!res.ok) return { ok: false, error: data?.error || 'فشل إرسال الرد.' };
    return { ok: true, thread: data.thread };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالخادم.' };
  }
}

export async function markAdminThreadReadServer(sessionId: string): Promise<void> {
  try {
    await fetch(`/api/admin/chat/threads/${encodeURIComponent(sessionId)}/read`, {
      method: 'POST',
      credentials: 'include',
      headers: getAdminAuthHeaders(),
    });
  } catch {
    // ignore
  }
}

export async function deleteAdminChatThreadServer(sessionId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/chat/threads/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAdminAuthHeaders(),
    });
    if (res.status === 401 || res.status === 403) notifySessionExpired();
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveAdminChatConfigServer(
  payload: Partial<SupportChatConfig>
): Promise<{ ok: boolean; config?: SupportChatConfig; error?: string }> {
  try {
    const res = await fetch('/api/admin/chat/config', {
      method: 'PUT',
      headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) notifySessionExpired();
    if (!res.ok) return { ok: false, error: data?.error || 'تعذر حفظ إعدادات الشات.' };
    return { ok: true, config: data.config };
  } catch {
    return { ok: false, error: 'تعذر الاتصال بالخادم.' };
  }
}
