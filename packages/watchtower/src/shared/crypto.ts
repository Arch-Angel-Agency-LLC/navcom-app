/**
 * Moved to @navcom/core (`seal` / `open`). Re-exported under the daemon's original names.
 *
 * A throw still means "drop this event", never "empty payload": an undecryptable event is
 * exactly the input the daemon must not act on.
 */
import { open, seal } from "@navcom/core";

export function encryptPayload(
  ourSecretKey: Uint8Array,
  theirPubkey: string,
  payload: unknown,
): string {
  return seal(ourSecretKey, theirPubkey, payload);
}

export function decryptPayload<T>(
  ourSecretKey: Uint8Array,
  theirPubkey: string,
  ciphertext: string,
): T {
  return open<T>(ourSecretKey, theirPubkey, ciphertext);
}
