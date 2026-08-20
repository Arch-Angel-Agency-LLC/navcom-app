import { describe, it, expect } from "vitest";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { openSignal, sealResponse, sealSignal } from "../src/shared/crypto.js";

describe("sealing in both directions", () => {
  it("round-trips a payload between two keypairs", () => {
    const a = generateSecretKey();
    const b = generateSecretKey();
    const bPub = getPublicKey(b);
    const aPub = getPublicKey(a);

    const payload = { type: "ack", responder: "watchtower", responder_kind: "agent", text: null, provenance: null };
    const ciphertext = sealSignal(a, [bPub], payload);

    const decrypted = openSignal<typeof payload>(b, aPub, ciphertext);
    expect(decrypted).toEqual(payload);
  });

  it("a third party's key cannot decrypt the payload", () => {
    const a = generateSecretKey();
    const b = generateSecretKey();
    const eve = generateSecretKey();
    const bPub = getPublicKey(b);
    const aPub = getPublicKey(a);

    const ciphertext = sealSignal(a, [bPub], { secret: "value" });

    expect(() => openSignal(eve, aPub, ciphertext)).toThrow();
  });

  it("ciphertext differs across calls even for the same payload (fresh nonce)", () => {
    const a = generateSecretKey();
    const b = generateSecretKey();
    const bPub = getPublicKey(b);

    const c1 = sealSignal(a, [bPub], { x: 1 });
    const c2 = sealSignal(a, [bPub], { x: 1 });
    expect(c1).not.toBe(c2);
  });

  it("round-trips nested objects and arrays", () => {
    const a = generateSecretKey();
    const b = generateSecretKey();
    const bPub = getPublicKey(b);
    const aPub = getPublicKey(a);

    const payload = { area: "district-7", position: { lat: 1.23, lon: -4.56, precision_m: 500 }, tags: ["x", "y"] };
    const ciphertext = sealSignal(a, [bPub], payload);
    expect(openSignal(b, aPub, ciphertext)).toEqual(payload);
  });
});
