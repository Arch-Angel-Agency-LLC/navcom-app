import { loadDirectory } from '$lib/directory/load';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
  const records = loadDirectory();
  return {
    records,
    // Fixed at build time. The site is static, so "now" is when it was published — and
    // that is stated on the page rather than implied, because every age shown is relative
    // to it.
    builtAt: new Date().toISOString()
  };
};
