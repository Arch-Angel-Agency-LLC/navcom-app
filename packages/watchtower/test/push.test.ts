import { describe, expect, it } from "vitest";
import { readSubscription } from "../src/push/index.js";

/**
 * What a subscription file has to be before anybody is paged with it.
 *
 * Delivery itself is not tested here and cannot be: it needs a real browser subscription and
 * a real push service. What *is* testable is refusing to send something that would arrive
 * wrong, or arrive readable.
 */

const good = JSON.stringify({
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
  keys: { p256dh: "BKx".repeat(10), auth: "aGVsbG8" }
});

describe("reading what the on-call operator handed over", () => {
  it("accepts a real subscription", () => {
    const s = readSubscription(good);
    expect(s.endpoint).toContain("fcm.googleapis.com");
    expect(s.keys.auth).toBe("aGVsbG8");
  });

  it("refuses one with no keys, rather than sending it unencrypted", () => {
    // Some push services accept a payload with no encryption keys. Sending one would put
    // the page in the clear through Google's or Apple's servers -- and the encryption is the
    // entire reason this exists instead of a curl to a topic.
    const bare = JSON.stringify({ endpoint: "https://fcm.googleapis.com/fcm/send/abc" });
    expect(() => readSubscription(bare)).toThrow(/not encrypted/);
  });

  it("refuses one missing half its keys", () => {
    const half = JSON.stringify({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      keys: { p256dh: "BKx" }
    });
    expect(() => readSubscription(half)).toThrow(/both keys/);
  });

  it("refuses a non-https endpoint", () => {
    const plain = JSON.stringify({
      endpoint: "http://example.org/push",
      keys: { p256dh: "BKx", auth: "aGVsbG8" }
    });
    expect(() => readSubscription(plain)).toThrow(/https/);
  });

  it("refuses anything that is not a subscription at all", () => {
    for (const junk of ["", "not json", "{}", "[]", "null"]) {
      expect(() => readSubscription(junk), junk).toThrow();
    }
  });
});

describe('a subscription whose keys are present but empty', () => {
  const base = { endpoint: 'https://push.example/abc', keys: { p256dh: 'BQ', auth: 'AQ' } };

  it('is refused, because an empty key encrypts nothing', () => {
    // The browser side encodes a null key as an empty string, so this arrived looking like
    // a complete subscription. A typeof check passed it, and the page failed at 3am on the
    // one channel that exists to work then.
    expect(() => readSubscription(JSON.stringify({ ...base, keys: { p256dh: '', auth: 'AQ' } })))
      .toThrow(/both keys/i);
    expect(() => readSubscription(JSON.stringify({ ...base, keys: { p256dh: 'BQ', auth: '   ' } })))
      .toThrow(/both keys/i);
  });

  it('still accepts a real one', () => {
    expect(readSubscription(JSON.stringify(base)).keys.p256dh).toBe('BQ');
  });
});
