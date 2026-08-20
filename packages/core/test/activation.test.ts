/**
 * Display rule 7: a place whose opening depends on something this app cannot check never
 * renders its hours.
 *
 * The display rules exist for one failure — *"a confident wrong answer that sends someone
 * somewhere that turns them away."* Rules 1 and 2 handle the case where the data is old.
 * This is the case where **the data is perfectly fresh and the answer is still wrong**: a
 * warming centre verified this morning still has a locked door on a mild night, because the
 * city has not called it.
 */

import { describe, expect, it } from 'vitest';
import { displayField } from '../src/index.js';
import type { ResourceRecord } from '../src/index.js';

/**
 * Two "todays", each with a record verified that morning.
 *
 * Freshness is load-bearing in this file: rule 2 already blanks a stale volatile field, so a
 * record verified in January and read in July would render `call-first` for the ordinary
 * reason and prove nothing about rule 7. Every case below is verified the same day it is
 * read, which is what makes a `call-first` result attributable to activation or season.
 */
const TODAY = new Date('2026-01-15T00:00:00Z');
const JULY = new Date('2026-07-15T00:00:00Z');
const VERIFIED_JULY = '2026-07-15';

const record = (over: Partial<ResourceRecord> = {}): ResourceRecord =>
  ({
    id: 'x',
    name: 'A place',
    type: 'warming',
    hours: 'Mon-Sun 19:00-07:00',
    intake_hours: '19:00-21:00',
    capacity_signal: 'usually_available',
    last_verified: '2026-01-15',
    verified_by: 'Wren',
    method: 'in_person',
    flag: 'ok',
    lat: 38.62,
    ...over
  }) as ResourceRecord;

describe('weather-activated places', () => {
  it('never shows hours, however recently they were verified', () => {
    const shown = displayField(record({ seasonal: 'weather_activated' }), 'hours', TODAY);
    expect(shown.kind).toBe('call-first');
  });

  it('says the reason is activation, not staleness', () => {
    // A reader deciding whether to send somebody across a city is owed the difference
    // between "nobody has checked this in a month" and "this only opens when the city
    // calls it". The first might still be right.
    const shown = displayField(record({ seasonal: 'weather_activated' }), 'hours', TODAY);
    expect(shown.kind === 'call-first' && shown.because).toBe('weather-activated');
  });

  it('covers every field that answers "is it open"', () => {
    const r = record({ seasonal: 'weather_activated' });
    for (const field of ['hours', 'intake_hours', 'capacity_signal'] as const) {
      expect(displayField(r, field, TODAY).kind, field).toBe('call-first');
    }
  });

  it('leaves everything else alone', () => {
    // The address of a weather-activated centre is still its address. Only "is it open
    // tonight" becomes unanswerable, and blanking the rest would make the record useless
    // for the operator who wants to go and look.
    const r = record({ seasonal: 'weather_activated', address: '1 Example St' });
    expect(displayField(r, 'address', TODAY).kind).toBe('value');
    expect(displayField(r, 'name', TODAY).kind).toBe('value');
  });
});

describe('seasonal places, out of season', () => {
  it('shows a winter shelter normally in winter', () => {
    expect(displayField(record({ seasonal: 'winter_only' }), 'hours', TODAY).kind).toBe('value');
  });

  it('refuses to show its hours in July', () => {
    // July hours for a winter shelter are last winter's hours.
    const r = record({ seasonal: 'winter_only', last_verified: VERIFIED_JULY });
    const shown = displayField(r, 'hours', JULY);
    expect(shown.kind).toBe('call-first');
    expect(shown.kind === 'call-first' && shown.because).toBe('out-of-season');
  });

  it('knows the southern hemisphere runs the other way', () => {
    // Melbourne. July is winter there, so a winter-only shelter is in season then, and out
    // of season in January.
    const inJuly = record({ seasonal: 'winter_only', lat: -37.8, last_verified: VERIFIED_JULY });
    expect(displayField(inJuly, 'hours', JULY).kind).toBe('value');

    const inJanuary = record({ seasonal: 'winter_only', lat: -37.8 });
    const shown = displayField(inJanuary, 'hours', TODAY);
    expect(shown.kind).toBe('call-first');
    expect(shown.kind === 'call-first' && shown.because).toBe('out-of-season');
  });

  it('says nothing about season where it cannot know', () => {
    // No latitude, or the tropics, where a four-season model does not describe the year.
    // Claiming "out of season" there would be a guess dressed as a rule.
    const noLat = record({ seasonal: 'winter_only', lat: undefined, last_verified: VERIFIED_JULY });
    const tropics = record({ seasonal: 'winter_only', lat: 1.35, last_verified: VERIFIED_JULY });
    expect(displayField(noLat, 'hours', JULY).kind).toBe('value');
    expect(displayField(tropics, 'hours', JULY).kind).toBe('value');
  });

  it('leaves a year-round place completely alone', () => {
    const r = record({ seasonal: 'year_round', last_verified: VERIFIED_JULY });
    expect(displayField(r, 'hours', JULY).kind).toBe('value');
  });
});

describe('the rule it does not replace', () => {
  it('still shows blank as unknown, not as call-first', () => {
    // Rule 5 takes precedence. "Unknown" and "call first" are different answers.
    const shown = displayField(record({ seasonal: 'weather_activated', hours: '' }), 'hours', TODAY);
    expect(shown.kind).toBe('unknown');
  });
});
