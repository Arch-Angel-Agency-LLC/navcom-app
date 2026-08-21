/**
 * Whether somebody the config file declares on-call can actually acknowledge anything.
 *
 * Every other test in this package builds on-call entries with a helper that takes a pubkey.
 * **The config parser has no way to produce one.** So the ack path was covered only in a
 * shape production cannot create, and in production it could not match anybody at all.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import type { SimplePool } from "nostr-tools/pool";
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools/pure";
import type { Event } from "nostr-tools/core";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ResponsePayload } from "@navcom/core";
import { EscalationExecutor } from "../src/escalation/executor.js";
import { loadEscalationConfig } from "../src/escalation/config.js";
import { sealSignal, openResponse } from "../src/shared/crypto.js";
import { KIND_DISTRESS, KIND_SIGNAL, KIND_RESPONSE } from "../src/shared/kinds.js";
import type { pageAll } from "../src/escalation/pager.js";

const dirs: string[] = [];
function configFile(body: string) {
  const dir = mkdtempSync(join(tmpdir(), "navcom-cfg-"));
  dirs.push(dir);
  const path = join(dir, "escalation.toml");
  writeFileSync(path, body);
  return path;
}

const executors: EscalationExecutor[] = [];
function build(configPath: string) {
  const config = loadEscalationConfig(configPath);
  const published: Event[] = [];
  let onEvent: ((e: Event) => void) | undefined;
  const pool = {
    publish: (_r: string[], e: Event) => { published.push(e); return [Promise.resolve("ok")]; },
    subscribeMany: (_r: string[], _f: unknown, p: { onevent: (e: Event) => void }) => {
      onEvent = p.onevent; return { close: () => {} };
    },
    destroy: () => {},
  } as unknown as SimplePool;
  const secretKey = generateSecretKey();
  const page = vi.fn<typeof pageAll>(async () => [
    { callsign: "Wren", channel: "sms", dispatched: true },
  ]);
  const ex = new EscalationExecutor({
    config, secretKey, pubkey: getPublicKey(secretKey), pool, page,
  });
  executors.push(ex);
  ex.start();
  return { ex, pubkey: getPublicKey(secretKey), published, deliver: (e: Event) => onEvent?.(e) };
}

const distress = (operator: Uint8Array, watchtower: string) =>
  finalizeEvent({
    kind: KIND_DISTRESS,
    tags: [["p", watchtower]],
    content: sealSignal(operator, [watchtower], { position: null, area: "north side" }),
    created_at: Math.floor(Date.now() / 1000),
  }, operator);

const ack = (responder: Uint8Array, watchtower: string, distressId: string) =>
  finalizeEvent({
    kind: KIND_SIGNAL,
    tags: [["p", watchtower], ["t", "distress-ack"]],
    content: sealSignal(responder, [watchtower], { distress_id: distressId }),
    created_at: Math.floor(Date.now() / 1000),
  }, responder);

afterEach(async () => {
  await Promise.all(executors.splice(0).map((e) => e.stop()));
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("an on-call person the config file declares", () => {
  it("can acknowledge a Distress, which is the whole point of being on-call", async () => {
    const responder = generateSecretKey();
    const operator = generateSecretKey();
    const path = configFile(`
[identity]
privkey_path = "/dev/null"
[relays]
urls = ["wss://fake.relay"]
[[escalation.oncall]]
callsign = "Wren"
pubkey   = "${getPublicKey(responder)}"
channel  = "sms"
command  = ["true"]
`);
    const { pubkey, published, deliver } = build(path);
    const d = distress(operator, pubkey);
    deliver(d);
    await vi.waitFor(() => expect(published.length).toBeGreaterThan(0));
    deliver(ack(responder, pubkey, d.id));

    const said = await vi.waitFor(async () => {
      const all = published
        .filter((e) => e.kind === KIND_RESPONSE)
        .map((e) => openResponse<ResponsePayload>(operator, pubkey, e.content));
      expect(all.some((r) => r.type === "ack")).toBe(true);
      return all;
    });
    const acked = said.find((r) => r.type === "ack")!;
    expect(acked.responder.kind).toBe("human");
    expect(acked.responder.callsign).toBe("Wren");
    expect(acked.text).toMatch(/Wren is responding/);
  });

  it("still refuses an ack from somebody who is not on the roster", async () => {
    // A ladder that keeps paging is survivable; one stopped by somebody who is not coming
    // is not. Making the roster expressible must not make it permissive.
    const responder = generateSecretKey();
    const stranger = generateSecretKey();
    const operator = generateSecretKey();
    const path = configFile(`
[identity]
privkey_path = "/dev/null"
[relays]
urls = ["wss://fake.relay"]
[[escalation.oncall]]
callsign = "Wren"
pubkey   = "${getPublicKey(responder)}"
channel  = "sms"
command  = ["true"]
`);
    const { pubkey, published, deliver } = build(path);
    const d = distress(operator, pubkey);
    deliver(d);
    await vi.waitFor(() => expect(published.length).toBeGreaterThan(0));
    deliver(ack(stranger, pubkey, d.id));
    await new Promise((r) => setTimeout(r, 150));

    const all = published
      .filter((e) => e.kind === KIND_RESPONSE)
      .map((e) => openResponse<ResponsePayload>(operator, pubkey, e.content));
    expect(all.some((r) => r.type === "ack")).toBe(false);
  });

  it("is refused a malformed pubkey at startup rather than at 3am", async () => {
    const path = configFile(`
[identity]
privkey_path = "/dev/null"
[relays]
urls = ["wss://fake.relay"]
[[escalation.oncall]]
callsign = "Wren"
pubkey   = "not-a-key"
channel  = "sms"
command  = ["true"]
`);
    expect(() => loadEscalationConfig(path)).toThrow(/pubkey/i);
  });
});
