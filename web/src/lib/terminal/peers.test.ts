/**
 * The peer list.
 *
 * Small surface, and two properties on it matter: that pairing is something you did, and
 * that nothing here proposes anybody.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { PairError, pair, peerPubkeys, peers, unpair } from './peers';
import { burn, panicWipe } from './storage';

function installLocalStorage() {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i: number) => [...store.keys()][i] ?? null
  };
}

const raven = 'a'.repeat(64);
const owl = 'b'.repeat(64);

beforeEach(installLocalStorage);

describe('pairing', () => {
  it('keeps who you paired with and what you call them', () => {
    pair(raven, 'Raven');
    expect(peers()[0]?.callsign).toBe('Raven');
    expect(peerPubkeys()).toEqual([raven]);
  });

  it('refuses anything that is not a code', () => {
    for (const bad of ['', 'raven', 'a'.repeat(63), 'z'.repeat(64)]) {
      expect(() => pair(bad, 'Raven'), bad).toThrow(PairError);
    }
  });

  it('refuses a peer with no name', () => {
    // You have to know who is on your screen. An unnamed key is a stranger by another name.
    expect(() => pair(raven, '   ')).toThrow(PairError);
  });

  it('refuses to pair with the same person twice', () => {
    pair(raven, 'Raven');
    expect(() => pair(raven, 'Raven again')).toThrow(PairError);
  });

  it('accepts a code in any case, since people copy it from anywhere', () => {
    pair(raven.toUpperCase(), 'Raven');
    expect(peerPubkeys()).toEqual([raven]);
  });
});

describe('unpairing', () => {
  it('is immediate and takes only that person', () => {
    pair(raven, 'Raven');
    pair(owl, 'Owl');
    unpair(raven);
    expect(peers().map((p) => p.callsign)).toEqual(['Owl']);
  });

  it('does nothing surprising when they were never a peer', () => {
    pair(raven, 'Raven');
    unpair(owl);
    expect(peers()).toHaveLength(1);
  });
});

describe('where the list lives', () => {
  it('survives a panic wipe', () => {
    // A peer relationship outlasts a night, and losing one would mean finding that person
    // again in person to get it back.
    pair(raven, 'Raven');
    panicWipe();
    expect(peers()).toHaveLength(1);
  });

  it('is destroyed by a burn, like everything else', () => {
    pair(raven, 'Raven');
    burn();
    expect(peers()).toEqual([]);
  });
});
