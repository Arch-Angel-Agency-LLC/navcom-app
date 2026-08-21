/**
 * Everything an operator would need on another phone.
 *
 * The accruing tier and nothing else. That is not a shortcut — the tiers already encode
 * exactly this distinction: **accruing is the decade, wipeable is tonight.** A backup that
 * carried tonight would carry the thing a panic wipe exists to destroy, and restoring it
 * would undo a wipe somebody meant.
 */

import { openBackup, sealBackup } from '@navcom/core';
import { get, set } from './storage';

/** Keys that are this device's business rather than this operator's. */
const DEVICE_ONLY = ['relays_own'];

export interface Kit {
  v: 1;
  at: string;
  /** Every accruing key except the ones that describe this handset. */
  accruing: Record<string, unknown>;
}

function accruing(): Record<string, unknown> {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('navcom.accruing') ?? '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Seals what an operator would need. Throws on an empty passphrase. */
export function makeBackup(passphrase: string): string {
  const all = accruing();
  const kept = Object.fromEntries(Object.entries(all).filter(([k]) => !DEVICE_ONLY.includes(k)));
  return sealBackup(passphrase, {
    v: 1,
    at: new Date().toISOString().slice(0, 10),
    accruing: kept
  } satisfies Kit);
}

export class RestoreError extends Error {}

/**
 * Restores onto this device.
 *
 * **Refuses to overwrite an identity that is already here.** Restoring over a live persona
 * would destroy standing silently, and the operator doing it is usually somebody who
 * mistyped which phone they were holding. Burn first if that is genuinely the intent.
 */
export function restore(passphrase: string, blob: string): { keys: number } {
  if (get<string>('accruing', 'secret')) {
    throw new RestoreError(
      'This phone already has an identity. Restoring would replace it and lose whatever it holds — burn it first if that is what you mean.'
    );
  }

  const kit = openBackup<Kit>(passphrase, blob);
  if (!kit || typeof kit !== 'object' || typeof kit.accruing !== 'object' || !kit.accruing) {
    throw new RestoreError('That backup is not one this version understands.');
  }

  for (const [key, value] of Object.entries(kit.accruing)) set('accruing', key, value);
  return { keys: Object.keys(kit.accruing).length };
}

/** Restores from a bare recovery code — who you are, without what you held. */
export function restoreCode(code: string): void {
  const clean = code.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(clean)) throw new RestoreError('A recovery code is 64 hexadecimal characters.');
  if (get<string>('accruing', 'secret')) {
    throw new RestoreError('This phone already has an identity. Burn it first if you mean to replace it.');
  }
  set('accruing', 'secret', clean);
}
