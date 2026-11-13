interface ApiProxyContext {
  request: Request;
  env: Record<string, string | undefined>;
}

export async function onRequest(context: ApiProxyContext): Promise<Response> {
  const backendOrigin = context.env.BACKEND_ORIGIN?.trim().replace(/\/$/, '');
  if (!backendOrigin) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          'BACKEND_ORIGIN is not configured on Cloudflare Pages. Deploy the free Node.js Express service (render.yaml) and set BACKEND_ORIGIN in Cloudflare Pages environment variables.',
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
  headers.set('x-forwarded-host', incomingUrl.host);
  headers.set('x-forwarded-proto', 'https');
  headers.delete('host');

  const init: RequestInit = {
    method: context.request.method,
    headers,
    redirect: 'manual',
  };

  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    init.body = await context.request.arrayBuffer();
  }

  try {
    const upstream = await fetch(targetUrl, init);
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set('X-Robots-Tag', 'noindex, nofollow');

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'تعذر الاتصال بالخادم الخلفي حالياً، قد يكون في وضع الاستيقاظ. يرجى المحاولة بعد لحظات.',
        detail: (err as Error)?.message || 'Upstream unavailable',
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    );
  }
}
