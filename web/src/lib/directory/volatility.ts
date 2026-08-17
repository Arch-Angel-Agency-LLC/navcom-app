/**
 * Volatility classes.
 *
 * The core insight of the schema: different fields rot at different speeds, so staleness
 * is computed per field-group rather than per record.
 *
 * Normative source: docs/product/directory-schema.md §4
 */

import type { ResourceField, VolatilityClass } from './types';

export const STALE_AFTER_DAYS: Record<VolatilityClass, number> = {
  static: 365,
  slow: 90,
  seasonal: 30,
  volatile: 14
};

/**
 * The schema names the classes by field group rather than exhaustively. Fields it lists
 * explicitly are marked EXPLICIT; the rest are assigned by the same logic and marked
 * INFERRED so the extension is visible rather than silent.
 */
export const FIELD_CLASS: Record<ResourceField, VolatilityClass | null> = {
  // static — EXPLICIT: address, type, accessibility
  address: 'static',
  type: 'static',
  accessibility: 'static',
  // static — INFERRED: change about as often as an address does
  name: 'static',
  lat: 'static',
  lon: 'static',
  phone: 'static',

  // slow — EXPLICIT: intake rules, cost, languages, max stay
  accepts: 'slow',
  pets: 'slow',
  sobriety: 'slow',
  id_required: 'slow',
  referral_required: 'slow',
  sex_offender_ok: 'slow',
  curfew: 'slow',
  max_stay: 'slow',
  belongings: 'slow',
  languages: 'slow',
  cost: 'slow',

  // seasonal — EXPLICIT
  seasonal: 'seasonal',

  // volatile — EXPLICIT: hours, intake hours, capacity signal
  hours: 'volatile',
  intake_hours: 'volatile',
  capacity_signal: 'volatile',

  // Not directory content — verification metadata and free text carry no class.
  last_verified: null,
  verified_by: null,
  method: null,
  flag: null,
  notes: null
};

export function classOf(field: ResourceField): VolatilityClass | null {
  return FIELD_CLASS[field];
}

/** Whole days elapsed between two ISO dates. Negative if `verified` is in the future. */
export function ageInDays(verified: string, now: Date): number {
  const then = Date.parse(`${verified}T00:00:00Z`);
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.floor((today - then) / 86_400_000);
}

/**
 * Meteorological season, used for the seasonal class's second staleness trigger:
 * "30 days, or at season change".
 */
export function seasonOf(date: Date): 'winter' | 'spring' | 'summer' | 'autumn' {
  const m = date.getUTCMonth(); // 0-11
  if (m === 11 || m <= 1) return 'winter';
  if (m <= 4) return 'spring';
  if (m <= 7) return 'summer';
  return 'autumn';
}
