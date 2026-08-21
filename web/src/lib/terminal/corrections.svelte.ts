/**
 * Live corrections for the area this device carries.
 *
 * The device half of Milestone 6. Corrections travel as attestations on relays and are
 * merged over the **cached** directory at read time — so an operator sees their squad's
 * corrections with no build, no deploy, no maintainer, and no signal.
 *
 * ## Cached, because the directory is
 *
 * The whole point of the cached directory is that it works in a car park with no bars. A
 * correction that only existed while a relay was reachable would be exactly the wrong shape:
 * live when you do not need it and gone when you do. So corrections are written to the
 * accruing tier as they arrive and read from there on start.
 *
 * ## Read from everybody, and that is deliberate
 *
 * There is no peer list here and no allowlist. A correction is a **public attestation with
 * an author and an age**, and it wins or loses on those — an in-person check from a stranger
 * last night is better evidence than a website scrape from March, and pretending otherwise
 * would throw away the ninth tribe's whole contribution.
 *
 * What protects the reader is not who is allowed to speak. It is that a correction is
 * additive and cannot delete anything [`@navcom/core`'s `directory/corrections.ts`], so the
 * worst a hostile stranger achieves is a claim beside the record, wearing their name.
 */

import type { Event } from 'nostr-tools/core';
import {
  buildCorrection,
  KIND_CORRECTION,
  readCorrection,
  type Correction,
  type Method
} from '@navcom/core';
import { ensureContactKey } from './card';
import { loadIdentity } from './identity';
import { pool } from './pool';
import { relays } from './relays';
import { get, set } from './storage';

type Stored = Correction & { by: string };

const FIELD = 'corrections';

let held = $state<Record<string, Stored>>({});
let closer: { close(): void } | null = null;

/** Keyed by author and record: one operator's latest word about a place replaces their last. */
const keyOf = (c: Stored) => `${c.by}:${c.record}`;

export const corrections = {
  /** Everything this device knows, for merging. */
  get all(): Stored[] {
    return Object.values(held);
  },

  /** What is known about one record. */
  about(recordId: string): Stored[] {
    return Object.values(held).filter((c) => c.record === recordId);
  },

  /**
   * Loads what is cached and starts listening for more.
   *
   * `records` scopes the subscription to the area actually carried. Asking a relay for every
   * correction on the network would pull places this operator will never go, on a phone
   * counting bytes.
   */
  start(records: readonly string[]): void {
    held = get<Record<string, Stored>>('accruing', FIELD) ?? {};

    const urls = relays();
    if (urls.length === 0 || records.length === 0) return;

    closer?.close();
    closer = pool().subscribeMany(urls, { kinds: [KIND_CORRECTION], '#d': [...records] }, {
      onevent: (event: Event) => {
        const read = readCorrection(event);
        if (!read) return;

        // Out-of-order delivery is normal. An older correction must not overwrite the same
        // author's newer one.
        const existing = held[keyOf(read)];
        if (existing && existing.last_verified > read.last_verified) return;

        held = { ...held, [keyOf(read)]: read };
        set('accruing', FIELD, held);
      }
    });
  },

  /**
   * Publishes what this operator learned.
   *
   * Signed by the contact key, which is generated here if it does not exist — contributing
   * must not be gated behind having published a card, because the operator with the best
   * knowledge is often the one with the most reason not to be findable.
   */
  async submit(
    record: string,
    fields: Correction['fields'],
    method: Method = 'in_person'
  ): Promise<void> {
    const urls = relays();
    const callsign = loadIdentity()?.callsign;
    const secret = ensureContactKey();

    const correction: Correction = {
      record,
      // `anonymous` is a real author in this schema, not a fallback for a missing one.
      verified_by: callsign ?? 'anonymous',
      method,
      last_verified: new Date().toISOString().slice(0, 10),
      fields
    };

    const event = buildCorrection(secret, correction, Math.floor(Date.now() / 1000));
    const read = readCorrection(event);
    if (read) {
      // Held locally whether or not a relay takes it. An operator who corrects a record with
      // no signal must still see their own correction -- and it will publish the next time
      // this runs with a connection.
      held = { ...held, [keyOf(read)]: read };
      set('accruing', FIELD, held);
    }

    if (urls.length === 0) return;
    await Promise.allSettled(pool().publish(urls, event));
  },

  stop(): void {
    closer?.close();
    closer = null;
  }
};
