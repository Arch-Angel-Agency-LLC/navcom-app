/**
 * Drills.
 *
 * The watch tests its own paging path on an unannounced schedule and publishes what
 * happened. **A watch that cannot demonstrate a passing drill is presumed broken**, and
 * `10910` carries the last result so a cold client can see that before signing on.
 *
 * Two rules shape everything here, and both are about not flattering ourselves:
 *
 *  - **A pass means "no evidence of failure", never "verified"** [C32]. The path worked this
 *    time. That is the entire claim, and it is the only one a test can support against an
 *    adversary who knows when the tests run
 *  - **A drill must be distinguishable from a real `Distress` by the recipient** [C29].
 *    Somebody woken at 3am has seconds and no context. Producing alarm fatigue in the name
 *    of testing would destroy the one mechanism where failure means somebody is hurt
 *
 * Normative source: docs/spec/escalation.spec.md
 */

import type { Author } from './attestation.js';

export type DrillResultKind = 'pass' | 'fail';

export interface Drill {
  /** Unix seconds the drill was fired. */
  at: number;
  /** Who was paged, by name. A list, not a total — the same rule as everywhere else. */
  paged: string[];
  /** Who actually answered, each signing for themselves. */
  acknowledged: Author[];
  /** Milliseconds to the first human acknowledgement, or null if none came. */
  firstAckMs: number | null;
  result: DrillResultKind;
}

export const DEFAULT_DRILL_WINDOW_DAYS = 7;

/**
 * When the next drill fires.
 *
 * **Randomised inside the window, not on a fixed cadence.** A drill that always runs at
 * 03:00 on a Tuesday tests whether the path works at 03:00 on a Tuesday, and an on-call
 * operator who has learned the schedule is not being tested at all — they are being
 * reminded. The Sleeper learns a fixed schedule faster than anybody.
 *
 * `random` is injected so this is deterministic under test; nothing else should pass it.
 */
export function nextDrillAt(
  lastAt: number | null,
  now: number,
  windowDays = DEFAULT_DRILL_WINDOW_DAYS,
  random: () => number = Math.random
): number {
  const window = windowDays * 86_400;
  // Never before now: a drill whose scheduled moment is already past would fire the instant
  // the executor restarts, which is how a restart loop becomes a paging storm.
  const from = Math.max(lastAt ?? now, now);
  return from + Math.floor(random() * window);
}

/**
 * What a drill proved, which is less than it looks.
 *
 * A pass requires **a human acknowledgement**. Not a delivery receipt, not a command exiting
 * zero, not an agent — those say a message left a machine, and somebody whose phone buzzed
 * is not somebody who woke up.
 *
 * An empty roster is a **fail**, not a skip. "Nobody is on-call" is precisely the finding a
 * weekly drill exists to surface, and recording it as anything else would let a watch with
 * no roster look untested rather than unstaffed.
 */
export function evaluateDrill(
  at: number,
  paged: string[],
  acknowledged: Author[],
  firstAckMs: number | null
): Drill {
  const humans = acknowledged.filter((a) => a.kind === 'human');
  return {
    at,
    paged,
    acknowledged: humans,
    firstAckMs: humans.length > 0 ? firstAckMs : null,
    result: humans.length > 0 ? 'pass' : 'fail'
  };
}

/**
 * What the result is called where a person reads it.
 *
 * Never the word "verified". A drill that passed says the path worked that time, and any
 * stronger word is a claim about the future made from evidence about the past.
 */
export function drillSentence(drill: Drill | null): string {
  if (!drill) return 'No drill has ever run. This watch has not demonstrated that it can raise anyone.';

  if (drill.result === 'fail') {
    if (drill.paged.length === 0) {
      return 'Last drill failed: nobody was on-call, so nobody was paged.';
    }
    // One person is "was". Somebody reads this on a status page, and a sentence that does
    // not parse is a sentence that gets skimmed past.
    const verb = drill.paged.length === 1 ? 'was' : 'were';
    return `Last drill failed: ${drill.paged.join(', ')} ${verb} paged and nobody answered.`;
  }

  const who = drill.acknowledged.map((a) => a.callsign ?? 'someone').join(', ');
  const seconds = drill.firstAckMs === null ? null : Math.round(drill.firstAckMs / 1000);
  return (
    `Last drill found no evidence of failure: ${who} answered` +
    (seconds === null ? '.' : ` in ${seconds}s.`) +
    ' That means the path worked that time, not that it is verified.'
  );
}
