import { describe, it, expect } from "vitest";
import { InvalidArgumentError } from "commander";
import { int } from "../src/client/parsers.js";

describe("int() commander option parser", () => {
  it("parses a plain numeric string", () => {
    expect(int("3")).toBe(3);
    expect(int("7200")).toBe(7200);
  });

  it("is unaffected by a second argument (commander's previousValue)", () => {
    // Real bug caught live: commander calls parseArg(value, previousValue),
    // and when an option has a numeric default, previousValue IS that
    // default. Bare `parseInt` treats its second argument as a RADIX, not
    // "previous value" -- `parseInt("3", 150)` is NaN (150 isn't a valid
    // radix), which silently broke --stale-after's default-value case
    // (age > NaN is always false, so dark-detection never fired). This
    // pins that commander-style invocation no longer breaks parsing.
    // @ts-expect-error -- exercising the exact extra-arg shape commander uses
    expect(int("3", 150)).toBe(3);
    // @ts-expect-error -- same extra-arg shape as above
    expect(int("150", 3)).toBe(150);
  });

  it("rejects non-numeric input with a clean commander error instead of silently returning NaN", () => {
    // Found in review, separate bug: a non-numeric value like
    // "--duration abc" used to silently become NaN, which
    // JSON.stringify serializes as `null` (NaN isn't valid JSON) --
    // the daemon received "expected_duration": null and crashed its
    // on-station handler with no indication anywhere of what actually
    // went wrong on either side.
    expect(() => int("abc")).toThrow(InvalidArgumentError);
    expect(() => int("")).toThrow(InvalidArgumentError);
    expect(() => int("   ")).toThrow(InvalidArgumentError);
  });

  it("still accepts a leading-numeric string the same way parseInt always has", () => {
    // Documenting existing (unchanged) behavior, not a new guarantee:
    // parseInt("12.5", 10) is 12, not NaN, so this isn't rejected.
    expect(int("12.5")).toBe(12);
  });
});
