/**
 * The board a watch reads during an incident.
 *
 * The watch's address is handed to every operator, so anybody holding it can put something
 * here — the same open door the escalation executor has. What matters is that the one signal
 * that means somebody is hurt cannot be buried by the rest.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { Event } from 'nostr-tools/core';
import { buildSignal, buildDistress, newSecretKey, publicKeyOf } from '@navcom/core';
import { finalizeEvent } from 'nostr-tools/pure';

const watch = newSecretKey();
const watchPub = publicKeyOf(watch);

let deliver: (event: Event) => void = () => {};

vi.mock('./identity', () => ({
  loadIdentity: () => ({ secretKey: watch, pubkey: watchPub, callsign: 'Watch' })
}));
vi.mock('./config', () => ({ loadConfig: () => ({ watchtower: watchPub, relays: ['wss://r'] }) }));
vi.mock('./watch-key', () => ({ watchKey: () => watch, watchPubkey: () => watchPub }));
vi.mock('./relays', () => ({ relays: () => ['wss://r'] }));
vi.mock('./pq.svelte', () => ({ kemKeys: () => ({}), pq: { known: {} } }));
vi.mock('./pool', () => ({
  pool: () => ({
    subscribeMany: (_u: string[], _f: unknown, p: { onevent: (e: Event) => void }) => {
      deliver = p.onevent;
      return { close: () => {} };
    },
    publish: () => [Promise.resolve('ok')]
  })
}));

/**
 * A fresh module per test.
 *
 * The board is module-level `$state` and deliberately has no reset — it expires on its own
 * and nothing persists it [C27]. That is right for the product and means a test must not
 * inherit the previous one's traffic.
 */
let board: typeof import('./board.svelte').board;

const T = 1_800_000_000;
const to = { pubkey: watchPub, holders: [watchPub] };

/** Signed the way a relay would deliver it — the builders return unsigned templates. */
const query = (i: number): Event => {
  const sender = newSecretKey();
  return finalizeEvent(buildSignal(sender, to, 'query', { text: `q${i}`, area: 'north' }, T + i), sender);
};

const distress = (): Event => {
  const sender = newSecretKey();
  return finalizeEvent(
    buildDistress(sender, to, { position: null, area: 'north side' }, T + 99_999),
    sender
  );
};

beforeEach(async () => {
  vi.resetModules();
  ({ board } = await import('./board.svelte'));
  board.start();
});

describe('a Distress arriving after a flood of routine traffic', () => {
  it('is not buried underneath it', () => {
    // `20911` is a separate kind precisely so a client can prioritise it independently of
    // routine traffic. The board flattened it into one queue sorted by arrival, coloured red
    // and otherwise equal — so a hundred queries arriving first put it a hundred rows down
    // the screen a watch reads when somebody is in trouble.
    for (let i = 0; i < 150; i++) deliver(query(i));
    deliver(distress());

    expect(board.distress).toHaveLength(1);
    expect(board.waiting.every((w) => w.type !== 'distress')).toBe(true);
  });

  it('is still admitted when the routine board is completely full', () => {
    // Routine traffic is dropped once the board is full. A Distress must never be one of
    // the things dropped to make room for a query.
    for (let i = 0; i < 400; i++) deliver(query(i));
    expect(board.routineDropped).toBe(true);

    deliver(distress());
    expect(board.distress).toHaveLength(1);
  });

  it('keeps the routine board usable rather than holding everything', () => {
    for (let i = 0; i < 400; i++) deliver(query(i));
    expect(board.waiting.length).toBeLessThanOrEqual(200);
  });

  it('says routine traffic is being dropped, rather than dropping it quietly', () => {
    for (let i = 0; i < 400; i++) deliver(query(i));
    expect(board.routineDropped).toBe(true);
    expect(board.distressDropped).toBe(false);
  });

  it('leaves an ordinary night alone', () => {
    for (let i = 0; i < 5; i++) deliver(query(i));
    deliver(distress());
    expect(board.waiting).toHaveLength(5);
    expect(board.distress).toHaveLength(1);
    expect(board.routineDropped).toBe(false);
  });
});
