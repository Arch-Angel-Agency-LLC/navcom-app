/**
 * Derived confidence. Never entered by hand.
 *
 *   in_person or staff_confirmed, within window    -> high
 *   phone, within window                           -> medium
 *   website or secondhand, within window           -> low
 *   anything past its window                       -> stale
 *   flag != ok                                     -> suspect (overrides all)
 *
 * Normative source: docs/product/directory-schema.md §4
 */

import type { Confidence, ResourceField, ResourceRecord, VolatilityClass } from './types';
import { STALE_AFTER_DAYS, STALENESS_MARGIN_DAYS, ageInDays, classOf, seasonIndex } from './volatility';

/**
 * Confidence for one volatility class of a record.
 *
 * `marginDays` accounts for the page outliving its build — see STALENESS_MARGIN_DAYS. It
 * defaults to the safe value rather than to zero, so a caller who forgets it gets the
 * conservative answer instead of the confident one. Pass 0 only to assert exact windows.
 *
 * Two cases the schema does not spell out, resolved toward the honest blank:
 * a record with no `last_verified`, and one with no `method`, both read `stale`. We cannot
 * establish any confidence in either, and "stale" is the weakest claim available that is
 * still true. Neither is treated as `low`, which would assert more than we know.
 */
export function confidenceForClass(
  record: ResourceRecord,
  cls: VolatilityClass,
  now: Date,
  marginDays: number = STALENESS_MARGIN_DAYS
): Confidence {
  // Overrides everything, including a fresh in-person verification.
  if (record.flag !== 'ok') return 'suspect';

  if (!record.last_verified) return 'stale';

  const age = ageInDays(record.last_verified, now) + marginDays;
  if (age > STALE_AFTER_DAYS[cls]) return 'stale';

  // Second staleness trigger for the seasonal class: "30 days, or at season change".
  // seasonIndex is hemisphere-independent by construction — see its doc comment.
  if (cls === 'seasonal') {
    const verifiedAt = new Date(`${record.last_verified}T00:00:00Z`);
    if (seasonIndex(verifiedAt) !== seasonIndex(now)) return 'stale';
  }

  switch (record.method) {
    case 'in_person':
    case 'staff_confirmed':
      return 'high';
    case 'phone':
      return 'medium';
    case 'website':
    case 'secondhand':
      return 'low';
    default:
      return 'stale';
  }
}

/** Confidence for a single field, via its volatility class. */
export function confidenceForField(
  record: ResourceRecord,
  field: ResourceField,
  now: Date,
  marginDays: number = STALENESS_MARGIN_DAYS
): Confidence {
  const cls = classOf(field);
  if (cls === null) return record.flag !== 'ok' ? 'suspect' : 'high';
  return confidenceForClass(record, cls, now, marginDays);
}

/**
 * A seeded entry is one imported from public sources rather than verified by an operator.
 * Display rule 6 requires these look visibly different, not merely carry different
 * metadata: low-confidence data that looks authoritative is more dangerous than no data.
 */
export function isSeeded(record: ResourceRecord): boolean {
  return record.method === 'website' || record.method === 'secondhand';
}
