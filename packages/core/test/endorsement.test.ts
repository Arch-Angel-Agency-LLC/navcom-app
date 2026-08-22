/**
 * Vouching for somebody without creating a record of them.
 *
 * The property everything else follows from: **a credential names nobody.** It reads "I
 * vouch for the holder of this", so an endorser can never create a record about a person who
 * has not agreed to exist in this system — and there is no social graph to breach, because
 * one was never written down.
 */

import { ageInDays } from '../src/attestation';
import { KIND_CREDENTIAL } from '../src/events/kinds';
import { finalizeEvent } from 'nostr-tools/pure';
import { describe, expect, it } from 'vitest';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import type { Event } from 'nostr-tools/core';
import {
  claimCredential,
  EndorsementError,
  isRevokedBy,
  readEndorsement,
  revoke,
  SCOPES,
  writeCredential
} from '../src/index.js';

const wren = generateSecretKey();
const wrenPub = getPublicKey(wren);
const raven = generateSecretKey();
const ravenPub = getPublicKey(raven);
const owl = generateSecretKey();

const T = 1_755_300_000;
const overRelay = (e: Event): Event => JSON.parse(JSON.stringify(e)) as Event;
const cred = (over = {}) =>
  writeCredential(wren, { scope: 'can-take-watch', endorser: 'Wren', at: '2026-08-19', ...over }, T);

describe('a credential names nobody', () => {
  it('carries no subject, no recipient tag, and no pubkey but the endorser\'s', () => {
    // The whole design. A `p` tag here would name the person it is about, which is exactly
    // what makes a social graph and exactly what this refuses to write down.
    const c = cred();
    expect(c.tags).toEqual([]);
    expect(JSON.stringify(c)).not.toContain(ravenPub);
    expect(c.pubkey).toBe(wrenPub);
  });

  it('can be written for somebody who has never opened the app', () => {
    // Consent resolved at the root rather than managed: there is nobody to consent, because
    // nobody is named.
    expect(() => cred()).not.toThrow();
  });

  it('says only what a scope tag can say, never free text', () => {
    // An endorser explaining WHY somebody is credible is how an operator's history leaks.
    expect(() => writeCredential(wren, { scope: 'great person' as never, endorser: 'Wren', at: '2026-08-19' }, T))
      .toThrow(EndorsementError);
    expect(SCOPES).toContain('can-take-watch');
    expect(SCOPES).toContain('trained-with-me');
  });

  it('refuses a credential with no callsign or a malformed date', () => {
    expect(() => writeCredential(wren, { scope: 'medic', endorser: ' ', at: '2026-08-19' }, T)).toThrow();
    expect(() => writeCredential(wren, { scope: 'medic', endorser: 'Wren', at: 'yesterday' }, T)).toThrow();
  });
});

describe('claiming binds it to a persona', () => {
  it('reads back the scope, the endorser and the holder', () => {
    const c = cred();
    const e = readEndorsement(c, claimCredential(raven, c, T + 60))!;
    expect(e.scope).toBe('can-take-watch');
    expect(e.endorser).toBe('Wren');
    expect(e.endorserKey).toBe(wrenPub);
    expect(e.holder).toBe(ravenPub);
  });

  it('needs no network, no account and no approval', () => {
    // Nothing in this path looks anything up. Verification is local, which is why it works
    // in a car park with no bars.
    const c = cred();
    expect(readEndorsement(c, claimCredential(raven, c, T + 60))).not.toBeNull();
  });

  it('refuses a claim over a different credential', () => {
    const mine = cred();
    const other = writeCredential(wren, { scope: 'medic', endorser: 'Wren', at: '2026-08-19' }, T + 1);
    expect(readEndorsement(mine, claimCredential(raven, other, T + 60))).toBeNull();
  });

  it('refuses an unsigned or tampered credential', () => {
    const c = cred();
    const claim = claimCredential(raven, c, T + 60);
    const forged = overRelay({
      ...c,
      content: JSON.stringify({ scope: 'can-take-watch', endorser: 'Owl', at: '2026-08-19' })
    });
    expect(readEndorsement(forged, claim)).toBeNull();
  });

  it('is a bearer token, and that cost is real', () => {
    // Stated rather than hidden. Whoever holds the bytes can claim it -- that is the price
    // of not naming people, and it is why a credential is handed over in person.
    const c = cred();
    const stolen = readEndorsement(c, claimCredential(owl, c, T + 60));
    expect(stolen).not.toBeNull();
    expect(stolen?.holder).toBe(getPublicKey(owl));
  });
});

describe('withdrawal is the endorser retracting, not an appeal', () => {
  it('lets the endorser revoke what they wrote', () => {
    const c = cred();
    const e = readEndorsement(c, claimCredential(raven, c, T + 60))!;
    expect(isRevokedBy(e, revoke(wren, e.id, T + 120))).toBe(true);
  });

  it('lets nobody else revoke it', () => {
    // Anybody may publish an event claiming to. A reader checks the key, so a stranger
    // cannot strip somebody's standing by asserting it -- and nobody adjudicates.
    const c = cred();
    const e = readEndorsement(c, claimCredential(raven, c, T + 60))!;
    expect(isRevokedBy(e, revoke(owl, e.id, T + 120))).toBe(false);
    expect(isRevokedBy(e, revoke(raven, e.id, T + 120)), 'not even the holder').toBe(false);
  });

  it('does not revoke a different credential', () => {
    const c = cred();
    const e = readEndorsement(c, claimCredential(raven, c, T + 60))!;
    expect(isRevokedBy(e, revoke(wren, 'some-other-id', T + 120))).toBe(false);
  });

  it('names only the credential, so publishing one reveals nobody', () => {
    const c = cred();
    const e = readEndorsement(c, claimCredential(raven, c, T + 60))!;
    const r = revoke(wren, e.id, T + 120);
    expect(JSON.stringify(r)).not.toContain(ravenPub);
  });
});

describe('age rather than expiry', () => {
  it('carries the date it was written and expires on no timer', () => {
    // Somebody endorsed `medic` five years ago is a fact about five years ago. This system
    // already has one way of handling that -- show the age -- and a second rule for the same
    // problem would be a rule too many.
    const old = writeCredential(wren, { scope: 'medic', endorser: 'Wren', at: '2021-01-04' }, T);
    const e = readEndorsement(old, claimCredential(raven, old, T + 60))!;
    expect(e.at).toBe('2021-01-04');
    expect(e).not.toHaveProperty('expires');
  });
});

describe('a credential whose date is not one', () => {
  const endorser = generateSecretKey();
  const holder = generateSecretKey();

  const pair = (at: string) => {
    const credential = writeCredential(endorser, { scope: 'medic', endorser: 'Raven', at }, 1_800_000_000);
    return { credential, claim: claimCredential(holder, credential, 1_800_000_001) };
  };

  it('refuses a month thirteen', () => {
    // The pattern checked the shape and nothing else, so `2026-13-45` passed — and the screen
    // that renders "N days ago" rendered "NaN days ago". A date that is not a date is not a
    // weak claim about when somebody vouched; it is not a claim at all.
    expect(() => writeCredential(endorser, { scope: 'medic', endorser: 'Raven', at: '2026-13-45' }, 1))
      .toThrow(/real date/i);
  });

  it('refuses one on the way in as well as on the way out', () => {
    // A hand-rolled client never touches the builder.
    const forged = finalizeEvent({
      kind: KIND_CREDENTIAL,
      created_at: 1_800_000_000,
      tags: [],
      content: JSON.stringify({ scope: 'medic', endorser: 'Raven', at: '2026-13-45' })
    }, endorser);
    const claim = claimCredential(holder, forged, 1_800_000_001);
    expect(readEndorsement(forged, claim)).toBeNull();
  });

  it('still accepts a real one, including a leap day', () => {
    expect(readEndorsement(pair('2024-02-29').credential, pair('2024-02-29').claim)).not.toBeNull();
    expect(() => writeCredential(endorser, { scope: 'medic', endorser: 'Raven', at: '2023-02-29' }, 1))
      .toThrow(/real date/i);
  });
});

describe('an endorsement dated in the future', () => {
  it('has no age a reader can weigh', () => {
    // It rendered "0 days ago" — the freshest possible — and never aged, which defeats the
    // one mechanism this design uses instead of expiry.
    const now = new Date('2026-08-21T12:00:00Z');
    expect(Number.isFinite(ageInDays('2099-01-01', now))).toBe(false);
    // A day of tolerance for timezones, and no more.
    expect(ageInDays('2026-08-22', now)).toBe(-1);
    expect(Number.isFinite(ageInDays('2026-09-30', now))).toBe(false);
  });
});
