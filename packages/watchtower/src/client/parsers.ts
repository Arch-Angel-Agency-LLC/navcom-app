import { InvalidArgumentError } from "commander";

// NOT bare `parseInt` -- commander calls custom parsers as
// parseArg(value, previousValue), and when an option has a numeric
// default, previousValue is that default. parseInt's second parameter
// is a RADIX, not "previous value" -- `parseInt("3", 150)` silently
// returns NaN (150 isn't a valid radix). Caught live: --stale-after with
// a default of 150 always produced NaN, so the staleness comparison
// (age > NaN) was always false and dark-detection never fired.
//
// Found in review (separate bug, same function): a non-numeric value
// like `--duration abc` also produced NaN, which this used to return
// silently. commander doesn't reject NaN on its own, so it reached
// JSON.stringify(payload) downstream -- which serializes NaN as `null`
// (NaN isn't valid JSON), so the daemon received `"expected_duration":
// null` instead of a clear type error. That in turn crashed the
// daemon's on-station handler (see shared/validate.ts), leaving the
// operator with nothing but a silent 10s timeout and no indication
// anywhere of what actually went wrong. Throwing InvalidArgumentError
// here gives an immediate, local, readable error instead.
export function int(value: string): number {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new InvalidArgumentError(`"${value}" is not a valid integer.`);
  }
  return parsed;
}
