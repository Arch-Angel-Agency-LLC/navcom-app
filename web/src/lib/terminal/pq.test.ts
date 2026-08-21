/**
 * Post-quantum keys, and what the device keeps.
 *
 * A key bundle is only useful for somebody this device might send to. Anything beyond that
 * is a record of a relationship, held somewhere nobody thought to look.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { Event } from 'nostr-tools/core';
import { newSecretKey, publicKeyOf } from '@navcom/core';

const me = newSecretKey();
const myPubkey = publicKeyOf(me);
const raven = publicKeyOf(newSecretKey());
const wren = publicKeyOf(newSecretKey());

let currentPeers: string[] = [];

vi.mock('./identity', () => ({
  loadIdentity: () => ({ secretKey: me, pubkey: myPubkey, callsign: 'Me' })
}));
vi.mock('./config', () => ({ loadConfig: () => null }));
vi.mock('./card', () => ({ contactPubkey: () => null }));
vi.mock('./peers', () => ({ peerPubkeys: () => currentPeers }));
vi.mock('./relays', () => ({ relays: () => ['wss://fake.relay'] }));
vi.mock('./pool', () => ({
  pool: () => ({
    subscribeMany: () => ({ close: () => {} }),
    publish: () => [Promise.resolve('ok')]
  })
}));

let pq: typeof import('./pq.svelte').pq;
let set: typeof import('./storage').set;
let get: typeof import('./storage').get;

beforeEach(async () => {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k)
  };
  vi.resetModules();
  ({ pq } = await import('./pq.svelte'));
  ({ set, get } = await import('./storage'));
});

describe('keys for people this device no longer sends to', () => {
  it('are dropped rather than kept forever', () => {
    // `unpair` is unilateral, immediate and tells nobody — and it left the key here, so this
    // map became a shadow copy of every relationship the device has ever had.
    set('accruing', 'kem_keys', { [raven]: 'raven-kem', [wren]: 'wren-kem' });
    currentPeers = [wren];

    pq.start();
    expect(Object.keys(pq.known)).toEqual([wren]);
  });

  it('are dropped from storage too, not just from memory', () => {
    // The tier that survives a panic wipe is the whole point of the finding.
    set('accruing', 'kem_keys', { [raven]: 'raven-kem', [wren]: 'wren-kem' });
    currentPeers = [wren];

    pq.start();
    expect(get<Record<string, string>>('accruing', 'kem_keys')).toEqual({ [wren]: 'wren-kem' });
  });

  it('keeps the keys of people still paired with', () => {
    set('accruing', 'kem_keys', { [raven]: 'raven-kem', [wren]: 'wren-kem' });
    currentPeers = [wren, raven];

    pq.start();
    expect(Object.keys(pq.known).sort()).toEqual([wren, raven].sort());
  });

  it('leaves an operator with no peers holding nothing', () => {
    set('accruing', 'kem_keys', { [raven]: 'raven-kem' });
    currentPeers = [];

    pq.start();
    expect(pq.known).toEqual({});
  });
});
