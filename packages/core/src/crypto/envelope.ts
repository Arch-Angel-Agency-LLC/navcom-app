/**
 * Encrypting to the Watchtower.
 *
 * **Signals are encrypted to the Watchtower key, not to the individual holding watch.**
 * Encrypting to whoever currently holds the board breaks on handover, locks the agent out
 * of anything addressed to a human, and makes shared watch impossible.
 *
 * The cost is explicit rather than implied: the box can read every signal. It already holds
 * the board, runs the agent and executes escalation.
 *
 * NIP-44 comes from nostr-tools — the reference implementation. This project does not ship
 * its own cryptography on a boundary protecting people at risk.
 */

import { nip44 } from 'nostr-tools';
import type { SecretKey } from './keys';

/** Seal a payload so only the holder of `recipientPubkey`'s secret can read it. */
export function seal(secret: SecretKey, recipientPubkey: string, payload: unknown): string {
  const conversation = nip44.getConversationKey(secret, recipientPubkey);
  return nip44.encrypt(JSON.stringify(payload), conversation);
}

/** Open a payload sealed to us by `senderPubkey`. Throws if it was not. */
export function open<T = unknown>(secret: SecretKey, senderPubkey: string, ciphertext: string): T {
  const conversation = nip44.getConversationKey(secret, senderPubkey);
  return JSON.parse(nip44.decrypt(ciphertext, conversation)) as T;
}
