// Per-page SEO: title, description, canonical URL and robots directives.
export const SITE_URL = 'https://echox-store.netlify.app';

interface PageMeta { path: string; title: string; description: string; index: boolean }

const DEFAULT_DESC =
  'متجر ECHOX STORE التونسي للأدوات والمعدات الكهربائية والميكانيكية وقطع الغيار الأصلية، مع الدفع عند الاستلام والتوصيل لكافة ولايات تونس الـ24.';

const PAGES: Record<string, PageMeta> = {
  store: { path: '/', title: 'ECHOX STORE — متجر تونسي للأدوات والمعدات وقطع الغيار الأصلية', description: DEFAULT_DESC, index: true },
  promise: { path: '/promise', title: 'وعدنا وضمان الجودة | ECHOX STORE تونس', description: 'تعرّف على ضمان ECHOX STORE: منتجات أصلية، دفع عند الاستلام، وتوصيل سريع لكافة ولايات تونس.', index: true },
  companies: { path: '/companies', title: 'الشركات والعلامات الشريكة | ECHOX STORE تونس', description: 'العلامات التجارية والشركات الشريكة لمتجر ECHOX STORE في تونس للأدوات والمعدات الأصلية.', index: true },
  contact: { path: '/contact', title: 'اتصل بنا | ECHOX STORE تونس', description: 'تواصل مع ECHOX STORE عبر الهاتف أو واتساب أو البريد الإلكتروني. الدعم من الإثنين إلى السبت.', index: true },
  my_orders: { path: '/my_orders', title: 'تتبع طلبك | ECHOX STORE', description: DEFAULT_DESC, index: false },
  account: { path: '/account', title: 'حسابي | ECHOX STORE', description: DEFAULT_DESC, index: false },
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

export function applySeo(view: string) {
  const isOwner = view.startsWith('/owner') || view === 'owner_dashboard';
  const page = PAGES[view === '/' ? 'store' : view === 'wishlist' ? 'account' : view] ||
    (isOwner ? { ...PAGES.account, title: 'ECHOX STORE', path: view, index: false } : PAGES.store);

  const url = SITE_URL + page.path;
  document.title = page.title;
  setMeta('name', 'description', page.description);
  setMeta('name', 'robots', page.index ? 'index, follow, max-image-preview:large' : 'noindex, nofollow');
  setMeta('property', 'og:title', page.title);
  setMeta('property', 'og:description', page.description);
  setMeta('property', 'og:url', url);

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;
}
