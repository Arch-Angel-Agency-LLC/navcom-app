/**
 * Who else is out, as this device sees it.
 *
 * Derived, never held. Each phone builds its own picture from the presence events it can
 * decrypt — there is no server-side list, nothing is persisted, and it expires on its own.
 *
 * **Absence reads as unknown**, never as home and never as in trouble. A peer whose
 * heartbeat stops has a flat battery, no signal, or a phone in a pocket, and the system
 * saying anything more than "I do not know" would be inventing a fact [invariant 3].
 */

import { SimplePool } from 'nostr-tools/pool';
import type { Event } from 'nostr-tools/core';
import {
  buildPresence,
  KIND_PEER_PRESENCE,
  readPresence,
  type PresencePayload
} from '@navcom/core';
import { loadConfig } from './config';
import { loadIdentity } from './identity';
import { peerPubkeys, peers } from './peers';

/** How often presence is republished, and therefore how quickly a peer appears. */
export const HEARTBEAT_SECONDS = 60;

/**
 * How many missed heartbeats before a peer reads as unknown.
 *
 * Three rather than one: a single missed beat is a subway, a lift, or a relay hiccup, and
 * flipping somebody to "unknown" every time they walk past a building would make the whole
 * view worthless.
 */
const MISSES_BEFORE_UNKNOWN = 3;

export interface PeerPresence {
  pubkey: string;
  /** What you call them, from your own peer list. Never what they call themselves. */
  callsign: string;
  payload: PresencePayload;
  /** Unix seconds of their last heartbeat. */
  heard: number;
}

let seen = $state<Record<string, PeerPresence>>({});
let connected = $state(false);
let closer: { close(): void } | null = null;
let beat: ReturnType<typeof setInterval> | null = null;
const pool = new SimplePool();

function relays(): string[] {
  // Peers ride the same relays as the watch. Somebody with no Watchtower configured has no
  // relay list yet, which is a real gap rather than a bug -- pairing needs somewhere to
  // publish, and that is the next thing to give them.
  return loadConfig()?.relays ?? [];
}

export const presence = {
  /** Everyone heard from recently enough to say anything about. */
  get out(): PeerPresence[] {
    const cutoff = Math.floor(Date.now() / 1000) - HEARTBEAT_SECONDS * MISSES_BEFORE_UNKNOWN;
    return Object.values(seen)
      .filter((p) => p.heard >= cutoff && p.payload.status === 'out')
      .sort((a, b) => a.callsign.localeCompare(b.callsign));
  },

  /**
   * Peers we have not heard from lately.
   *
   * Reported as unknown, deliberately and by name. Leaving them off the screen entirely
   * would read as "not out", which is a claim nobody made.
   */
  get unknown(): { pubkey: string; callsign: string }[] {
    const cutoff = Math.floor(Date.now() / 1000) - HEARTBEAT_SECONDS * MISSES_BEFORE_UNKNOWN;
    return peers()
      .filter((p) => {
        const last = seen[p.pubkey];
        return !last || last.heard < cutoff;
      })
      .map((p) => ({ pubkey: p.pubkey, callsign: p.callsign }));
  },

  get connected(): boolean {
    return connected;
  },

  /** Starts listening. Safe to call repeatedly. */
  start(): void {
    const identity = loadIdentity();
    const urls = relays();
    if (!identity || urls.length === 0 || peerPubkeys().length === 0) return;

    closer?.close();
    closer = pool.subscribeMany(
      urls,
      { kinds: [KIND_PEER_PRESENCE], '#p': [identity.pubkey] },
      {
        onevent: (event: Event) => {
          const read = readPresence(identity.secretKey, event, peerPubkeys());
          if (!read) return;
          const known = peers().find((p) => p.pubkey === read.from);
          if (!known) return;

          // Out-of-order delivery is normal on relays. An older heartbeat must not
          // overwrite a newer one and make somebody look stale who is not.
          const existing = seen[read.from];
          if (existing && existing.heard >= read.at) return;

          seen = {
            ...seen,
            [read.from]: {
              pubkey: read.from,
              callsign: known.callsign,
              payload: read.payload,
              heard: read.at
            }
          };
        }
      }
    );
    connected = true;
  },

  /** Publishes where you are to the peers you paired with, and to nobody else. */
  async announce(payload: PresencePayload): Promise<void> {
    const identity = loadIdentity();
    const urls = relays();
    const to = peerPubkeys();
    if (!identity || urls.length === 0 || to.length === 0) return;

    const events = buildPresence(
      identity.secretKey,
      to,
      payload,
      Math.floor(Date.now() / 1000)
    );
    // Settled, not raced: one peer's relay failing must not stop the others being told.
    await Promise.allSettled(events.flatMap((e) => pool.publish(urls, e)));
  },

  /** Republishes on a heartbeat, because relays store none of this. */
  beat(payload: () => PresencePayload | null): void {
    if (beat) clearInterval(beat);
    beat = setInterval(() => {
      const p = payload();
      if (p) void this.announce(p);
    }, HEARTBEAT_SECONDS * 1000);
  },

  stop(): void {
    closer?.close();
    closer = null;
    if (beat) clearInterval(beat);
    beat = null;
    connected = false;
  }
};
