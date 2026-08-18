import { describe, it, expect, vi, afterEach } from "vitest";
import type { SimplePool } from "nostr-tools/pool";
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools/pure";
import type { Event } from "nostr-tools/core";
import { WatchtowerDaemon } from "../src/daemon/watchtower.js";
import type { DaemonConfig } from "../src/daemon/config.js";
import { encryptPayload, decryptPayload } from "../src/shared/crypto.js";
import { KIND_SIGNAL, KIND_DISTRESS, KIND_RESPONSE, KIND_WATCH_STATE } from "../src/shared/kinds.js";
import type { ResponsePayload, WatchStatePayload } from "../src/shared/payloads.js";
import * as authorization from "../src/daemon/authorization.js";
import * as query from "../src/daemon/query.js";

/**
 * The one file with zero direct test coverage before this pass, despite
 * being where every other piece (board, validation, authorization,
 * crypto, the query timeout) actually gets wired together and dispatched.
 * A real, injectable fake SimplePool (see WatchtowerDaemonOptions.pool)
 * makes this possible without a network connection.
 */
function fakeConfig(overrides: Partial<DaemonConfig["watch"]> = {}, allowedPubkeys: string[] = []): DaemonConfig {
  return {
    identity: { privkeyPath: "/dev/null" },
    relays: { urls: ["wss://fake.relay"] },
    watch: {
      routineIntervalDefault: 3600,
      overdueGrace: 1800,
      hardExpiry: 14400,
      heartbeatIntervalSeconds: 3600, // long, so it never fires mid-test
      sweepIntervalSeconds: 3600,
      queryTimeoutSeconds: 8,
      ...overrides,
    },
    authorization: { allowedPubkeys },
  };
}

function fakePool() {
  const publishedEvents: Event[] = [];
  let onEvent: ((event: Event) => void) | undefined;
  const pool = {
    publish: (relays: string[], event: Event) => {
      publishedEvents.push(event);
      return relays.map(() => Promise.resolve("ok"));
    },
    subscribeMany: (_relays: string[], _filter: unknown, params: { onevent: (e: Event) => void }) => {
      onEvent = params.onevent;
      return { close: () => {} };
    },
    destroy: () => {},
  } as unknown as SimplePool;
  return {
    pool,
    publishedEvents,
    deliver: (event: Event) => onEvent?.(event),
  };
}

function buildDaemon(configOverrides: Partial<DaemonConfig["watch"]> = {}, allowedPubkeys: string[] = []) {
  const secretKey = generateSecretKey();
  const pubkey = getPublicKey(secretKey);
  const { pool, publishedEvents, deliver } = fakePool();
  const daemon = new WatchtowerDaemon({ config: fakeConfig(configOverrides, allowedPubkeys), secretKey, pubkey, pool });
  return { daemon, pubkey, secretKey, publishedEvents, deliver };
}

function signalEvent(
  operatorSecretKey: Uint8Array,
  watchtowerPubkey: string,
  type: string,
  payload: unknown,
): Event {
  const content = encryptPayload(operatorSecretKey, watchtowerPubkey, payload);
  return finalizeEvent(
    { kind: KIND_SIGNAL, tags: [["p", watchtowerPubkey], ["t", type]], content, created_at: Math.floor(Date.now() / 1000) },
    operatorSecretKey,
  );
}

function distressEvent(operatorSecretKey: Uint8Array, watchtowerPubkey: string, text: string | null): Event {
  const content = encryptPayload(operatorSecretKey, watchtowerPubkey, { text });
  return finalizeEvent(
    { kind: KIND_DISTRESS, tags: [["p", watchtowerPubkey]], content, created_at: Math.floor(Date.now() / 1000) },
    operatorSecretKey,
  );
}

async function waitForResponse(publishedEvents: Event[], fromIndex = 0): Promise<Event> {
  await vi.waitFor(() => {
    const found = publishedEvents.slice(fromIndex).find((e) => e.kind === KIND_RESPONSE);
    if (!found) throw new Error("no response published yet");
  });
  return publishedEvents.slice(fromIndex).find((e) => e.kind === KIND_RESPONSE)!;
}

let activeDaemons: WatchtowerDaemon[] = [];
async function started(configOverrides: Partial<DaemonConfig["watch"]> = {}, allowedPubkeys: string[] = []) {
  const ctx = buildDaemon(configOverrides, allowedPubkeys);
  await ctx.daemon.start();
  activeDaemons.push(ctx.daemon);
  return ctx;
}

afterEach(async () => {
  await Promise.all(activeDaemons.map((d) => d.stop()));
  activeDaemons = [];
  vi.restoreAllMocks();
});

describe("WatchtowerDaemon.start()", () => {
  it("publishes an unencrypted watch-state event with state: automated", async () => {
    const { publishedEvents } = await started();
    const watchState = publishedEvents.find((e) => e.kind === KIND_WATCH_STATE);
    expect(watchState).toBeDefined();
    const payload = JSON.parse(watchState!.content) as WatchStatePayload;
    expect(payload.state).toBe("automated");
    expect(payload.holder_kind).toBe("agent");
    // oncall is a list of authored declarations now, so a count can never exceed
    // its evidence. Empty is the honest value: nobody has declared themselves on-call.
    expect(payload.oncall).toEqual([]);
    expect(payload.overdue_count).toBe(0);
  });
});

describe("overdue notification (found in review)", () => {
  // External review caught that "notify whoever holds watch" on the
  // overdue transition is a real, already-specified requirement, not a
  // deferred escalation feature -- and that reusing a third-party
  // channel (e.g. Discord) for it would leak operator activity
  // (callsign + timing) to that third party. The fix: republish the
  // aggregate overdue_count on the existing kind 10910 channel, which
  // is already public/aggregate-only by construction. These tests pin
  // both halves: the count is accurate, and no operator identity ever
  // appears in that payload.
  it("republishes watch-state immediately when an entry crosses into overdue, with an accurate count", async () => {
    vi.useFakeTimers();
    try {
      const { daemon, publishedEvents } = await started({ overdueGrace: 1, sweepIntervalSeconds: 1 });
      const operatorPubkey = getPublicKey(generateSecretKey());
      daemon.board.onStation({
        operator: operatorPubkey, callsign: "OP-1", area: "d",
        expectedDurationSeconds: 1, routineIntervalSeconds: null, position: null, now: Math.floor(Date.now() / 1000),
      });

      const watchStatesBefore = publishedEvents.filter((e) => e.kind === KIND_WATCH_STATE).length;
      await vi.advanceTimersByTimeAsync(5000); // past expected_duration(1s) + overdueGrace(1s) + a sweep tick

      const watchStates = publishedEvents.filter((e) => e.kind === KIND_WATCH_STATE);
      expect(watchStates.length).toBeGreaterThan(watchStatesBefore); // an out-of-band publish happened
      const latest = JSON.parse(watchStates[watchStates.length - 1]!.content) as WatchStatePayload;
      expect(latest.overdue_count).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("never includes callsign, pubkey, or any operator-identifying field in the watch-state payload", async () => {
    vi.useFakeTimers();
    try {
      const { daemon, publishedEvents } = await started({ overdueGrace: 1, sweepIntervalSeconds: 1 });
      const operatorPubkey = getPublicKey(generateSecretKey());
      daemon.board.onStation({
        operator: operatorPubkey, callsign: "a-very-identifying-callsign", area: "very-specific-district",
        expectedDurationSeconds: 1, routineIntervalSeconds: null, position: null, now: Math.floor(Date.now() / 1000),
      });

      await vi.advanceTimersByTimeAsync(5000);

      const watchStates = publishedEvents.filter((e) => e.kind === KIND_WATCH_STATE);
      for (const e of watchStates) {
        expect(e.content).not.toContain("a-very-identifying-callsign");
        expect(e.content).not.toContain("very-specific-district");
        expect(e.content).not.toContain(operatorPubkey);
      }
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("on-station dispatch", () => {
  it("adds the operator to the board and acks", async () => {
    const { daemon, pubkey, deliver, publishedEvents } = await started();
    const operator = generateSecretKey();
    const operatorPubkey = getPublicKey(operator);

    deliver(signalEvent(operator, pubkey, "on-station", {
      area: "district-7", expected_duration: 7200, routine_interval: null, share_position: false, position: null,
    }));

    const responseEvent = await waitForResponse(publishedEvents);
    const payload = decryptPayload<ResponsePayload>(operator, pubkey, responseEvent.content);
    expect(payload.type).toBe("ack");
    expect(daemon.board.get(operatorPubkey)?.status).toBe("active");
    expect(daemon.board.get(operatorPubkey)?.area).toBe("district-7");
  });

  it("responds with a clear error-ack instead of crashing on a malformed payload", async () => {
    // The exact bug the 15-pass review found and fixed: a malformed
    // expected_duration used to reach an uncaught RangeError deep
    // inside Board.onStation(), and the operator got nothing back at
    // all. This is the daemon-level regression test for that fix,
    // distinct from validate.test.ts's unit-level coverage of the
    // validator itself.
    const { daemon, pubkey, deliver, publishedEvents } = await started();
    const operator = generateSecretKey();

    deliver(signalEvent(operator, pubkey, "on-station", {
      area: "district-7", expected_duration: "not-a-number", routine_interval: null, share_position: false, position: null,
    }));

    const responseEvent = await waitForResponse(publishedEvents);
    const payload = decryptPayload<ResponsePayload>(operator, pubkey, responseEvent.content);
    expect(payload.type).toBe("ack");
    expect(payload.text).toMatch(/expected_duration/);
    expect(daemon.board.size).toBe(0); // never made it onto the board
  });
});

describe("query dispatch", () => {
  it("returns an answer with responder_kind and null provenance (renders unverified)", async () => {
    const { pubkey, deliver, publishedEvents } = await started();
    const operator = generateSecretKey();

    deliver(signalEvent(operator, pubkey, "query", { text: "bed tonight, has a dog" }));

    const responseEvent = await waitForResponse(publishedEvents);
    const payload = decryptPayload<ResponsePayload>(operator, pubkey, responseEvent.content);
    expect(payload.type).toBe("answer");
    expect(payload.responder.kind).toBe("agent");
    expect(payload.provenance).toBeNull();
  });

  it("times out and returns a clear error-ack instead of hanging when answerQuery() is slow", async () => {
    vi.spyOn(query, "answerQuery").mockImplementation(
      () => new Promise(() => {}), // never resolves
    );
    const { pubkey, deliver, publishedEvents } = await started({ queryTimeoutSeconds: 0.05 });
    const operator = generateSecretKey();

    deliver(signalEvent(operator, pubkey, "query", { text: "anyone there?" }));

    const responseEvent = await waitForResponse(publishedEvents);
    const payload = decryptPayload<ResponsePayload>(operator, pubkey, responseEvent.content);
    expect(payload.type).toBe("ack");
    expect(payload.text).toMatch(/timed out/);
  });
});

describe("assist dispatch", () => {
  it("puts urgency in front of whoever holds watch, and never guesses it", async () => {
    // "I need someone" and "I need someone now" ask for different responses. An ack that
    // swallowed the difference would make them identical on the board, and defaulting an
    // absent urgency to the lower of the two is the confident wrong answer applied to the
    // one field that says how long someone has.
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const { pubkey, deliver, publishedEvents } = await started();
      const operator = generateSecretKey();

      deliver(signalEvent(operator, pubkey, "assist", { urgency: "now", text: "corner of 4th" }));
      await waitForResponse(publishedEvents);
      expect(log.mock.calls.flat().join("\n")).toMatch(/\[assist\].*urgency=NOW/);

      log.mockClear();
      deliver(signalEvent(operator, pubkey, "assist", {}));
      await waitForResponse(publishedEvents);
      const unstated = log.mock.calls.flat().join("\n");
      expect(unstated).toMatch(/urgency=UNSTATED/);
      expect(unstated).not.toMatch(/urgency=soon/);
    } finally {
      log.mockRestore();
    }
  });
});

describe("distress dispatch", () => {
  it("creates a board entry for an operator who never sent on-station and acks", async () => {
    const { daemon, pubkey, deliver, publishedEvents } = await started();
    const operator = generateSecretKey();
    const operatorPubkey = getPublicKey(operator);

    deliver(distressEvent(operator, pubkey, "help"));

    const responseEvent = await waitForResponse(publishedEvents);
    const payload = decryptPayload<ResponsePayload>(operator, pubkey, responseEvent.content);
    expect(payload.type).toBe("ack");
    expect(daemon.board.get(operatorPubkey)?.status).toBe("distress");
  });
});

describe("stood-down dispatch", () => {
  it("removes the operator from the board", async () => {
    const { daemon, pubkey, deliver, publishedEvents } = await started();
    const operator = generateSecretKey();
    const operatorPubkey = getPublicKey(operator);

    deliver(signalEvent(operator, pubkey, "on-station", {
      area: "d", expected_duration: 100, routine_interval: null, share_position: false, position: null,
    }));
    await waitForResponse(publishedEvents);
    expect(daemon.board.size).toBe(1);

    deliver(signalEvent(operator, pubkey, "stood-down", {}));
    await waitForResponse(publishedEvents, 1);
    expect(daemon.board.get(operatorPubkey)).toBeUndefined();
  });
});

describe("authorization gate (found in review)", () => {
  it("silently drops a signal from an unauthorized operator -- no response, no board mutation", async () => {
    vi.spyOn(authorization, "isAuthorizedOperator").mockReturnValue(false);
    const { daemon, pubkey, deliver, publishedEvents } = await started();
    const operator = generateSecretKey();

    deliver(signalEvent(operator, pubkey, "on-station", {
      area: "d", expected_duration: 100, routine_interval: null, share_position: false, position: null,
    }));

    // Give any (incorrect) async handling a chance to run before asserting nothing happened.
    await new Promise((r) => setTimeout(r, 20));
    expect(publishedEvents.filter((e) => e.kind === KIND_RESPONSE)).toHaveLength(0);
    expect(daemon.board.size).toBe(0);
  });

  it("processes signals normally when authorized (Session One's default)", async () => {
    const { daemon, pubkey, deliver, publishedEvents } = await started();
    const operator = generateSecretKey();

    deliver(signalEvent(operator, pubkey, "on-station", {
      area: "d", expected_duration: 100, routine_interval: null, share_position: false, position: null,
    }));

    await waitForResponse(publishedEvents);
    expect(daemon.board.size).toBe(1);
  });

  // ADDED (Stage 2, allowlist): end-to-end confirmation against the REAL
  // isAuthorizedOperator() with a real, non-empty allowedPubkeys list --
  // the two tests above only exercise the mocked/default-empty paths.
  it("processes a signal from an operator ON a real configured allowlist", async () => {
    const operator = generateSecretKey();
    const operatorPubkey = getPublicKey(operator);
    const { daemon, pubkey, deliver, publishedEvents } = await started({}, [operatorPubkey]);

    deliver(signalEvent(operator, pubkey, "on-station", {
      area: "d", expected_duration: 100, routine_interval: null, share_position: false, position: null,
    }));

    await waitForResponse(publishedEvents);
    expect(daemon.board.size).toBe(1);
  });

  it("silently drops a signal from an operator NOT on a real configured allowlist", async () => {
    const someoneElsesPubkey = getPublicKey(generateSecretKey());
    const { daemon, pubkey, deliver, publishedEvents } = await started({}, [someoneElsesPubkey]);
    const operator = generateSecretKey(); // not on the allowlist

    deliver(signalEvent(operator, pubkey, "on-station", {
      area: "d", expected_duration: 100, routine_interval: null, share_position: false, position: null,
    }));

    await new Promise((r) => setTimeout(r, 20));
    expect(publishedEvents.filter((e) => e.kind === KIND_RESPONSE)).toHaveLength(0);
    expect(daemon.board.size).toBe(0);
  });
});

describe("bad signature", () => {
  it("is dropped without a response", async () => {
    // Found while writing this test: nostr-tools' finalizeEvent() marks
    // its own output as pre-verified via a hidden Symbol
    // (verifiedSymbol), and verifyEvent() trusts that cached flag
    // without re-checking. Object-spreading a finalizeEvent() result
    // (`{ ...event, sig: "bad" }`) silently COPIES that cached "true"
    // along with it, so verifyEvent on the "tampered" copy would return
    // the stale cached result instead of actually re-verifying -- not a
    // real daemon vulnerability (a relay-delivered event is always a
    // fresh JSON.parse() result, which can never carry a JS Symbol in
    // the first place), but a real trap for constructing this exact
    // test. JSON.parse(JSON.stringify(...)) strips the symbol, matching
    // what a genuine relay delivery actually looks like.
    const { daemon, pubkey, deliver, publishedEvents } = await started();
    const operator = generateSecretKey();
    const signed = signalEvent(operator, pubkey, "on-station", {
      area: "d", expected_duration: 100, routine_interval: null, share_position: false, position: null,
    });
    const tampered: Event = JSON.parse(JSON.stringify(signed));
    tampered.sig = "0".repeat(128);

    deliver(tampered);

    await new Promise((r) => setTimeout(r, 20));
    expect(publishedEvents.filter((e) => e.kind === KIND_RESPONSE)).toHaveLength(0);
    expect(daemon.board.size).toBe(0);
  });

  it("tampered content with a now-stale id/sig is also caught (id no longer matches content)", async () => {
    const { daemon, pubkey, deliver, publishedEvents } = await started();
    const operator = generateSecretKey();
    const signed = signalEvent(operator, pubkey, "on-station", {
      area: "d", expected_duration: 100, routine_interval: null, share_position: false, position: null,
    });
    const tampered: Event = JSON.parse(JSON.stringify(signed));
    tampered.content = tampered.content + "tampered";

    deliver(tampered);

    await new Promise((r) => setTimeout(r, 20));
    expect(publishedEvents.filter((e) => e.kind === KIND_RESPONSE)).toHaveLength(0);
    expect(daemon.board.size).toBe(0);
  });
});

describe("validly-signed but undecryptable content", () => {
  it("is dropped without a response (distinct from a bad signature -- passes verifyEvent, fails at decrypt)", async () => {
    // A genuinely different failure mode from the "bad signature" tests
    // above: a real, validly-signed event (this one legitimately passes
    // verifyEvent) whose content simply isn't valid NIP-44 ciphertext --
    // a buggy client, not tampering in transit.
    const { daemon, pubkey, deliver, publishedEvents } = await started();
    const operator = generateSecretKey();
    const event = finalizeEvent(
      { kind: KIND_SIGNAL, tags: [["p", pubkey], ["t", "on-station"]], content: "not valid nip44 ciphertext", created_at: Math.floor(Date.now() / 1000) },
      operator,
    );

    deliver(event);

    await new Promise((r) => setTimeout(r, 20));
    expect(publishedEvents.filter((e) => e.kind === KIND_RESPONSE)).toHaveLength(0);
    expect(daemon.board.size).toBe(0);
  });
});
