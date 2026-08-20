import type { Page, Response } from '@playwright/test';

/**
 * Putting a device into a known state before the app loads.
 *
 * There is no server-side state in NavCom — an operator's identity, peers, contact and
 * patrols all live in `localStorage` on their own phone. That makes these tests much
 * cheaper than they would be in most applications: seeding a scenario is writing two keys.
 *
 * It also means every test starts from a real state an operator can actually be in, rather
 * than from a fixture nobody would ever have.
 */

/**
 * A fixed key, so failures are reproducible.
 *
 * Never used anywhere but here. Any 64 hex characters are a valid secp256k1 secret with
 * overwhelming probability, and this one is deliberately obvious about being a test value.
 */
export const TEST_SECRET = 'a'.repeat(63) + '1';

interface Seed {
  /** Give the device an identity. Without one, the app is at "start here". */
  callsign?: string;
  /** Configure a Watchtower. Most tests deliberately do NOT, because most operators have none. */
  watchtower?: { pubkey: string; relays: string[] };
  /** Somebody to call. */
  contact?: { label: string; number: string };
  /** People paired with, keyed by pubkey. */
  peers?: { pubkey: string; callsign: string; since: number }[];
  /** Whether the patrol history survives a panic wipe. */
  keepPatrolHistory?: boolean;
}

/**
 * Seeds storage before any script on the page runs.
 *
 * `addInitScript` rather than navigating and then writing: the app reads storage during
 * module initialisation, so writing afterwards would test a state that never occurs.
 *
 * **It seeds once and then gets out of the way.** The script runs on every navigation, so
 * an unconditional write erases whatever the test just did — the first version of this
 * wiped a patrol between recording it and navigating to look at it, and the failure looked
 * exactly like the app not saving patrols. A harness that quietly undoes the thing under
 * test is worse than no harness.
 */
export async function seedDevice(page: Page, seed: Seed = {}): Promise<void> {
  await page.addInitScript((s: Seed & { secret: string }) => {
    /**
     * No test touches the public internet.
     *
     * Several screens open relay connections on mount — presence, and now the invite
     * inbox — so without this the suite quietly dialled `relay.damus.io` on every run.
     * That is somebody else's volunteer-run server, it makes results depend on their
     * uptime, and a test that can fail because a stranger rebooted a box is not a test.
     *
     * Stubbed rather than blocked at the network layer so the app's own code paths still
     * run: a pool with a socket that never opens is exactly the state a phone with no
     * signal is in, which is the state most of these tests are about anyway.
     */
    class DeadSocket extends EventTarget {
      static readonly CONNECTING = 0;
      static readonly OPEN = 1;
      static readonly CLOSING = 2;
      static readonly CLOSED = 3;
      readonly readyState = 3;
      readonly url: string;
      onopen: unknown = null;
      onclose: unknown = null;
      onerror: unknown = null;
      onmessage: unknown = null;
      constructor(url: string) {
        super();
        this.url = url;
        // Asynchronous, like a real failure. A synchronous throw in a constructor would
        // take down whatever module was building the pool.
        setTimeout(() => this.dispatchEvent(new Event('error')), 0);
      }
      send(): void {}
      close(): void {}
    }
    (globalThis as unknown as { WebSocket: unknown }).WebSocket = DeadSocket;

    // Already set up by an earlier navigation in this test. Leave it alone.
    if (localStorage.getItem('navcom.seeded') === '1') return;
    localStorage.setItem('navcom.seeded', '1');

    const accruing: Record<string, unknown> = {};
    const wipeable: Record<string, unknown> = {};

    if (s.callsign) {
      accruing['secret'] = s.secret;
      accruing['callsign'] = s.callsign;
    }
    if (s.watchtower) {
      accruing['watchtower'] = s.watchtower.pubkey;
      accruing['relays'] = s.watchtower.relays;
    }
    if (s.contact) accruing['emergency_contact'] = s.contact;
    if (s.peers) accruing['peers'] = s.peers;
    if (s.keepPatrolHistory !== undefined) accruing['keep_patrol_history'] = s.keepPatrolHistory;

    localStorage.setItem('navcom.accruing', JSON.stringify(accruing));
    localStorage.setItem('navcom.wipeable', JSON.stringify(wipeable));
  }, { ...seed, secret: TEST_SECRET });
}

/**
 * Opens a terminal screen and waits until it is actually interactive.
 *
 * `page.goto` resolves when the HTML has loaded, and every terminal screen is prerendered —
 * so the controls are on screen, visible and enabled, a beat before anything is wired to
 * them. Playwright fills and clicks far faster than a person does, and lands in that
 * window; under parallel load it landed there often enough that several specs failed at
 * random, each looking like a bug in a different screen.
 *
 * Waiting on the terminal layout's own hydration flag is the fix, rather than a timeout:
 * it waits for exactly the thing that has to have happened, and it cannot pass early on a
 * fast machine or fail late on a slow one.
 */
export async function open(page: Page, path: string): Promise<Response | null> {
  const response = await page.goto(path);
  await page.waitForSelector('html[data-hydrated="true"]', { timeout: 15_000 });
  return response;
}

/** What is actually on the device now, for asserting on the result of a flow. */
export async function readDevice(page: Page): Promise<{
  accruing: Record<string, unknown>;
  wipeable: Record<string, unknown>;
}> {
  return page.evaluate(() => ({
    accruing: JSON.parse(localStorage.getItem('navcom.accruing') ?? '{}') as Record<string, unknown>,
    wipeable: JSON.parse(localStorage.getItem('navcom.wipeable') ?? '{}') as Record<string, unknown>
  }));
}

/**
 * Waits for the service worker to be running.
 *
 * The offline tests are worthless without this. Going offline before the worker has
 * activated tests a page that is still being served from the network, and passes.
 */
export async function serviceWorkerReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller !== null || !!navigator.serviceWorker?.ready,
    undefined,
    { timeout: 20_000 }
  );
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active?.state !== 'activated') {
      await new Promise<void>((resolve) => {
        registration.active?.addEventListener('statechange', function listener() {
          if (this.state === 'activated') resolve();
        });
      });
    }
  });
}
