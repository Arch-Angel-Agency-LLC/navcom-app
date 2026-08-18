/**
 * Build-time directory load.
 *
 * Every region's CSV and manifest is inlined by Vite at build time, so the published site
 * is static HTML with no data fetch and no runtime dependency on anything.
 */

import { parseDirectoryOrThrow } from './parse';
import { parseRegion, type Region } from './region';
import type { ResourceField, ResourceRecord } from './types';

const csvFiles = import.meta.glob('../../../../data/regions/*/resources.csv', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

const regionFiles = import.meta.glob('../../../../data/regions/*/region.json', {
  eager: true
}) as Record<string, { default: unknown }>;

const slugOf = (path: string): string => path.replace(/.*\/regions\/([^/]+)\/.*/, '$1');

export interface LoadedDirectory {
  regions: Region[];
  records: ResourceRecord[];
}

let cache: LoadedDirectory | null = null;

/**
 * Throws during build if any CSV is malformed, any manifest is invalid, or two regions
 * claim the same record id — see data/regions/README.md on why ids are global.
 */
export function loadAll(): LoadedDirectory {
  if (cache) return cache;

  const regions: Region[] = [];
  const records: ResourceRecord[] = [];
  const seen = new Map<string, string>();

  for (const [path, mod] of Object.entries(regionFiles)) {
    regions.push(parseRegion(slugOf(path), mod.default));
  }
  regions.sort((a, b) => a.slug.localeCompare(b.slug));

  for (const [path, csv] of Object.entries(csvFiles)) {
    const slug = slugOf(path);
    if (!regions.some((r) => r.slug === slug)) {
      throw new Error(`data/regions/${slug}/ has resources.csv but no region.json`);
    }
    for (const record of parseDirectoryOrThrow(csv)) {
      const already = seen.get(record.id);
      if (already) {
        throw new Error(
          `Record id "${record.id}" is claimed by both "${already}" and "${slug}". ` +
            `Ids are global because URLs are flat — prefix with the region slug.`
        );
      }
      seen.set(record.id, slug);
      // Region is attached here, never read from the CSV, so a row cannot claim to be
      // somewhere it is not.
      records.push({ ...record, region: slug });
    }
  }

  records.sort((a, b) => a.name.localeCompare(b.name));
  cache = { regions, records };
  return cache;
}

/** Records across every region. */
export function loadDirectory(): ResourceRecord[] {
  return loadAll().records;
}

export function loadRegions(): Region[] {
  return loadAll().regions;
}

export function regionOf(record: ResourceRecord): Region | undefined {
  return loadAll().regions.find((r) => r.slug === record.region);
}

/**
 * Human labels. Written from the reader's side of the screen — someone deciding whether a
 * place will take the person in front of them, not someone reading a schema.
 */
export const FIELD_LABELS: Partial<Record<ResourceField, string>> = {
  accepts: 'Who they take',
  pets: 'Pets',
  sobriety: 'Using',
  id_required: 'ID needed',
  referral_required: 'Referral needed',
  sex_offender_ok: 'Registry restrictions',
  reports_to: 'Reports to',
  curfew: 'Curfew',
  max_stay: 'Max stay',
  belongings: 'Belongings',
  accessibility: 'Access',
  languages: 'Languages',
  cost: 'Cost',
  hours: 'Open',
  intake_hours: 'Intake',
  seasonal: 'Season',
  capacity_signal: 'Usually',
  address: 'Address',
  phone: 'Phone'
};

/** The fields that answer "will they actually take this person, tonight?" */
export const INTAKE_FIELDS: ResourceField[] = [
  'accepts', 'pets', 'sobriety', 'id_required', 'referral_required',
  'sex_offender_ok', 'reports_to', 'curfew', 'max_stay', 'belongings', 'accessibility',
  'languages', 'cost'
];

export const AVAILABILITY_FIELDS: ResourceField[] = [
  'hours', 'intake_hours', 'seasonal', 'capacity_signal'
];

/** Readable labels for enum values, so the page never shows a snake_case token. */
export const VALUE_LABELS: Record<string, string> = {
  single_men: 'single men',
  single_women: 'single women',
  couples: 'couples',
  families: 'families',
  minors: 'minors',
  trans_inclusive: 'trans inclusive',

  service_only: 'service animals only',
  kennel_onsite: 'kennel on site',

  sober_required: 'sobriety required',
  harm_reduction_ok: 'harm reduction OK',
  no_questions: 'no questions asked',

  helps_but_not_required: 'helps, but not required',

  no_one: 'nobody',
  child_services: 'child services',

  storage_provided: 'storage provided',
  carry_on_only: 'what you can carry',
  size_limit: 'size limit',

  wheelchair: 'wheelchair accessible',
  ground_floor: 'ground floor',

  sliding: 'sliding scale',

  year_round: 'year round',
  winter_only: 'winter only',
  summer_only: 'summer only',
  weather_activated: 'weather activated',

  usually_available: 'usually has space',
  often_full: 'often full',
  call_first: 'call first',

  shelter: 'Shelter', meal: 'Meals', hygiene: 'Showers & laundry', medical: 'Medical',
  harm_reduction: 'Harm reduction', warming: 'Warming centre', cooling: 'Cooling centre',
  storage: 'Storage', legal: 'Legal', id_docs: 'ID & documents', mail: 'Mail',
  charging: 'Charging', veterinary: 'Veterinary', youth: 'Youth', dv: 'Domestic violence',
  detox: 'Detox', daytime: 'Drop-in'
};

/** Formats a single value. Never pass it an already-joined string. */
export function labelValue(raw: string): string {
  return VALUE_LABELS[raw] ?? raw.replace(/_/g, ' ');
}

/** Formats each value, then joins. */
export function labelValues(values: string[]): string {
  return values.map(labelValue).join(', ');
}
