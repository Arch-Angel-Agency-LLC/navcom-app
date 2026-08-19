import type { ResourceRecord } from "@navcom/core";

/**
 * Writing the CSV.
 *
 * Column order is fixed and matches what is already committed, so a re-scrape produces a
 * diff about the data rather than about the file format.
 */

export const COLUMNS = [
  "id", "name", "type", "address", "lat", "lon", "phone", "accepts", "pets", "sobriety",
  "id_required", "referral_required", "sex_offender_ok", "reports_to", "curfew", "max_stay",
  "belongings", "accessibility", "languages", "cost", "hours", "intake_hours", "seasonal",
  "capacity_signal", "last_verified", "verified_by", "method", "flag", "notes",
] as const;

/**
 * The columns a scraper may never fill.
 *
 * `SeededRecord` already makes them unreachable at the type level. This is the second lock,
 * checked at the moment of writing, because the first one is only as good as nobody casting
 * around it.
 */
export const INTAKE_COLUMNS = [
  "accepts", "pets", "sobriety", "id_required", "referral_required", "sex_offender_ok",
  "reports_to", "curfew", "max_stay", "belongings", "capacity_signal",
] as const;

function cell(value: unknown): string {
  if (value === undefined || value === null) return "";
  const s = Array.isArray(value) ? value.join("|") : String(value);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCsv(records: ResourceRecord[]): string {
  const rows = records.map((r) =>
    COLUMNS.map((c) => cell((r as unknown as Record<string, unknown>)[c])).join(","),
  );
  return [COLUMNS.join(","), ...rows].join("\n") + "\n";
}
