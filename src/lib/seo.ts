import { Language, Product } from '../types';

const FALLBACK_SITE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SITE_URL) ||
  'https://echoxstore.pages.dev';

export function getSiteOrigin(): string {
  if (
    typeof window !== 'undefined' &&
    window.location?.origin &&
    !window.location.origin.includes('localhost') &&
    !window.location.origin.includes('127.0.0.1')
  ) {
    return window.location.origin;
  }
  return FALLBACK_SITE_URL;
}

export const SITE_URL = getSiteOrigin();

interface PageMeta {
  path: string;
  index: boolean;
  meta: Record<Language, { title: string; description: string }>;
}

const PAGES: Record<string, PageMeta> = {
  store: {
    path: '/',
    index: true,
    meta: {
      ar: {
        title: 'ECHOX STORE — متجر تونسي للأدوات والمعدات وقطع الغيار الأصلية',
        description:
          'متجر ECHOX STORE التونسي للأدوات والمعدات الكهربائية والميكانيكية وقطع الغيار الأصلية، مع الدفع عند الاستلام أو التحويل البنكي والتوصيل لكافة ولايات تونس الـ24.',
      },
      fr: {
        title: 'ECHOX STORE — Outillage, Équipements & Pièces d’Origine en Tunisie',
        description:
          'Boutique tunisienne ECHOX STORE : outillage industriel, appareils de mesure et pièces détachées certifiées avec paiement à la livraison ou virement bancaire dans les 24 gouvernorats.',
      },
      en: {
        title: 'ECHOX STORE — Genuine Tools, Equipment & Spare Parts in Tunisia',
        description:
          'ECHOX STORE Tunisia offers certified industrial tools, automotive spare parts, and precision electronics with Cash on Delivery or Bank Transfer across all 24 governorates.',
      },
    },
  },
  promise: {
    path: '/promise',
    index: true,
    meta: {
      ar: {
        title: 'وعدنا وضمان الجودة | ECHOX STORE تونس',
        description:
          'تعرّف على ميثاق ضمان ECHOX STORE: منتجات أصلية 100%، دفع آمن عند المعاينة أو بالتحويل البنكي، وتوصيل سريع لكافة ولايات تونس.',
      },
      fr: {
        title: 'Notre Engagement Qualité & Garantie | ECHOX STORE Tunisie',
        description:
          'Découvrez la garantie ECHOX STORE : pièces certifiées 100% d’origine, contrôle avant paiement et livraison express sur toute la Tunisie.',
      },
      en: {
        title: 'Our Quality Promise & Warranty | ECHOX STORE Tunisia',
        description:
          'Learn about the ECHOX STORE guarantee: 100% genuine certified equipment, secure payment options, and fast delivery across Tunisia.',
      },
    },
  },
  companies: {
    path: '/companies',
    index: true,
    meta: {
      ar: {
        title: 'الشركات والعلامات الشريكة | ECHOX STORE تونس',
        description:
          'استعرض الشركات والموزعين المعتمدين لدى متجر ECHOX STORE في تونس للأدوات الصناعية، قطع غيار السيارات، وأجهزة القياس الدقيقة.',
      },
      fr: {
        title: 'Partenaires & Distributeurs Agréés | ECHOX STORE Tunisie',
        description:
          'Découvrez les marques et distributeurs officiels partenaires d’ECHOX STORE en Tunisie pour l’outillage, les pièces auto et l’électronique.',
      },
      en: {
        title: 'Authorized Partners & Brands | ECHOX STORE Tunisia',
        description:
          'Explore verified partner distributors and brands on ECHOX STORE Tunisia across power tools, automotive parts, and industrial electronics.',
      },
    },
  },
  contact: {
    path: '/contact',
    index: true,
    meta: {
      ar: {
        title: 'اتصل بنا والدعم الفني | ECHOX STORE تونس',
        description:
          'تواصل مع فريق ECHOX STORE تونس عبر الهاتف أو واتساب أو البريد الإلكتروني. دعم سريع واستشارات فنية من الإثنين إلى السبت.',
      },
      fr: {
        title: 'Contact & Assistance Technique | ECHOX STORE Tunisie',
        description:
          'Contactez l’équipe ECHOX STORE Tunisie par téléphone, WhatsApp ou e-mail pour toute demande de pièce ou suivi.',
      },
      en: {
        title: 'Contact & Technical Support | ECHOX STORE Tunisia',
        description:
          'Reach ECHOX STORE Tunisia via phone, WhatsApp, or email for genuine hardware advice and customer support.',
      },
    },
  },
  my_orders: {
    path: '/my_orders',
    index: false,
    meta: {
      ar: {
        title: 'تتبع طلبك | ECHOX STORE',
        description: 'متابعة حالة الطلب والدفع في ECHOX STORE.',
      },
      fr: {
        title: 'Suivi de Commande | ECHOX STORE',
        description: 'Suivez l’état de votre commande et paiement sur ECHOX STORE.',
      },
      en: {
        title: 'Track Your Order | ECHOX STORE',
        description: 'Track your order delivery and payment status on ECHOX STORE.',
      },
    },
  },
  account: {
    path: '/account',
    index: false,
    meta: {
      ar: {
        title: 'حسابي | ECHOX STORE',
        description: 'بوابة الحساب والعناوين والمفضلة في ECHOX STORE.',
      },
      fr: {
        title: 'Mon Compte | ECHOX STORE',
        description: 'Gérez vos adresses et commandes sur ECHOX STORE.',
      },
      en: {
        title: 'My Account | ECHOX STORE',
        description: 'Manage your addresses and orders on ECHOX STORE.',
      },
    },
  },
};

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setHreflangLink(hreflang: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(
    `link[rel="alternate"][hreflang="${hreflang}"]`
  );
  if (!el) {
    el = document.createElement('link');
    el.rel = 'alternate';
    el.setAttribute('hreflang', hreflang);
    document.head.appendChild(el);
  }
  el.href = href;
}

function toAbsoluteUrl(origin: string, urlOrPath?: string): string {
  if (!urlOrPath) return `${origin}/assets/images/hero_echox_tunisia_store.webp`;
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) return urlOrPath;
  return `${origin}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;
}

function updateProductJsonLd(origin: string, product: Product | null, lang: Language) {
  const existing = document.getElementById('echox-product-schema');
  if (!product) {
    if (existing) existing.remove();
    return;
  }

  const productUrl = `${origin}/?product=${encodeURIComponent(product.id)}`;
  const productImage = toAbsoluteUrl(origin, product.images?.[0]);
  const productName = product.name?.[lang] || product.name?.ar || 'ECHOX Product';
  const productDesc = product.description?.[lang] || product.description?.ar || '';

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    description: productDesc,
    image: (product.images || []).map((img) => toAbsoluteUrl(origin, img)),
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: product.companyName || 'ECHOX STORE',
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'TND',
      price: product.price.toFixed(3),
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  if (product.rating && product.reviewCount) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(product.rating),
      reviewCount: String(product.reviewCount),
    };
  }

  const scriptEl =
    (existing as HTMLScriptElement | null) ||
    (() => {
      const s = document.createElement('script');
      s.id = 'echox-product-schema';
      s.type = 'application/ld+json';
      document.head.appendChild(s);
      return s;
    })();

  scriptEl.textContent = JSON.stringify(schema);
}

export function applySeo(
  view: string,
  lang: Language = 'ar',
  activeProduct: Product | null = null
) {
  const origin = getSiteOrigin();
  const isOwner = view.startsWith('/owner') || view === 'owner_dashboard';

  // Ensure <html lang/dir> matches current active language cleanly
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en';
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  if (activeProduct && !isOwner) {
    const productTitle = `${activeProduct.name?.[lang] || activeProduct.name?.ar} | ECHOX STORE`;
    const productDesc = (
      activeProduct.description?.[lang] ||
      activeProduct.description?.ar ||
      PAGES.store.meta[lang].description
    ).slice(0, 160);
    const productUrl = `${origin}/?product=${encodeURIComponent(activeProduct.id)}`;
    const productImg = toAbsoluteUrl(origin, activeProduct.images?.[0]);

    document.title = productTitle;
    setMeta('name', 'description', productDesc);
    setMeta('name', 'robots', 'index, follow, max-snippet:-1, max-image-preview:large');
    setMeta('property', 'og:type', 'product');
    setMeta('property', 'og:title', productTitle);
    setMeta('property', 'og:description', productDesc);
    setMeta('property', 'og:url', productUrl);
    setMeta('property', 'og:image', productImg);
    setMeta('name', 'twitter:title', productTitle);
    setMeta('name', 'twitter:description', productDesc);
    setMeta('name', 'twitter:image', productImg);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = productUrl;

    setHreflangLink('ar-TN', `${origin}/?product=${encodeURIComponent(activeProduct.id)}&lang=ar`);
    setHreflangLink('fr-TN', `${origin}/?product=${encodeURIComponent(activeProduct.id)}&lang=fr`);
    setHreflangLink('en', `${origin}/?product=${encodeURIComponent(activeProduct.id)}&lang=en`);
    setHreflangLink('x-default', productUrl);

    updateProductJsonLd(origin, activeProduct, lang);
    return;
  }

  updateProductJsonLd(origin, null, lang);

  const normalizedView = view === '/' ? 'store' : view === 'wishlist' ? 'account' : view;
  const page =
    PAGES[normalizedView] ||
    (isOwner
      ? {
          path: '/owner/dashboard',
          index: false,
          meta: {
            ar: { title: 'مركز التحكم | ECHOX STORE', description: 'إدارة المتجر والمدفوعات.' },
            fr: { title: "Panneau d'administration | ECHOX STORE", description: 'Gestion ECHOX STORE.' },
            en: { title: 'Admin Panel | ECHOX STORE', description: 'ECHOX STORE Admin Panel.' },
          },
        }
      : PAGES.store);

  const metaForLang = page.meta[lang] || page.meta.ar;
  const url = `${origin}${page.path}`;
  const defaultHeroImage = `${origin}/assets/images/hero_echox_tunisia_store.webp`;

  document.title = metaForLang.title;
  setMeta('name', 'description', metaForLang.description);
  setMeta(
    'name',
    'robots',
    page.index ? 'index, follow, max-snippet:-1, max-image-preview:large' : 'noindex, nofollow'
  );
  setMeta('property', 'og:type', 'website');
  setMeta('property', 'og:title', metaForLang.title);
  setMeta('property', 'og:description', metaForLang.description);
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:image', defaultHeroImage);
  setMeta('name', 'twitter:title', metaForLang.title);
  setMeta('name', 'twitter:description', metaForLang.description);
  setMeta('name', 'twitter:image', defaultHeroImage);

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;

  if (page.index) {
    setHreflangLink('ar-TN', `${origin}${page.path}?lang=ar`);
    setHreflangLink('fr-TN', `${origin}${page.path}?lang=fr`);
    setHreflangLink('en', `${origin}${page.path}?lang=en`);
    setHreflangLink('x-default', url);
  }
}
