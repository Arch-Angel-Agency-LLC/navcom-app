import { error } from '@sveltejs/kit';
import { allDocs, docBySlug } from '$lib/docs';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => allDocs().map((d) => ({ slug: d.slug }));

export const load: PageLoad = ({ params }) => {
  const doc = docBySlug(params.slug);
  if (!doc) throw error(404, 'No such document');
  return { doc };
};
