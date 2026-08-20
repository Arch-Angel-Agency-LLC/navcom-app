/// <reference types="@sveltejs/kit" />
/**
 * Offline shell for the Field Terminal.
 *
 * Registered only when a terminal page is visited — the public site runs no script, so it
 * never reaches this code. That is deliberate: a document does not need a worker, and a
 * reader who has scripting off should not be handed one.
 *
 * The terminal is a different matter. **Offline is a normal state, not an error** [C10], and
 * the Outpost's whole situation is a parking lot with no service. So the shell is cached on
 * install and served from cache first, because a terminal that needs the network to render
 * "Dark" has failed at the exact moment it mattered.
 */

import { base, build, files, version } from '$service-worker';
import { TERMINAL_ROUTES } from '$lib/terminal/routes';

const CACHE = `navcom-terminal-${version}`;

/**
 * The shell, plus the terminal's own pages.
 *
 * The directory is prerendered INTO the terminal's directory page rather than fetched as
 * data, so caching the page caches the records — one artifact, no second request that could
 * fail exactly when it matters. Cached on install, not on first use: the moment an operator
 * needs the directory is the moment they have no signal, and "we'll fetch it when you open
 * the screen" is a fallback that only works when you did not need a fallback.
 */
const SHELL = [
  ...build,
  ...files.filter((f) => !f.endsWith('.csv')),
  ...TERMINAL_ROUTES.map(
    (page) => `${base}/terminal/${page}`
  )
];

/**
 * Individual area pages are NOT precached.
 *
 * There are dozens and an operator works in one. Precaching them all would fill a cheap
 * phone with cities somebody will never visit, so opening an area is what saves it — which
 * is why that page says so in those words rather than offering a download button.
 */
const isAreaPage = (pathname: string) => /\/terminal\/directory\/[^/]+\/?$/.test(pathname);

const sw = self as unknown as ServiceWorkerGlobalScope;

/** No network and nothing cached. Fail visibly — degrade visibly, never fail silently. */
function offline(): Response {
  return new Response('Offline, and this was not cached.', {
    status: 503,
    headers: { 'content-type': 'text/plain' }
  });
}

sw.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => sw.skipWaiting()));
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => sw.clients.claim())
  );
});

sw.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  // Only the terminal is offline-capable. The public site is served normally.
  if (!url.pathname.startsWith('/terminal') && !url.pathname.startsWith('/_app')) return;

  // The directory page is the one worth refreshing when there IS a network: a cached copy
  // that silently never updates is how a phone ends up confidently reciting a shelter that
  // closed in March. Cache remains the fallback, so being offline changes nothing.
  if (url.pathname.endsWith('/terminal/directory/') || isAreaPage(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit ?? offline()))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).catch(() => {
          return offline();
        })
    )
  );
});
