/**
 * How many people this watch is willing to wake, and how often.
 *
 * **The watch's address is meant to be handed out.** Anybody who has it can publish a signed
 * `20911` from a key they made a second ago, and the executor pages the whole on-call roster
 * for each one. Measured rather than argued: three hundred `20911` from three hundred fresh
 * keys produced three hundred pages, one after another, to a real person's phone.
 *
 * That is not a denial of service against a server — it is an attack on the one mechanism in
 * this system where failure means somebody is hurt. `CLAUDE.md` names it directly: alarm
 * fatigue destroys escalation. A pager that has cried wolf four hundred times is a pager
 * nobody answers on the night it is real, and no amount of correct ladder logic survives
 * that.
 *
 * ## Why this does not violate invariant 2
 *
 * Spending the budget does **not** silently drop a `Distress`. The ladder still opens, the
 * operator is still told, and what they are told is the truth: nobody could be paged. That is
 * the invariant working — the ladder is allowed to fail, and it may never fail silently.
 *
 * ## Why it is not per-operator
 *
 * A per-key limit would be free to defeat: the flood already comes from fresh keys, one per
 * event. There is no enrollment step in this build, so there is no roster of operators to
 * check against, and inventing one to solve this would change who a watch will answer — a
 * much larger decision than a rate limit, and not one to make inside an audit pass.
 *
 * So the budget is global and deliberately generous. It is not sized to be clever; it is
 * sized so that a real night never reaches it and a flood does so immediately.
 */

export interface PageBudget {
  /** Records a dispatch and says whether it is allowed. */
  take(now: number): boolean;
  /** How many remain in the current window, for logging. */
  remaining(now: number): number;
}

export function pageBudget(maxPages: number, windowSeconds: number): PageBudget {
  const dispatched: number[] = [];

  const prune = (now: number): void => {
    const cutoff = now - windowSeconds;
    while (dispatched.length > 0 && dispatched[0]! <= cutoff) dispatched.shift();
  };

  return {
    take(now) {
      prune(now);
      if (dispatched.length >= maxPages) return false;
      dispatched.push(now);
      return true;
    },
    remaining(now) {
      prune(now);
      return Math.max(0, maxPages - dispatched.length);
    }
  };
}
