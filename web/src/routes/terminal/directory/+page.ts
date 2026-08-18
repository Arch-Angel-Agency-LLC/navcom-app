/**
 * The directory, prerendered into the terminal's own page.
 *
 * Prerendered rather than fetched as data, deliberately: caching the page caches the
 * records, so there is no second request that could fail exactly when it matters. It also
 * puts the records into the **built artifact**, where the display-rule regression tests can
 * see them — three times this project has shipped a rule the logic honoured and the output
 * did not, and the directory is where that would do real harm.
 *
 * The build stamp travels with it. A prerendered snapshot has two ages: how old each fact
 * is, which the records carry, and how old the whole copy is, which nothing else would say.
 */

import { loadDirectory, loadRegions } from '$lib/directory/load';

export const prerender = true;

export function load() {
  return {
    built: new Date().toISOString(),
    regions: loadRegions(),
    records: loadDirectory()
  };
}
