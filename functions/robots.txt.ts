interface PagesFunctionContext {
  request: Request;
  env: Record<string, string | undefined>;
}

export async function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  const url = new URL(context.request.url);
  const origin = context.env.VITE_SITE_URL || url.origin;

  const body = `User-agent: *
Allow: /
Allow: /promise
Allow: /companies
Allow: /contact
Allow: /assets/
Disallow: /owner
Disallow: /owner/
Disallow: /owner_dashboard
Disallow: /my_orders
Disallow: /account
Disallow: /wishlist
Disallow: /api/

Sitemap: ${origin.replace(/\/$/, '')}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
