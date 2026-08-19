/**
 * Which area's directory to carry.
 *
 * An operator works in one place. Offering all of them at once is both useless to them and
 * more than a prepaid phone should be asked to cache.
 */

import { loadDirectory, loadRegions } from '$lib/directory/load';

export const prerender = true;

export function load() {
  const counts = new Map<string, number>();
  for (const r of loadDirectory()) {
    if (r.region) counts.set(r.region, (counts.get(r.region) ?? 0) + 1);
  }

  return {
    areas: loadRegions()
      .map((region) => ({ region, records: counts.get(region.slug) ?? 0 }))
      // A region with nothing in it has nothing to offer offline, and listing it would
      // promise a fallback that is an empty page.
      .filter((a) => a.records > 0)
      .sort((a, b) => a.region.name.localeCompare(b.region.name))
  };
}
