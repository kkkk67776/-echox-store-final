interface MiddlewareContext {
  request: Request;
  next: () => Promise<Response>;
}

const PRIVATE_ROUTE_PREFIXES = [
  '/owner',
  '/owner_dashboard',
  '/my_orders',
  '/orders',
  '/account',
  '/wishlist',
  '/api',
];

export async function onRequest(context: MiddlewareContext): Promise<Response> {
  const url = new URL(context.request.url);
  const response = await context.next();
  const newResponse = new Response(response.body, response);

  newResponse.headers.set('X-Content-Type-Options', 'nosniff');
  newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  const isPrivate = PRIVATE_ROUTE_PREFIXES.some(
    (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)
  );

  if (isPrivate) {
    newResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return newResponse;
}
