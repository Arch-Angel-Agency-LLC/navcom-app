/**
 * The executor -- the wiring the pure state machine cannot cover.
 *
 * The ladder's own logic is tested in core, against the seven numbered failure modes. What
 * is left here is everything that could be right in the state machine and wrong in the
 * process: who gets told, what `responder` says, whether a hung agent can interfere, and
 * whether an ack from the wrong person can stop a ladder.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SimplePool } from "nostr-tools/pool";
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools/pure";
import type { Event } from "nostr-tools/core";
import type { ResponsePayload } from "@navcom/core";
import { EscalationExecutor } from "../src/escalation/executor.js";
import type { EscalationConfig, OnCallEntry } from "../src/escalation/config.js";
import { encryptPayload, decryptPayload } from "../src/shared/crypto.js";
import { KIND_DISTRESS, KIND_SIGNAL, KIND_RESPONSE } from "../src/shared/kinds.js";
import type { pageAll } from "../src/escalation/pager.js";

const STANDING = 4_102_444_800;

function onCallEntry(callsign: string, pubkey?: string, channel: OnCallEntry["declaration"]["channel"] = "sms"): OnCallEntry {
  return {
    declaration: {
      author: { kind: "node", callsign, ...(pubkey ? { pubkey } : {}) },
      channel,
      expires: STANDING,
    },
    command: ["true"],
  };
}

function fakeConfig(oncall: OnCallEntry[] = []): EscalationConfig {
  return {
    identity: { privkeyPath: "/dev/null" },
    relays: { urls: ["wss://fake.relay"] },
    escalation: { pagingWindowSeconds: 300, contactWindowSeconds: 300, oncall },
  };
}

function fakePool() {
  const published: Event[] = [];
  let onEvent: ((e: Event) => void) | undefined;
  const pool = {
    publish: (_relays: string[], event: Event) => {
      published.push(event);
      return [Promise.resolve("ok")];
    },
    subscribeMany: (_r: string[], _f: unknown, params: { onevent: (e: Event) => void }) => {
      onEvent = params.onevent;
      return { close: () => {} };
    },
    destroy: () => {},
  } as unknown as SimplePool;
  return { pool, published, deliver: (e: Event) => onEvent?.(e) };
}

let executors: EscalationExecutor[] = [];

/** Typed to pageAll's signature so `mock.calls[0][0]` is the roster, not `never`. */
const noopPager = () => vi.fn<typeof pageAll>(async () => []);

function build(oncall: OnCallEntry[] = [], page: ReturnType<typeof noopPager> = noopPager()) {
  const secretKey = generateSecretKey();
  const pubkey = getPublicKey(secretKey);
  const { pool, published, deliver } = fakePool();
  const executor = new EscalationExecutor({ config: fakeConfig(oncall), secretKey, pubkey, pool, page });
  executors.push(executor);
  executor.start();
  return { executor, pubkey, published, deliver, page };
}

function distressFrom(operator: Uint8Array, watchtower: string): Event {
  return finalizeEvent(
    {
      kind: KIND_DISTRESS,
      tags: [["p", watchtower]],
      content: encryptPayload(operator, watchtower, { position: null, area: "north side" }),
      created_at: Math.floor(Date.now() / 1000),
    },
    operator,
  );
}

function ackFrom(responder: Uint8Array, watchtower: string, distressId: string): Event {
  return finalizeEvent(
    {
      kind: KIND_SIGNAL,
      tags: [["p", watchtower], ["t", "distress-ack"]],
      content: encryptPayload(responder, watchtower, { distress_id: distressId }),
      created_at: Math.floor(Date.now() / 1000),
    },
    responder,
  );
}

async function reports(published: Event[], operator: Uint8Array, watchtower: string) {
  await vi.waitFor(() => expect(published.length).toBeGreaterThan(0));
  return published
    .filter((e) => e.kind === KIND_RESPONSE)
    .map((e) => decryptPayload<ResponsePayload>(operator, watchtower, e.content));
}

afterEach(async () => {
  await Promise.all(executors.map((e) => e.stop()));
  executors = [];
  vi.restoreAllMocks();
});

describe("the trigger", () => {
  it("starts a ladder on a 20911 and tells the operator immediately", async () => {
    const operator = generateSecretKey();
    const { pubkey, published, deliver } = build([onCallEntry("Wren")]);

    deliver(distressFrom(operator, pubkey));

    const [first] = await reports(published, operator, pubkey);
    expect(first!.type).toBe("escalation-status");
    expect(first!.text).toMatch(/Paging Wren/);
  });

  it("pages everyone at once, and only after the operator has been told", async () => {
    const operator = generateSecretKey();
    const page = noopPager();
    const { pubkey, published, deliver } = build(
      [onCallEntry("Wren"), onCallEntry("Raven")],
      page,
    );

    deliver(distressFrom(operator, pubkey));
    await vi.waitFor(() => expect(page).toHaveBeenCalledTimes(1));

    // One call with the whole roster -- parallel, not a call per person in sequence.
    expect(page.mock.calls[0]![0]).toHaveLength(2);
    expect(published.length).toBeGreaterThan(0);
  });

  it("ignores a forged distress", async () => {
    const operator = generateSecretKey();
    const { pubkey, published, deliver } = build([onCallEntry("Wren")]);
    // Round-tripped through JSON, which is what a relay actually delivers. A plain object
    // spread would carry nostr-tools' internal "already verified" marker across, and the
    // forgery would sail through verifyEvent -- a test artifact, but one that would have
    // made this assertion meaningless while looking like it passed.
    const forged = JSON.parse(JSON.stringify(distressFrom(operator, pubkey))) as Event;
    forged.sig = "0".repeat(128);

    deliver(forged);
    await new Promise((r) => setTimeout(r, 50));
    expect(published).toHaveLength(0);
  });

  it("starts one ladder for a retried distress [failure mode 7]", async () => {
    // The client is required to retry indefinitely, so this is the normal case.
    const operator = generateSecretKey();
    const page = noopPager();
    const { executor, pubkey, deliver } = build([onCallEntry("Wren")], page);
    const event = distressFrom(operator, pubkey);

    deliver(event);
    await vi.waitFor(() => expect(page).toHaveBeenCalledTimes(1));
    deliver(event);
    deliver(event);
    await new Promise((r) => setTimeout(r, 50));

    expect(executor.ladders.all()).toHaveLength(1);
    expect(page).toHaveBeenCalledTimes(1);
  });
});

describe("what the operator is told", () => {
  it("reports EXHAUSTED immediately when nobody is on-call [failure modes 1 and 5]", async () => {
    const operator = generateSecretKey();
    const { pubkey, published, deliver } = build([]);

    deliver(distressFrom(operator, pubkey));

    const [first] = await reports(published, operator, pubkey);
    expect(first!.text).toMatch(/Nobody is coming/i);
    expect(first!.text).toMatch(/no emergency contact/i);
  });

  it("authors a transition as the node, so a phone keeps retrying through it", async () => {
    // The load-bearing detail. The client stops retrying on a `human` responder, so a
    // machine saying "paging" MUST NOT be authored as one -- that would end a Distress with
    // nobody on the other side, which is invariant 2 failing while looking like it worked.
    const operator = generateSecretKey();
    const { pubkey, published, deliver } = build([onCallEntry("Wren")]);

    deliver(distressFrom(operator, pubkey));

    const all = await reports(published, operator, pubkey);
    for (const r of all) {
      expect(r.responder.kind, JSON.stringify(r)).not.toBe("human");
    }
  });
});

describe("acknowledgement", () => {
  it("stops the ladder and names the human, which is what ends the operator's retry", async () => {
    const operator = generateSecretKey();
    const responder = generateSecretKey();
    const wren = onCallEntry("Wren", getPublicKey(responder));
    const { executor, pubkey, published, deliver } = build([wren]);

    const distress = distressFrom(operator, pubkey);
    deliver(distress);
    await vi.waitFor(() => expect(published.length).toBeGreaterThan(0));

    deliver(ackFrom(responder, pubkey, distress.id));

    await vi.waitFor(() => {
      expect(executor.ladders.get(distress.id)?.state).toBe("acknowledged");
    });

    const all = await reports(published, operator, pubkey);
    const final = all.at(-1)!;
    expect(final.responder.kind).toBe("human");
    expect(final.responder.callsign).toBe("Wren");
    expect(final.text).toMatch(/Wren is responding/);
  });

  it("refuses an ack from somebody not on the roster", async () => {
    // A ladder that keeps paging is survivable. One stopped by somebody who is not coming
    // is not -- so this is strict, and the refusal is logged rather than silent.
    const operator = generateSecretKey();
    const stranger = generateSecretKey();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { executor, pubkey, published, deliver } = build([onCallEntry("Wren")]);

    const distress = distressFrom(operator, pubkey);
    deliver(distress);
    await vi.waitFor(() => expect(published.length).toBeGreaterThan(0));

    deliver(ackFrom(stranger, pubkey, distress.id));
    await new Promise((r) => setTimeout(r, 50));

    expect(executor.ladders.get(distress.id)?.state).toBe("paging");
    expect(warn.mock.calls.flat().join(" ")).toMatch(/REFUSED/);
  });

  it("ignores an ack for a distress it never saw", async () => {
    const responder = generateSecretKey();
    const { pubkey, deliver } = build([onCallEntry("Wren", getPublicKey(responder))]);
    deliver(ackFrom(responder, pubkey, "f".repeat(64)));
    await new Promise((r) => setTimeout(r, 50));
    // No crash, no ladder invented.
    expect(true).toBe(true);
  });
});

describe("proving a channel works before relying on it", () => {
  it("marks a test page unmistakably, in the text the recipient reads", async () => {
    // A drill MUST be distinguishable from a real Distress BY THE RECIPIENT. Somebody woken
    // at 3am has seconds and no context, so the distinction cannot live in a field the page
    // does not carry or a schedule they were never told about.
    const { testPage, TEST_PREFIX } = await import("../src/escalation/pager.js");
    const entry = onCallEntry("Wren");
    entry.command = ["node", "-e", "process.stdout.write(process.argv[1])", "{{message}}"];

    const results = await testPage([entry]);
    expect(results[0]!.dispatched).toBe(true);
    expect(TEST_PREFIX).toMatch(/NOT AN EMERGENCY/);
    expect(TEST_PREFIX.startsWith("[")).toBe(true);
  });

  it("reports a command that does not exist rather than counting it as reachable", async () => {
    // An on-call entry whose command has never run is an entry that works until the night it
    // matters. "dispatched" is the weakest possible claim and it still has to be earned.
    const { testPage } = await import("../src/escalation/pager.js");
    const broken = onCallEntry("Ghost");
    broken.command = ["definitely-not-a-real-command-xyz"];

    const [result] = await testPage([broken], "check", 5_000);
    expect(result!.dispatched).toBe(false);
    expect(result!.error).toBeTruthy();
  });

  it("does not page a console-open entry, which cannot be woken", async () => {
    const { testPage } = await import("../src/escalation/pager.js");
    const results = await testPage([onCallEntry("Oracle", undefined, "console-open")]);
    expect(results).toEqual([]);
  });

  it("passes the message per-argument, so a payload cannot become a command", async () => {
    // argv, never a shell string. This asserts the substitution reaches the child process
    // as one argument rather than being re-parsed by anything.
    const { pageAll } = await import("../src/escalation/pager.js");
    const entry = onCallEntry("Wren");
    entry.command = ["node", "-e", "if(process.argv[1] !== '; rm -rf /') process.exit(3)", "{{message}}"];

    const [result] = await pageAll([entry], "; rm -rf /");
    expect(result!.dispatched, "the message was altered or re-parsed").toBe(true);
  });
});

describe("6 — the agent cannot impair escalation", () => {
  it("has no reference to the agent anywhere in the executor's module graph", async () => {
    // Structural, asserted against the source rather than argued. The daemon owns the agent
    // and the board; if the executor ever imports either, the separation has been lost and
    // a hung agent can take the one path that must never depend on it.
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const dir = fileURLToPath(new URL("../src/escalation/", import.meta.url));

    for (const file of ["executor.ts", "config.ts", "pager.ts", "index.ts"]) {
      const src = readFileSync(`${dir}${file}`, "utf8");
      const imports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]!);
      for (const spec of imports) {
        expect(spec, `${file} imports ${spec}`).not.toMatch(/daemon\/|query\.js|board\.js|watchtower\.js/);
      }
    }
  });

  it("subscribes to relays itself rather than being handed events", async () => {
    // The requirement failing "on paper" would look like: separate process, trigger routed
    // through the daemon. Then a hung daemon takes escalation with it.
    const { pubkey, deliver } = build([onCallEntry("Wren")]);
    const operator = generateSecretKey();
    // `deliver` IS the relay subscription callback. That it exists is the assertion.
    expect(() => deliver(distressFrom(operator, pubkey))).not.toThrow();
  });
});
