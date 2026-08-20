/**
 * Holding the board, on a phone.
 *
 * This is the watch as a **mode of the same app**, replacing the plan where a Console was
 * served from a box. The premise of that plan was that a box exists, and for the squads
 * this project is actually for, it does not.
 *
 * ## Taking watch is a declaration, not a monitor
 *
 * Nothing here watches anybody. A phone in a pocket with the screen off is not observing a
 * board, and no amount of interface can make it so. What this screen does is let a person
 * **say, on the record, that they are watching** — and then show them what they have taken
 * on, so they can actually do it.
 *
 * That distinction is the whole design, and it is why:
 *
 * - **Nothing is inferred from the app being open.** Taking watch is an explicit act, and
 *   so is standing down. Closing the tab does not end a watch, because a watch that ended
 *   when a screen closed would end without anybody being told
 * - **Overdue is shown, never acted on.** The board marks somebody past their time and
 *   stops there. It pages nobody, contacts nobody, and starts no ladder [invariant 3]
 * - **There is no alert, no sound and no badge.** A person who took watch is expected to
 *   look. A phone that promised to interrupt them would be promising something a
 *   backgrounded web page cannot deliver
 *
 * ## Who can read what
 *
 * Signals are sealed to the **holders** — each member's own operator key — so a member
 * reads the board with their own key and never needs the watch's. The watch key signs
 * answers and watch state, which is a separate job [`watch-key.ts`].
 */

import { SimplePool } from 'nostr-tools/pool';
import { finalizeEvent } from 'nostr-tools/pure';
import type { Event } from 'nostr-tools/core';
import {
  buildResponse,
  buildWatchStateEvent,
  darkState,
  isOverdue,
  KIND_DISTRESS,
  KIND_SIGNAL,
  openFromGroup,
  readTag,
  type BoardEntry,
  type SignalType
} from '@navcom/core';
import { loadIdentity } from './identity';
import { loadConfig } from './config';
import { relays } from './relays';
import { watchKey, watchPubkey } from './watch-key';

/** How often watch state is republished. A stale state reads Dark, which is the point. */
export const WATCH_BEAT_SECONDS = 120;

export interface Waiting {
  id: string;
  operator: string;
  callsign: string;
  type: SignalType | 'distress';
  text: string | null;
  at: number;
}

let entries = $state<BoardEntry[]>([]);
let waiting = $state<Waiting[]>([]);
let onStation = $state(false);
let since = $state(0);
let closer: { close(): void } | null = null;
let beat: ReturnType<typeof setInterval> | null = null;
const pool = new SimplePool();

/** Anything sealed to us that we could not open is dropped, never guessed at. */
function readSignal(event: Event): { from: string; payload: Record<string, unknown> } | null {
  const identity = loadIdentity();
  if (!identity) return null;
  try {
    return {
      from: event.pubkey,
      payload: openFromGroup<Record<string, unknown>>(identity.secretKey, event.pubkey, event.content)
    };
  } catch {
    return null;
  }
}

export const board = {
  /** Who is out, as this device has heard it. Never persisted — the board expires [C27]. */
  get entries(): BoardEntry[] {
    const now = Math.floor(Date.now() / 1000);
    return entries
      .map((e) => ({ ...e, status: isOverdue(e, now) ? ('overdue' as const) : e.status }))
      .sort((a, b) => a.callsign.localeCompare(b.callsign));
  },

  /** Signals somebody is waiting on an answer to. Oldest first — they have waited longest. */
  get waiting(): Waiting[] {
    return [...waiting].sort((a, b) => a.at - b.at);
  },

  get onStation(): boolean {
    return onStation;
  },

  get since(): number {
    return since;
  },

  /**
   * Starts listening.
   *
   * Listening is not holding watch. A member off watch still sees the board — that is the
   * squad trade, stated in the spec — and it is also what makes handover possible without
   * anything being transferred.
   */
  start(): void {
    const identity = loadIdentity();
    const address = watchPubkey() ?? loadConfig()?.pubkey;
    const urls = relays();
    if (!identity || !address || urls.length === 0) return;

    closer?.close();
    closer = pool.subscribeMany(
      urls,
      { kinds: [KIND_SIGNAL, KIND_DISTRESS], '#p': [address] },
      {
        onevent: (event: Event) => {
          const read = readSignal(event);
          if (!read) return;
          const type = (event.kind === KIND_DISTRESS
            ? 'distress'
            : readTag(event.tags, 't')) as Waiting['type'] | undefined;
          if (!type) return;
          apply(type, read.from, read.payload, event);
        }
      }
    );
  },

  /**
   * Goes on station.
   *
   * Explicit and ceremonial, because signing on means something. Everyone out sees the
   * callsign of whoever took it — an operator must never be unable to name who is behind
   * them [invariant 4].
   */
  async takeWatch(): Promise<void> {
    const secret = watchKey();
    const identity = loadIdentity();
    const urls = relays();
    if (!secret || !identity?.callsign || urls.length === 0) return;

    since = Math.floor(Date.now() / 1000);
    onStation = true;
    await publishState(secret, identity.callsign, since);
    if (beat) clearInterval(beat);
    beat = setInterval(() => {
      const s = watchKey();
      const who = loadIdentity()?.callsign;
      if (onStation && s && who) void publishState(s, who, since);
    }, WATCH_BEAT_SECONDS * 1000);
  },

  /**
   * Stands down, and says so.
   *
   * **Publishes Dark rather than going quiet.** Simply stopping would leave the last state
   * on the relay until it went stale, and every operator reading it in the meantime would
   * believe a human was watching. Dark is a supported state, honestly reported.
   */
  async standDown(): Promise<void> {
    const secret = watchKey();
    const urls = relays();
    onStation = false;
    if (beat) clearInterval(beat);
    beat = null;
    if (!secret || urls.length === 0) return;

    const event = finalizeEvent(
      { ...buildWatchStateEvent(darkInput(), Math.floor(Date.now() / 1000)), content: JSON.stringify(darkState()) },
      secret
    );
    await Promise.allSettled(pool.publish(urls, event));
  },

  /**
   * Answers somebody.
   *
   * The answer is signed by the watch and sealed to the one operator who asked. Answering
   * takes the signal off the board because it has been dealt with — **except a `Distress`,
   * which only a human ending it can clear** [invariant 2]. There is no button here that
   * closes one.
   */
  async answer(item: Waiting, text: string): Promise<void> {
    const secret = watchKey();
    const urls = relays();
    if (!secret || urls.length === 0) return;

    const identity = loadIdentity();
    const event = finalizeEvent(
      buildResponse(
        secret,
        item.operator,
        item.id,
        {
          type: item.type === 'distress' ? 'ack' : 'answer',
          // A person, saying so. An operator must never be uncertain whether they are
          // talking to one [invariant 5], and this is the field that decides it.
          responder: { kind: 'human', callsign: identity?.callsign ?? 'watch' },
          text: text.trim() || null,
          // No directory lookup happened here -- a person typed this. Claiming provenance
          // for a hand-written answer would dress it as verified, and a confident wrong
          // answer at 10pm is the worst failure available to this system.
          provenance: null
        },
        Math.floor(Date.now() / 1000)
      ),
      secret
    );
    await Promise.allSettled(pool.publish(urls, event));

    // A Distress stays until a human has actually ended it, which is not something this
    // screen can know. Acknowledging is telling them somebody is awake, not that it is over.
    if (item.type !== 'distress') {
      waiting = waiting.filter((w) => w.id !== item.id);
    }
  },

  stop(): void {
    closer?.close();
    closer = null;
    // The beat deliberately survives: closing a screen does not end a watch.
  }
};

function darkInput() {
  return {
    state: 'dark' as const,
    holder: null,
    holder_kind: null,
    oncall: [],
    since: Math.floor(Date.now() / 1000),
    agent_health: 'down' as const,
    last_drill: null,
    overdue_count: 0,
    log_root: null,
    now: Math.floor(Date.now() / 1000)
  };
}

async function publishState(secret: Uint8Array, callsign: string, at: number): Promise<void> {
  const urls = relays();
  const event = finalizeEvent(
    buildWatchStateEvent(
      {
        state: 'station',
        holder: callsign,
        holder_kind: 'human',
        // Nobody is on-call for a phone-held watch unless somebody said so. The node must
        // never assert reachability on anyone's behalf, and a squad has no node to.
        oncall: [],
        since: at,
        agent_health: 'down',
        last_drill: null,
        overdue_count: 0,
        log_root: null,
        now: Math.floor(Date.now() / 1000)
      },
      Math.floor(Date.now() / 1000)
    ),
    secret
  );
  await Promise.allSettled(pool.publish(urls, event));
}

/** Folds one signal into the board. */
function apply(
  type: Waiting['type'],
  from: string,
  payload: Record<string, unknown>,
  event: Event
): void {
  const callsign = typeof payload.callsign === 'string' ? payload.callsign : from.slice(0, 8);
  const now = event.created_at;

  if (type === 'on-station') {
    const duration = typeof payload.expected_duration === 'number' ? payload.expected_duration : 7200;
    const entry: BoardEntry = {
      operator: from,
      callsign,
      area: typeof payload.area === 'string' ? payload.area : 'unknown',
      signed_on: now,
      expected_until: now + duration,
      routine_due: typeof payload.routine_interval === 'number' ? now + payload.routine_interval : null,
      last_contact: now,
      position: (payload.position as BoardEntry['position']) ?? null,
      status: 'active'
    };
    entries = [...entries.filter((e) => e.operator !== from), entry];
    return;
  }

  if (type === 'stood-down') {
    entries = entries.filter((e) => e.operator !== from);
    waiting = waiting.filter((w) => w.operator !== from);
    return;
  }

  entries = entries.map((e) =>
    e.operator === from
      ? { ...e, last_contact: now, status: type === 'distress' ? 'distress' : e.status }
      : e
  );

  if (type === 'routine') return;

  // Query, Assist and Distress are all things a person is waiting on.
  waiting = [
    ...waiting.filter((w) => w.id !== event.id),
    {
      id: event.id,
      operator: from,
      callsign,
      type,
      text: typeof payload.text === 'string' ? payload.text : null,
      at: now
    }
  ];
}
