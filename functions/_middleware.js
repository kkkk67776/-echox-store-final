export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (!url.pathname.startsWith('/api/')) {
    return next();
  }

  const backendOrigin = (env.BACKEND_ORIGIN || env.VITE_BACKEND_ORIGIN || '').replace(/\/$/, '');

  if (!backendOrigin) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Cloudflare Pages API backend is not configured. Set BACKEND_ORIGIN in the Pages project environment.'
    }), {
      status: 503,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  const targetUrl = new URL(url.pathname + url.search, backendOrigin);
  const headers = new Headers(request.headers);
  headers.set('x-forwarded-host', url.host);
  headers.set('x-forwarded-proto', url.protocol.replace(':', ''));
  headers.set('x-forwarded-for', request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '');
  headers.set('x-real-ip', request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '');

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const text = await request.clone().text();
    if (text) {
      init.body = text;
    }
  }

  return fetch(targetUrl, init);
}
