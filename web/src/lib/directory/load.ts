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

/**
 * Folders starting with `_` are scaffolding, not regions — `_template` exists to be copied
 * and its manifest is deliberately invalid so nobody ships it unedited.
 */
const isRegion = (path: string): boolean => !slugOf(path).startsWith('_');

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
    if (!isRegion(path)) continue;
    regions.push(parseRegion(slugOf(path), mod.default));
  }
  regions.sort((a, b) => a.slug.localeCompare(b.slug));

  for (const [path, csv] of Object.entries(csvFiles)) {
    if (!isRegion(path)) continue;
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

export {
  FIELD_LABELS, INTAKE_FIELDS, AVAILABILITY_FIELDS, VALUE_LABELS, labelValue, labelValues
} from './fields';
