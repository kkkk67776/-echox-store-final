interface ApiProxyContext {
  request: Request;
  env: Record<string, string | undefined>;
}

const DEFAULT_RENDER_BACKEND = 'https://echox-store.onrender.com';

export async function onRequest(context: ApiProxyContext): Promise<Response> {
  if (context.request.method === 'OPTIONS') {
    const reqOrigin = context.request.headers.get('origin') || 'https://echoxstore.pages.dev';
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': reqOrigin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  const rawBackend = (context.env.BACKEND_ORIGIN || DEFAULT_RENDER_BACKEND).trim().replace(/\/$/, '');
  if (!/^https?:\/\//i.test(rawBackend)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'BACKEND_ORIGIN is invalid on Cloudflare Pages.',
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    );
  }

  const incomingUrl = new URL(context.request.url);
  const targetUrl = `${rawBackend}${incomingUrl.pathname}${incomingUrl.search}`;

  const headers = new Headers(context.request.headers);
  const clientIp =
    context.request.headers.get('cf-connecting-ip') ||
    context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (clientIp) {
    headers.set('cf-connecting-ip', clientIp);
    headers.set('x-forwarded-for', clientIp);
  }
  headers.set('x-forwarded-host', incomingUrl.host);
  headers.set('x-forwarded-proto', 'https');
  headers.delete('host');

  const isIdempotentRead = context.request.method === 'GET' || context.request.method === 'HEAD';
  const isRetryableVerifyPost =
    context.request.method === 'POST' &&
    (incomingUrl.pathname === '/api/security/verifyAccessCode' ||
      incomingUrl.pathname === '/api/security/verifyPin' ||
      incomingUrl.pathname === '/api/payments/verify-return' ||
      incomingUrl.pathname === '/api/orders/track');
  const canRetryUpstream = isIdempotentRead || isRetryableVerifyPost;
  const bodyBuffer = !isIdempotentRead ? await context.request.arrayBuffer() : undefined;

  const buildInit = (): RequestInit => {
    const init: RequestInit = {
      method: context.request.method,
      headers,
      redirect: 'manual',
    };
    if (bodyBuffer) {
      init.body = bodyBuffer.slice(0);
    }
    return init;
  };

  const isColdStartStatus = (status: number) => status === 502 || status === 503 || status === 504;

  try {
    let upstream = await fetch(targetUrl, buildInit());

    // Render Free Plan cold-start resilience: wait and retry up to 2 times for wake-up
    if (canRetryUpstream && isColdStartStatus(upstream.status)) {
      for (const waitMs of [2000, 3000]) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        upstream = await fetch(targetUrl, buildInit());
        if (!isColdStartStatus(upstream.status)) break;
      }
    }

    const contentType = upstream.headers.get('content-type') || '';
    if (isColdStartStatus(upstream.status) && !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'الخادم الخلفي يستيقظ الآن من وضع السكون (Render)، يرجى الانتظار 15-25 ثانية ثم المحاولة مجدداً.',
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'noindex, nofollow',
          },
        }
      );
    }

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set('X-Robots-Tag', 'noindex, nofollow');
    responseHeaders.set('Cache-Control', 'no-store');

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    if (canRetryUpstream) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const retryUpstream = await fetch(targetUrl, buildInit());
        const retryType = retryUpstream.headers.get('content-type') || '';
        if (!isColdStartStatus(retryUpstream.status) || retryType.includes('application/json')) {
          const responseHeaders = new Headers(retryUpstream.headers);
          responseHeaders.set('X-Robots-Tag', 'noindex, nofollow');
          responseHeaders.set('Cache-Control', 'no-store');
          return new Response(retryUpstream.body, {
            status: retryUpstream.status,
            statusText: retryUpstream.statusText,
            headers: responseHeaders,
          });
        }
      } catch {
        // fall through to 502
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'الخادم الخلفي يستيقظ الآن من وضع السكون (Render)، يرجى الانتظار 15-25 ثانية ثم المحاولة مجدداً.',
        detail: (err as Error)?.message || 'Upstream unavailable',
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    );
  }
}
