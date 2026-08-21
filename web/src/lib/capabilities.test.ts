/**
 * The static half of the capability checks: the screen exists, is cached, and says what it
 * claims.
 *
 * The other half — that `requires` is the truth — needs a real browser and lives in
 * `e2e/capabilities.spec.ts`. Neither half is sufficient: a screen can carry every claim and
 * still have no control on it, and a control can work while the claim beside it is fiction.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';
import { describe, expect, it } from 'vitest';
import { CAPABILITIES, CAPABILITY_SCREENS } from './capabilities';
import { TERMINAL_ROUTES } from './terminal/routes';

const BUILD = fileURLToPath(new URL('../../build/', import.meta.url));

function body(screen: string): string {
  const path = join(BUILD, screen, 'index.html');
  if (!existsSync(path)) throw new Error(`${screen} was not built`);
  return parse(readFileSync(path, 'utf8')).querySelector('body')?.structuredText ?? '';
}

describe('every capability has a screen', () => {
  for (const screen of CAPABILITY_SCREENS) {
    it(`${screen} is in the build`, () => {
      expect(existsSync(join(BUILD, screen, 'index.html'))).toBe(true);
    });
  }

  it('every capability screen is cached for offline', () => {
    // Two screens once shipped without being cached, and both were screens whose whole
    // point is working without a signal.
    const cached = new Set<string>(TERMINAL_ROUTES.map((r) => `terminal/${r}`));
    // `on-visit` screens are cached the first time they are opened rather than precached --
    // "only what you open is kept", because carrying every metro would fill a cheap phone.
    // Asserted separately below rather than exempted silently.
    for (const c of CAPABILITIES.filter((x) => (x.cached ?? 'precache') === 'precache')) {
      expect(cached.has(c.screen), `${c.screen} is not cached offline`).toBe(true);
    }
  });

  it('every on-visit screen was actually built, since nothing precaches it', () => {
    // The failure this guards: a screen that is neither in the shell nor in the build is
    // simply absent, and the precache check above would not have looked.
    for (const c of CAPABILITIES.filter((x) => x.cached === 'on-visit')) {
      expect(existsSync(join(BUILD, c.screen, 'index.html')), `${c.screen} was not built`).toBe(true);
    }
  });
});

describe('every claim has something behind it', () => {
  for (const capability of CAPABILITIES) {
    for (const claim of capability.claims) {
      it(`${capability.name}: "${claim}"`, () => {
        // Checked against the prerendered HTML, so a claim cannot hide behind state a
        // fresh visitor lacks. That is the point rather than a limitation: five times this
        // session an important sentence sat behind a conditional nobody would reach.
        expect(body(capability.screen)).toContain(claim);
      });
    }
  }
});

describe('the manifest itself stays honest', () => {
  it('declares a control for anything with something to operate', () => {
    // A capability with no control is a page you read. One with a control is a thing you
    // do, and the browser check only covers the second -- so an undeclared control is a
    // capability that never gets exercised.
    const shouldOperate = ['Go out', 'Distress', 'Peers', 'Query', 'Assist'];
    for (const name of shouldOperate) {
      const c = CAPABILITIES.find((x) => x.name === name);
      expect(c?.control, `${name} declares no control`).toBeTruthy();
    }
  });

  it('has no capability requiring a watch that it does not need', () => {
    // Most operators have no Watchtower. A capability that lists one is claiming most
    // people cannot use it, which had better be true.
    //
    // An allow-list rather than a rule, so that adding a third is a decision somebody had
    // to write down here:
    //
    //  - Query and Assist need a person on the other end. That is what they are
    //  - Resupply goes to whoever keeps the shared stash, and somebody patrolling alone has
    //    no quartermaster either — they buy their own socks. The screen says exactly that
    //    rather than reading as incomplete setup
    const needWatch = CAPABILITIES.filter((c) => c.requires.includes('watch')).map((c) => c.name);
    expect(needWatch.sort()).toEqual(['Assist', 'Query', 'Resupply']);
  });
});
