/**
 * Live corrections, and the two properties that keep them safe.
 *
 * A correction is how the ninth tribe's knowledge gets in — perishable, local, and known only
 * by the person who was standing there. The tests that matter are not the round trip:
 *
 *  1. **A correction is weighed, never obeyed.** An in-person check from last night beats a
 *     website scrape from March because the confidence rules already said so
 *  2. **It is additive.** Nothing a hostile operator sends can remove a record or blank a
 *     field, because `declined.md` declines adjudication and there is nobody to appeal to
 */

import { describe, expect, it } from 'vitest';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import type { Event } from 'nostr-tools/core';
import {
  buildCorrection,
  CorrectionError,
  mergeCorrections,
  needsChecking,
  readCorrection,
  type Correction,
  type ResourceRecord
} from '../src/index.js';

const wren = generateSecretKey();
const raven = generateSecretKey();
const NOW = new Date('2026-08-20T00:00:00Z');
const overRelay = (e: Event): Event => JSON.parse(JSON.stringify(e)) as Event;

/** Scraped from a website in March. True-ish, old, and nobody has been there. */
const base = (over: Partial<ResourceRecord> = {}): ResourceRecord =>
  ({
    id: 'st-louis-example',
    name: 'Example Shelter',
    type: 'shelter',
    hours: 'Mon-Sun 19:00-07:00',
    last_verified: '2026-03-01',
    verified_by: 'anonymous',
    method: 'website',
    flag: 'ok',
    ...over
  }) as ResourceRecord;

const correction = (over: Partial<Correction> = {}): Correction => ({
  record: 'st-louis-example',
  verified_by: 'Wren',
  method: 'in_person',
  last_verified: '2026-08-19',
  fields: { hours: 'Mon-Sun 20:00-06:00' },
  ...over
});

const readable = (secret: Uint8Array, c: Correction) =>
  readCorrection(overRelay(buildCorrection(secret, c, 1_755_300_000)))!;

describe('a correction is weighed, not obeyed', () => {
  it('lets last night in person beat March off a website', () => {
    const merged = mergeCorrections(base(), [readable(wren, correction())], NOW);
    expect(merged.record.hours).toBe('Mon-Sun 20:00-06:00');
    expect(merged.sources.hours?.correction?.verified_by).toBe('Wren');
  });

  it('does not let a stale correction beat a fresh record', () => {
    // Somebody's note from last winter must not overwrite a record checked this week.
    const fresh = base({ last_verified: '2026-08-18', method: 'in_person', verified_by: 'Owl' });
    const old = readable(wren, correction({ last_verified: '2026-01-04' }));
    const merged = mergeCorrections(fresh, [old], NOW);
    expect(merged.record.hours).toBe('Mon-Sun 19:00-07:00');
    expect(merged.sources.hours).toBeUndefined();
  });

  it('fills a blank, because a blank is no claim at all', () => {
    // Rule 5 renders blank as "unknown". Anything sourced beats nothing.
    const merged = mergeCorrections(
      base({ pets: undefined }),
      [readable(wren, correction({ fields: { pets: 'yes' } }))],
      NOW
    );
    expect(merged.record.pets).toBe('yes');
  });

  it('prefers the more recent of two equally good corrections', () => {
    const older = readable(wren, correction({ last_verified: '2026-08-10' }));
    const newer = readable(raven, correction({
      verified_by: 'Raven', last_verified: '2026-08-19', fields: { hours: '21:00-05:00' }
    }));
    const merged = mergeCorrections(base(), [older, newer], NOW);
    expect(merged.record.hours).toBe('21:00-05:00');
  });

  it('leaves fields nobody corrected exactly as published', () => {
    const merged = mergeCorrections(base({ phone: '314-555-0100' }), [readable(wren, correction())], NOW);
    expect(merged.record.phone).toBe('314-555-0100');
    expect(merged.sources.phone).toBeUndefined();
  });
});

describe('additive, never subtractive — the abuse answer', () => {
  it('cannot make a record suspect for everybody', () => {
    // The whole hazard. If a correction's flag became a property of the record, one hostile
    // operator could make any shelter unusable for everyone -- deletion wearing a different
    // hat -- and `declined.md` refuses to appoint anybody to adjudicate it.
    const hostile = readable(raven, correction({
      verified_by: 'Raven', fields: { flag: 'permanently_closed' }
    }));
    const merged = mergeCorrections(base(), [hostile], NOW);

    expect(merged.record.flag, 'the published record is untouched').toBe('ok');
    expect(merged.reports).toHaveLength(1);
    expect(merged.reports[0]?.verified_by, 'attributed, so a reader can weigh it').toBe('Raven');
  });

  it('cannot blank a field', () => {
    // An empty assertion is refused at build time rather than applied as a deletion.
    expect(() => buildCorrection(wren, correction({ fields: { hours: '' } }), 1)).toThrow(CorrectionError);
    expect(() => buildCorrection(wren, correction({ fields: {} }), 1)).toThrow(CorrectionError);
  });

  it('cannot remove the record', () => {
    const merged = mergeCorrections(base(), [readable(raven, correction({ fields: { flag: 'reported_closed' } }))], NOW);
    expect(merged.record.id).toBe('st-louis-example');
    expect(merged.record.name).toBe('Example Shelter');
  });
});

describe('what a correction refuses to carry', () => {
  it('refuses a field that is not in the schema', () => {
    for (const junk of ['legalName', 'person', 'note_about_client']) {
      expect(() => buildCorrection(wren, correction({ fields: { [junk]: 'x' } as never }), 1), junk)
        .toThrow(CorrectionError);
    }
  });

  it('refuses coordinates', () => {
    // A correction is about what a place does. Where the building is is not something an
    // operator learns by being turned away at the door.
    expect(() => buildCorrection(wren, correction({ fields: { lat: '38.6' } as never }), 1))
      .toThrow(CorrectionError);
  });

  it('refuses one with no author or an unknown method', () => {
    expect(() => buildCorrection(wren, correction({ verified_by: ' ' }), 1)).toThrow(CorrectionError);
    expect(() => buildCorrection(wren, correction({ method: 'vibes' as never }), 1)).toThrow(CorrectionError);
    expect(() => buildCorrection(wren, correction({ last_verified: 'yesterday' }), 1)).toThrow(CorrectionError);
  });

  it('refuses a smuggled field on read, not only on build', () => {
    // A hand-rolled publisher does not call buildCorrection.
    const event = buildCorrection(wren, correction(), 1_755_300_000);
    const forged = overRelay({
      ...event,
      content: JSON.stringify({ ...JSON.parse(event.content), fields: { lat: '38.6' } })
    });
    expect(readCorrection(forged)).toBeNull();
  });

  it('refuses one whose tag disagrees with its payload', () => {
    // A relay indexed the tag. If the two disagree, one is lying and neither is guessable.
    const event = buildCorrection(wren, correction(), 1_755_300_000);
    expect(readCorrection(overRelay({ ...event, tags: [['d', 'somewhere-else']] }))).toBeNull();
  });

  it('refuses one whose signature does not hold', () => {
    const event = buildCorrection(wren, correction(), 1_755_300_000);
    const forged = overRelay({
      ...event,
      content: JSON.stringify({ ...JSON.parse(event.content), verified_by: 'Owl' })
    });
    expect(readCorrection(forged)).toBeNull();
  });
});

describe('who signed it', () => {
  it('is the contact key, so contributing costs no operational exposure', () => {
    // The same separation a card uses. An operator can put knowledge in without being
    // findable, which matters most for the person with the best knowledge and the most
    // reason to stay unlinkable.
    const event = buildCorrection(wren, correction(), 1_755_300_000);
    expect(event.pubkey).toBe(getPublicKey(wren));
  });

  it('is about one record, so a relay can be asked for just that place', () => {
    const event = buildCorrection(wren, correction(), 1_755_300_000);
    expect(event.tags).toEqual([['d', 'st-louis-example']]);
  });
});

describe('what to ask, so contributing is an errand rather than an audit', () => {
  it('names the blanks that decide whether somebody gets in', () => {
    const skeleton = base({ pets: undefined, id_required: undefined, intake_hours: undefined });
    const asks = needsChecking(skeleton, [], NOW);
    expect(asks).toContain('pets');
    expect(asks).toContain('intake_hours');
  });

  it('asks about the door before it asks about anything else', () => {
    // A blank `pets` turns somebody away -- the commonest reason a person refuses a bed. A
    // blank `languages` almost never does.
    const skeleton = base({ pets: undefined, intake_hours: undefined, phone: undefined });
    expect(needsChecking(skeleton, [], NOW)[0]).toBe('intake_hours');
  });

  it('is short, because a list of everything is a list nobody reads', () => {
    const skeleton = base({
      pets: undefined, id_required: undefined, intake_hours: undefined,
      capacity_signal: undefined, sobriety: undefined, accepts: undefined
    });
    expect(needsChecking(skeleton, [], NOW)).toHaveLength(3);
  });

  it('stops asking once somebody has answered', () => {
    // The errand is done. Continuing to ask is how a contribution list becomes noise.
    const skeleton = base({ pets: undefined, intake_hours: undefined });
    const answered = readable(wren, correction({ fields: { pets: 'no' } }));
    expect(needsChecking(skeleton, [answered], NOW)).not.toContain('pets');
  });

  it('falls back to what has gone stale when nothing is blank', () => {
    // A value nobody has confirmed in a season is worth a question, not distrust.
    const old = base({
      pets: 'yes', id_required: 'no', intake_hours: '19:00-21:00',
      capacity_signal: 'often_full', sobriety: 'no_questions', accepts: 'single_men',
      curfew: '22:00', phone: '314-555-0100', last_verified: '2025-01-01'
    });
    expect(needsChecking(old, [], NOW).length).toBeGreaterThan(0);
  });

  it('asks for nothing when a record is complete and fresh', () => {
    const good = base({
      pets: 'yes', id_required: 'no', intake_hours: '19:00-21:00',
      capacity_signal: 'often_full', sobriety: 'no_questions', accepts: 'single_men',
      curfew: '22:00', phone: '314-555-0100',
      last_verified: '2026-08-19', method: 'in_person', verified_by: 'Wren'
    });
    expect(needsChecking(good, [], NOW)).toEqual([]);
  });

  it('tasks nobody — it returns fields, never a person', () => {
    // Invariant 6: nothing tasks anyone. This says what is missing; who goes and asks is
    // never the system's business.
    const asks = needsChecking(base({ pets: undefined }), [], NOW);
    expect(asks.every((a) => typeof a === 'string')).toBe(true);
    expect(JSON.stringify(asks)).not.toMatch(/callsign|operator|assign/i);
  });
});
