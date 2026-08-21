/**
 * The pairing inbox.
 *
 * **Anybody can write to it.** The contact key is published — that is what a card is for —
 * so this is the one place in the app where a stranger's traffic lands on the operator's
 * screen without their consent. What matters here is that it stays usable when somebody
 * abuses that.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { Event } from 'nostr-tools/core';
import { buildInvite, newSecretKey, publicKeyOf } from '@navcom/core';

const me = newSecretKey();
const myPubkey = publicKeyOf(me);

/** Delivers whatever the relay subscription hands over. */
let deliver: (event: Event) => void = () => {};

vi.mock('./identity', () => ({
  loadIdentity: () => ({ secretKey: me, pubkey: myPubkey, callsign: 'Wren' })
}));
vi.mock('./card', () => ({ contactKey: () => null, contactPubkey: () => null }));
vi.mock('./relays', () => ({ relays: () => ['wss://fake.relay'] }));
vi.mock('./pq.svelte', () => ({ kemKeys: () => null }));
vi.mock('./pool', () => ({
  pool: () => ({
    subscribeMany: (_u: string[], _f: unknown, p: { onevent: (e: Event) => void }) => {
      deliver = p.onevent;
      return { close: () => {} };
    },
    publish: () => [Promise.resolve('ok')]
  })
}));

const { invites } = await import('./invites.svelte');

const T = 1_800_000_000;
const from = (secret: Uint8Array, callsign: string, at: number): Event =>
  buildInvite(secret, myPubkey, { callsign }, at);

const flood = (n: number) => {
  for (let i = 0; i < n; i++) deliver(from(newSecretKey(), `S${i}`, T + i));
};

beforeEach(() => {
  invites.ignoreAll();
  invites.start();
});

describe('when pairing requests arrive faster than the list will hold', () => {
  it('keeps the screen usable instead of holding every one', () => {
    // Unbounded, five thousand of these cost twelve and a half million property copies and
    // four seconds on a laptop, because each arrival copied the whole map. On a prepaid
    // Android 8 the screen is gone, and the peers list goes with it.
    flood(200);
    expect(invites.waiting.length).toBeLessThanOrEqual(50);
  });

  it('says so, rather than quietly turning people away', () => {
    flood(200);
    expect(invites.flooded).toBe(true);
  });

  it('can be cleared in one action, or the cap is worse than the flood', () => {
    // A capped list that empties only fifty taps at a time is one an operator cannot
    // recover from — which would make the cap the attack rather than the defence.
    flood(200);
    invites.ignoreAll();
    expect(invites.waiting).toHaveLength(0);
    expect(invites.flooded).toBe(false);
  });

  it('takes a real invite again once there is room', () => {
    flood(200);
    invites.ignoreAll();
    deliver(from(newSecretKey(), 'Raven', T + 9_999));
    expect(invites.waiting.map((w) => w.payload.callsign)).toContain('Raven');
  });

  it('holds an ordinary handful without complaining', () => {
    flood(3);
    expect(invites.waiting).toHaveLength(3);
    expect(invites.flooded).toBe(false);
  });
});
