import type { SimplePool } from "nostr-tools/pool";
import { finalizeEvent, verifyEvent } from "nostr-tools/pure";
import type { Event } from "nostr-tools/core";
import { encryptPayload, decryptPayload } from "../shared/crypto.js";
import { KIND_SIGNAL, KIND_DISTRESS, KIND_RESPONSE } from "../shared/kinds.js";
import type { ResponsePayload, SignalPayload, SignalType } from "../shared/payloads.js";

/**
 * Found in review: sendSignal/sendDistress used to `Promise.allSettled`
 * the publish and ignore the results entirely -- if every relay
 * rejected the publish (all unreachable, bad URL, etc.), the function
 * still returned successfully as if the event had gone out. The caller
 * would then sit through the FULL waitForResponse timeout and see "No
 * response from Watchtower within 10000ms," which is a misleading
 * diagnosis: the real problem was the signal never left the client at
 * all. This throws immediately and distinctly when zero relays accept.
 */
async function publishOrThrow(pool: SimplePool, relays: string[], event: Event): Promise<void> {
  const results = await Promise.allSettled(pool.publish(relays, event));
  const okCount = results.filter((r) => r.status === "fulfilled").length;
  if (okCount === 0) {
    const reasons = results
      .map((r) => (r.status === "rejected" ? String(r.reason) : null))
      .filter((r): r is string => r !== null);
    throw new Error(`Failed to publish to any relay (${relays.length} tried): ${reasons.join("; ") || "unknown error"}`);
  }
}

export async function sendSignal(
  pool: SimplePool,
  relays: string[],
  secretKey: Uint8Array,
  watchtowerPubkey: string,
  type: SignalType,
  payload: SignalPayload,
): Promise<Event> {
  const content = encryptPayload(secretKey, watchtowerPubkey, payload);
  const event = finalizeEvent(
    {
      kind: KIND_SIGNAL,
      tags: [
        ["p", watchtowerPubkey],
        ["t", type],
      ],
      content,
      created_at: Math.floor(Date.now() / 1000),
    },
    secretKey,
  );
  await publishOrThrow(pool, relays, event);
  return event;
}

export async function sendDistress(
  pool: SimplePool,
  relays: string[],
  secretKey: Uint8Array,
  watchtowerPubkey: string,
  text: string | undefined,
): Promise<Event> {
  const content = encryptPayload(secretKey, watchtowerPubkey, { text: text ?? null });
  const event = finalizeEvent(
    {
      kind: KIND_DISTRESS,
      tags: [["p", watchtowerPubkey]],
      content,
      created_at: Math.floor(Date.now() / 1000),
    },
    secretKey,
  );
  await publishOrThrow(pool, relays, event);
  return event;
}

/**
 * Wait for the 20912 response addressed to us that answers `sentEvent`.
 * Rejects on timeout -- "every signal receives at least an ack," so a
 * timeout here means something is actually wrong (daemon down, relay
 * unreachable, wrong watchtower pubkey), not a normal outcome to retry
 * silently past.
 */
export function waitForResponse(
  pool: SimplePool,
  relays: string[],
  secretKey: Uint8Array,
  ourPubkey: string,
  watchtowerPubkey: string,
  sentEvent: Event,
  timeoutMs: number,
): Promise<ResponsePayload> {
  return new Promise((resolve, reject) => {
    // Found in review: `closer` used to be referenced inside this timer
    // callback before the `const closer = pool.subscribeMany(...)` below
    // had run. In the normal case that's fine (the callback only fires
    // after `timeoutMs`, long after `closer` is assigned) -- but if
    // subscribeMany ever threw SYNCHRONOUSLY (a malformed relay URL,
    // say), the promise executor would throw and correctly reject the
    // promise, except this `timer` would be left armed with nothing
    // clearing it, and would later fire and throw ITS OWN unhandled
    // "Cannot access 'closer' before initialization" deep inside a raw
    // setTimeout callback -- a second, confusing failure minutes after
    // the real one. `closer` is now declared up front and the timer
    // callback no-ops if it was never assigned.
    let closer: ReturnType<typeof pool.subscribeMany> | undefined;

    const timer = setTimeout(() => {
      closer?.close("timeout");
      reject(new Error(`No response from Watchtower within ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      closer = pool.subscribeMany(
        relays,
        {
          kinds: [KIND_RESPONSE],
          authors: [watchtowerPubkey],
          "#p": [ourPubkey],
          "#e": [sentEvent.id],
          since: sentEvent.created_at - 1,
        },
        {
          onevent: (event: Event) => {
            // Defense in depth, consistent with the daemon's own
            // verifyEvent check on incoming signals -- decryption
            // already authenticates the sender via NIP-44's ECDH shared
            // secret (an attacker without the real Watchtower private
            // key cannot produce content that decrypts successfully
            // regardless of what pubkey they claim), so this isn't a
            // security bypass without it, just an inconsistency worth
            // closing.
            if (!verifyEvent(event)) return;
            try {
              const payload = decryptPayload<ResponsePayload>(secretKey, watchtowerPubkey, event.content);
              clearTimeout(timer);
              closer?.close("received");
              resolve(payload);
            } catch {
              // undecryptable response -- keep waiting, don't fail the whole wait on one bad event
            }
          },
        },
      );
    } catch (err: unknown) {
      clearTimeout(timer);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
