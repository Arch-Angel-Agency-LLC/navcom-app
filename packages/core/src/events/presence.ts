import { finalizeEvent, generateSecretKey, verifyEvent } from 'nostr-tools/pure';
import type { Event } from 'nostr-tools/core';
import { open, seal } from '../crypto/envelope.js';
import type { SecretKey } from '../crypto/keys.js';
import { KIND_PEER_PRESENCE, tagRecipient } from './kinds.js';
import type { Position } from './signal.js';

/**
 * Peer presence — kind 20913.
 *
 * The one message in this system that involves no watch at all. An operator publishes it to
 * the peers they have paired with, and each device draws its own picture of who is out.
 *
 * ## Why one event per peer, from a key that is thrown away
 *
 * The obvious design is one event `p`-tagged to everybody. It is also a **social graph
 * published to a public relay**: anyone watching sees that this key sends presence to those
 * keys, every minute, forever. The Doxxer is a named adversary here and that is precisely
 * their material — and *"no central social graph"* is not a preference, it is one of the
 * things this design is for.
 *
 * Signing separate events with the real key is no better: a relay correlates them by author
 * and reconstructs the same graph.
 *
 * So each peer gets their own event, signed by a **fresh ephemeral key that is discarded
 * immediately**. A relay sees unrelated one-off keys publishing to unrelated recipients and
 * can link none of them. The real sender is inside the ciphertext, where only the recipient
 * can read it.
 *
 * ## And why the inside is a signed event rather than a name
 *
 * A payload that merely *says* who it is from can say anything. The inner content is a
 * complete nostr event signed by the sender's real key, so a recipient verifies authorship
 * with the same function they use everywhere else. The wrapper hides who is talking; the
 * inner signature proves it.
 *
 * This is the shape NIP-59 uses, built from primitives already in the project rather than
 * invented here.
 *
 * Normative source: docs/spec/signals.spec.md
 */

export type PresenceStatus = 'out' | 'stood-down';

export interface PresencePayload {
  callsign: string;
  status: PresenceStatus;
  /** Coarse — a district, never an address. Null where the operator shares nothing. */
  area: string | null;
  /** Unix seconds they expect to be back. */
  until: number;
  /** Present only where the operator chose to share it, at the precision they chose. */
  position?: Position;
}

/**
 * One wrapped event per peer.
 *
 * The caller publishes all of them. There is deliberately no batching: a batch is a link.
 */
export function buildPresence(
  secret: SecretKey,
  peers: string[],
  payload: PresencePayload,
  createdAt: number
): Event[] {
  return peers.map((peer) => {
    // The real message, signed by the real key. Never published as-is.
    const inner = finalizeEvent(
      {
        kind: KIND_PEER_PRESENCE,
        created_at: createdAt,
        tags: [tagRecipient(peer)],
        content: JSON.stringify(payload)
      },
      secret
    );

    // A key that exists for one message and is never stored. This is what makes two
    // wrapped events from the same operator unlinkable to anyone but their recipients.
    const ephemeral = generateSecretKey();
    return finalizeEvent(
      {
        kind: KIND_PEER_PRESENCE,
        created_at: createdAt,
        tags: [tagRecipient(peer)],
        content: seal(ephemeral, peer, inner)
      },
      ephemeral
    );
  });
}

export interface PresenceFrom {
  /** The sender's real pubkey, proven by the inner signature rather than claimed. */
  from: string;
  payload: PresencePayload;
  /** Unix seconds the sender stamped it. */
  at: number;
}

/**
 * Unwraps a presence event addressed to us.
 *
 * Returns null for anything that does not verify, rather than throwing: a relay delivers
 * whatever it likes, and one malformed event must not take down a client's whole feed.
 *
 * **Only a peer we recognise is accepted.** Without that check, anybody who learns a pubkey
 * could publish presence into somebody's screen — and a stranger appearing on the list of
 * who is out is both alarming and a way to make a real peer easy to miss.
 */
export function readPresence(
  secret: SecretKey,
  wrap: Event,
  knownPeers: readonly string[]
): PresenceFrom | null {
  let inner: Event;
  try {
    inner = open<Event>(secret, wrap.pubkey, wrap.content);
  } catch {
    return null;
  }

  // Authorship is proven here, not asserted anywhere.
  if (!inner || typeof inner !== 'object' || !verifyEvent(inner)) return null;
  if (inner.kind !== KIND_PEER_PRESENCE) return null;
  if (!knownPeers.includes(inner.pubkey)) return null;

  try {
    const payload = JSON.parse(inner.content) as PresencePayload;
    if (!payload.callsign || (payload.status !== 'out' && payload.status !== 'stood-down')) {
      return null;
    }
    return { from: inner.pubkey, payload, at: inner.created_at };
  } catch {
    return null;
  }
}
