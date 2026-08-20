/**
 * Who you have paired with.
 *
 * A peer is somebody you scanned a code with, in person, and then accepted. There is no
 * discovery, no suggestion and no ranking — nothing here proposes anybody, because a list
 * of operators who might know each other is the thing this design refuses to build.
 *
 * Lives in the accruing tier. A peer relationship outlasts a night, and losing one to a
 * panic wipe would mean finding that person again in person to get it back.
 */

import { isPubkey } from '@navcom/core';
import { get, set } from './storage';

export interface Peer {
  pubkey: string;
  /** What you call them. Yours to set, and never sent anywhere. */
  callsign: string;
  /** Unix seconds you paired. */
  since: number;
  /**
   * You have taken on noticing when this person is past their time.
   *
   * A commitment you make, not a status they have. Two people who patrol alone on
   * different nights watching each other is probably the commonest real arrangement after
   * pure solo, and it needs no team, no shared callsign and no watch.
   *
   * **They are told**, in the presence you send them and nowhere else. A buddy arrangement
   * kept as a private note means somebody can believe they are watched while nobody is.
   */
  buddy?: boolean;
}

const FIELD = 'peers';

export function peers(): Peer[] {
  return get<Peer[]>('accruing', FIELD) ?? [];
}

export class PairError extends Error {}

/**
 * Adds a peer.
 *
 * Pairing is mutual and deliberate: this is called when somebody accepts, never when a
 * code is merely seen. A relationship that happened *to* you is not one you agreed to.
 */
export function pair(pubkey: string, callsign: string): Peer {
  const key = pubkey.trim().toLowerCase();
  if (!isPubkey(key)) throw new PairError('That is not a NavCom code.');

  const name = callsign.trim();
  if (!name) throw new PairError('Give them a name — you need to know who is on your screen.');

  const existing = peers();
  if (existing.some((p) => p.pubkey === key)) {
    throw new PairError('You are already paired with them.');
  }

  const peer = { pubkey: key, callsign: name, since: Math.floor(Date.now() / 1000) };
  set('accruing', FIELD, [...existing, peer]);
  return peer;
}

/**
 * Removes a peer.
 *
 * **Unilateral, immediate, and nobody is told.** Somebody who has to justify unpairing, or
 * whose unpairing sends a notification, is somebody who will stay paired with a person they
 * would rather not be.
 *
 * It stops *future* presence being readable. It cannot recall what was already sent, and
 * nothing here should imply otherwise.
 */
export function unpair(pubkey: string): void {
  set('accruing', FIELD, peers().filter((p) => p.pubkey !== pubkey));
}

export function peerPubkeys(): string[] {
  return peers().map((p) => p.pubkey);
}

/**
 * Takes on, or puts down, watching for somebody.
 *
 * Putting it down is as unceremonious as taking it up. Somebody who has to justify
 * stopping is somebody who keeps a commitment they cannot keep, which is worse for the
 * person relying on it than an honest end.
 */
export function setBuddy(pubkey: string, buddy: boolean): void {
  set(
    'accruing',
    FIELD,
    peers().map((p) => (p.pubkey === pubkey ? { ...p, buddy } : p))
  );
}

/** Who you are watching for. */
export function buddies(): Peer[] {
  return peers().filter((p) => p.buddy === true);
}
