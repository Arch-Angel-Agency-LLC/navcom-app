/**
 * The two directions a watch encrypts in, named after which one they are.
 *
 * They use **different envelopes**, and that is not an inconsistency:
 *
 * - **Inbound** signals are sealed to whoever holds this watch — one key for a box, one per
 *   phone for a squad — so they arrive as group envelopes [`crypto/group.ts` in core]
 * - **Outbound** responses go to the single operator who asked. There is no membership to
 *   express, and a group envelope would be overhead on every answer
 *
 * They were once one symmetric pair called `encryptPayload`/`decryptPayload`, and the first
 * thing that happened after the envelopes diverged was a test building an *inbound* message
 * with the *outbound* function. Twenty-six tests failed at once and every message said
 * "invalid ciphertext", which points at the cryptography rather than at the mix-up. Names
 * that say the direction make that mistake unavailable.
 *
 * A throw still means "drop this event", never "empty payload": an undecryptable event is
 * exactly the input the daemon must not act on.
 */
import { open, openFromGroup, seal, sealToGroup } from "@navcom/core";

/** An answer to the one operator who asked. */
export function sealResponse(
  ourSecretKey: Uint8Array,
  operatorPubkey: string,
  payload: unknown,
): string {
  return seal(ourSecretKey, operatorPubkey, payload);
}

/** A signal addressed to this watch, from an operator. */
export function openSignal<T>(
  ourSecretKey: Uint8Array,
  operatorPubkey: string,
  ciphertext: string,
): T {
  return openFromGroup<T>(ourSecretKey, operatorPubkey, ciphertext);
}

/**
 * An answer from a watch, as the operator who asked reads it.
 *
 * The counterpart to `sealResponse`, and direct for the same reason. Exported for tests and
 * for anything standing in for a field client.
 */
export function openResponse<T>(
  operatorSecretKey: Uint8Array,
  watchtowerPubkey: string,
  ciphertext: string,
): T {
  return open<T>(operatorSecretKey, watchtowerPubkey, ciphertext);
}

/**
 * A signal to a watch, as an operator's client builds one.
 *
 * Exported for tests and for anything standing in for a field client. Real clients go
 * through `sendSignal` in core's transport, which also handles publishing.
 */
export function sealSignal(
  operatorSecretKey: Uint8Array,
  holders: readonly string[],
  payload: unknown,
): string {
  return sealToGroup(operatorSecretKey, holders, payload);
}
