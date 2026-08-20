/**
 * Which relays this device uses.
 *
 * **Separate from the Watchtower config, and that separation is the point.** Peer presence
 * needs somewhere to publish and has nothing to do with a watch — an operator who has
 * paired with a friend and has no Watchtower at all was, until this existed, unable to use
 * the one feature built specifically for them.
 *
 * Relays are public message pipes run by strangers. They carry sealed envelopes they cannot
 * read, and using one reveals no Watchtower — which is why a default list is fine here and
 * a default *Watchtower* would not be. Nothing discovers a Watchtower; a relay is not one.
 *
 * The defaults are visible and editable, because every network call this app makes has to
 * be explainable to somebody pointing a proxy at it.
 */

import { get, set } from './storage';
import { loadConfig } from './config';

/**
 * Where an operator starts.
 *
 * Two, not one: a single relay is a single point of failure for presence, and these are
 * free services run by volunteers who owe nobody uptime.
 */
export const DEFAULT_RELAYS = ['wss://relay.damus.io', 'wss://nos.lol'];

const FIELD = 'relays_own';

/**
 * The relays to use, in preference order.
 *
 * A configured Watchtower's relays win, because peers and the watch sharing a relay means
 * one connection instead of two on a phone that is counting them. Otherwise the operator's
 * own list, otherwise the defaults.
 */
export function relays(): string[] {
  const watch = loadConfig()?.relays;
  if (watch?.length) return watch;
  const own = get<string[]>('accruing', FIELD);
  if (own?.length) return own;
  return DEFAULT_RELAYS;
}

/** Whether the list in use is the shipped default rather than anything chosen. */
export function usingDefaults(): boolean {
  return !loadConfig()?.relays?.length && !get<string[]>('accruing', FIELD)?.length;
}

export function setRelays(list: string[]): void {
  set('accruing', FIELD, list.filter((r) => /^wss?:\/\//.test(r.trim())).map((r) => r.trim()));
}
