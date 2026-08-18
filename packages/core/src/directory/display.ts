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
import type { Confidence, ResourceField, ResourceRecord, VolatilityClass } from './types';
import { ageInDays, classOf } from './volatility';

export interface Age {
  days: number;
  /** ISO date, for a <time datetime> attribute. */
  iso: string;
  /**
   * "14 Aug 2026". The primary rendering, because a date cannot become false. A relative
   * phrase can: this page is static, and "3 days ago" stops being true the moment the
   * build goes cold.
   */
  absolute: string;
  /** "3 days ago". A secondary hint, only honest while the build is fresh. */
  relative: string;
}

export type FieldDisplay =
  /** Rule 5. Blank is unknown, never "no restriction". */
  | { kind: 'unknown'; cls: VolatilityClass | null }
  /** Rule 2. The old value is deliberately not carried — it must not be rendered. */
  | { kind: 'call-first'; confidence: Confidence; cls: VolatilityClass | null }
  /** Rule 1. A volatile value always carries its age; `age` is non-null when volatile. */
  | {
      kind: 'value';
      /** Individual values, unformatted. Label each, then join — never re-split a join. */
      values: string[];
      /** Convenience join of `values`, for tests and plain-text contexts. */
      value: string;
      confidence: Confidence;
      age: Age | null;
      cls: VolatilityClass | null;
    };

export function formatRelative(days: number): string {
  if (days < 0) return 'dated in the future';
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 31) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "14 Aug 2026". Unambiguous across locales, and true whenever it is read. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function ageOf(record: ResourceRecord, now: Date): Age | null {
  if (!record.last_verified) return null;
  const days = ageInDays(record.last_verified, now);
  return {
    days,
    iso: record.last_verified,
    absolute: formatDate(record.last_verified),
    relative: formatRelative(days)
  };
}

function rawValues(v: unknown): string[] {
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === 'boolean') return [v ? 'yes' : 'no'];
  const s = String(v).trim();
  return s.length ? [s] : [];
}

/** How one field of one record must be rendered. */
export function displayField(
  record: ResourceRecord,
  field: ResourceField,
  now: Date,
  marginDays?: number
): FieldDisplay {
  const values = rawValues(record[field]);
  const cls = classOf(field);

  // Rule 5 — blank is unknown, and takes precedence over everything else.
  if (values.length === 0) return { kind: 'unknown', cls };

  const confidence = confidenceForField(record, field, now, marginDays);
  const age = ageOf(record, now);

  // Rule 2 — a stale or suspect volatile field never shows its old value.
  if (cls === 'volatile' && (confidence === 'stale' || confidence === 'suspect')) {
    return { kind: 'call-first', confidence, cls };
  }

  // Rule 1 — a volatile value is never shown without its age. If we cannot establish an
  // age we cannot satisfy the rule, so the honest rendering is "call first".
  if (cls === 'volatile' && age === null) {
    return { kind: 'call-first', confidence, cls };
  }

  return { kind: 'value', values, value: values.join(', '), confidence, age, cls };
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
