/**
 * Bundle budget check.
 *
 * "The device floor is a real target, not an aspiration. Check bundle size." — CLAUDE.md
 * Budgets in docs/delivery.md. This fails the build rather than warning, because a budget
 * nobody enforces is a wish.
 *
 * It measures what a browser actually DOWNLOADS for a page — the HTML plus the assets that
 * HTML references — not everything sitting in build/. Those differ sharply here: with
 * client-side rendering off, SvelteKit still emits client chunks that no page ever loads.
 * Counting them would report a payload no reader is ever served.
 */

import { gzipSync } from 'node:zlib';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, normalize, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BUILD = fileURLToPath(new URL('../build/', import.meta.url));

const BUDGETS = {
  /** JavaScript delivered for a single page load, gzipped. */
  js: 100 * 1024,
  /** Everything delivered for a single page load, gzipped. */
  page: 250 * 1024
};

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

let files;
try {
  files = walk(BUILD);
} catch {
  console.error('No build/ directory. Run `npm run build` first.');
  process.exit(1);
}

const gz = (p) => gzipSync(readFileSync(p)).length;
const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

const htmlFiles = files.filter((f) => f.endsWith('.html'));
const referenced = new Set();

/** Assets pulled by a page: stylesheets, scripts, preloads. */
function assetsOf(htmlPath) {
  const html = readFileSync(htmlPath, 'utf8');
  const found = new Set();
  const re = /(?:href|src)="([^"]+\.(?:css|js))"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const ref = m[1];
    if (/^(https?:)?\/\//.test(ref)) continue; // external; CSP blocks these anyway
    const abs = ref.startsWith('/')
      ? join(BUILD, ref.slice(1))
      : normalize(join(dirname(htmlPath), ref));
    if (existsSync(abs)) found.add(abs);
  }
  return [...found];
}

const pages = htmlFiles.map((html) => {
  const assets = assetsOf(html);
  assets.forEach((a) => referenced.add(a));
  referenced.add(html);

  let js = 0;
  let css = 0;
  for (const a of assets) {
    const size = gz(a);
    if (a.endsWith('.js')) js += size;
    else css += size;
  }
  const htmlSize = gz(html);
  return { name: relative(BUILD, html), html: htmlSize, css, js, total: htmlSize + css + js };
});

pages.sort((a, b) => b.total - a.total);

console.log(`Delivered payload per page, gzipped — ${pages.length} pages\n`);
console.log(`  ${'HTML'.padStart(9)} ${'CSS'.padStart(9)} ${'JS'.padStart(9)} ${'TOTAL'.padStart(9)}  page`);
for (const p of pages.slice(0, 8)) {
  console.log(
    `  ${kb(p.html).padStart(9)} ${kb(p.css).padStart(9)} ${kb(p.js).padStart(9)} ${kb(p.total).padStart(9)}  ${p.name}`
  );
}
if (pages.length > 8) console.log(`  ${`+${pages.length - 8} smaller`.padStart(41)}`);

const worstJs = Math.max(...pages.map((p) => p.js));
const worstPage = pages[0];

console.log('');
const checks = [
  ['JavaScript', worstJs, BUDGETS.js, 'worst page'],
  ['Page total', worstPage.total, BUDGETS.page, worstPage.name]
];

let failed = false;
for (const [label, actual, budget, note] of checks) {
  const ok = actual <= budget;
  if (!ok) failed = true;
  const pct = Math.round((actual / budget) * 100);
  console.log(
    `  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(11)} ${kb(actual).padStart(9)} / ${kb(budget).padStart(9)}  (${pct}%)  ${note}`
  );
}

// Emitted but never referenced by any page. Harmless to a reader, but worth seeing: if it
// starts growing, something has begun shipping client code.
const dead = files.filter((f) => !referenced.has(f) && !f.endsWith('.txt'));
if (dead.length) {
  const deadBytes = dead.reduce((n, f) => n + gz(f), 0);
  console.log(
    `\n  note  ${dead.length} unreferenced file(s), ${kb(deadBytes)} gzipped — emitted by the` +
      `\n        client build, loaded by no page. Not delivered to anyone.`
  );
}

if (worstJs === 0) {
  console.log('\n  Zero JavaScript delivered. Every page works with scripting disabled.');
}

process.exit(failed ? 1 : 0);
