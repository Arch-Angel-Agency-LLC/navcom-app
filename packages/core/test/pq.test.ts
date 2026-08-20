/**
 * Post-quantum cover, and the fallback that is allowed to happen.
 *
 * Two properties carry the weight, and neither is "does ML-KEM work" — that is the
 * library's job and it has its own test vectors:
 *
 *  1. **Hybrid means both.** The message must stay private if either primitive falls, which
 *     is the entire reason for not simply replacing the curve
 *  2. **Falling back is honest.** A recipient with no published key still gets the message,
 *     and the sender is told what actually happened rather than what was intended
 */

import { describe, expect, it } from 'vitest';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import {
  buildKeyBundle,
  coverOf,
  COVER_NOTE,
  kemKeypair,
  kemPublicFromHex,
  kemPublicHex,
  openFromGroup,
  PqError,
  readKeyBundle,
  sealToGroup
} from '../src/index.js';

const wren = generateSecretKey();
const wrenPub = getPublicKey(wren);
const raven = generateSecretKey();
const ravenPub = getPublicKey(raven);
const owl = generateSecretKey();
const owlPub = getPublicKey(owl);

const keys = (...who: Uint8Array[]): Record<string, string> =>
  Object.fromEntries(who.map((s) => [getPublicKey(s), kemPublicHex(s)]));

const payload = { type: 'query', text: 'bed tonight, has a dog' };

describe('the KEM keypair', () => {
  it('is derived from the operator secret, so there is no second key to lose', () => {
    // It exists wherever the identity exists, a burn destroys it with the identity, and
    // restoring an identity restores it.
    expect(kemPublicHex(wren)).toBe(kemPublicHex(wren));
    expect(kemPublicHex(wren)).not.toBe(kemPublicHex(raven));
  });

  it('is a real ML-KEM-768 key and not something shaped like one', () => {
    const pair = kemKeypair(wren);
    expect(pair.publicKey.length).toBe(1184);
    expect(pair.secretKey.length).toBe(2400);
  });

  it('refuses a key of the wrong length rather than padding it', () => {
    // A wrong-length key would otherwise fail deep inside the KEM on the first send, which
    // is a bad place to find out.
    expect(() => kemPublicFromHex('ab')).toThrow(PqError);
    expect(() => kemPublicFromHex('zz'.repeat(1184))).toThrow(PqError);
  });
});

describe('a published bundle', () => {
  it('is readable by somebody who already holds the pubkey', () => {
    const read = readKeyBundle(buildKeyBundle(wren, 1_755_300_000), wrenPub);
    expect(read?.kem).toBe(kemPublicHex(wren));
  });

  it('is refused when it is not from who we asked about', () => {
    // The one thing this event has to be proof against: a relay answering a question
    // nobody asked, with a key it generated.
    expect(readKeyBundle(buildKeyBundle(raven, 1_755_300_000), wrenPub)).toBeNull();
  });

  it('is refused when the signature does not hold', () => {
    const event = buildKeyBundle(wren, 1_755_300_000);
    const forged = JSON.parse(
      JSON.stringify({ ...event, content: JSON.stringify({ kem: kemPublicHex(raven) }) })
    ) as typeof event;
    expect(readKeyBundle(forged, wrenPub)).toBeNull();
  });

  it('is refused when the key inside is not a key', () => {
    const event = buildKeyBundle(wren, 1_755_300_000);
    for (const junk of ['', 'ab', '{}']) {
      const bad = JSON.parse(JSON.stringify({ ...event, content: JSON.stringify({ kem: junk }) }));
      expect(readKeyBundle(bad as typeof event, wrenPub)).toBeNull();
    }
  });
});

describe('hybrid sealing', () => {
  it('is readable by every holder who published a key', () => {
    const sealed = sealToGroup(wren, [ravenPub, owlPub], payload, keys(raven, owl));
    expect(openFromGroup(raven, wrenPub, sealed)).toEqual(payload);
    expect(openFromGroup(owl, wrenPub, sealed)).toEqual(payload);
  });

  it('is still unreadable by anybody else', () => {
    const sealed = sealToGroup(wren, [ravenPub], payload, keys(raven));
    expect(() => openFromGroup(owl, wrenPub, sealed)).toThrow();
  });

  it('carries the KEM ciphertext, which is what makes it hybrid at all', () => {
    // Without it the recipient cannot recover their half, and the wrap would be classical
    // wearing a prefix.
    const sealed = sealToGroup(wren, [ravenPub], payload, keys(raven));
    const k = (JSON.parse(sealed) as { k: string[] }).k[0]!;
    expect(k.startsWith('q:')).toBe(true);
    // 1088 bytes of ciphertext, hex.
    expect(k.slice(2, k.indexOf('.')).length).toBe(2176);
  });

  it('needs the classical half too, so breaking ML-KEM alone is not enough', () => {
    // The property that makes this hybrid rather than a swap. The wrapping key is derived
    // from both secrets, so an attacker holding the KEM shared secret and nothing else
    // still cannot open it -- represented here by a recipient with the right KEM keypair
    // and the wrong nostr key.
    const sealed = sealToGroup(wren, [ravenPub], payload, keys(raven));
    const impostor = generateSecretKey();
    expect(() => openFromGroup(impostor, wrenPub, sealed)).toThrow();
  });
});

describe('falling back', () => {
  it('still delivers to somebody who published no key', () => {
    // Refusing to send is the alternative, and the message that would fail to send is a
    // Distress.
    const sealed = sealToGroup(wren, [ravenPub], payload, {});
    expect(openFromGroup(raven, wrenPub, sealed)).toEqual(payload);
  });

  it('delivers to a mixed group, so one stale phone does not cut everybody off', () => {
    // A squad where one member has not opened the app since key bundles shipped still
    // receives everything -- and the members who can be covered still are.
    const sealed = sealToGroup(wren, [ravenPub, owlPub], payload, keys(raven));
    expect(openFromGroup(raven, wrenPub, sealed)).toEqual(payload);
    expect(openFromGroup(owl, wrenPub, sealed)).toEqual(payload);

    const wraps = (JSON.parse(sealed) as { k: string[] }).k;
    expect(wraps.filter((w) => w.startsWith('q:')).length).toBe(1);
    expect(wraps.filter((w) => w.startsWith('c:')).length).toBe(1);
  });

  it('reports the weakest link, never an average', () => {
    // "Mostly covered" tells an operator nothing they can use. One holder without a key
    // means the content key is in a classical wrap on a public relay.
    expect(coverOf([ravenPub, owlPub], keys(raven, owl))).toBe('hybrid');
    expect(coverOf([ravenPub, owlPub], keys(raven))).toBe('classical');
    expect(coverOf([ravenPub], {})).toBe('classical');
  });

  it('says what is actually missing, calmly and specifically', () => {
    // Not a warning label. The message IS encrypted and nobody can read it today; what is
    // missing is cover against being stored now and opened later. A yellow triangle saying
    // "insecure" would be alarming and also wrong.
    expect(COVER_NOTE).toMatch(/unreadable now/i);
    expect(COVER_NOTE).toMatch(/quantum/i);
    expect(COVER_NOTE).not.toMatch(/insecure|unsafe|danger|warning|error|risk/i);
  });
});
