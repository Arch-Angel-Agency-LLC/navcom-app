/**
 * Keys.
 *
 * Platform-neutral on purpose: this module never touches a filesystem, so the same code
 * runs in a browser and on the node. Loading a key from disk is the node's job.
 */

import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

export type SecretKey = Uint8Array;

/** A new operator or Watchtower identity. Generated where it will live, never transmitted. */
export function newSecretKey(): SecretKey {
  return generateSecretKey();
}

export function publicKeyOf(secret: SecretKey): string {
  return getPublicKey(secret);
}

export const secretToHex = (secret: SecretKey): string => bytesToHex(secret);

export function secretFromHex(hex: string): SecretKey {
  const clean = hex.trim().replace(/^0x/, '');
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error('A secret key is 64 hex characters');
  }
  return hexToBytes(clean);
}

export function isPubkey(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}
