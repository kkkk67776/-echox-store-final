interface ApiProxyContext {
  request: Request;
  env: Record<string, string | undefined>;
}

export async function onRequest(context: ApiProxyContext): Promise<Response> {
  const backendOrigin = context.env.BACKEND_ORIGIN?.replace(/\/$/, '');
  if (!backendOrigin) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          'BACKEND_ORIGIN is not configured on Cloudflare Pages. Deploy the Node.js Express service (e.g. Render Free) and set BACKEND_ORIGIN in Cloudflare Pages environment variables.',
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    );
  }

  const incomingUrl = new URL(context.request.url);
  const targetUrl = `${backendOrigin}${incomingUrl.pathname}${incomingUrl.search}`;

  const headers = new Headers(context.request.headers);
  headers.delete('host');

  const init: RequestInit = {
    method: context.request.method,
    headers,
    redirect: 'manual',
  };

  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    init.body = await context.request.arrayBuffer();
  }

  const upstream = await fetch(targetUrl, init);
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set('X-Robots-Tag', 'noindex, nofollow');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
