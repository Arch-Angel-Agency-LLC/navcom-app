/**
 * Bundle budget check.
 *
 * "The device floor is a real target, not an aspiration. Check bundle size." — CLAUDE.md
 * Budgets in docs/delivery.md. This fails the build rather than printing a warning,
 * because a budget nobody enforces is a wish.
 */

import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const BUILD = fileURLToPath(new URL('../build/', import.meta.url));

const BUDGETS = {
  /** Initial JavaScript delivered to the browser, gzipped. */
  js: 100 * 1024,
  /** Everything the first page load pulls, gzipped. */
  total: 250 * 1024
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

let js = 0;
let total = 0;
const rows = [];

for (const f of files) {
  const size = gz(f);
  total += size;
  if (f.endsWith('.js')) js += size;
  rows.push([relative(BUILD, f), size]);
}

rows.sort((a, b) => b[1] - a[1]);

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

console.log('Gzipped build output\n');
for (const [name, size] of rows.slice(0, 15)) {
  console.log(`  ${kb(size).padStart(9)}  ${name}`);
}
if (rows.length > 15) console.log(`  ${String(`+${rows.length - 15} more`).padStart(9)}`);

console.log('');
const checks = [
  ['JavaScript', js, BUDGETS.js],
  ['Total', total, BUDGETS.total]
];

let failed = false;
for (const [label, actual, budget] of checks) {
  const ok = actual <= budget;
  if (!ok) failed = true;
  const pct = budget === 0 ? 0 : Math.round((actual / budget) * 100);
  console.log(
    `  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(11)} ${kb(actual).padStart(9)} / ${kb(budget).padStart(9)}  (${pct}%)`
  );
}

if (js === 0) {
  console.log('\n  Zero JavaScript. The directory works with scripting disabled.');
}

process.exit(failed ? 1 : 0);
