/**
 * The Watchtower key, on a phone.
 *
 * A squad with no box holds the watch here, so this key is the watch's identity: the address
 * operators send to. Losing it or replacing it strands everybody configured against it.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import {
  createWatch, foundedHere, joinWatch, leaveWatch, watchKey, WatchKeyError
} from './watch-key';

/** Enough of the browser API for storage; the real one is tiny here. */
beforeEach(() => {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k)
  };
});

describe('joining a watch on a device that already holds one', () => {
  it('is refused rather than silently replacing it', () => {
    // `createWatch` was guarded against replacing a live watch's identity and `joinWatch` —
    // the one that takes a key from somebody else — was not. On a device holding the only
    // copy, that is the watch ending and everybody configured against it stranded.
    const first = createWatch();
    expect(() => joinWatch('d'.repeat(63) + '4')).toThrow(WatchKeyError);
    expect(watchKey()).toEqual(first);
  });

  it('says what to do about it', () => {
    createWatch();
    expect(() => joinWatch('d'.repeat(63) + '4')).toThrow(/give that one up first/i);
  });

  it('still joins on a device with no watch', () => {
    const joined = joinWatch('d'.repeat(63) + '4');
    expect(watchKey()).toEqual(joined);
    // Joining is not founding, so the qualification gate still applies.
    expect(foundedHere()).toBe(false);
  });

  it('joins again once the first has been given up', () => {
    createWatch();
    leaveWatch();
    expect(() => joinWatch('d'.repeat(63) + '4')).not.toThrow();
  });
});
