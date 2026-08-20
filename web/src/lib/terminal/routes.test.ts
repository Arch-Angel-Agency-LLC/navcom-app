/**
 * The offline cache must not drift from the app.
 *
 * Two screens shipped without being cached before this existed, and both of them were
 * screens whose entire point is working without a signal.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TERMINAL_ROUTES } from './routes';

const BUILD = fileURLToPath(new URL('../../../build/terminal/', import.meta.url));

describe('every terminal screen is available offline', () => {
  it('caches every screen that was actually built', () => {
    if (!existsSync(BUILD)) throw new Error('No build output. Run `npm run build` first.');

    const built = readdirSync(BUILD)
      .filter((e) => statSync(join(BUILD, e)).isDirectory())
      // Area pages are deliberately not precached: there are dozens and an operator works
      // in one, so opening an area is what saves it.
      .filter((e) => e !== 'directory')
      .map((e) => `${e}/`);

    const cached = new Set<string>(TERMINAL_ROUTES);
    for (const route of built) {
      expect(cached.has(route), `${route} was built but is not cached offline`).toBe(true);
    }
  });

  it('does not cache a screen that no longer exists', () => {
    for (const route of TERMINAL_ROUTES) {
      if (route === '') continue;
      expect(existsSync(join(BUILD, route)), `${route} is cached but was not built`).toBe(true);
    }
  });
});
