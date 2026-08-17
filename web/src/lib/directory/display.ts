/**
 * Display rules. These exist because of one failure mode: a confident wrong answer that
 * sends someone somewhere that turns them away.
 *
 *   1. Never show a volatile field without its age
 *   2. Stale volatile data displays as "call first", never the old value
 *   3. suspect records surface the flag first, above all other content
 *   4. Anyone can flag in one tap                     <- not met on the public site; see below
 *   5. Blank renders as "unknown", never as absence of a restriction
 *   6. Seeded entries look visibly different from operator-verified ones
 *
 * Rule 4 is a write, and the public directory is static with no backend. It is therefore
 * READ-ONLY, and flagging lives in the field terminal where corrections queue offline
 * [C17]. The site must say so rather than imply the rule is met. See docs/delivery.md.
 *
 * Normative source: docs/product/directory-schema.md §4
 */

import { confidenceForField, isSeeded } from './confidence';
import type { Confidence, ResourceField, ResourceRecord } from './types';
import { ageInDays, classOf } from './volatility';

export interface Age {
  days: number;
  /** "verified 3 days ago" — rendered, never assembled by the caller. */
  label: string;
}

export type FieldDisplay =
  /** Rule 5. Blank is unknown, never "no restriction". */
  | { kind: 'unknown' }
  /** Rule 2. The old value is deliberately not carried — it must not be rendered. */
  | { kind: 'call-first'; confidence: Confidence }
  /** Rule 1. A volatile value always carries its age; `age` is non-optional here. */
  | { kind: 'value'; value: string; confidence: Confidence; age: Age | null };

export function formatAge(days: number): string {
  if (days < 0) return 'verified in the future';
  if (days === 0) return 'verified today';
  if (days === 1) return 'verified yesterday';
  if (days < 31) return `verified ${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `verified ${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(days / 365);
  return `verified ${years} year${years === 1 ? '' : 's'} ago`;
}

function ageOf(record: ResourceRecord, now: Date): Age | null {
  if (!record.last_verified) return null;
  const days = ageInDays(record.last_verified, now);
  return { days, label: formatAge(days) };
}

function renderValue(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (Array.isArray(v)) return v.length ? v.join(', ') : null;
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  const s = String(v).trim();
  return s.length ? s : null;
}

/** How one field of one record must be rendered. */
export function displayField(
  record: ResourceRecord,
  field: ResourceField,
  now: Date
): FieldDisplay {
  const raw = renderValue(record[field]);

  // Rule 5 — blank is unknown, and takes precedence over everything else.
  if (raw === null) return { kind: 'unknown' };

  const cls = classOf(field);
  const confidence = confidenceForField(record, field, now);
  const age = ageOf(record, now);

  // Rule 2 — a stale or suspect volatile field never shows its old value.
  if (cls === 'volatile' && (confidence === 'stale' || confidence === 'suspect')) {
    return { kind: 'call-first', confidence };
  }

  // Rule 1 — a volatile value is never shown without its age. If we cannot establish an
  // age we cannot satisfy the rule, so the honest rendering is "call first".
  if (cls === 'volatile' && age === null) {
    return { kind: 'call-first', confidence };
  }

  return { kind: 'value', value: raw, confidence, age };
}

export interface RecordDisplay {
  /** Rule 3 — non-null means render this above all other content. */
  flagFirst: { flag: ResourceRecord['flag']; label: string } | null;
  /** Rule 6 — the caller must render seeded entries visibly differently. */
  seeded: boolean;
  age: Age | null;
}

const FLAG_LABEL: Record<ResourceRecord['flag'], string> = {
  ok: '',
  reported_closed: 'Reported closed',
  reported_wrong: 'Reported wrong — check before relying on this',
  permanently_closed: 'Permanently closed'
};

export function displayRecord(record: ResourceRecord, now: Date): RecordDisplay {
  return {
    flagFirst:
      record.flag === 'ok' ? null : { flag: record.flag, label: FLAG_LABEL[record.flag] },
    seeded: isSeeded(record),
    age: ageOf(record, now)
  };
}
