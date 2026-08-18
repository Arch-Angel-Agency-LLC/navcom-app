/**
 * Which Watchtower this terminal belongs to.
 *
 * Handed over out of band, by a person. **Nothing auto-discovers a Watchtower** — a list of
 * Watchtowers is a list of where operators are, so there is no directory of them and there
 * should not be one.
 *
 * Kept in the accruing tier, which is a real trade rather than an obvious call: the pubkey
 * is association data, and a searched phone carrying it reveals which watch you are on. But
 * putting it in the wipeable tier would mean a panic wipe leaves an operator unable to
 * reconnect without finding a person, on the night they were most likely to need to. Burn
 * destroys it; a wipe does not.
 */

import { isPubkey } from '@navcom/core';
import { get, set } from './storage';

export interface WatchtowerConfig {
  pubkey: string;
  relays: string[];
}

export function loadConfig(): WatchtowerConfig | null {
  const pubkey = get<string>('accruing', 'watchtower');
  const relays = get<string[]>('accruing', 'relays');
  if (!pubkey || !relays?.length) return null;
  return { pubkey, relays };
}

export class ConfigError extends Error {}

export function saveConfig(pubkey: string, relaysRaw: string): WatchtowerConfig {
  const cleanKey = pubkey.trim().toLowerCase();
  if (!isPubkey(cleanKey)) {
    throw new ConfigError('A Watchtower pubkey is 64 hexadecimal characters.');
  }
  const relays = relaysRaw
    .split(/[\s,]+/)
    .map((r) => r.trim())
    .filter(Boolean);
  if (relays.length === 0) throw new ConfigError('At least one relay is needed.');
  for (const r of relays) {
    if (!/^wss?:\/\//.test(r)) throw new ConfigError(`"${r}" is not a relay URL — expected wss://`);
  }
  set('accruing', 'watchtower', cleanKey);
  set('accruing', 'relays', relays);
  return { pubkey: cleanKey, relays };
}
