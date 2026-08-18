/**
 * The operator's identity.
 *
 * A keypair generated on this device. Never transmitted, never escrowed, never registered —
 * there is no account, so there is nothing to revoke and nobody who could revoke it.
 *
 * Lives in the accruing tier: panic wipe destroys tonight, not the decade.
 */

import { newSecretKey, publicKeyOf, secretFromHex, secretToHex } from '@navcom/core';
import { get, set } from './storage';

export interface Identity {
  secretKey: Uint8Array;
  pubkey: string;
  callsign: string | null;
}

/** Null until an operator has one. Creating it is a deliberate act, not a side effect. */
export function loadIdentity(): Identity | null {
  const hex = get<string>('accruing', 'secret');
  if (!hex) return null;
  try {
    const secretKey = secretFromHex(hex);
    return { secretKey, pubkey: publicKeyOf(secretKey), callsign: get<string>('accruing', 'callsign') };
  } catch {
    return null;
  }
}

export function createIdentity(callsign: string): Identity {
  const secretKey = newSecretKey();
  set('accruing', 'secret', secretToHex(secretKey));
  set('accruing', 'callsign', callsign);
  return { secretKey, pubkey: publicKeyOf(secretKey), callsign };
}

export function setCallsign(callsign: string): void {
  set('accruing', 'callsign', callsign);
}
