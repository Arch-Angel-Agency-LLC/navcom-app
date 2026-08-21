/**
 * What arrives from somewhere else, and how long it is allowed to be.
 *
 * Found by audit rather than by failure. Caps existed on exactly two fields — `doing` and an
 * invite `note` — because somebody had put `maxlength` on those two textareas. **Signal
 * text, correction values and callsigns had none at all.**
 *
 * A `maxlength` stops the operator who typed it and nobody else. Everything here arrives
 * from a relay serving whatever it likes, a restored backup, or a client somebody wrote
 * themselves, so the cap has to be where every client shares it.
 */

import { describe, expect, it } from 'vitest';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import type { Event } from 'nostr-tools/core';
import {
  buildCard, buildCorrection, buildDistress, buildInvite, buildPresence, buildSignal,
  CALLSIGN_MAX, FIELDS_MAX, readCard, readCorrection, readInvite, readPresence,
  TEXT_MAX, VALUE_MAX, watchtowerAt, withinLimit, writeCredential
} from '../src/index.js';

const wren = generateSecretKey();
const peer = getPublicKey(generateSecretKey());
const to = watchtowerAt(getPublicKey(generateSecretKey()));
const T = 1_755_300_000;
const long = (n: number) => 'x'.repeat(n);
const overRelay = (e: Event): Event => JSON.parse(JSON.stringify(e)) as Event;

describe('a callsign lands on somebody else\'s screen', () => {
  it('is refused past its cap wherever it enters the wire', () => {
    // Unbounded, it is a layout attack on another operator's phone -- a board, a peer list,
    // a corrected field, a watch state.
    const over = long(CALLSIGN_MAX + 1);
    expect(() => buildCard(wren, { callsign: over, region: 'st-louis' }, T)).toThrow();
    expect(() => buildInvite(wren, peer, { callsign: over }, T)).toThrow();
    expect(() => writeCredential(wren, { scope: 'medic', endorser: over, at: '2026-08-21' }, T)).toThrow();
    expect(() => buildCorrection(wren, {
      record: 'r', verified_by: over, method: 'in_person',
      last_verified: '2026-08-21', fields: { pets: 'no' }
    }, T)).toThrow();
  });

  it('is refused on the way in too, not only on the way out', () => {
    // A hand-rolled publisher never calls the builder.
    const card = buildCard(wren, { callsign: 'Wren', region: 'st-louis' }, T);
    const forged = overRelay({
      ...card,
      content: JSON.stringify({ callsign: long(CALLSIGN_MAX + 1), region: 'st-louis' })
    });
    expect(readCard(forged)).toBeNull();
  });

  it('refuses an oversized callsign in peer presence', () => {
    // Reading is what protects the recipient -- the sender is somebody else's client, and a
    // fork could put anything in here. Addressed to a real peer and read with that peer's
    // key, so a null result is the cap and not a failed decryption.
    const peerSecret = generateSecretKey();
    const peerPub = getPublicKey(peerSecret);
    const mine = getPublicKey(wren);

    const [ok] = buildPresence(wren, [peerPub], {
      callsign: 'Wren', status: 'out', area: 'Downtown', until: T
    }, T);
    expect(readPresence(peerSecret, ok!, [mine]), 'a normal one reads').not.toBeNull();

    const [oversized] = buildPresence(wren, [peerPub], {
      callsign: long(CALLSIGN_MAX + 1), status: 'out', area: 'Downtown', until: T
    }, T);
    expect(readPresence(peerSecret, oversized!, [mine])).toBeNull();
  });

  it('refuses an oversized area in peer presence, which lands on the same screen', () => {
    const peerSecret = generateSecretKey();
    const [event] = buildPresence(wren, [getPublicKey(peerSecret)], {
      callsign: 'Wren', status: 'out', area: long(500), until: T
    }, T);
    expect(readPresence(peerSecret, event!, [getPublicKey(wren)])).toBeNull();
  });

  it('still accepts a normal one', () => {
    expect(() => buildCard(wren, { callsign: 'Wren', region: 'st-louis' }, T)).not.toThrow();
    expect(withinLimit('Wren', CALLSIGN_MAX)).toBe(true);
  });
});

describe('what an operator types into a signal', () => {
  it('is capped, including a Distress', () => {
    // Somebody in trouble is not writing an essay, and a cap that would truncate a real one
    // would be far lower than this.
    expect(() => buildSignal(wren, to, 'query', { text: long(TEXT_MAX + 1) }, T)).toThrow();
    expect(() => buildDistress(wren, to, { position: null, area: null, text: long(TEXT_MAX + 1) }, T)).toThrow();
  });

  it('leaves anything a person would actually write alone', () => {
    expect(() => buildSignal(wren, to, 'query', { text: long(TEXT_MAX) }, T)).not.toThrow();
    expect(() => buildDistress(wren, to, { position: null, area: 'north side', text: 'two of them' }, T)).not.toThrow();
  });
});

describe('a correction is cached by everybody carrying that area', () => {
  const base = {
    record: 'st-louis-example', verified_by: 'Wren', method: 'in_person' as const,
    last_verified: '2026-08-21'
  };

  it('refuses a field value longer than a field value', () => {
    // The one that most directly costs somebody else's storage.
    expect(() => buildCorrection(wren, { ...base, fields: { hours: long(VALUE_MAX + 1) } }, T)).toThrow();
  });

  it('refuses a re-import dressed as a correction', () => {
    const many = Object.fromEntries(
      ['hours', 'intake_hours', 'pets', 'sobriety', 'id_required', 'accepts', 'phone',
       'curfew', 'max_stay', 'cost', 'languages', 'belongings', 'accessibility'].map((f) => [f, 'x'])
    );
    expect(Object.keys(many).length).toBeGreaterThan(FIELDS_MAX);
    expect(() => buildCorrection(wren, { ...base, fields: many }, T)).toThrow();
  });

  it('refuses both on read as well', () => {
    const good = buildCorrection(wren, { ...base, fields: { hours: '19:00' } }, T);
    const payload = JSON.parse(good.content) as Record<string, unknown>;
    const forged = overRelay({
      ...good,
      content: JSON.stringify({ ...payload, fields: { hours: long(VALUE_MAX + 1) } })
    });
    expect(readCorrection(forged)).toBeNull();
  });

  it('leaves a real correction alone', () => {
    expect(() => buildCorrection(wren, { ...base, fields: { hours: 'Mon-Sun 19:00-07:00' } }, T)).not.toThrow();
  });
});

describe('withinLimit', () => {
  it('refuses empty and whitespace, which are not values', () => {
    expect(withinLimit('', 10)).toBe(false);
    expect(withinLimit('   ', 10)).toBe(false);
    expect(withinLimit(undefined, 10)).toBe(false);
    expect(withinLimit(42, 10)).toBe(false);
  });
});
