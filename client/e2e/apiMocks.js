// Shared API mocking helper for the Playwright E2E suite.
//
// A single catch-all route handler is installed on the `/api/` prefix and every
// request is dispatched against an ordered list of route descriptors. The first
// descriptor whose `method` (optional) and `pattern` (RegExp, matched against
// the URL pathname) both match wins. This keeps the specs free of Playwright
// route-ordering concerns.
//
// Descriptor shape:
//   {
//     method:  'GET',                 // optional HTTP method
//     pattern: /\/api\/bugs$/,        // RegExp against the URL pathname
//     status:  200,                   // optional, defaults to 200
//     json:    { ... } | async (ctx), // body, or a function producing it
//     abort:   true,                  // simulate a dropped connection
//   }
//
// When nothing matches, a 404 `{ error }` envelope is returned so unexpected
// requests fail loudly rather than hanging.
export function createApiRouter(routes = []) {
  return async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method().toUpperCase();

    for (const entry of routes) {
      if (entry.method && entry.method.toUpperCase() !== method) continue;
      if (entry.pattern && !entry.pattern.test(pathname)) continue;

      if (entry.abort) {
        return route.abort();
      }

      let json = entry.json;
      if (typeof json === 'function') {
        json = await json({ request, pathname, method });
      }

      return route.fulfill({
        status: entry.status ?? 200,
        json: json ?? {},
      });
    }

    return route.fulfill({
      status: 404,
      json: { error: `No mock for ${method} ${pathname}` },
    });
  };
}

/** Install a single catch-all `/api/**` mock router on the page. */
export async function installApiMocks(page, routes) {
  await page.route('**/api/**', createApiRouter(routes));
}
