/**
 * The public face, and the two things it must never cost an operator.
 *
 * Being findable is the one opt-in in this system that creates a permanent public artifact.
 * The tests below are mostly about what that artifact cannot contain and cannot be linked
 * to — because those are the properties a later change would break without failing anything
 * else, and the operator harmed would never know.
 */

import { describe, expect, it } from 'vitest';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import type { Event } from 'nostr-tools/core';
import {
  buildCard,
  buildPresence,
  buildPublicPresence,
  CardError,
  CARD_FIELDS,
  DOING_MAX,
  KIND_CARD,
  KIND_PUBLIC_PRESENCE,
  readCard,
  readPublicPresence,
  type Card
} from '../src/index.js';

const contact = generateSecretKey();
const contactPub = getPublicKey(contact);
const operational = generateSecretKey();
const operationalPub = getPublicKey(operational);

const T = 1_755_300_000;

/**
 * What a relay actually delivers: JSON, parsed.
 *
 * Every forgery test below goes through this, and it is not ceremony. `verifyEvent`
 * memoises its result on the event object under a symbol, and object spread copies
 * symbols — so `{ ...event, content: 'forged' }` arrives already marked verified and every
 * tamper test passes vacuously. A round trip through JSON is both what the wire does and
 * the only way these assertions mean anything.
 */
const overRelay = (event: Event): Event => JSON.parse(JSON.stringify(event)) as Event;
const card = (over: Partial<Card> = {}): Card => ({
  callsign: 'Raven',
  region: 'st-louis',
  doing: 'Water and socks, Thursdays.',
  ...over
});

describe('a card', () => {
  it('carries a callsign, a region and a line, and is readable by anybody', () => {
    const read = readCard(buildCard(contact, card(), T));
    expect(read?.card.callsign).toBe('Raven');
    expect(read?.card.region).toBe('st-louis');
    expect(read?.card.doing).toBe('Water and socks, Thursdays.');
    expect(read?.contact).toBe(contactPub);
  });

  it('is signed by the contact key and never the operational one', () => {
    // The property the whole design rests on. A card signed by the operational key would
    // let anyone watching a relay count the presence events addressed to it -- when this
    // operator is out, how many peers they have, which nights they work.
    const event = buildCard(contact, card(), T);
    expect(event.pubkey).toBe(contactPub);
    expect(event.pubkey).not.toBe(operationalPub);
  });

  it('cannot be linked to that operator\'s peer traffic', () => {
    // Stated as a test rather than a comment because it is the claim the card screen makes
    // to an operator deciding whether to publish one.
    const published = buildCard(contact, card(), T);
    const presence = buildPresence(
      operational,
      [getPublicKey(generateSecretKey())],
      { callsign: 'Raven', status: 'out', area: 'Downtown', until: T + 7200 },
      T
    );
    for (const e of presence) {
      expect(e.pubkey).not.toBe(published.pubkey);
      expect(JSON.stringify(e.tags)).not.toContain(published.pubkey);
    }
  });

  it('is replaceable, so an operator has one card rather than a history of cards', () => {
    expect(buildCard(contact, card(), T).kind).toBe(KIND_CARD);
    expect(KIND_CARD).toBeGreaterThanOrEqual(10_000);
    expect(KIND_CARD).toBeLessThan(20_000);
  });

  it('works without a line about what you do', () => {
    const read = readCard(buildCard(contact, card({ doing: undefined }), T));
    expect(read?.card.doing).toBeUndefined();
  });
});

describe('what a card refuses to carry', () => {
  it('refuses one carrying a position, at any precision', () => {
    // The field somebody will eventually try to add. There is no setting that publishes a
    // position, and refusing on read means a client written against a future, looser
    // version of this type still cannot make one appear on somebody's screen.
    const smuggled = { ...card(), lat: 38.62, lon: -90.19 };
    const event = buildCard(contact, smuggled as Card, T);
    // buildCard drops it -- but a hand-rolled publisher would not, so read must refuse.
    expect(readCard(event)?.card).not.toHaveProperty('lat');

    expect(readCard(overRelay({ ...event, content: JSON.stringify(smuggled) }))).toBeNull();
  });

  it('refuses any field it does not know, rather than trimming it', () => {
    const event = buildCard(contact, card(), T);
    for (const junk of ['legalName', 'phone', 'home', 'precision']) {
      expect(readCard(overRelay({ ...event, content: JSON.stringify({ ...card(), [junk]: 'x' }) })), junk).toBeNull();
    }
  });

  it('has no field for anything but a callsign, a region and a line', () => {
    expect([...CARD_FIELDS]).toEqual(['callsign', 'region', 'doing']);
  });

  it('refuses a card with no callsign or no region', () => {
    expect(() => buildCard(contact, card({ callsign: '  ' }), T)).toThrow(CardError);
    expect(() => buildCard(contact, card({ region: '' }), T)).toThrow(CardError);
    expect(() => buildCard(contact, card({ region: 'Saint Louis, MO' }), T)).toThrow(CardError);
  });

  it('refuses a line longer than a line', () => {
    expect(() => buildCard(contact, card({ doing: 'x'.repeat(DOING_MAX + 1) }), T)).toThrow(
      CardError
    );
  });

  it('refuses a card whose signature does not hold', () => {
    const event = buildCard(contact, card(), T);
    const forged = overRelay({ ...event, content: JSON.stringify(card({ callsign: 'Owl' })) });
    expect(readCard(forged)).toBeNull();
  });

  it('returns null rather than throwing on anything malformed', () => {
    const event = buildCard(contact, card(), T);
    expect(() => readCard(overRelay({ ...event, content: 'not json' }))).not.toThrow();
    expect(readCard(overRelay({ ...event, content: 'not json' }))).toBeNull();
    expect(readCard(overRelay({ ...event, content: '[]' }))).toBeNull();
    expect(readCard(overRelay({ ...event, kind: 1 }))).toBeNull();
  });
});

describe('being listed as out', () => {
  it('says a key and a region, and carries no payload at all', () => {
    // Not a count, not a pin, not a duration. The callsign is not repeated here either --
    // a reader resolves it against the card the same key signed, so there is one place a
    // callsign lives and no way for the two to disagree.
    const event = buildPublicPresence(contact, 'st-louis', T);
    expect(event.content).toBe('');
    expect(readPublicPresence(event, 'st-louis')).toBe(contactPub);
  });

  it('has nowhere to put a position, a time or a number', () => {
    const event = buildPublicPresence(contact, 'st-louis', T);
    const wire = JSON.stringify({ content: event.content, tags: event.tags });
    expect(wire).not.toMatch(/lat|lon|until|count|precision/);
    // One tag, and it is the region a client filtered on to receive this at all.
    expect(event.tags).toEqual([['d', 'st-louis']]);
  });

  it('is ephemeral, so no relay accumulates which nights somebody works', () => {
    expect(KIND_PUBLIC_PRESENCE).toBeGreaterThanOrEqual(20_000);
    expect(KIND_PUBLIC_PRESENCE).toBeLessThan(30_000);
  });

  it('is refused when it claims a region it was not published to', () => {
    const event = buildPublicPresence(contact, 'st-louis', T);
    expect(readPublicPresence(event, 'chicago')).toBeNull();
  });

  it('is refused when somebody has tried to hide something in it', () => {
    const event = buildPublicPresence(contact, 'st-louis', T);
    expect(readPublicPresence(overRelay({ ...event, content: '{"lat":38.6}' }), 'st-louis')).toBeNull();
  });

  it('uses the contact key, so being listed exposes no more than the card did', () => {
    const event = buildPublicPresence(contact, 'st-louis', T);
    expect(event.pubkey).toBe(contactPub);
    expect(event.pubkey).not.toBe(operationalPub);
  });
});
