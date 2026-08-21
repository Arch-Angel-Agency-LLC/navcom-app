/**
 * Drills, and the two ways they lie if nobody is careful.
 *
 * A drill that flatters the watch is worse than no drill: it produces a published `pass`
 * that an operator reads before deciding whether to go out.
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DRILL_WINDOW_DAYS,
  drillSentence,
  evaluateDrill,
  nextDrillAt,
  type Author
} from '../src/index.js';

const T = 1_755_300_000;
const human = (callsign: string): Author => ({ kind: 'human', callsign });

describe('a pass requires a human', () => {
  it('passes when somebody answered', () => {
    const d = evaluateDrill(T, ['Wren', 'Raven'], [human('Raven')], 41_000);
    expect(d.result).toBe('pass');
    expect(d.firstAckMs).toBe(41_000);
  });

  it('fails when the pages went out and nobody answered', () => {
    // A command exiting zero says a message left a machine. Somebody whose phone buzzed is
    // not somebody who woke up, and this is the distinction the whole drill exists to test.
    const d = evaluateDrill(T, ['Wren', 'Raven'], [], null);
    expect(d.result).toBe('fail');
  });

  it('fails on an empty roster rather than recording a skip', () => {
    // "Nobody is on-call" is precisely the finding a weekly drill exists to surface.
    // Anything softer lets an unstaffed watch look untested rather than unstaffed.
    const d = evaluateDrill(T, [], [], null);
    expect(d.result).toBe('fail');
    expect(drillSentence(d)).toMatch(/nobody was on-call/i);
  });

  it('does not let an agent pass a drill', () => {
    // Invariant 5. An agent answering proves the message arrived somewhere, not that a
    // person is reachable -- and the whole point of on-call is that a person is.
    const d = evaluateDrill(T, ['Mecha Jono'], [{ kind: 'agent', callsign: 'Mecha Jono' }], 900);
    expect(d.result).toBe('fail');
    expect(d.acknowledged).toEqual([]);
  });

  it('discards a timing that has no acknowledgement behind it', () => {
    const d = evaluateDrill(T, ['Wren'], [], 12_000);
    expect(d.firstAckMs).toBeNull();
  });
});

describe('the word it is allowed to use', () => {
  it('never says verified', () => {
    // A drill that passed says the path worked that time. Any stronger word is a claim
    // about the future made from evidence about the past.
    const passed = drillSentence(evaluateDrill(T, ['Wren'], [human('Wren')], 8_000));
    expect(passed).toMatch(/no evidence of failure/i);
    // The word does appear -- in the denial. What must never appear is the claim, so this
    // asserts every occurrence is negated rather than that the word is absent.
    for (const m of passed.matchAll(/verified/gi)) {
      const before = passed.slice(Math.max(0, m.index - 24), m.index);
      expect(before, 'an un-negated "verified"').toMatch(/\bnot\b/i);
    }
  });

  it('reads as a sentence for one person and for several', () => {
    // Read on a status page by somebody deciding whether to go out. A sentence that does
    // not parse is one that gets skimmed past.
    expect(drillSentence(evaluateDrill(T, ['Wren'], [], null))).toMatch(/Wren was paged/);
    expect(drillSentence(evaluateDrill(T, ['Wren', 'Raven'], [], null))).toMatch(/were paged/);
  });

  it('says plainly that a watch with no drill has demonstrated nothing', () => {
    expect(drillSentence(null)).toMatch(/has not demonstrated/i);
  });

  it('names who was paged and who answered, never a count', () => {
    const d = evaluateDrill(T, ['Wren', 'Raven'], [human('Raven')], 30_000);
    const said = drillSentence(d);
    expect(said).toContain('Raven');
    expect(said).not.toMatch(/\b1 of 2\b/);
  });
});

describe('when the next one fires', () => {
  it('is randomised inside the window rather than on a cadence', () => {
    // A drill that always runs at 03:00 on a Tuesday tests whether the path works at 03:00
    // on a Tuesday. An on-call operator who has learned the schedule is being reminded, not
    // tested -- and the Sleeper learns a fixed schedule faster than anybody.
    const times = new Set<number>();
    for (const r of [0, 0.25, 0.5, 0.75, 0.99]) {
      times.add(nextDrillAt(T, T, DEFAULT_DRILL_WINDOW_DAYS, () => r));
    }
    expect(times.size).toBe(5);
  });

  it('stays inside the window', () => {
    const window = DEFAULT_DRILL_WINDOW_DAYS * 86_400;
    for (const r of [0, 0.5, 0.999]) {
      const next = nextDrillAt(T, T, DEFAULT_DRILL_WINDOW_DAYS, () => r);
      expect(next).toBeGreaterThanOrEqual(T);
      expect(next).toBeLessThan(T + window);
    }
  });

  it('never schedules into the past, however long the executor was down', () => {
    // A scheduled moment already gone would fire the instant the executor restarts, which
    // is how a crash loop becomes a paging storm at 4am.
    const longAgo = T - 400 * 86_400;
    expect(nextDrillAt(longAgo, T, DEFAULT_DRILL_WINDOW_DAYS, () => 0)).toBeGreaterThanOrEqual(T);
  });

  it('schedules a first drill from now when none has ever run', () => {
    expect(nextDrillAt(null, T, DEFAULT_DRILL_WINDOW_DAYS, () => 0)).toBe(T);
  });
});

describe('the same person answering more than once', () => {
  const wren = { kind: 'human' as const, callsign: 'Wren', pubkey: 'aa'.repeat(32) };

  it('counts as one person, because that is how many people it is', () => {
    // A client retries its acknowledgement and several relays deliver each attempt. The
    // list is published in 10910, where "Wren, Wren, Wren" reads as three people having
    // woken up — and a roster's depth is the one thing a reader judges from it.
    const drill = evaluateDrill(1000, ['Wren'], [wren, wren, wren], 4200);
    expect(drill.acknowledged).toHaveLength(1);
    expect(drillSentence(drill)).toMatch(/Wren answered in 4s/);
    expect(drillSentence(drill)).not.toMatch(/Wren, Wren/);
  });

  it('still keeps two different people apart', () => {
    const raven = { kind: 'human' as const, callsign: 'Raven', pubkey: 'bb'.repeat(32) };
    expect(evaluateDrill(1000, ['Wren', 'Raven'], [wren, raven, wren], 4200).acknowledged)
      .toHaveLength(2);
  });

  it('falls back to the callsign when nobody carries a key', () => {
    const keyless = { kind: 'human' as const, callsign: 'Wren' };
    expect(evaluateDrill(1000, ['Wren'], [keyless, keyless], 100).acknowledged).toHaveLength(1);
  });
});
