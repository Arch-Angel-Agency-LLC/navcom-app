/**
 * One metro's directory, prerendered.
 *
 * **Split by region because the whole thing does not fit.** Prerendering every record into
 * one page put the terminal at 79% of its page budget with 33 metros seeded, and the budget
 * is a hard gate for a reason -- the device floor is a prepaid Android 8 with 400MB free.
 *
 * It is also the right shape regardless of size: an operator is in one place, and a St.
 * Louis patrol has no use for Sydney's shelters taking up their offline cache.
 */

import { error } from '@sveltejs/kit';
import { loadDirectory, loadRegions } from '$lib/directory/load';

export const prerender = true;

/** Every region with records. A region with none has nothing to show offline. */
export function entries() {
  const counts = new Map<string, number>();
  for (const r of loadDirectory()) {
    if (r.region) counts.set(r.region, (counts.get(r.region) ?? 0) + 1);
  }
  return [...counts.keys()].map((region) => ({ region }));
}

export function load({ params }: { params: { region: string } }) {
  const region = loadRegions().find((r) => r.slug === params.region);
  if (!region) error(404, 'No such region');

  return {
    built: new Date().toISOString(),
    region,
    records: loadDirectory().filter((r) => r.region === params.region)
  };
}
