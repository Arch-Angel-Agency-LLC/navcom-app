/**
 * Being on station.
 *
 * Signing on is a deliberate act and never automatic — an operator who did not sign on is
 * not watched, and the terminal must never decide otherwise on their behalf.
 */

import { SimplePool } from 'nostr-tools/pool';
import {
  capabilitySentence,
  checkReview,
  sendDistressUntilAcknowledged,
  sendSignal,
  waitForResponse,
  type DistressPhase,
  type OnStationPayload,
  type ResponsePayload,
  type SignalType,
  type ReviewCheck,
  type WatchStatePayload
} from '@navcom/core';

import { loadConfig } from './config';
import { loadIdentity } from './identity';
import { get, set, clearField } from './storage';
import { watch } from './watch.svelte';
import { seenRoots } from './roots';

export interface SignOn {
  at: number;
  area: string;
  expectedUntil: number;
  /**
   * What the watch said it could do at the moment of signing on.
   *
   * The operator's own record, not the node's — it is not signed by the Watchtower, so it
   * proves what this terminal was *shown*, not what was true. The node-signed version is
   * the capability receipt, and it lands when the daemon issues one.
   */
  toldAtSignOn: string;
}

let session = $state<SignOn | null>(get<SignOn>('wipeable', 'signon'));
let busy = $state(false);
let lastResponse = $state<ResponsePayload | null>(null);
let error = $state<string | null>(null);
let distressPhases = $state<DistressPhase[]>([]);
let distressRunning = $state(false);
let distressController: AbortController | null = null;

const pool = new SimplePool();

function ctx() {
  const config = loadConfig();
  const identity = loadIdentity();
  if (!config || !identity) throw new Error('This terminal is not set up yet.');
  return { config, identity };
}

async function send(type: SignalType, payload: object, timeoutMs = 10_000) {
  const { config, identity } = ctx();
  const sent = await sendSignal(
    pool, config.relays, identity.secretKey, config.pubkey, type, payload as never
  );
  return waitForResponse(
    pool, config.relays, identity.secretKey, identity.pubkey, config.pubkey, sent, timeoutMs
  );
}

/** Attaches the declared area, which is coarse by construction — it came from a sign-on. */
function area(text?: string) {
  return {
    ...(text === undefined ? {} : { text }),
    ...(session?.area ? { area: session.area } : {})
  };
}

async function run<T>(fn: () => Promise<T>): Promise<T | null> {
  busy = true;
  error = null;
  try {
    return await fn();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    return null;
  } finally {
    busy = false;
  }
}

export const operator = {
  get session(): SignOn | null { return session; },
  get busy(): boolean { return busy; },
  get error(): string | null { return error; },
  get lastResponse(): ResponsePayload | null { return lastResponse; },
  get distress(): DistressPhase[] { return distressPhases; },
  /** True while the retry loop is alive. It ends on a human, or on the operator. */
  get distressRunning(): boolean { return distressRunning; },

  async signOn(area: string, hours: number, routineMinutes: number | null) {
    const state: WatchStatePayload = watch.state;
    const payload: OnStationPayload = {
      callsign: loadIdentity()?.callsign ?? undefined,
      area,
      expected_duration: Math.round(hours * 3600),
      routine_interval: routineMinutes === null ? null : routineMinutes * 60,
      share_position: false,
      position: null
    };
    const response = await run(() => send('on-station', payload));
    if (!response) return;
    lastResponse = response;
    session = {
      at: Math.floor(Date.now() / 1000),
      area,
      expectedUntil: Math.floor(Date.now() / 1000) + Math.round(hours * 3600),
      toldAtSignOn: capabilitySentence(state)
    };
    // Wipeable: tonight's data. Panic wipe removes it; identity survives.
    set('wipeable', 'signon', session);
  },

  async routine() {
    const r = await run(() => send('routine', {}));
    if (r) lastResponse = r;
  },

  async query(text: string) {
    // Area rides along so the watch can answer "nearest bed" without asking where you are.
    const r = await run(() => send('query', area(text), 15_000));
    if (r) lastResponse = r;
  },

  async assist(urgency: 'soon' | 'now', text: string) {
    const r = await run(() => send('assist', { urgency, ...area(text ? text : undefined) }, 15_000));
    if (r) lastResponse = r;
  },

  /**
   * Asks the watch what it has written about this operator, and checks the answer.
   *
   * The check is the point. A response carries entries, proofs and the root they are
   * against — all three from the watch — so verifying them against each other proves
   * nothing. `checkReview` accepts only a root this device saw published itself.
   */
  async reviewLog(): Promise<ReviewCheck | null> {
    const response = await run(() => send('log-review', {}, 20_000));
    if (!response) return null;
    lastResponse = response;
    if (!response.review) return null;
    const identity = loadIdentity();
    if (!identity) return null;
    return checkReview(response.review, seenRoots(), identity.pubkey);
  },

  async standDown() {
    const r = await run(() => send('stood-down', {}));
    if (!r) return;
    lastResponse = r;
    session = null;
    clearField('wipeable', 'signon');
  },

  /**
   * Sends Distress and keeps sending until a human acknowledges.
   *
   * Never stops on its own. Every attempt is reported, including the ones that never left
   * the device — an operator who knows nothing is getting through can act on that.
   */
  async raiseDistress(text: string) {
    const { config, identity } = ctx();
    distressPhases = [];
    error = null;
    distressRunning = true;
    distressController = new AbortController();
    try {
      await sendDistressUntilAcknowledged(
        pool, config.relays, identity.secretKey, identity.pubkey, config.pubkey,
        { position: null, area: session?.area ?? null, text: text || undefined },
        {
          signal: distressController.signal,
          onPhase: (p) => { distressPhases = [...distressPhases, p]; }
        }
      );
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      distressRunning = false;
      distressController = null;
    }
  },

  /**
   * Stops a running Distress. **Only the operator calls this** — nothing else in the app
   * may, because a client that gives up on its own has failed silently.
   */
  standDownDistress() {
    distressController?.abort();
  },

  /**
   * Drops everything this module is holding in memory, and sends nothing.
   *
   * A wipe clears storage; without this the screen would go on showing "On station —
   * Downtown" from a variable, which is the wipe appearing to have failed at the moment an
   * operator most needs to believe it worked.
   *
   * It deliberately does **not** stand down. Standing down is a signal, and a signal is
   * visible — the operator wiping under duress is the last person who should be made to
   * transmit. The board entry is the watch's, it is Live, and it expires on its own.
   */
  forget() {
    session = null;
    lastResponse = null;
    error = null;
    distressPhases = [];
  }
};
