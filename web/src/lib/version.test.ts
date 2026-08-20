/**
 * The build stamp.
 *
 * It exists so that "did my change reach production" has an answer rather than a guess.
 * Answering it by fetching a page and searching for a string is inference, and enough of
 * that got this site served a bot-mitigation challenge.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const BUILD = fileURLToPath(new URL('../../build/', import.meta.url));

function stamp(): { commit: string; builtAt: string; dirty: boolean } {
  const path = join(BUILD, 'version.json');
  if (!existsSync(path)) throw new Error('No version.json in the build. Run `npm run build`.');
  return JSON.parse(readFileSync(path, 'utf8')) as ReturnType<typeof stamp>;
}

describe('what is deployed', () => {
  it('is published as a static file, not a function', () => {
    // Prerendered like everything else here: nothing runs at the host, so there is nothing
    // to attack or be billed for.
    expect(existsSync(join(BUILD, 'version.json'))).toBe(true);
  });

  it('names a commit and a build time', () => {
    const v = stamp();
    expect(v.commit).toMatch(/^[0-9a-f]{7}$|^unknown$/);
    expect(Number.isNaN(Date.parse(v.builtAt))).toBe(false);
    expect(typeof v.dirty).toBe('boolean');
  });

  it('was built now rather than carried over from an earlier build', () => {
    // A stale stamp is worse than none: it is the one file whose whole job is being current,
    // and a build that copies an old one forward would report a deploy that never happened.
    const age = Date.now() - Date.parse(stamp().builtAt);
    expect(age).toBeLessThan(60 * 60 * 1000);
  });

  it('says the same thing to a person as to a machine', () => {
    // The status page and this file are two consumers of one module, computed once per
    // build. Two places deriving the same fact separately is how a stamp starts lying.
    const page = readFileSync(join(BUILD, 'status', 'index.html'), 'utf8');
    expect(page).toContain(`data-version="${stamp().commit}"`);
  });

  it('tells a reader how to notice the daily rebuild has stopped', () => {
    // The gap this replaces could previously only be found by reading a workflow file.
    const page = readFileSync(join(BUILD, 'status', 'index.html'), 'utf8');
    expect(page).toMatch(/rebuilds daily/i);
    expect(page).toMatch(/rebuild has stopped/i);
  });
});
