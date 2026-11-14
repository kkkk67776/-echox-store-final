interface PagesFunctionContext {
  request: Request;
  env: Record<string, string | undefined>;
}

const DEFAULT_RENDER_BACKEND = 'https://echox-store.onrender.com';

const STATIC_PATHS = [
  { loc: '/', changefreq: 'daily', priority: '1.0', multilingual: true },
  { loc: '/promise', changefreq: 'monthly', priority: '0.8', multilingual: true },
  { loc: '/companies', changefreq: 'weekly', priority: '0.8', multilingual: true },
  { loc: '/contact', changefreq: 'monthly', priority: '0.7', multilingual: true },
  { loc: '/?category=power_tools', changefreq: 'weekly', priority: '0.8', multilingual: false },
  { loc: '/?category=auto_parts', changefreq: 'weekly', priority: '0.8', multilingual: false },
  { loc: '/?category=electronics', changefreq: 'weekly', priority: '0.8', multilingual: false },
];

const FALLBACK_PRODUCT_IDS = [
  'prod_titan_drill',
  'prod_aether_headlight',
  'prod_fluke_multimeter',
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function fetchLiveProductIds(backendOrigin: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${backendOrigin}/api/store/state`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);
    if (!res.ok) return FALLBACK_PRODUCT_IDS;
    const data: any = await res.json().catch(() => null);
    if (data && Array.isArray(data.products)) {
      const ids = data.products
        .filter((p: any) => p && p.active !== false && typeof p.id === 'string' && p.id.trim())
        .map((p: any) => String(p.id).trim());
      if (ids.length > 0) return ids;
    }
  } catch {
    // Fallback cleanly if Render backend is waking up
  }
  return FALLBACK_PRODUCT_IDS;
}

export async function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  const url = new URL(context.request.url);
  const origin = (context.env.VITE_SITE_URL || url.origin).replace(/\/$/, '');
  const backendOrigin = (context.env.BACKEND_ORIGIN || DEFAULT_RENDER_BACKEND).trim().replace(/\/$/, '');
  const lastmod = new Date().toISOString().slice(0, 10);

  const productIds = await fetchLiveProductIds(backendOrigin);
  const productRoutes = productIds.map((id) => ({
    loc: `/?product=${encodeURIComponent(id)}`,
    changefreq: 'weekly',
    priority: '0.9',
    multilingual: true,
  }));

  const entries = [...STATIC_PATHS, ...productRoutes]
    .map((entry) => {
      const fullUrl = `${origin}${entry.loc}`;
      const sep = entry.loc.includes('?') ? '&' : '?';
      const alternates = entry.multilingual
        ? `
    <xhtml:link rel="alternate" hreflang="ar-TN" href="${escapeXml(`${fullUrl}${sep}lang=ar`)}" />
    <xhtml:link rel="alternate" hreflang="fr-TN" href="${escapeXml(`${fullUrl}${sep}lang=fr`)}" />
    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(`${fullUrl}${sep}lang=en`)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(fullUrl)}" />`
        : '';

      return `  <url>
    <loc>${escapeXml(fullUrl)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>${alternates}
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  });
}
