import { describe, it, expect } from "vitest";
import type { SimplePool } from "nostr-tools/pool";
import { checkDark } from "../src/client/dark.js";

const RELAYS = ["wss://relay.example"];
const PUBKEY = "a".repeat(64);

function fakePool(get: SimplePool["get"]): SimplePool {
  return { get } as unknown as SimplePool;
}

describe("checkDark", () => {
  it("reports dark:absent when no event is found", async () => {
    const pool = fakePool(async () => null);
    const result = await checkDark(pool, RELAYS, PUBKEY, 150);
    expect(result).toEqual({ dark: true, reason: "absent" });
  });

  it("reports dark:stale when the event is older than the threshold", async () => {
    const oldCreatedAt = Math.floor(Date.now() / 1000) - 500;
    const pool = fakePool(async () => ({
      kind: 10910, tags: [], content: "{}", created_at: oldCreatedAt,
      pubkey: PUBKEY, id: "x", sig: "y",
    }) as unknown as ReturnType<SimplePool["get"]> extends Promise<infer T> ? T : never);

    const result = await checkDark(pool, RELAYS, PUBKEY, 150);
    expect(result.dark).toBe(true);
    expect(result.reason).toBe("stale");
  });

  it("reports dark:false with the parsed state when the event is fresh and well-formed", async () => {
    const now = Math.floor(Date.now() / 1000);
    const state = { state: "automated", holder: null, holder_kind: "agent", oncall_count: 2, since: now, agent_health: "ok", last_drill: null };
    const pool = fakePool(async () => ({
      kind: 10910, tags: [], content: JSON.stringify(state), created_at: now,
      pubkey: PUBKEY, id: "x", sig: "y",
    }) as unknown as ReturnType<SimplePool["get"]> extends Promise<infer T> ? T : never);

    const result = await checkDark(pool, RELAYS, PUBKEY, 150);
    expect(result.dark).toBe(false);
    expect(result.state).toEqual(state);
  });

  it("reports dark:corrupt instead of throwing when the event content isn't valid JSON (found in review)", async () => {
    // Near-impossible for a genuinely-signed event in practice (the pool
    // verifies signatures before an event ever reaches here, and content
    // is covered by that signature), but this used to be a bare
    // JSON.parse with no guard at all -- an uncaught SyntaxError straight
    // out of the CLI on any corruption in transit, however unlikely.
    const now = Math.floor(Date.now() / 1000);
    const pool = fakePool(async () => ({
      kind: 10910, tags: [], content: "{not valid json", created_at: now,
      pubkey: PUBKEY, id: "x", sig: "y",
    }) as unknown as ReturnType<SimplePool["get"]> extends Promise<infer T> ? T : never);

    const result = await checkDark(pool, RELAYS, PUBKEY, 150);
    expect(result.dark).toBe(true);
    expect(result.reason).toBe("corrupt");
  });
});
