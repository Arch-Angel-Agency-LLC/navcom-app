/**
 * Watch state, as the terminal sees it.
 *
 * Nothing is connected yet — relays and config arrive in sprints 02 and 03. Until then this
 * reports **Dark**, and that is the correct answer rather than a placeholder: absence of a
 * `10910` is Dark, and a terminal that has never been configured genuinely has no watch.
 *
 * The wiring point is `applyEvent`. When the relay client lands it calls that and nothing
 * else in the screen changes.
 */

import { darkState, readWatchState, type WatchStatePayload } from '@navcom/core';

let current = $state<WatchStatePayload>(darkState());
/** Null until a watch state has ever been seen. Distinct from "seen, and it says dark". */
let seenAt = $state<number | null>(null);

export const watch = {
  get state(): WatchStatePayload {
    return current;
  },
  /** When the last `10910` arrived, or null if one never has. */
  get seenAt(): number | null {
    return seenAt;
  },
  /** Sprint 03 calls this with event content. Dark is what happens if it never does. */
  applyEvent(content: string | null, at: number = Date.now()): void {
    current = readWatchState(content);
    seenAt = content ? at : null;
  }
};
