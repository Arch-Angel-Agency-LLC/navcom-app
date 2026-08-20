/**
 * Invites — pairing with somebody you have not met.
 *
 * ## Nothing arrives here uninvited that you did not make reachable
 *
 * There are two inboxes, and the difference is the whole safety story:
 *
 * - The **contact key**, which only exists if you published a card. This is the public
 *   address, and anybody may write to it. Withdrawing the card discards the key and the
 *   inbox with it
 * - The **operational key**, which only people you handed it to can write to — peers, and
 *   anybody you sent an invite to. It is not published anywhere
 *
 * So an operator who never publishes a card has no public inbox at all, and one who
 * withdraws stops having one. Being reachable is a thing you switch on.
 *
 * ## Accepting, and the fact that declining sends nothing
 *
 * Accepting pairs them and sends your own key back, which is just an invite in the other
 * direction. Declining is **ignoring**: no message leaves this device, so a sender never
 * learns their invite was read, refused, or even that the key is live.
 *
 * That asymmetry is deliberate. Somebody who owes a refusal is somebody who accepts to
 * avoid an awkward one — the same reason `unpair` tells nobody.
 *
 * Held in memory only. An invite lives on the relay that stored it until it is acted on, so
 * there is no local queue to expire, migrate, or leak into a wipe.
 */

import type { Event } from 'nostr-tools/core';
import { buildInvite, KIND_INVITE, readInvite, type Invite } from '@navcom/core';
import { contactKey, contactPubkey } from './card';
import { loadIdentity } from './identity';
import { pair, peerPubkeys } from './peers';
import { relays } from './relays';
import { pool } from './pool';
import { kemKeys } from './pq.svelte';

export interface Waiting extends Invite {
  /** The event id, so accepting the same invite twice is not possible. */
  id: string;
}

let waiting = $state<Record<string, Waiting>>({});
let closer: { close(): void } | null = null;

export const invites = {
  /**
   * Invites you have not acted on, oldest first.
   *
   * Anybody already paired is filtered out rather than shown as a duplicate — a relay may
   * still be holding the invite that led to a pairing, and offering to accept somebody
   * twice would read as though the first one had not worked.
   */
  get waiting(): Waiting[] {
    const known = new Set(peerPubkeys());
    return Object.values(waiting)
      .filter((w) => !known.has(w.from))
      .sort((a, b) => a.at - b.at);
  },

  /** Starts listening on whichever inboxes this operator actually has. */
  start(): void {
    const identity = loadIdentity();
    const urls = relays();
    if (!identity || urls.length === 0) return;

    const contact = contactPubkey();
    const addresses = contact ? [identity.pubkey, contact] : [identity.pubkey];

    closer?.close();
    closer = pool().subscribeMany(urls, { kinds: [KIND_INVITE], '#p': addresses }, {
      onevent: (event: Event) => {
        // Tried against both keys, because the two inboxes are the same kind and a relay
        // does not say which address matched.
        const secret = contactKey();
        const read =
          readInvite(identity.secretKey, event) ?? (secret ? readInvite(secret, event) : null);
        if (!read) return;
        if (read.from === identity.pubkey) return;
        waiting = { ...waiting, [event.id]: { ...read, id: event.id } };
      }
    });
  },

  /**
   * Pairs them, and sends your key back so they can pair you.
   *
   * `callsign` is what *you* will call them — yours to set, never sent anywhere, and
   * defaulting to what they call themselves.
   */
  async accept(invite: Waiting, callsign: string): Promise<void> {
    const identity = loadIdentity();
    const urls = relays();
    if (!identity?.callsign) return;

    pair(invite.from, callsign.trim() || invite.payload.callsign);
    waiting = Object.fromEntries(Object.entries(waiting).filter(([id]) => id !== invite.id));

    if (urls.length === 0) return;
    const back = buildInvite(
      identity.secretKey,
      invite.from,
      { callsign: identity.callsign },
      Math.floor(Date.now() / 1000),
      kemKeys()[invite.from]
    );
    await Promise.allSettled(pool().publish(urls, back));
  },

  /**
   * Takes it off this screen. **Sends nothing.**
   *
   * Local only, and named `ignore` rather than `decline` because there is no such message
   * and there must never be one. The sender learns nothing.
   */
  ignore(invite: Waiting): void {
    waiting = Object.fromEntries(Object.entries(waiting).filter(([id]) => id !== invite.id));
  },

  stop(): void {
    closer?.close();
    closer = null;
  }
};

/**
 * Asks somebody with a card to pair.
 *
 * This is the one moment an operator's operational key leaves the device to somebody they
 * have not met — a deliberate act, aimed at one person, and the reason a card carries a
 * contact key instead.
 */
export async function invite(contact: string, note: string): Promise<void> {
  const identity = loadIdentity();
  const urls = relays();
  if (!identity?.callsign || urls.length === 0) return;

  const event = buildInvite(
    identity.secretKey,
    contact,
    { callsign: identity.callsign, note },
    Math.floor(Date.now() / 1000),
    kemKeys()[contact]
  );
  await Promise.allSettled(pool().publish(urls, event));
}
