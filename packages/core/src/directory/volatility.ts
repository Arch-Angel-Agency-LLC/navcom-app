/**
 * Volatility classes.
 *
 * The core insight of the schema: different fields rot at different speeds, so staleness
 * is computed per field-group rather than per record.
 *
 * Normative source: docs/product/directory-schema.md §4
 */

import type { ResourceField, VolatilityClass } from './types.js';

export const STALE_AFTER_DAYS: Record<VolatilityClass, number> = {
  static: 365,
  slow: 90,
  seasonal: 30,
  volatile: 14
};

/**
 * How stale the published page itself may be, in days.
 *
 * The site is static, so confidence is computed once at build time and then frozen into
 * HTML. Without a margin, a field that crosses its window after the build keeps showing
 * its value until the next one — the page would be confidently wrong about its own
 * freshness, which is the exact failure the schema exists to prevent.
 *
 * So staleness is computed against `now + this`, which makes a field read "call first" a
 * little early rather than a little late. Erring toward call-first is the safe direction:
 * an honest blank beats a confident guess.
 *
 * This must be >= the actual rebuild interval. See docs/delivery.md — the scheduled
 * rebuild is load-bearing, not a nicety.
 */
export const STALENESS_MARGIN_DAYS = 1;

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

  reports_to: 'slow',

  // Not directory content — verification metadata, provenance and free text carry no class.
  // `region` is attached by the loader and describes where a row lives, not what it claims,
  // so it never goes stale.
  region: null,
  last_verified: null,
  verified_by: null,
  method: null,
  flag: null,
  notes: null
};

export function classOf(field: ResourceField): VolatilityClass | null {
  return FIELD_CLASS[field];
}

// Age is the attestation model's, not the directory's — it was written twice, which is the
// duplication this package exists to remove. Re-exported so callers keep their import.
export { ageInDays } from '../attestation.js';

export type Hemisphere = 'north' | 'south' | 'tropical';
export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

/**
 * Which meteorological quarter a date falls in: 0 = Dec-Feb, 1 = Mar-May, 2 = Jun-Aug,
 * 3 = Sep-Nov.
 *
 * This is the mechanism behind the seasonal class's second staleness trigger — "30 days,
 * or at season change" — and it is deliberately **not** hemisphere-aware, because it does
 * not need to be. Both hemispheres divide the year at the same four moments; they only
 * disagree about what to call the blocks in between. So "has the season changed since this
 * was verified" has the same answer everywhere on Earth, and threading a hemisphere through
 * the confidence calculation would add a parameter that cannot change the result.
 *
 * Kept separate from `seasonOf` so that nobody later notices `seasonOf` looks
 * northern-hemisphere-shaped, concludes staleness is broken south of the equator, and
 * "fixes" a calculation that was already correct. There is a test asserting this
 * invariance; if you are here to change it, read that test first.
 */
export function seasonIndex(date: Date): 0 | 1 | 2 | 3 {
  const m = date.getUTCMonth(); // 0-11
  return (Math.floor(((m + 1) % 12) / 3) as 0 | 1 | 2 | 3);
}

/**
 * The human name for a season, which *is* hemisphere-dependent — December is summer in
 * Melbourne. Nothing renders this yet. It exists so that when something does, it is right
 * for the place the service is in rather than for the place this was written.
 *
 * `tropical` returns null: the four-season model does not describe the equator, and
 * inventing a wet/dry mapping we have not researched would be a confident guess.
 */
export function seasonOf(date: Date, hemisphere: Hemisphere): Season | null {
  if (hemisphere === 'tropical') return null;
  const north: Season[] = ['winter', 'spring', 'summer', 'autumn'];
  const south: Season[] = ['summer', 'autumn', 'winter', 'spring'];
  return (hemisphere === 'north' ? north : south)[seasonIndex(date)];
}

/** Derived from latitude where a record has one. 23.5deg is the tropics. */
export function hemisphereOf(lat: number | undefined): Hemisphere | null {
  if (lat === undefined || !Number.isFinite(lat)) return null;
  if (Math.abs(lat) <= 23.5) return 'tropical';
  return lat > 0 ? 'north' : 'south';
}
