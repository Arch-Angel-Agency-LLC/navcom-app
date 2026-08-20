/**
 * The Watchtower key, on a phone.
 *
 * A watch running on a box generates this on the box and never copies it off. A squad with
 * no box has no box to put it on, so it lives here instead — and *"a squad with no hardware
 * and no technical member"* is the common case, not the edge one.
 *
 * ## What this key is, and what it is not
 *
 * It is the watch's **identity**: the address operators send to, and the key that signs
 * watch state and answers. It is **not** what makes signals readable — those are sealed to
 * each member's own operator key [`@navcom/core`'s `crypto/group.ts`], which is what lets
 * somebody be removed from a squad without re-provisioning everyone.
 *
 * ## The consequence, stated rather than discovered
 *
 * Every member of a squad holds this key, because any of them may need to answer. So
 * **anybody who has ever been a member can publish watch state** — including somebody
 * removed from the holder list. Removing them stops them *reading* new signals; it does not
 * stop them claiming, on the public record, to be the watch.
 *
 * That is the key-rotation gap `bootstrap.spec.md` already records as a Mk1 requirement,
 * and it is why a squad-held watch is only for people who already know each other. It is
 * written here rather than left implicit, because the alternative is somebody discovering
 * it from an incident.
 *
 * Accruing tier. A panic wipe on a bad night must not take the watch's identity with it —
 * that would strand every operator signed on under it, at the worst possible moment.
 */

import { newSecretKey, publicKeyOf, secretFromHex, secretToHex, type SecretKey } from '@navcom/core';
import { clearField, get, set } from './storage';

const SECRET = 'watch_secret';

/** The watch's secret, or null on a device that holds no watch. */
export function watchKey(): SecretKey | null {
  const hex = get<string>('accruing', SECRET);
  if (!hex) return null;
  try {
    return secretFromHex(hex);
  } catch {
    return null;
  }
}

/** The watch's address, or null. What operators are given, and what they send to. */
export function watchPubkey(): string | null {
  const secret = watchKey();
  return secret ? publicKeyOf(secret) : null;
}

/**
 * Starts a new watch on this device.
 *
 * Deliberate and separate from reading, so nothing brings a Watchtower into existence as a
 * side effect of opening a screen. Refuses to overwrite: replacing a live watch's identity
 * would silently strand every operator configured against the old address.
 */
export function createWatch(): SecretKey {
  const existing = watchKey();
  if (existing) return existing;
  const secret = newSecretKey();
  set('accruing', SECRET, secretToHex(secret));
  return secret;
}

/**
 * Joins a watch somebody else started, by its secret.
 *
 * Handed over in person, exactly as the address is. There is no discovery and no request
 * flow — a watch you can ask to join is a watch a stranger can ask to join.
 */
export class WatchKeyError extends Error {}

export function joinWatch(secretHex: string): SecretKey {
  let secret: SecretKey;
  try {
    secret = secretFromHex(secretHex);
  } catch {
    throw new WatchKeyError('That is not a watch key — expected 64 hexadecimal characters.');
  }
  set('accruing', SECRET, secretToHex(secret));
  return secret;
}

/**
 * Drops the watch key from this device.
 *
 * Stops this phone being able to answer or publish watch state. It does **not** end the
 * watch: other members still hold the same key, and nothing here can reach their devices.
 */
export function leaveWatch(): void {
  clearField('accruing', SECRET);
}
