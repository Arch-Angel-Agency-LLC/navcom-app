import { docGroups } from '$lib/docs';
import type { PageLoad } from './$types';

export const load: PageLoad = () => ({
  groups: docGroups().map(({ group, pages }) => ({
    group,
    pages: pages.map(({ slug, title }) => ({ slug, title }))
  }))
});
