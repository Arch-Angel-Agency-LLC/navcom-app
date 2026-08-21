/**
 * What this phone can actually do with no signal — checked, not assumed.
 *
 * Three screens promise *"works with no signal at all"*. None of them ever looked. The
 * mechanism to look has been there the whole time: the Cache API is readable from the page,
 * and the worker knows what it failed to save.
 *
 * That gap is the one this project keeps finding in other forms — a claim with nothing
 * behind it — except here the thing behind it exists and was simply never consulted. An
 * operator who believes they are carrying St. Louis and is not finds out in a car park.
 *
 * **Absence of an answer is not an answer.** A browser with no Cache API, or a worker that
 * has not registered, reports `unknown` rather than `no` — saying "you are not carrying
 * this" when we cannot tell would be inventing a fact, the same way a blank directory field
 * reads as unknown rather than as no restriction.
 */

export type Carried = 'yes' | 'no' | 'unknown';

let areas = $state<Record<string, Carried>>({});
let shellGaps = $state<string[] | null>(null);

/** Whether a path is in any cache this origin holds. */
async function isCached(path: string): Promise<Carried> {
  if (typeof caches === 'undefined') return 'unknown';
  try {
    for (const name of await caches.keys()) {
      if (await (await caches.open(name)).match(path)) return 'yes';
    }
    return 'no';
  } catch {
    // A browser that refuses the Cache API entirely — private modes do this. We cannot
    // tell, so we say we cannot tell.
    return 'unknown';
  }
}

export const offline = {
  /** Per region slug: carried, not carried, or unknown. */
  get areas(): Record<string, Carried> {
    return areas;
  },

  /**
   * Shell entries the worker could not save, or null while unknown.
   *
   * Empty is the ordinary case. Anything else means parts of the terminal will not open
   * without a signal, which an operator should hear before they need them rather than after.
   */
  get shellGaps(): string[] | null {
    return shellGaps;
  },

  /** Checks each area the operator could be carrying. */
  async check(slugs: readonly string[]): Promise<void> {
    const found: Record<string, Carried> = {};
    for (const slug of slugs) found[slug] = await isCached(`/terminal/directory/${slug}/`);
    areas = found;
  },

  /** Asks the worker what it failed to save. Silent where there is no worker to ask. */
  async checkShell(): Promise<void> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const worker = navigator.serviceWorker.controller ?? registration.active;
      if (!worker) return;

      shellGaps = await new Promise<string[]>((resolve) => {
        // A worker that never answers must not leave the screen waiting on it.
        const timer = setTimeout(() => resolve([]), 3000);
        const onMessage = (e: MessageEvent) => {
          const data = e.data as { missing?: string[] } | null;
          if (!data || !Array.isArray(data.missing)) return;
          clearTimeout(timer);
          navigator.serviceWorker.removeEventListener('message', onMessage);
          resolve(data.missing);
        };
        navigator.serviceWorker.addEventListener('message', onMessage);
        worker.postMessage({ ask: 'missing' });
      });
    } catch {
      // Nothing to report is different from nothing being wrong, so this stays null.
    }
  }
};
