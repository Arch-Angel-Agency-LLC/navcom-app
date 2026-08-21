import { describe, expect, it } from "vitest";
import { byRecord, latestPerAuthor } from "../src/promote/index.js";
import type { Correction } from "@navcom/core";

/**
 * Preparing corrections for a person to read.
 *
 * 6.8 is deliberately human -- a public artifact anybody can rewrite is not one anybody can
 * rely on. But a bottleneck that takes an evening does not happen, so the job here is to
 * make the reading short and honest, not to make the decision.
 */

const c = (over: Partial<Correction & { by: string }> = {}): Correction & { by: string } => ({
  by: "a".repeat(64),
  record: "st-louis-example",
  verified_by: "Wren",
  method: "in_person",
  last_verified: "2026-08-19",
  fields: { pets: "no" },
  ...over,
});

describe("what a reviewer is shown", () => {
  it("keeps only an operator's latest word about a place", () => {
    // Somebody who corrects the same shelter twice has changed their mind, not said two
    // things. Showing both would make a reviewer adjudicate between one person and himself.
    const kept = latestPerAuthor([
      c({ last_verified: "2026-08-01", fields: { pets: "yes" } }),
      c({ last_verified: "2026-08-19", fields: { pets: "no" } }),
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0]?.fields.pets).toBe("no");
  });

  it("keeps both when two different operators say something", () => {
    // Two people is evidence. One person twice is a correction.
    const kept = latestPerAuthor([c(), c({ by: "b".repeat(64), verified_by: "Raven" })]);
    expect(kept).toHaveLength(2);
  });

  it("keeps an operator's word about each place separately", () => {
    const kept = latestPerAuthor([c(), c({ record: "st-louis-other" })]);
    expect(kept).toHaveLength(2);
  });

  it("groups by place, so a reviewer reads a shelter rather than a stream", () => {
    const groups = byRecord([c(), c({ by: "b".repeat(64) }), c({ record: "st-louis-other" })]);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.record).toBe("st-louis-example");
    expect(groups[0]?.corrections).toHaveLength(2);
  });

  it("puts the most-reported place first", () => {
    // A shelter three people corrected is likelier to have actually changed than one
    // somebody mentioned once. That is a reading order, not a verdict.
    const groups = byRecord([
      c({ record: "quiet-one" }),
      c({ record: "busy-one" }),
      c({ record: "busy-one", by: "b".repeat(64) }),
    ]);
    expect(groups[0]?.record).toBe("busy-one");
  });

  it("has no way to apply anything", () => {
    // A tool that wrote to the CSV would have quietly removed the person this step exists
    // for, and the reviewer would find out by reading hours they never approved.
    const api = { byRecord, latestPerAuthor } as Record<string, unknown>;
    for (const forbidden of ["apply", "write", "commit", "merge", "accept"]) {
      expect(Object.keys(api).some((k) => k.toLowerCase().includes(forbidden)), forbidden).toBe(false);
    }
  });
});
