import { describe, it, expect } from "vitest";
import { isAuthorizedOperator } from "../src/daemon/authorization.js";

describe("isAuthorizedOperator", () => {
  // Session One's MVP policy, preserved as the default: with no
  // allowed_pubkeys configured, any pubkey is authorized. This test
  // exists so a future change to this default has to deliberately
  // update a test that currently pins it, not silently drift.
  it("allows any pubkey when allowedPubkeys is empty (MVP default)", () => {
    expect(isAuthorizedOperator("a".repeat(64), [])).toBe(true);
    expect(isAuthorizedOperator("b".repeat(64), [])).toBe(true);
    expect(isAuthorizedOperator("", [])).toBe(true);
  });

  it("allows a pubkey present in a real allowlist", () => {
    const allowed = ["a".repeat(64), "b".repeat(64)];
    expect(isAuthorizedOperator("a".repeat(64), allowed)).toBe(true);
    expect(isAuthorizedOperator("b".repeat(64), allowed)).toBe(true);
  });

  it("rejects a pubkey not present in a real allowlist", () => {
    const allowed = ["a".repeat(64)];
    expect(isAuthorizedOperator("c".repeat(64), allowed)).toBe(false);
    expect(isAuthorizedOperator("", allowed)).toBe(false);
  });

  it("is case-sensitive -- an uppercase-hex pubkey does not match a lowercase allowlist entry", () => {
    // Nostr pubkeys are conventionally lowercase hex; config.ts's own
    // parsing already rejects non-lowercase entries at load time, so
    // this pins that a mismatched case is correctly NOT silently
    // normalized/matched here as a second line of defense.
    const allowed = ["a".repeat(64)];
    expect(isAuthorizedOperator("A".repeat(64), allowed)).toBe(false);
  });
});
