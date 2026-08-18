import type { SimplePool } from "nostr-tools/pool";
import { KIND_WATCH_STATE } from "../shared/kinds.js";
import type { WatchStatePayload } from "../shared/payloads.js";

export interface DarkCheckResult {
  dark: boolean;
  reason?: "absent" | "stale" | "corrupt";
  ageSeconds?: number;
  state?: WatchStatePayload;
}

/**
 * "When the daemon is unreachable, a client renders dark — absence of
 * this event is not ambiguity, it is Dark."
 *
 * Kind 10910 is REPLACEABLE, so a relay that still holds the daemon's
 * last-published copy keeps serving it to a freshly-connecting client
 * even after the daemon has died -- absence alone isn't a reliable dark
 * signal in a real test against a real relay. Staleness (event age vs.
 * `staleAfterSeconds`, meant to be a small multiple of the daemon's
 * heartbeat interval) is the other half of the check. See
 * daemon/config.ts's docstring for the same reasoning from the publish
 * side.
 */
export async function checkDark(
  pool: SimplePool,
  relays: string[],
  watchtowerPubkey: string,
  staleAfterSeconds: number,
  maxWaitMs = 3000,
): Promise<DarkCheckResult> {
  const event = await pool.get(
    relays,
    { kinds: [KIND_WATCH_STATE], authors: [watchtowerPubkey] },
    { maxWait: maxWaitMs },
  );

  if (!event) {
    return { dark: true, reason: "absent" };
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - event.created_at;
  if (ageSeconds > staleAfterSeconds) {
    return { dark: true, reason: "stale", ageSeconds };
  }

  // Found in review: kind 10910 is unencrypted and unsigned-content
  // trust here relies entirely on the relay-pool's own signature
  // verification of the event envelope (SimplePool defaults to
  // verifying every incoming event before it's ever handed to a
  // caller) -- a forged event without the real Watchtower private key
  // can't pass that check, so a parse failure here should be
  // near-impossible for a genuine event. "Should be impossible" isn't a
  // reason to skip a two-line guard on network-sourced input, though:
  // this used to be a bare JSON.parse that would throw an uncaught
  // SyntaxError straight out of the CLI on any corruption in transit.
  try {
    const state = JSON.parse(event.content) as WatchStatePayload;
    return { dark: false, ageSeconds, state };
  } catch {
    return { dark: true, reason: "corrupt", ageSeconds };
  }
}
