/**
 * Peer presence, and the property that costs the most to get right.
 *
 * Most of what follows is about **unlinkability**: two presence events from one operator
 * must not be connectable by anybody except their recipients. The obvious implementation
 * publishes a social graph to a public relay, and the Doxxer is a named adversary here.
 */

import { describe, expect, it } from 'vitest';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { buildPresence, readPresence, KIND_PEER_PRESENCE, type PresencePayload } from '../src/index.js';

const wren = generateSecretKey();
const wrenPub = getPublicKey(wren);
const raven = generateSecretKey();
const ravenPub = getPublicKey(raven);
const owl = generateSecretKey();
const owlPub = getPublicKey(owl);

const T = 1_755_300_000;
const out = (over: Partial<PresencePayload> = {}): PresencePayload => ({
  callsign: 'Wren', status: 'out', area: 'Downtown', until: T + 7200, ...over
});

describe('what a relay can see', () => {
  it('publishes one event per peer, none of them signed by the sender', () => {
    const events = buildPresence(wren, [ravenPub, owlPub], out(), T);
    expect(events).toHaveLength(2);
    for (const e of events) {
      expect(e.pubkey, 'the real key is on the wire').not.toBe(wrenPub);
    }
  });

  it('cannot link two peers back to one operator', () => {
    // The whole point. A relay watching these sees unrelated one-off keys publishing to
    // unrelated recipients -- there is nothing common to correlate on.
    const [a, b] = buildPresence(wren, [ravenPub, owlPub], out(), T);
    expect(a!.pubkey).not.toBe(b!.pubkey);
    expect(a!.sig).not.toBe(b!.sig);
  });

  it('cannot link the same peer across two heartbeats', () => {
    // A fixed wrapper key per peer would let a relay watch one relationship over time,
    // which is a schedule -- when this person goes out, and for how long.
    const first = buildPresence(wren, [ravenPub], out(), T);
    const second = buildPresence(wren, [ravenPub], out(), T + 60);
    expect(first[0]!.pubkey).not.toBe(second[0]!.pubkey);
  });

  it('leaks no plaintext about who is out or where', () => {
    const [event] = buildPresence(wren, [ravenPub], out({ area: 'Riverfront' }), T);
    expect(event!.content).not.toContain('Riverfront');
    expect(event!.content).not.toContain('Wren');
    expect(JSON.stringify(event!.tags)).not.toContain(wrenPub);
  });
});

describe('what a peer can read', () => {
  it('reads the payload and the real sender', () => {
    const [event] = buildPresence(wren, [ravenPub], out(), T);
    const read = readPresence(raven, event!, [wrenPub]);
    expect(read?.from).toBe(wrenPub);
    expect(read?.payload.area).toBe('Downtown');
    expect(read?.at).toBe(T);
  });

  it('cannot be read by somebody it was not addressed to', () => {
    const [forRaven] = buildPresence(wren, [ravenPub], out(), T);
    expect(readPresence(owl, forRaven!, [wrenPub])).toBeNull();
  });

  it('carries a stand-down as its own message rather than by going quiet', () => {
    // Simply stopping is what a flat battery looks like.
    const [event] = buildPresence(wren, [ravenPub], out({ status: 'stood-down' }), T);
    expect(readPresence(raven, event!, [wrenPub])?.payload.status).toBe('stood-down');
  });
});

describe('what a peer refuses', () => {
  it('refuses presence from somebody not on the peer list', () => {
    // Without this, anybody who learns a pubkey can put themselves on somebody's screen --
    // and a stranger in the list of who is out makes a real peer easy to miss.
    const [event] = buildPresence(wren, [ravenPub], out(), T);
    expect(readPresence(raven, event!, [])).toBeNull();
    expect(readPresence(raven, event!, [owlPub])).toBeNull();
  });

  it('refuses an inner event whose signature does not hold', () => {
    // Authorship is proven, never asserted. A payload that merely says who it is from can
    // say anything.
    const [event] = buildPresence(wren, [ravenPub], out(), T);
    const forged = JSON.parse(JSON.stringify(event!)) as typeof event;
    forged!.content = forged!.content.slice(0, -4) + 'AAAA';
    expect(readPresence(raven, forged!, [wrenPub])).toBeNull();
  });

  it('returns null rather than throwing on anything malformed', () => {
    // A relay delivers whatever it likes, and one bad event must not take down the feed.
    const junk = { ...buildPresence(wren, [ravenPub], out(), T)[0]!, content: 'not-ciphertext' };
    expect(() => readPresence(raven, junk, [wrenPub])).not.toThrow();
    expect(readPresence(raven, junk, [wrenPub])).toBeNull();
  });

  it('refuses a payload with no callsign or a status it does not know', () => {
    const [bad] = buildPresence(wren, [ravenPub], { ...out(), callsign: '' }, T);
    expect(readPresence(raven, bad!, [wrenPub])).toBeNull();

    const [worse] = buildPresence(wren, [ravenPub], { ...out(), status: 'lurking' as never }, T);
    expect(readPresence(raven, worse!, [wrenPub])).toBeNull();
  });

  it('uses the ephemeral kind, so no relay is expected to store it', () => {
    const [event] = buildPresence(wren, [ravenPub], out(), T);
    expect(event!.kind).toBe(KIND_PEER_PRESENCE);
    expect(KIND_PEER_PRESENCE).toBeGreaterThanOrEqual(20_000);
    expect(KIND_PEER_PRESENCE).toBeLessThan(30_000);
  });
});
