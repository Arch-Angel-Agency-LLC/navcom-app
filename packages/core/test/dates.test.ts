/**
 * Milestone 1, robustness: what the display rules do with a date that is not a date.
 *
 * The rules decide whether a value is shown at all, so the age calculation underneath them
 * is load-bearing for every record on every screen — and now for every correction, since
 * corrections are weighed against records by exactly the same rules.
 */

import { describe, expect, it } from 'vitest';
import { generateSecretKey } from 'nostr-tools/pure';
import {
  ageInDays, buildCorrection, displayField, displayMerged, FUTURE_TOLERANCE_DAYS,
  mergeCorrections, readCorrection
} from '../src/index.js';
import type { ResourceRecord } from '../src/index.js';

const NOW = new Date('2026-08-21T00:00:00Z');
const rec = (over: Partial<ResourceRecord> = {}): ResourceRecord =>
  ({
    id: 'x', name: 'A place', type: 'shelter', hours: '19:00-07:00',
    last_verified: '2026-08-20', verified_by: 'Wren', method: 'in_person', flag: 'ok', ...over
  }) as ResourceRecord;

describe('a date that will not parse', () => {
  it('reads as unverifiable rather than as recent', () => {
    for (const bad of ['not-a-date', '2026-13-45', '', 'yesterday', '2026-08-20T99']) {
      expect(ageInDays(bad, NOW), bad).toBe(Number.POSITIVE_INFINITY);
      expect(displayField(rec({ last_verified: bad }), 'hours', NOW).kind, bad).toBe('call-first');
    }
  });
});

describe('a date in the future', () => {
  it('is not the freshest thing possible', () => {
    // It used to be exactly that: a negative age clears every staleness threshold, so a
    // record claiming to be verified in 2030 rendered as high confidence.
    for (const ahead of ['2030-01-01', '99999-01-01', '2026-12-25']) {
      expect(displayField(rec({ last_verified: ahead }), 'hours', NOW).kind, ahead).toBe('call-first');
    }
  });

  it('tolerates a day, because timezones are real', () => {
    // A record verified this evening in Auckland is tomorrow in UTC. Calling that a forgery
    // would break honest data to catch a case a day's grace already covers.
    const tomorrow = '2026-08-22';
    expect(ageInDays(tomorrow, NOW)).toBe(-1);
    expect(displayField(rec({ last_verified: tomorrow }), 'hours', NOW).kind).toBe('value');
    expect(FUTURE_TOLERANCE_DAYS).toBe(1);
  });

  it('stops tolerating past that', () => {
    expect(ageInDays('2026-08-23', NOW)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('the directory merge, which is weighed by the same rule', () => {
  const wren = generateSecretKey();
  const raven = generateSecretKey();
  const correction = (by: Uint8Array, at: string, hours: string) =>
    readCorrection(
      JSON.parse(JSON.stringify(buildCorrection(by, {
        record: 'x', verified_by: 'Somebody', method: 'in_person',
        last_verified: at, fields: { hours }
      }, 1_755_300_000)))
    )!;

  it('cannot be won forever by dating a correction in the future', () => {
    // The cheap attack this closes. Corrections are weighed by confidence and ties break on
    // the date, so a correction dated 2099 would beat every honest one, from anybody,
    // permanently.
    const honest = correction(wren, '2026-08-20', 'honest hours');
    const forged = correction(raven, '2099-01-01', 'forged hours');

    // The published record is a stale website scrape, so an honest in-person correction
    // legitimately beats it. Giving the base record equal freshness would have made this
    // pass for the wrong reason -- ties go to the published version by design.
    const merged = mergeCorrections(
      rec({ hours: 'published hours', last_verified: '2025-01-01', method: 'website' }),
      [honest, forged],
      NOW
    );
    expect(merged.record.hours).toBe('honest hours');
    expect(displayMerged(merged, 'hours', NOW).by?.last_verified).toBe('2026-08-20');
  });

  it('still lets an honest recent correction win', () => {
    const merged = mergeCorrections(
      rec({ hours: 'published hours', last_verified: '2025-01-01', method: 'website' }),
      [correction(wren, '2026-08-20', 'checked last night')],
      NOW
    );
    expect(merged.record.hours).toBe('checked last night');
  });
});
