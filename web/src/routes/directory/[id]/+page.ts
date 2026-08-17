import { error } from '@sveltejs/kit';
import { loadDirectory } from '$lib/directory/load';
import type { EntryGenerator, PageLoad } from './$types';

/** Tells the prerenderer which detail pages exist. */
export const entries: EntryGenerator = () => loadDirectory().map((r) => ({ id: r.id }));

export const load: PageLoad = ({ params }) => {
  const record = loadDirectory().find((r) => r.id === params.id);
  if (!record) throw error(404, 'No such entry');
  return { record, builtAt: new Date().toISOString() };
};
