/**
 * What is deployed, in one request.
 *
 * Prerendered, so it is a static file like everything else here — no function runs, and
 * there is nothing at the host to attack or bill for.
 *
 * It exists so that "did my change reach production" has an answer instead of a guess.
 * Fetching a page and searching it for a string answers a different question badly, and
 * doing that repeatedly is what got this site served a bot-mitigation challenge.
 *
 * Also makes the daily rebuild self-reporting: a `builtAt` several days old says the
 * scheduled job is not running, which is a gap that previously had to be found by reading
 * the workflow file.
 */

import { json } from '@sveltejs/kit';
import { VERSION } from '$lib/server/version';

export const prerender = true;

export function GET() {
  return json(VERSION);
}
