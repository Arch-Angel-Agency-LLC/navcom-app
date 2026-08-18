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

import { build, files, version } from '$service-worker';

const CACHE = `navcom-terminal-${version}`;

/** The shell only. Directory data caches separately, in sprint 04. */
const SHELL = [...build, ...files.filter((f) => !f.endsWith('.csv'))];

const sw = self as unknown as ServiceWorkerGlobalScope;

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

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).catch(() => {
          // No network and nothing cached. Fail visibly rather than hanging — degrade
          // visibly, never fail silently.
          return new Response('Offline, and this was not cached.', {
            status: 503,
            headers: { 'content-type': 'text/plain' }
          });
        })
    )
  );
});
