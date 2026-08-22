/**
 * Standing, and taking it back.
 *
 * `can-take-watch` is the gate on who may hold a board, so an endorsement that cannot be
 * withdrawn is a gate that only ever opens.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { Event } from 'nostr-tools/core';
import { newSecretKey, publicKeyOf, revoke, writeCredential } from '@navcom/core';

const revokeWith = (secret: Uint8Array, id: string) => revoke(secret, id, 1_800_009_999);

const me = newSecretKey();
const endorser = newSecretKey();

let deliver: (event: Event) => void = () => {};
let relaysUp = true;

vi.mock('./identity', () => ({
  loadIdentity: () => ({ secretKey: me, pubkey: publicKeyOf(me), callsign: 'Wren' })
}));
vi.mock('./relays', () => ({ relays: () => ['wss://fake.relay'] }));
vi.mock('./pool', () => ({
  pool: () => ({
    subscribeMany: (_u: string[], _f: unknown, p: { onevent: (e: Event) => void }) => {
      deliver = p.onevent;
      return { close: () => {} };
    },
    publish: () =>
      relaysUp ? [Promise.resolve('ok')] : [Promise.reject(new Error('no relay accepted'))]
  })
}));

let standing: typeof import('./standing');

/** A credential from `endorser`, claimed by this operator. */
function takeUp(scope = 'can-take-watch') {
  const credential = writeCredential(
    endorser, { scope: scope as never, endorser: 'Raven', at: '2026-08-01' }, 1_800_000_000
  );
  standing.claim(JSON.stringify(credential));
  return credential;
}

beforeEach(async () => {
  relaysUp = true;
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k)
  };
  vi.resetModules();
  standing = await import('./standing');
});

describe('an endorsement somebody has taken back', () => {
  it('stops qualifying the holder once the withdrawal arrives', async () => {
    // revoke and isRevokedBy were both in core, identity.md said endorsers publish a
    // revocation checked when online, and the client neither published one nor ever looked.
    const credential = takeUp();
    expect(standing.holds('can-take-watch')).toBe(true);

    standing.start();
    deliver(revokeWith(endorser, credential.id));

    expect(standing.holds('can-take-watch')).toBe(false);
  });

  it('cannot be stripped by somebody who did not write it', async () => {
    // A stranger publishing a revocation must not take away another person's standing.
    const credential = takeUp();
    standing.start();
    // Signed by an unrelated key, naming the same credential.
    deliver(revokeWith(newSecretKey(), credential.id));
    expect(standing.holds('can-take-watch')).toBe(true);
  });

  it('survives being closed and reopened, because it is cached', async () => {
    const credential = takeUp();
    standing.start();
    deliver(revokeWith(endorser, credential.id));

    vi.resetModules();
    standing = await import('./standing');
    expect(standing.holds('can-take-watch')).toBe(false);
  });

  it('leaves other endorsements alone', async () => {
    const gone = takeUp('can-take-watch');
    takeUp('medic');
    standing.start();
    deliver(revokeWith(endorser, gone.id));

    expect(standing.holds('can-take-watch')).toBe(false);
    expect(standing.holds('medic')).toBe(true);
  });
});

describe('an endorser taking back what they wrote', () => {
  it('stops honouring it on their own device even with no signal', async () => {
    // The endorser has decided, and that decision must not wait for signal.
    const credential = writeCredential(
      me, { scope: 'can-take-watch', endorser: 'Wren', at: '2026-08-01' }, 1_800_000_000
    );
    standing.recordWritten(credential);
    expect(standing.written()).toHaveLength(1);

    relaysUp = false;
    expect(await standing.withdraw(credential.id)).toBe(false);
    expect(standing.written()).toHaveLength(0);
  });

  it('reports that it did reach a relay when it did', async () => {
    const credential = writeCredential(
      me, { scope: 'medic', endorser: 'Wren', at: '2026-08-01' }, 1_800_000_000
    );
    standing.recordWritten(credential);
    expect(await standing.withdraw(credential.id)).toBe(true);
  });
});
