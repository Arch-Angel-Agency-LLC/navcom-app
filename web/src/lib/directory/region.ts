/**
 * Regions.
 *
 * A row says a place opens at 19:00. Nothing in the row says local to *where*, and a
 * directory intended to work outside one country cannot leave that implied. The manifest
 * carries the context every row in its folder inherits.
 *
 * See data/regions/README.md for the shape and for what is deliberately absent.
 */

export const REGION_STATUS = ['example', 'seeded', 'maintained'] as const;
export type RegionStatus = (typeof REGION_STATUS)[number];

export interface Region {
  slug: string;
  /** What people there call it, in their language. */
  name: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  /** IANA. What makes `hours` and `curfew` mean anything. */
  timezone: string;
  /** ISO 639-1, the languages this data is written in. */
  languages: string[];
  /**
   * `seeded` means nobody has checked any of it. The site says so, because a reader
   * deserves to know whether a person has ever been there.
   */
  status: RegionStatus;
}

const ALPHA2 = /^[A-Z]{2}$/;
const IANA = /^(UTC|[A-Za-z]+(?:_[A-Za-z]+)*\/[A-Za-z0-9+_-]+(?:\/[A-Za-z0-9+_-]+)?)$/;
const ISO639 = /^[a-z]{2,3}$/;

/** Validates a manifest. Throws at build time rather than shipping a region that lies. */
export function parseRegion(slug: string, raw: unknown): Region {
  // A function declaration, not an arrow: TypeScript only treats a never-returning call as
  // an assertion when it can resolve the declaration, which is what lets the checks below
  // narrow instead of needing a cast on every field.
  function fail(why: string): never {
    throw new Error(`data/regions/${slug}/region.json: ${why}`);
  }
  if (raw === null || typeof raw !== 'object') fail('must be a JSON object');
  const r = raw as Record<string, unknown>;

  if (r.slug !== slug) fail(`slug is "${String(r.slug)}" but the folder is "${slug}"`);
  if (typeof r.name !== 'string' || !r.name.trim()) fail('name is required');
  if (typeof r.country !== 'string' || !ALPHA2.test(r.country)) {
    fail(`country must be an ISO 3166-1 alpha-2 code, got "${String(r.country)}"`);
  }
  if (typeof r.timezone !== 'string' || !IANA.test(r.timezone)) {
    fail(`timezone must be an IANA name such as Europe/Berlin, got "${String(r.timezone)}"`);
  }
  if (!Array.isArray(r.languages) || r.languages.length === 0) {
    fail('languages must list at least one ISO 639-1 code');
  }
  for (const l of r.languages as unknown[]) {
    if (typeof l !== 'string' || !ISO639.test(l)) {
      fail(`"${String(l)}" is not an ISO 639-1 language code`);
    }
  }
  if (!REGION_STATUS.includes(r.status as RegionStatus)) {
    fail(`status must be one of: ${REGION_STATUS.join(', ')}`);
  }

  return {
    slug,
    name: r.name.trim(),
    country: r.country,
    timezone: r.timezone,
    languages: r.languages as string[],
    status: r.status as RegionStatus
  };
}

/** "Times are local to Europe/Berlin" — stated rather than implied. */
export function localTimeNote(region: Region): string {
  return region.timezone === 'UTC'
    ? 'Times are UTC.'
    : `Times are local to ${region.timezone.replace(/_/g, ' ')}.`;
}
