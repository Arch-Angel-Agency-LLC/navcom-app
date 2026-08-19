/**
 * Regression tests for the display rules, asserted against the BUILT HTML.
 *
 * The unit tests in directory.test.ts prove the logic. These prove the pages actually use
 * it — a component edited to "simplify" the stale case would pass every unit test while
 * shipping the exact failure the schema exists to prevent.
 *
 * Requires `npm run build` first; `npm run verify` sequences that for you.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, type HTMLElement } from 'node-html-parser';
import { beforeAll, describe, expect, it } from 'vitest';

import { displayField } from '@navcom/core';
import { loadDirectory } from './load';
import type { ResourceField } from '@navcom/core';

const BUILD = fileURLToPath(new URL('../../../build/', import.meta.url));

function htmlFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? htmlFiles(p) : p.endsWith('.html') ? [p] : [];
  });
}

interface Page {
  path: string;
  doc: HTMLElement;
  raw: string;
  /** Body text only — the <title> also contains the record name and would confuse order. */
  bodyText: string;
}

/**
 * Text inside a record that is NOT part of a rendered field verdict.
 *
 * Rule 2's whole point is that a suppressed value is *structurally absent*. The field slots
 * are covered by the same-field check below; this covers the other way it leaks — a
 * component rendering `record.address` as ordinary prose, outside the FieldRow machinery
 * that knows about suppression. The terminal's directory screen had exactly that in its
 * first draft.
 */
function proseOutsideFieldSlots(el: HTMLElement): string {
  if (el.getAttribute('data-display') !== undefined) return '';
  return el.childNodes
    .map((n) =>
      n.nodeType === 3
        ? (n.rawText ?? '')
        : proseOutsideFieldSlots(n as HTMLElement)
    )
    .join(' ');
}

let pages: Page[] = [];
/** Every element carrying data-record, on any page: one rendered record. */
let rendered: { page: Page; el: HTMLElement; id: string }[] = [];

beforeAll(() => {
  const files = htmlFiles(BUILD);
  if (files.length === 0) {
    throw new Error('No build output. Run `npm run build` before these tests.');
  }
  pages = files.map((path) => {
    const raw = readFileSync(path, 'utf8');
    const doc = parse(raw);
    return { path, doc, raw, bodyText: doc.querySelector('body')?.structuredText ?? '' };
  });

  rendered = pages.flatMap((page) =>
    page.doc.querySelectorAll('[data-record]').map((el) => ({
      page,
      el,
      id: el.getAttribute('data-record') as string
    }))
  );
});

/**
 * How many real cases each rule actually looked at.
 *
 * A guard that examines nothing passes. Every rule here scans the real directory, so a data
 * edit, a component rewrite, or a selector that stops matching can leave a rule green while
 * checking an empty set — and nothing about the output would look different. These counters
 * make silence fail.
 */
const examined = { rule1: 0, rule2: 0, rule3: 0, rule5: 0, rule6: 0, verdicts: 0 };

describe('rendered display rules', () => {
  it('has rendered some records', () => {
    expect(rendered.length).toBeGreaterThan(0);
  });

  it('rule 1 — every rendered volatile value carries an age', () => {
    for (const { path, doc } of pages) {
      for (const el of doc.querySelectorAll('[data-display="value"][data-class="volatile"]')) {
        examined.rule1++;
        expect(
          el.querySelector('[data-age]'),
          `${path}: volatile field "${el.getAttribute('data-field')}" rendered without an age`
        ).not.toBeNull();
      }
    }
  });

  it('rule 2 — a suppressed value is never rendered as a value anywhere on the page', () => {
    const records = loadDirectory();

    for (const { page, el, id } of rendered) {
      const record = records.find((r) => r.id === id);
      if (!record) continue;

      for (const cf of el.querySelectorAll('[data-display="call-first"]')) {
        const field = cf.getAttribute('data-field') as ResourceField;
        const suppressed = record[field];
        if (typeof suppressed !== 'string' || suppressed.trim() === '') continue;

        examined.rule2++;

        // Two checks, because the value can leak two ways and a single one misses one.
        //
        // (a) Rendered as a value for the SAME field — the summary-card-versus-detail-row
        //     leak. This used to be compared against every rendered value on the page,
        //     which false-failed the moment the terminal put many records on one page: a
        //     record with a suppressed `hours` of "unknown" also renders `sex_offender_ok`
        //     as the value "unknown", a legitimate enum member of a different field.
        const shownForField = el
          .querySelectorAll(`[data-display="value"][data-field="${field}"]`)
          .map((v) => v.structuredText.trim());

        expect(
          shownForField.some((s) => s.includes(suppressed)),
          `${page.path}: suppressed "${field}" value "${suppressed}" is rendered as a value`
        ).toBe(false);

        // (b) Printed as ordinary prose somewhere in the record, outside the field slots
        //     entirely. Narrowing (a) to one field removed this case, which is the leak a
        //     new component is most likely to introduce — and the terminal's own directory
        //     screen had it in its first draft, printing record.address into a <p>.
        expect(
          proseOutsideFieldSlots(el).includes(suppressed),
          `${page.path}: suppressed "${field}" value "${suppressed}" is printed as prose on ${id}`
        ).toBe(false);
      }
    }
  });

  it('rule 2 — call-first elements say so in words', () => {
    for (const { path, doc } of pages) {
      for (const el of doc.querySelectorAll('[data-display="call-first"]')) {
        expect(el.structuredText.toLowerCase(), path).toContain('call first');
      }
    }
  });

  it('rule 3 — a flagged record shows its flag before its own name', () => {
    const records = loadDirectory();

    for (const { page, el, id } of rendered) {
      if (el.getAttribute('data-flagged') !== 'true') continue;
      const record = records.find((r) => r.id === id);
      if (!record) continue;

      // The flag sits inside the card on the list page and above the header on the detail
      // page, so compare rendered reading order rather than DOM containment. Body text
      // only: <title> repeats the record name and would put it spuriously first.
      examined.rule3++;
      const flag = el.querySelector('[data-flag]') ?? page.doc.querySelector('[data-flag]');
      expect(flag, `${page.path}: no flag rendered for flagged record ${id}`).not.toBeNull();

      const flagAt = page.bodyText.indexOf(flag!.structuredText.trim().split('\n')[0]);
      const nameAt = page.bodyText.indexOf(record.name);

      expect(nameAt, `${page.path}: record name not found in body`).toBeGreaterThan(-1);
      expect(flagAt, `${page.path}: flag must be read before the name of ${id}`)
        .toBeLessThan(nameAt);
    }
  });

  it('rule 5 — unknown renders the word, never an empty cell', () => {
    for (const { path, doc } of pages) {
      for (const el of doc.querySelectorAll('[data-display="unknown"]')) {
        examined.rule5++;
        expect(el.structuredText.trim().toLowerCase(), path).toBe('unknown');
      }
    }
  });

  it('rule 6 — a seeded record carries its visible marker', () => {
    for (const { page, el } of rendered) {
      if (el.getAttribute('data-seeded') !== 'true') continue;
      examined.rule6++;
      const marker =
        el.querySelector('[data-seeded-note]') ?? page.doc.querySelector('.notice--warn');
      expect(marker, `${page.path}: seeded record with no visible marker`).not.toBeNull();
    }
  });

  it('renders the same verdict the logic produces, for every field of every record', () => {
    const records = loadDirectory();
    const now = new Date();

    for (const { page, el, id } of rendered) {
      const record = records.find((r) => r.id === id);
      if (!record) continue;

      // Scoped to this record's own element — a list page holds several.
      for (const field of el.querySelectorAll('[data-display][data-field]')) {
        const name = field.getAttribute('data-field') as ResourceField;
        const expected = displayField(record, name, now).kind;
        examined.verdicts++;
        expect(
          field.getAttribute('data-display'),
          `${page.path}: "${name}" on ${id} rendered as ${field.getAttribute('data-display')}, logic says ${expected}`
        ).toBe(expected);
      }
    }
  });

  it('actually examined a real case of every rule — a guard that checks nothing passes', () => {
    // Declared last on purpose: it asserts the rules above were not green by vacancy.
    // Without it, deleting the one flagged record from the seed data would silently retire
    // rule 3, and the suite would look exactly the same as it does now.
    //
    // This is the failure that let rule 2 drift: nothing was watching whether the guard
    // still had anything to guard.
    for (const [rule, n] of Object.entries(examined)) {
      expect(n, `${rule} examined nothing — it is passing vacuously`).toBeGreaterThan(0);
    }
  });
});

describe('the public surface', () => {
  it('delivers no JavaScript to any PUBLIC page', () => {
    // Strict, and scoped rather than relaxed: the site is a document and must stay readable
    // with scripting off. The terminal is an application, checked separately below.
    //
    // Asserts the real property rather than a proxy for it — SvelteKit loads a client entry
    // through <link rel="modulepreload"> plus one inline module, so counting only
    // `script[src]` would pass a page that shipped both.
    for (const { path, doc } of pages) {
      if (path.includes('/terminal/')) continue;
      expect(doc.querySelectorAll('script').length, `${path} has a script tag`).toBe(0);
      expect(
        doc.querySelectorAll('link[rel="modulepreload"]').length,
        `${path} preloads a module`
      ).toBe(0);
    }
  });

  it('gives every page a title and a description', () => {
    for (const { path, doc } of pages) {
      expect(doc.querySelector('title')?.structuredText.trim(), path).toBeTruthy();
      expect(
        doc.querySelector('meta[name="description"]'),
        `${path} has no meta description`
      ).not.toBeNull();
    }
  });

  it('gives every page exactly one h1', () => {
    for (const { path, doc } of pages) {
      expect(doc.querySelectorAll('h1').length, path).toBe(1);
    }
  });
});

describe('reader-facing documents are actually published', () => {
  it('publishes CONTRIBUTING and LICENSING, not just docs/', () => {
    const slugs = pages.map((p) => p.path);
    expect(slugs.some((p) => p.includes('/docs/contributing/')), 'CONTRIBUTING is unpublished').toBe(true);
    expect(slugs.some((p) => p.includes('/docs/licensing/')), 'LICENSING is unpublished').toBe(true);
  });

  it('does not leave a dead link where a published document exists', () => {
    for (const { path, doc } of pages) {
      for (const a of doc.querySelectorAll('a[href^="/docs/"]')) {
        const href = (a.getAttribute('href') ?? '').split('#')[0].replace(/\/$/, '');
        if (href === '/docs') continue;
        const target = href.replace(/^\/docs\//, '');
        expect(
          pages.some((p) => p.path.includes(`/docs/${target}/`)),
          `${path} links to ${href}, which is not published`
        ).toBe(true);
      }
    }
  });

  it('never skips a heading level', () => {
    for (const { path, doc } of pages) {
      const levels = doc
        .querySelectorAll('h1, h2, h3, h4, h5, h6')
        .map((h) => Number(h.tagName[1]));
      for (let i = 1; i < levels.length; i++) {
        expect(
          levels[i] - levels[i - 1],
          `${path}: h${levels[i - 1]} is followed by h${levels[i]}`
        ).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('the field terminal', () => {
  /** Status specifically — the terminal now has several screens under /terminal/. */
  const terminal = () => pages.find((p) => p.path.endsWith('/terminal/index.html'));
  const screens = () => pages.filter((p) => p.path.includes('/terminal/'));

  it('is built', () => {
    expect(terminal(), 'no terminal Status page in build/').toBeDefined();
  });

  it('has built every screen the loop needs', () => {
    const built = screens().map((p) => p.path);
    for (const screen of ['sign-on', 'query', 'assist', 'distress', 'setup', 'wipe', 'log', 'directory']) {
      expect(
        built.some((p) => p.includes(`/terminal/${screen}/`)),
        `${screen} screen is not built`
      ).toBe(true);
    }
  });

  it('offers Distress from every screen that can send one', () => {
    // Distress does not require being on station, and must never be more than one tap away.
    for (const screen of ['query', 'assist']) {
      const page = screens().find((p) => p.path.includes(`/terminal/${screen}/`))!;
      const links = page.doc.querySelectorAll('a').map((a) => a.getAttribute('href'));
      expect(links, `${screen} cannot reach Status`).toContain('/terminal/');
    }
    const distress = screens().find((p) => p.path.includes('/terminal/distress/'))!;
    // Sending is a hold, never a tap — invariant 3, deliberate by construction.
    expect(distress.bodyText).toMatch(/Hold to send/i);
    expect(distress.bodyText).toMatch(/until a human answers/i);
  });

  it('is an application, so it does load a client bundle', () => {
    const t = terminal()!;
    const modules = t.doc.querySelectorAll('link[rel="modulepreload"]').length;
    const scripts = t.doc.querySelectorAll('script').length;
    expect(modules + scripts, 'terminal ships no client code').toBeGreaterThan(0);
  });

  it('renders Dark before anything is configured, not an error or a spinner', () => {
    const t = terminal()!;
    const state = t.doc.querySelector('[data-state]');
    expect(state?.getAttribute('data-state')).toBe('dark');
    expect(t.bodyText).toContain('Dark is not an error');
    expect(t.bodyText.toLowerCase()).not.toContain('connecting');
    expect(t.bodyText.toLowerCase()).not.toContain('loading');
  });

  it('states the consequence, not just the label', () => {
    const t = terminal()!;
    const cap = t.doc.querySelector('[data-capability]');
    expect(cap, 'no capability sentence rendered').not.toBeNull();
    expect(cap!.structuredText).toMatch(/page nobody/i);
  });

  it('says what is lost without a watch rather than implying Dark is equivalent', () => {
    expect(terminal()!.bodyText).toMatch(/Query needs a watch/i);
  });

  it('never claims a capability that is not built', () => {
    // The Status screen once promised "the cached directory, the playbooks and your own log
    // all work with no watch and no signal" while none of the three existed. Claiming a
    // capability on the one screen that must be honest is the same failure as claiming a
    // watch that isn't there, and worse, because an operator plans around it.
    //
    // Each claim is tied to the screen that would have to exist for it to be true. Restore
    // a sentence and this passes; restore it early and it fails.
    const built = screens().map((p) => p.path);
    const claims: [RegExp, string][] = [
      [/cached directory/i, 'directory'],
      [/playbook/i, 'playbook'],
      [/your own log/i, 'log']
    ];
    for (const page of screens()) {
      for (const [claim, screen] of claims) {
        if (!claim.test(page.bodyText)) continue;
        expect(
          built.some((p) => p.includes(`/terminal/${screen}`)),
          `${page.path} claims "${claim.source}" but no ${screen} screen is built`
        ).toBe(true);
      }
    }
  });

  it('states where a wipe stops, rather than implying it is total', () => {
    // An operator who believes a wipe removes them from the watch is wrong in a way that
    // changes what they do next. Invariant 7 is a boundary, and the boundary is the part
    // worth saying out loud.
    const wipe = screens().find((p) => p.path.includes('/terminal/wipe/'))!;
    expect(wipe.bodyText).toMatch(/still has your board entry/i);
    expect(wipe.bodyText).toMatch(/accountability log is outside both/i);
    // The browser's own limits, which no amount of care on our side removes.
    expect(wipe.bodyText).toMatch(/no OS keystore/i);
    expect(wipe.bodyText).toMatch(/unlinks it rather than scrubbing/i);
  });

  it('shapes the two destructive actions differently', () => {
    // Panic wipe costs an evening and must be fast: a hold, rendered statically.
    // Burn costs everything an operator has built, so it names that cost up front.
    //
    // The typed-callsign confirmation is not asserted here on purpose — it only exists once
    // an identity is loaded on the client, and the prerendered page correctly shows the
    // "nothing to burn" branch instead. The confirmation gate is covered where it lives.
    const wipe = screens().find((p) => p.path.includes('/terminal/wipe/'))!;
    expect(wipe.bodyText).toMatch(/Hold to wipe tonight/i);
    expect(wipe.bodyText).toMatch(/identity included/i);
    expect(wipe.bodyText).toMatch(/no recovery unless you set one up/i);
    expect(wipe.bodyText).toMatch(/nothing to burn/i);
  });

  it('does not congratulate anyone after a wipe', () => {
    // A terminal that reports "4 items destroyed" tells whoever is holding the phone that
    // there was something to destroy. The screen returns to an ordinary Status instead.
    const wipe = screens().find((p) => p.path.includes('/terminal/wipe/'))!;
    expect(wipe.bodyText.toLowerCase()).not.toContain('wiped successfully');
    expect(wipe.bodyText.toLowerCase()).not.toContain('items destroyed');
  });

  it('never presents a self-verified record as checked', () => {
    // The trap this screen exists around: a response carries entries, proofs AND the root
    // they are against, all three from the watch. Verifying them against each other always
    // succeeds. A tick for that would tell an operator they had checked something when they
    // had not, which is worse than showing nothing.
    const log = screens().find((p) => p.path.includes('/terminal/log/'))!;
    expect(log.bodyText).toMatch(/marking its own homework/i);
    expect(log.bodyText).toMatch(/this device saw the watch\s+publish/i);
  });

  it('states the limit that survives every check on the record screen', () => {
    // Omission. No proof closes it, and a screen full of green ticks is exactly where an
    // operator would otherwise conclude the record is complete.
    const log = screens().find((p) => p.path.includes('/terminal/log/'))!;
    expect(log.bodyText).toMatch(/whether anything is missing/i);
    expect(log.bodyText).toMatch(/nothing signs yet/i);
  });

  it('renders its cached records into the built page, where the display rules are checked', () => {
    // The rules in the first describe block scan every [data-record] on every page. That
    // only covers the terminal if the terminal actually prerenders its records -- which is
    // why the groups start open. A collapsed-by-default accordion would have shipped this
    // screen with the six display rules unchecked on the surface where a confident wrong
    // answer does the most harm.
    const dir = screens().find((p) => p.path.includes('/terminal/directory/'))!;
    expect(dir.doc.querySelectorAll('[data-record]').length).toBeGreaterThan(0);
    expect(dir.doc.querySelectorAll('[data-display][data-field]').length).toBeGreaterThan(0);
  });

  it('has no search box, because Query goes to the watch', () => {
    // The anti-pattern this screen is most likely to grow. Searching a list one-handed in
    // the cold is the problem the watch exists to solve.
    const dir = screens().find((p) => p.path.includes('/terminal/directory/'))!;
    expect(dir.doc.querySelectorAll('input[type="search"]').length).toBe(0);
    expect(dir.doc.querySelectorAll('input[type="text"]').length).toBe(0);
    expect(dir.raw).not.toMatch(/placeholder="[^"]*search/i);
    expect(dir.bodyText).toMatch(/Query goes to the watch/i);
  });

  it('says how old the cached copy is, separately from how old the facts are', () => {
    // A snapshot has two ages and only one of them is written on the records. An operator
    // offline for three weeks has stale data twice over.
    const dir = screens().find((p) => p.path.includes('/terminal/directory/'))!;
    expect(dir.doc.querySelector('[data-snapshot-age]'), 'no snapshot age rendered').not.toBeNull();
  });

  it('carries a manifest so it can be installed', () => {
    expect(terminal()!.raw).toContain('manifest.webmanifest');
  });

  it('is actually installable — a manifest with no icons is not', () => {
    // Android refuses to offer installation for a manifest with an empty icons array, and
    // iOS falls back to a screenshot of the page. The manifest existed for weeks in that
    // state, which reads as "installable" in every summary and is not.
    const manifest = JSON.parse(
      readFileSync(join(BUILD, 'manifest.webmanifest'), 'utf8')
    ) as { icons: { src: string; sizes: string }[] };

    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes, 'Android needs 192 and 512').toEqual(
      expect.arrayContaining(['192x192', '512x512'])
    );
    for (const icon of manifest.icons) {
      expect(existsSync(join(BUILD, icon.src.replace(/^\//, ''))), `${icon.src} missing`).toBe(true);
    }
    // iOS ignores the manifest entirely for Add to Home Screen.
    expect(terminal()!.raw).toContain('apple-touch-icon');
    expect(existsSync(join(BUILD, 'apple-touch-icon.png'))).toBe(true);
  });
});
