interface PagesFunctionContext {
  request: Request;
  env: Record<string, string | undefined>;
}

const PUBLIC_PATHS = [
  { loc: '/', changefreq: 'daily', priority: '1.0', multilingual: true },
  { loc: '/promise', changefreq: 'monthly', priority: '0.8', multilingual: true },
  { loc: '/companies', changefreq: 'weekly', priority: '0.8', multilingual: true },
  { loc: '/contact', changefreq: 'monthly', priority: '0.7', multilingual: true },
  { loc: '/?category=power_tools', changefreq: 'weekly', priority: '0.8', multilingual: false },
  { loc: '/?category=auto_parts', changefreq: 'weekly', priority: '0.8', multilingual: false },
  { loc: '/?category=electronics', changefreq: 'weekly', priority: '0.8', multilingual: false },
  { loc: '/?product=prod_titan_drill', changefreq: 'weekly', priority: '0.9', multilingual: true },
  { loc: '/?product=prod_aether_headlight', changefreq: 'weekly', priority: '0.9', multilingual: true },
  { loc: '/?product=prod_fluke_multimeter', changefreq: 'weekly', priority: '0.9', multilingual: true },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  const url = new URL(context.request.url);
  const origin = (context.env.VITE_SITE_URL || url.origin).replace(/\/$/, '');
  const lastmod = new Date().toISOString().slice(0, 10);

  const entries = PUBLIC_PATHS.map((entry) => {
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
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
