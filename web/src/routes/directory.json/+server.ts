import { buildExport } from '$lib/directory/export';
import { loadDirectory } from '$lib/directory/load';

export const prerender = true;

/**
 * The canonical machine-readable directory. See src/lib/directory/export.ts for why the
 * verdicts ship alongside the data rather than the consumer recomputing them.
 */
export function GET() {
  const body = JSON.stringify(buildExport(loadDirectory(), new Date()), null, 2);
  return new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // A consumer that caches this longer than the margin is serving stale verdicts.
      'cache-control': 'public, max-age=3600'
    }
  });
}
