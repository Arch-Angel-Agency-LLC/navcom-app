/**
 * Endorsements this operator holds, and what they qualify them for.
 *
 * Held here and **indexed nowhere**. Nothing publishes them, nothing looks them up, and no
 * server knows they exist — which is why no social graph of this network exists to breach,
 * sell or subpoena.
 *
 * Accruing tier. Standing is the thing an operator builds over years; a panic wipe takes
 * tonight and must not take that.
 */

import {
  claimCredential,
  readEndorsement,
  type Endorsement,
  type Scope
} from '@navcom/core';
import type { Event } from 'nostr-tools/core';
import { loadIdentity } from './identity';
import { get, set } from './storage';

const FIELD = 'endorsements';

/** A presented pair, as stored: the credential somebody wrote, and this persona's claim. */
interface Held {
  credential: Event;
  claim: Event;
}

export class StandingError extends Error {}

export function held(): Endorsement[] {
  const stored = get<Held[]>('accruing', FIELD) ?? [];
  return stored
    .map((h) => readEndorsement(h.credential, h.claim))
    .filter((e): e is Endorsement => e !== null);
}

/** The pair, for presenting to somebody who wants to check it themselves. */
export function presentable(): Held[] {
  return get<Held[]>('accruing', FIELD) ?? [];
}

/**
 * Takes up a credential somebody handed over.
 *
 * Needs no account, no approval and no network — the whole exchange happens between two
 * people and two devices.
 */
export function claim(credentialJson: string): Endorsement {
  const identity = loadIdentity();
  if (!identity) throw new StandingError('Pick a callsign first — a credential binds to one.');

  let credential: Event;
  try {
    credential = JSON.parse(credentialJson.trim()) as Event;
  } catch {
    throw new StandingError('That is not a credential.');
  }

  let claimEvent: Event;
  try {
    claimEvent = claimCredential(identity.secretKey, credential, Math.floor(Date.now() / 1000));
  } catch {
    throw new StandingError('That credential is not signed by anybody.');
  }

  const endorsement = readEndorsement(credential, claimEvent);
  if (!endorsement) throw new StandingError('That credential is not one this version understands.');

  const stored = presentable();
  if (stored.some((h) => h.credential.id === credential.id)) {
    throw new StandingError('You already hold that one.');
  }
  set('accruing', FIELD, [...stored, { credential, claim: claimEvent }]);
  return endorsement;
}

/** Puts one down. Nobody is told — the same rule as unpairing. */
export function drop(credentialId: string): void {
  set('accruing', FIELD, presentable().filter((h) => h.credential.id !== credentialId));
}

/**
 * Whether this operator holds a given scope.
 *
 * **Provenance by name, never a count.** Callers that need to show something show *who*
 * vouched; this only answers whether anybody did.
 */
export function holds(scope: Scope): boolean {
  return held().some((e) => e.scope === scope);
}

/** Who vouched for a scope, so a screen can name them rather than total them. */
export function endorsersFor(scope: Scope): Endorsement[] {
  return held().filter((e) => e.scope === scope);
}
