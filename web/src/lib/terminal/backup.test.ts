/**
 * Carrying an identity to another phone.
 *
 * A backup is the one blob in this system somebody can **hand you**, and restoring it writes
 * into the tier that holds the identity, the standing and the patrol record.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { sealBackup } from '@navcom/core';
import { RestoreError, lastMade, makeBackup, restore } from './backup';
import { get, set } from './storage';

const PASS = 'correct horse battery staple';

beforeEach(() => {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k)
  };
});

/** A blob somebody could hand over, carrying whatever they like. */
const handed = (accruing: Record<string, unknown>, v: unknown = 1) =>
  sealBackup(PASS, { v, at: '2026-08-21', accruing });

describe('a backup somebody handed you', () => {
  it('cannot choose which relays this phone talks to', () => {
    // `DEVICE_ONLY` was enforced on the way out and not on the way in — and `relays_own` is
    // the list of relays this phone uses, so a crafted backup routed everything this
    // operator sends through relays somebody else chose.
    restore(PASS, handed({ callsign: 'Wren', relays_own: ['wss://attacker.example'] }));
    expect(get('accruing', 'relays_own')).toBeNull();
    expect(get('accruing', 'callsign')).toBe('Wren');
  });

  it('is refused if it was written by a version this build does not know', () => {
    // Declared and never checked. A kit written to a shape this build has never seen may
    // mean something different by the same key names.
    expect(() => restore(PASS, handed({ callsign: 'Wren' }, 2))).toThrow(RestoreError);
    expect(() => restore(PASS, handed({ callsign: 'Wren' }, 2))).toThrow(/newer version/i);
  });

  it('cannot be a storage bomb', () => {
    // A full phone stops saving, and this writes into the tier holding the identity.
    const many = Object.fromEntries(
      Array.from({ length: 500 }, (_, i) => [`junk${i}`, 'x'.repeat(200)])
    );
    expect(() => restore(PASS, handed(many))).toThrow(/more than a NavCom backup should/i);
    // And nothing was written before it refused.
    expect(get('accruing', 'junk0')).toBeNull();
  });

  it('still restores a real one', () => {
    set('accruing', 'callsign', 'Wren');
    set('accruing', 'peers', [{ pubkey: 'aa', callsign: 'Raven', since: 1 }]);
    const blob = makeBackup(PASS);

    // A fresh phone.
    const store = new Map<string, string>();
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k)
    };

    const { keys } = restore(PASS, blob);
    expect(keys).toBeGreaterThan(0);
    expect(get('accruing', 'callsign')).toBe('Wren');
  });

  it('refuses to overwrite an identity that is already here', () => {
    set('accruing', 'secret', 'a'.repeat(64));
    expect(() => restore(PASS, handed({ callsign: 'Someone else' }))).toThrow(/already has an identity/i);
  });

  it('gives the same answer for a wrong passphrase and a damaged blob', () => {
    // Telling them apart would tell somebody holding a stolen backup whether they were
    // getting closer.
    const blob = handed({ callsign: 'Wren' });
    // The ciphertext, not the envelope: a malformed envelope is a structural error and is
    // *meant* to read differently. What must be indistinguishable is a wrong passphrase from
    // a damaged payload, since telling those apart tells somebody holding a stolen backup
    // whether they are getting closer.
    const parsed = JSON.parse(blob) as { data: string };
    const tampered = JSON.stringify({
      ...parsed,
      data: parsed.data.slice(0, -4) + (parsed.data.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA')
    });

    const wrong = (() => { try { restore('not the passphrase', blob); } catch (e) { return (e as Error).message; } })();
    const damaged = (() => { try { restore(PASS, tampered); } catch (e) { return (e as Error).message; } })();
    expect(wrong).toBe(damaged);
    expect(wrong).toMatch(/wrong passphrase, or the backup is damaged/i);
  });
});

describe('whether this operator has a backup at all', () => {
  it('knows they have not made one', () => {
    // The screen stated the rule — "a backup you never made does not exist" — and the app
    // had no way to tell an operator which of those two people they were.
    expect(lastMade()).toBeNull();
  });

  it('records the date once one is actually made', () => {
    set('accruing', 'callsign', 'Wren');
    makeBackup(PASS);
    expect(lastMade()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('does not record one that failed', () => {
    // An empty passphrase throws, and a backup that threw is not a backup that exists.
    set('accruing', 'callsign', 'Wren');
    expect(() => makeBackup('')).toThrow();
    expect(lastMade()).toBeNull();
  });

  it("travels with the operator, because it is theirs rather than the handset's", () => {
    set('accruing', 'callsign', 'Wren');
    const blob = makeBackup(PASS);

    const store = new Map<string, string>();
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k)
    };
    restore(PASS, blob);
    expect(lastMade()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
