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

/**
 * A page asking to be saved.
 *
 * Area pages are cached on request rather than precached — there are dozens and an operator
 * works in one. The obvious mechanism, caching whatever gets fetched, **does not work here**:
 * SvelteKit navigates on the client, so clicking through to an area fetches its data and
 * never its HTML document. The document was therefore never cached, and "opening an area is
 * what saves it" was false for the only path anybody actually takes.
 *
 * So the page asks, explicitly, once it has rendered.
 */
sw.addEventListener('message', (event) => {
  const data = event.data as { cache?: string } | null;
  const path = data?.cache;
  if (typeof path !== 'string' || !path.startsWith('/terminal/')) return;

  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.add(new Request(path, { credentials: 'same-origin' })))
      // A failure here is an area not saved, which the page reports on its own terms. It
      // must not take down the worker that is also serving Distress.
      .catch(() => undefined)
  );
});

/**
 * A page, and the only notification this app is allowed to show.
 *
 * **The field terminal is silent.** No badges, no activity, no nudges, no "somebody signed
 * on". The single exception is a `Distress` reaching somebody who registered themselves as
 * on-call, which is the one message in this system where failing to interrupt a person is
 * the failure.
 *
 * ## Why web push rather than a third-party topic
 *
 * A page over an ntfy topic passes its text through somebody else's server in the clear. A
 * Web Push payload is encrypted to keys that only this browser holds, so the push service —
 * Google's, Mozilla's or Apple's, and there is no avoiding one — relays a blob it cannot
 * read. That is a real improvement on the one channel that carries an emergency.
 *
 * It is also the one native-grade capability a web app already has on both platforms: Chrome
 * on Android, and iOS 16.4+ once the app is on the home screen. No app store in either case.
 *
 * ## What it deliberately does not do
 *
 * No payload from the wire is rendered. The sender is a machine that cannot read the
 * `Distress` either, so there is nothing to render — and a notification that quoted
 * attacker-controlled text on a locked screen would be a way to put words in front of
 * somebody at their least critical moment. The text is fixed and lives here.
 */
sw.addEventListener('push', (event) => {
  // A push with no data, or data this version does not understand, still wakes somebody.
  // Failing closed here would mean a silent page, which is the failure this exists to
  // prevent -- so anything unparseable is treated as a real Distress.
  let drill = false;
  try {
    drill = (event.data?.json() as { drill?: boolean } | null)?.drill === true;
  } catch {
    drill = false;
  }

  event.waitUntil(
    sw.registration.showNotification(
      drill ? 'NavCom drill — not an emergency' : 'NavCom — Distress',
      {
        body: drill
          ? 'A drill. Acknowledge it so the roster can be proven.'
          : 'An operator is waiting for a human. Open the terminal and acknowledge.',
        // Distinguishable by the recipient, in the text they actually read [C29]. Somebody
        // woken at 3am has seconds and no context.
        tag: drill ? 'navcom-drill' : 'navcom-distress',
        requireInteraction: !drill,
        data: { url: `${base}/terminal/` }
      }
    )
  );
});

/** Tapping it opens the terminal, focusing a tab that is already there rather than adding one. */
sw.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | null)?.url ?? `${base}/terminal/`;
  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes('/terminal') && 'focus' in client) return client.focus();
      }
      return sw.clients.openWindow(url);
    })
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
